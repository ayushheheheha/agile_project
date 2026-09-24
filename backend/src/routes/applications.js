'use strict';

const express   = require('express');
const multer    = require('multer');
const pdfParse  = require('pdf-parse');

const { requireAuth, requireRole } = require('../middleware/auth');
const { supabaseAdmin }            = require('../services/supabaseClient');
const { scoreResume }              = require('../services/geminiScoring');

const router = express.Router();

// ── Multer: memory storage (no temp files) ────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'), false);
    }
  },
});

// ── POST /api/applications ────────────────────────────────────────────────────
/**
 * Candidate submits an application.
 * Multipart form: { job_id: string, resume: File (PDF) }
 *
 * Steps:
 *  1. Extract text from PDF (pdf-parse)
 *  2. Upload PDF to Supabase Storage bucket "resumes"
 *  3. Call Gemini scoring service
 *  4. Insert application row with score + summary
 */
router.post(
  '/',
  requireAuth,
  requireRole('candidate'),
  upload.single('resume'),
  async (req, res, next) => {
    try {
      const { job_id } = req.body;

      if (!job_id) {
        return res.status(400).json({ error: 'job_id is required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Resume PDF is required' });
      }

      // ── Fetch job details ─────────────────────────────────────────────────
      const { data: job, error: jobError } = await supabaseAdmin
        .from('jobs')
        .select('id, title, description, required_skills')
        .eq('id', job_id)
        .single();

      if (jobError || !job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // ── Extract PDF text ──────────────────────────────────────────────────
      let resumeText = '';
      try {
        const pdfData = await pdfParse(req.file.buffer);
        resumeText = pdfData.text || '';
      } catch (pdfErr) {
        console.warn('[applications] PDF parse failed:', pdfErr.message);
        // Continue with empty text — fallback scorer handles it gracefully
        resumeText = '';
      }

      // ── Upload PDF to Supabase Storage ────────────────────────────────────
      const fileName = `${req.user.id}/${job_id}/${Date.now()}.pdf`;
      const { error: storageError } = await supabaseAdmin.storage
        .from('resumes')
        .upload(fileName, req.file.buffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (storageError) {
        console.error('[applications] Storage upload error:', storageError.message);
        // Don't fail the whole request — continue without storage URL
      }

      // Build the public URL (storage bucket must be set to public, or use signed URL)
      const { data: urlData } = supabaseAdmin.storage
        .from('resumes')
        .getPublicUrl(fileName);

      const resumeUrl = storageError ? null : (urlData?.publicUrl || null);

      // ── Score with Gemini ─────────────────────────────────────────────────
      const scoringResult = await scoreResume(
        resumeText,
        job.title,
        job.description,
        job.required_skills
      );

      // ── Insert application row ────────────────────────────────────────────
      const { data: application, error: insertError } = await supabaseAdmin
        .from('applications')
        .insert({
          job_id,
          candidate_id:  req.user.id,
          resume_url:    resumeUrl,
          resume_text:   resumeText.slice(0, 50000), // cap at 50k chars
          match_score:   scoringResult.score,
          match_summary: scoringResult.summary,
          status:        'pending',
        })
        .select()
        .single();

      if (insertError) {
        // Handle duplicate application (UNIQUE constraint)
        if (insertError.code === '23505') {
          return res.status(409).json({
            error: 'You have already applied to this job',
          });
        }
        return res.status(500).json({ error: insertError.message });
      }

      return res.status(201).json({
        ...application,
        matched_skills: scoringResult.matched_skills,
        missing_skills: scoringResult.missing_skills,
      });

    } catch (err) {
      return next(err);
    }
  }
);

// ── GET /api/applications/mine ────────────────────────────────────────────────
/**
 * Candidate views their own applications with status and score.
 */
router.get('/mine', requireAuth, requireRole('candidate'), async (req, res, next) => {
  try {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        match_score,
        match_summary,
        resume_url,
        status,
        applied_at,
        jobs!applications_job_id_fkey (
          id,
          title,
          required_skills,
          profiles!jobs_recruiter_id_fkey (
            full_name
          )
        )
      `)
      .eq('candidate_id', req.user.id)
      .order('applied_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(applications);

  } catch (err) {
    return next(err);
  }
});

// ── PATCH /api/applications/:id/status ───────────────────────────────────────
/**
 * Recruiter updates the status of an application.
 * Body: { status: 'pending' | 'reviewed' | 'rejected' | 'hired' }
 */
router.patch('/:id/status', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'reviewed', 'rejected', 'hired'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Fetch the application and verify the recruiter owns the associated job
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        status,
        jobs!applications_job_id_fkey (
          id,
          recruiter_id
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.jobs.recruiter_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own the job for this application' });
    }

    // Update status
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json(updated);

  } catch (err) {
    return next(err);
  }
});

// ── PATCH /api/applications/:id/notes ────────────────────────────────────────
/**
 * Recruiter adds/updates private notes for an application.
 * Body: { notes: string }
 */
router.patch('/:id/notes', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({ error: 'notes field is required' });
    }

    // Verify recruiter owns the job associated with this application
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('applications')
      .select(`id, jobs!applications_job_id_fkey (id, recruiter_id)`)
      .eq('id', req.params.id)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.jobs.recruiter_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own the job for this application' });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({ recruiter_notes: notes })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json(updated);

  } catch (err) {
    return next(err);
  }
});

// ── PATCH /api/applications/:id/resume ───────────────────────────────────────
/**
 * Candidate re-uploads their resume for a PENDING application.
 * Only allowed while status = 'pending' (before recruiter review).
 * Multipart form: { resume: File (PDF) }
 *
 * Steps:
 *  1. Verify candidate owns the application and it is still pending
 *  2. Extract text from new PDF
 *  3. Replace the PDF in Supabase Storage
 *  4. Re-run Gemini scoring
 *  5. Update application row with new score/summary/url
 */
router.patch(
  '/:id/resume',
  requireAuth,
  requireRole('candidate'),
  upload.single('resume'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Resume PDF is required' });
      }

      // ── Fetch the existing application ────────────────────────────────────
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('applications')
        .select(`
          id, candidate_id, status, job_id,
          jobs!applications_job_id_fkey (
            id, title, description, required_skills
          )
        `)
        .eq('id', req.params.id)
        .single();

      if (fetchErr || !existing) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // ── Only the owner can update their application ───────────────────────
      if (existing.candidate_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this application' });
      }

      // ── Only update while still pending ──────────────────────────────────
      if (existing.status !== 'pending') {
        return res.status(409).json({
          error: `Resume can only be changed while status is "pending". Current status: "${existing.status}"`,
        });
      }

      const job = existing.jobs;

      // ── Extract PDF text ──────────────────────────────────────────────────
      let resumeText = '';
      try {
        const pdfData = await pdfParse(req.file.buffer);
        resumeText = pdfData.text || '';
      } catch (pdfErr) {
        console.warn('[applications/resume] PDF parse failed:', pdfErr.message);
        resumeText = '';
      }

      // ── Upload new PDF to Supabase Storage (overwrite) ────────────────────
      const fileName = `${req.user.id}/${job.id}/${Date.now()}.pdf`;
      const { error: storageError } = await supabaseAdmin.storage
        .from('resumes')
        .upload(fileName, req.file.buffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (storageError) {
        console.error('[applications/resume] Storage error:', storageError.message);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('resumes')
        .getPublicUrl(fileName);

      const resumeUrl = storageError ? existing.resume_url : (urlData?.publicUrl || null);

      // ── Re-score with Gemini ──────────────────────────────────────────────
      const scoringResult = await scoreResume(
        resumeText,
        job.title,
        job.description,
        job.required_skills
      );

      // ── Update application row ────────────────────────────────────────────
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('applications')
        .update({
          resume_url:    resumeUrl,
          resume_text:   resumeText.slice(0, 50000),
          match_score:   scoringResult.score,
          match_summary: scoringResult.summary,
          // Keep status = 'pending' — don't reset, it was already pending
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      return res.json({
        ...updated,
        matched_skills: scoringResult.matched_skills,
        missing_skills: scoringResult.missing_skills,
      });

    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;

