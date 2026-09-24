import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobsApi, applicationsApi } from '../lib/api.js';
import { useAuth } from '../components/AuthContext.jsx';
import {
  Loading, ErrorAlert, SkillList, ScoreBadge, formatDate,
} from '../components/ui.jsx';
import { IconArrowLeft } from '../components/Icons.jsx';

export default function JobDetail() {
  const { id }       = useParams();
  const { profile }  = useAuth();
  const fileRef      = useRef(null);

  const [job, setJob]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Application state
  const [applying, setApplying]     = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applyResult, setApplyResult] = useState(null);

  useEffect(() => {
    jobsApi.get(id)
      .then(data => setJob(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApply(e) {
    e.preventDefault();
    setApplyError('');
    setApplyResult(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setApplyError('Please select a PDF resume file');
      return;
    }

    if (file.type !== 'application/pdf') {
      setApplyError('Only PDF files are accepted');
      return;
    }

    setApplying(true);
    try {
      const result = await applicationsApi.apply(id, file);
      setApplyResult(result);
      // Reset the file input
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setApplyError(err.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  }

  if (loading) return (
    <div className="page-wrapper"><Loading message="Loading job…" /></div>
  );

  if (error) return (
    <div className="page-wrapper"><ErrorAlert message={error} /></div>
  );

  if (!job) return null;

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <Link to="/jobs" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <IconArrowLeft size={14} /> Back to jobs
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{job.title}</h1>
          <span className="text-muted text-sm">
            Posted by {job.profiles?.full_name || '—'} · {formatDate(job.created_at)}
          </span>
        </div>
      </div>

      {/* Job description */}
      <div className="panel" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="panel-title">Job Description</div>
        <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--font-size-sm)' }}>
          {job.description}
        </p>
      </div>

      {/* Required skills */}
      <div className="panel" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="panel-title">Required Skills</div>
        <SkillList skills={job.required_skills} />
      </div>

      {/* Apply section — candidates only */}
      {profile?.role === 'candidate' && (
        <div className="panel">
          <div className="panel-title">Apply for this Position</div>

          {applyResult ? (
            <div>
              <div className="alert alert-success" role="status">
                Application submitted successfully!
              </div>

              <div className="score-summary">
                <div className="score-summary__label">AI Match Score</div>
                <div className="score-summary__number">
                  <ScoreBadge score={applyResult.match_score} />
                </div>
                {applyResult.match_summary && (
                  <p className="text-sm" style={{ marginTop: 'var(--space-3)' }}>
                    {applyResult.match_summary}
                  </p>
                )}

                {applyResult.matched_skills?.length > 0 && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <p className="text-xs text-muted" style={{ marginBottom: 4 }}>MATCHED SKILLS</p>
                    <SkillList skills={applyResult.matched_skills} />
                  </div>
                )}

                {applyResult.missing_skills?.length > 0 && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <p className="text-xs text-muted" style={{ marginBottom: 4 }}>MISSING SKILLS</p>
                    <SkillList skills={applyResult.missing_skills} />
                  </div>
                )}
              </div>

              <Link to="/dashboard/candidate" className="btn btn-secondary mt-4">
                View my applications
              </Link>
            </div>
          ) : (
            <form onSubmit={handleApply} noValidate>
              <ErrorAlert message={applyError} />

              <div className="form-group">
                <label className="form-label" htmlFor="resume-upload">
                  Resume (PDF) <span className="required">*</span>
                </label>
                <input
                  id="resume-upload"
                  type="file"
                  accept="application/pdf"
                  ref={fileRef}
                  className="form-file"
                />
                <span className="form-hint">Max 10 MB. PDF only.</span>
              </div>

              <button
                id="apply-btn"
                type="submit"
                className="btn btn-primary"
                disabled={applying}
              >
                {applying
                  ? <><span className="spinner" />Scoring resume…</>
                  : 'Submit Application'
                }
              </button>

              {applying && (
                <p className="text-xs text-muted mt-4">
                  Analysing your resume with AI — this may take 5–15 seconds.
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Recruiter hint */}
      {profile?.role === 'recruiter' && (
        <div className="alert alert-info" style={{ marginTop: 'var(--space-4)' }}>
          You are viewing this as a recruiter. To see applicants, go to your{' '}
          <Link to="/dashboard/recruiter">Dashboard</Link>.
        </div>
      )}
    </div>
  );
}
