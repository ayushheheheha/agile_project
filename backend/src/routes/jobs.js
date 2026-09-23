'use strict';

const express              = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { supabaseAdmin }    = require('../services/supabaseClient');

const router = express.Router();

// ── POST /api/jobs ────────────────────────────────────────────────────────────
/**
 * Create a new job posting. Recruiter only.
 * Body: { title, description, required_skills: string[] | string (CSV) }
 */
router.post('/', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const { title, description } = req.body;
    let { required_skills } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }

    // Accept skills as an array or a comma-separated string
    if (typeof required_skills === 'string') {
      required_skills = required_skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    if (!Array.isArray(required_skills)) {
      required_skills = [];
    }

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .insert({
        recruiter_id:    req.user.id,
        title,
        description,
        required_skills,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(job);

  } catch (err) {
    return next(err);
  }
});

// ── GET /api/jobs ─────────────────────────────────────────────────────────────
/**
 * List all jobs. Any authenticated user.
 * Joins recruiter profile for display name.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select(`
        id,
        title,
        description,
        required_skills,
        created_at,
        profiles!jobs_recruiter_id_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(jobs);

  } catch (err) {
    return next(err);
  }
});

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
/**
 * Single job detail. Any authenticated user.
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select(`
        id,
        title,
        description,
        required_skills,
        created_at,
        profiles!jobs_recruiter_id_fkey (
          id,
          full_name
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json(job);

  } catch (err) {
    return next(err);
  }
});

// ── GET /api/jobs/:id/applications ────────────────────────────────────────────
/**
 * Recruiter views all applicants for a job they own.
 * Sorted by match_score DESC.
 */
router.get('/:id/applications', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const jobId = req.params.id;

    // Verify the recruiter owns this job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, recruiter_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.recruiter_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this job' });
    }

    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        resume_url,
        match_score,
        match_summary,
        status,
        applied_at,
        profiles!applications_candidate_id_fkey (
          id,
          full_name
        ),
        jobs!applications_job_id_fkey (
          id,
          title,
          required_skills
        )
      `)
      .eq('job_id', jobId)
      .order('match_score', { ascending: false, nullsFirst: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(applications);

  } catch (err) {
    return next(err);
  }
});

module.exports = router;
