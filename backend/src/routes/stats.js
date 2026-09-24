'use strict';

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { supabaseAdmin }            = require('../services/supabaseClient');

const router = express.Router();

// ── GET /api/stats/recruiter ──────────────────────────────────────────────────
/**
 * Returns KPIs for the logged-in recruiter:
 *   - total jobs posted
 *   - total applicants
 *   - avg match score
 *   - hired / rejected / pending counts
 *   - top job by applicants
 *   - score distribution buckets (0-39, 40-69, 70-100)
 *   - applications per day (last 14 days)
 */
router.get('/recruiter', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const recruiterId = req.user.id;

    // ── Fetch all jobs by this recruiter ─────────────────────────────────────
    const { data: jobs, error: jobsErr } = await supabaseAdmin
      .from('jobs')
      .select('id, title, created_at')
      .eq('recruiter_id', recruiterId);

    if (jobsErr) return res.status(500).json({ error: jobsErr.message });

    if (!jobs || jobs.length === 0) {
      return res.json({
        totalJobs: 0,
        totalApplicants: 0,
        avgScore: null,
        statusBreakdown: { pending: 0, reviewed: 0, rejected: 0, hired: 0 },
        scoreDistribution: [
          { label: '0–39', count: 0 },
          { label: '40–69', count: 0 },
          { label: '70–100', count: 0 },
        ],
        topJobs: [],
        dailyApplications: [],
      });
    }

    const jobIds = jobs.map(j => j.id);

    // ── Fetch all applications for those jobs ─────────────────────────────────
    const { data: applications, error: appsErr } = await supabaseAdmin
      .from('applications')
      .select('id, job_id, match_score, status, applied_at')
      .in('job_id', jobIds);

    if (appsErr) return res.status(500).json({ error: appsErr.message });

    const apps = applications || [];

    // ── KPI aggregations ──────────────────────────────────────────────────────
    const totalApplicants = apps.length;
    const scoresWithValue = apps.filter(a => a.match_score != null);
    const avgScore = scoresWithValue.length > 0
      ? Math.round(scoresWithValue.reduce((sum, a) => sum + a.match_score, 0) / scoresWithValue.length)
      : null;

    const statusBreakdown = { pending: 0, reviewed: 0, rejected: 0, hired: 0 };
    for (const a of apps) {
      if (statusBreakdown[a.status] !== undefined) statusBreakdown[a.status]++;
    }

    // Score buckets
    const scoreDistribution = [
      { label: '0-39',   count: 0 },
      { label: '40-69',  count: 0 },
      { label: '70-100', count: 0 },
    ];
    for (const a of scoresWithValue) {
      if (a.match_score < 40)      scoreDistribution[0].count++;
      else if (a.match_score < 70) scoreDistribution[1].count++;
      else                          scoreDistribution[2].count++;
    }

    // Top jobs by applicant count
    const jobApplicantMap = {};
    for (const j of jobs) jobApplicantMap[j.id] = { title: j.title, count: 0 };
    for (const a of apps) {
      if (jobApplicantMap[a.job_id]) jobApplicantMap[a.job_id].count++;
    }
    const topJobs = Object.values(jobApplicantMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Daily applications (last 14 days)
    const days = 14;
    const dailyMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }
    for (const a of apps) {
      const key = a.applied_at?.slice(0, 10);
      if (key && dailyMap[key] !== undefined) dailyMap[key]++;
    }
    const dailyApplications = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      totalJobs: jobs.length,
      totalApplicants,
      avgScore,
      statusBreakdown,
      scoreDistribution,
      topJobs,
      dailyApplications,
    });

  } catch (err) {
    return next(err);
  }
});

// ── GET /api/stats/candidate ──────────────────────────────────────────────────
/**
 * Returns KPIs for the logged-in candidate.
 */
router.get('/candidate', requireAuth, requireRole('candidate'), async (req, res, next) => {
  try {
    const { data: apps, error } = await supabaseAdmin
      .from('applications')
      .select('id, match_score, status, applied_at')
      .eq('candidate_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });

    const applications = apps || [];
    const scoresWithValue = applications.filter(a => a.match_score != null);
    const avgScore = scoresWithValue.length > 0
      ? Math.round(scoresWithValue.reduce((s, a) => s + a.match_score, 0) / scoresWithValue.length)
      : null;
    const bestScore = scoresWithValue.length > 0
      ? Math.round(Math.max(...scoresWithValue.map(a => a.match_score)))
      : null;

    const statusBreakdown = { pending: 0, reviewed: 0, rejected: 0, hired: 0 };
    for (const a of applications) {
      if (statusBreakdown[a.status] !== undefined) statusBreakdown[a.status]++;
    }

    return res.json({
      totalApplications: applications.length,
      avgScore,
      bestScore,
      statusBreakdown,
    });

  } catch (err) {
    return next(err);
  }
});

module.exports = router;
