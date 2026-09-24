import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobsApi, statsApi } from '../lib/api.js';
import { useAuth } from '../components/AuthContext.jsx';
import {
  Loading, EmptyState, ErrorAlert, SuccessAlert, SkillList, formatDate,
} from '../components/ui.jsx';

export default function RecruiterDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [jobs, setJobs]               = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError]     = useState('');
  const [seeding, setSeeding]         = useState(false);

  // Quick stats
  const [stats, setStats]       = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // New job form
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ title: '', description: '', skills: '' });
  const [posting, setPosting]       = useState(false);
  const [postError, setPostError]   = useState('');
  const [postSuccess, setPostSuccess] = useState('');

  useEffect(() => {
    fetchJobs();
    statsApi.recruiter()
      .then(d => setStats(d))
      .catch(() => {}) // stats are decorative — don't break the page
      .finally(() => setLoadingStats(false));
  }, [user]);

  async function fetchJobs() {
    setLoadingJobs(true);
    setJobsError('');
    try {
      const all  = await jobsApi.list();
      const mine = all.filter(j => j.profiles?.id === user?.id);
      setJobs(mine.length > 0 ? mine : all);
    } catch (err) {
      setJobsError(err.message);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setJobsError('');
    try {
      await jobsApi.seed();
      fetchJobs();
      statsApi.recruiter().then(d => setStats(d)).catch(() => {});
    } catch (err) {
      setJobsError(err.message);
    } finally {
      setSeeding(false);
    }
  }

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handlePostJob(e) {
    e.preventDefault();
    setPostError('');
    setPostSuccess('');

    if (!form.title.trim() || !form.description.trim()) {
      setPostError('Title and description are required');
      return;
    }

    setPosting(true);
    try {
      await jobsApi.create({
        title:           form.title.trim(),
        description:     form.description.trim(),
        required_skills: form.skills,
      });
      setPostSuccess('Job posted successfully');
      setForm({ title: '', description: '', skills: '' });
      setShowForm(false);
      fetchJobs();
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Recruiter Dashboard</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/analytics" className="btn btn-secondary">📊 Analytics</Link>
          <button
            className="btn btn-secondary"
            onClick={handleSeed}
            disabled={seeding}
            title="Populate realistic demo jobs and applicants"
          >
            {seeding ? 'Seeding…' : '⚡ Load Demo Data'}
          </button>
          <button
            id="post-job-btn"
            className="btn btn-primary"
            onClick={() => { setShowForm(s => !s); setPostError(''); setPostSuccess(''); }}
          >
            {showForm ? 'Cancel' : 'Post New Job'}
          </button>
        </div>
      </div>

      {/* ── Quick Stats Row ── */}
      {!loadingStats && stats && (
        <div className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="stat-card" style={{ borderTopColor: '#6366f1' }}>
            <div className="stat-card__icon">📋</div>
            <div className="stat-card__body">
              <div className="stat-card__value" style={{ color: '#6366f1' }}>{stats.totalJobs}</div>
              <div className="stat-card__label">Jobs Posted</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#3b82f6' }}>
            <div className="stat-card__icon">👥</div>
            <div className="stat-card__body">
              <div className="stat-card__value" style={{ color: '#3b82f6' }}>{stats.totalApplicants}</div>
              <div className="stat-card__label">Total Applicants</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#10b981' }}>
            <div className="stat-card__icon">✅</div>
            <div className="stat-card__body">
              <div className="stat-card__value" style={{ color: '#10b981' }}>{stats.statusBreakdown?.hired ?? 0}</div>
              <div className="stat-card__label">Hired</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#f59e0b' }}>
            <div className="stat-card__icon">🤖</div>
            <div className="stat-card__body">
              <div className="stat-card__value" style={{ color: '#f59e0b' }}>
                {stats.avgScore != null ? `${stats.avgScore}` : '—'}
              </div>
              <div className="stat-card__label">Avg AI Score</div>
            </div>
          </div>
        </div>
      )}

      <SuccessAlert message={postSuccess} />

      {/* ── Post New Job Form ── */}
      {showForm && (
        <div className="panel" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="panel-title">New Job Posting</div>

          <ErrorAlert message={postError} />

          <form onSubmit={handlePostJob} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="job-title">
                Job Title <span className="required">*</span>
              </label>
              <input
                id="job-title"
                type="text"
                name="title"
                className="form-input"
                value={form.title}
                onChange={handleFormChange}
                placeholder="e.g. Senior Backend Engineer"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="job-description">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="job-description"
                name="description"
                className="form-textarea"
                rows={5}
                value={form.description}
                onChange={handleFormChange}
                placeholder="Describe the role, responsibilities, and expectations…"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="job-skills">
                Required Skills
              </label>
              <input
                id="job-skills"
                type="text"
                name="skills"
                className="form-input"
                value={form.skills}
                onChange={handleFormChange}
                placeholder="e.g. Node.js, PostgreSQL, Docker, TypeScript"
              />
              <span className="form-hint">Comma-separated list of skills</span>
            </div>

            <button
              id="post-job-submit"
              type="submit"
              className="btn btn-primary"
              disabled={posting}
            >
              {posting ? <><span className="spinner" />Posting…</> : 'Post Job'}
            </button>
          </form>
        </div>
      )}

      {/* ── Jobs Table ── */}
      <div className="panel-title" style={{ marginBottom: 'var(--space-3)' }}>
        Your Job Postings
      </div>

      <ErrorAlert message={jobsError} />

      {loadingJobs ? (
        <Loading message="Loading your jobs…" />
      ) : jobs.length === 0 ? (
        <EmptyState
          message="You haven't posted any jobs yet."
          action={
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Loading demo data…' : 'Load Demo Jobs & Applicants'}
              </button>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                Post your first job
              </button>
            </div>
          }
        />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table" id="recruiter-jobs-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Required Skills</th>
                <th>Posted</th>
                <th>Applicants</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr
                  key={job.id}
                  onClick={() => navigate(`/dashboard/recruiter/jobs/${job.id}`)}
                  title="View applicants"
                >
                  <td><strong>{job.title}</strong></td>
                  <td><SkillList skills={job.required_skills} /></td>
                  <td className="text-muted">{formatDate(job.created_at)}</td>
                  <td>
                    <Link
                      to={`/dashboard/recruiter/jobs/${job.id}`}
                      onClick={e => e.stopPropagation()}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: 'var(--font-size-xs)' }}
                    >
                      View applicants
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
