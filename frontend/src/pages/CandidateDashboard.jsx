import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationsApi, jobsApi, statsApi } from '../lib/api.js';
import {
  Loading, EmptyState, ErrorAlert, ScoreBadge, formatDate,
} from '../components/ui.jsx';

const STATUS_CLASS = {
  pending:  'badge-pending',
  reviewed: 'badge-reviewed',
  rejected: 'badge-rejected',
  hired:    'badge-hired',
};

const STATUS_COLOR = {
  pending:  '#f59e0b',
  reviewed: '#3b82f6',
  hired:    '#10b981',
  rejected: '#ef4444',
};

/**
 * Inline resume re-upload widget — shown only on pending applications.
 */
function ChangeResumeWidget({ appId, onUpdated }) {
  const fileRef  = useRef(null);
  const [open, setOpen]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select a PDF file'); return; }
    if (file.type !== 'application/pdf') { setError('Only PDF files are accepted'); return; }

    setUploading(true);
    try {
      const updated = await applicationsApi.changeResume(appId, file);
      setResult(updated);
      onUpdated(updated);          // bubble up to refresh the row
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (result) {
    return (
      <div className="change-resume-success">
        <span className="change-resume-success__icon">✅</span>
        <span>
          Resume updated! New score: <strong>{result.match_score != null ? Math.round(result.match_score) : '—'}</strong>
        </span>
        <button
          className="change-resume-again"
          onClick={() => { setResult(null); setOpen(true); }}
        >
          Change again
        </button>
      </div>
    );
  }

  return (
    <div className="change-resume-wrap">
      {!open ? (
        <button
          className="btn-change-resume"
          onClick={() => setOpen(true)}
          title="Re-upload your resume and get a new AI score"
        >
          📎 Change Resume
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="change-resume-form" noValidate>
          {error && (
            <div className="change-resume-error">{error}</div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="change-resume-file"
            id={`resume-change-${appId}`}
          />
          <div className="change-resume-actions">
            <button
              type="submit"
              className="btn-change-resume btn-change-resume--submit"
              disabled={uploading}
            >
              {uploading
                ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />Scoring…</>
                : '✅ Upload & Re-score'
              }
            </button>
            <button
              type="button"
              className="btn-change-resume btn-change-resume--cancel"
              onClick={() => { setOpen(false); setError(''); }}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>
          {uploading && (
            <div className="change-resume-hint">
              Analysing your new resume with AI — this may take 5–15 seconds…
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default function CandidateDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [seeding, setSeeding]           = useState(false);
  const [stats, setStats]               = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadData(); }, []);

  function loadData() {
    setLoading(true);
    Promise.all([
      applicationsApi.mine(),
      statsApi.candidate().catch(() => null),
    ])
      .then(([apps, s]) => {
        setApplications(apps);
        setStats(s);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleSeed() {
    setSeeding(true);
    setError('');
    try {
      await jobsApi.seed();
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  }

  /** Called when a resume re-upload succeeds — update just that row in state */
  function handleResumeUpdated(updated) {
    setApplications(prev =>
      prev.map(a =>
        a.id === updated.id
          ? {
              ...a,
              match_score:   updated.match_score,
              match_summary: updated.match_summary,
              resume_url:    updated.resume_url,
            }
          : a
      )
    );
    // Refresh stats since score changed
    statsApi.candidate().then(s => setStats(s)).catch(() => {});
  }

  const filteredApps = filterStatus
    ? applications.filter(a => a.status === filterStatus)
    : applications;

  if (loading) return (
    <div className="page-wrapper"><Loading message="Loading your applications…" /></div>
  );

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>My Applications</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleSeed}
            disabled={seeding}
            title="Populate realistic demo applications"
          >
            {seeding ? 'Seeding…' : '⚡ Load Demo Applications'}
          </button>
          <Link to="/jobs" className="btn btn-primary">Browse Jobs</Link>
        </div>
      </div>

      <ErrorAlert message={error} />

      {/* ── KPI Cards ── */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="stat-card" style={{ borderTopColor: '#6366f1' }}>
            <div className="stat-card__icon">📨</div>
            <div className="stat-card__body">
              <div className="stat-card__value" style={{ color: '#6366f1' }}>{stats.totalApplications}</div>
              <div className="stat-card__label">Applications Sent</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#3b82f6' }}>
            <div className="stat-card__icon">🤖</div>
            <div className="stat-card__body">
              <div className="stat-card__value" style={{ color: '#3b82f6' }}>
                {stats.avgScore != null ? stats.avgScore : '—'}
              </div>
              <div className="stat-card__label">Avg AI Score</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#10b981' }}>
            <div className="stat-card__icon">🏆</div>
            <div className="stat-card__body">
              <div className="stat-card__value" style={{ color: '#10b981' }}>
                {stats.bestScore != null ? stats.bestScore : '—'}
              </div>
              <div className="stat-card__label">Best Score</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#10b981' }}>
            <div className="stat-card__icon">🎉</div>
            <div className="stat-card__body">
              <div className="stat-card__value" style={{ color: '#10b981' }}>{stats.statusBreakdown?.hired ?? 0}</div>
              <div className="stat-card__label">Offers / Hired</div>
            </div>
          </div>
        </div>
      )}

      {applications.length === 0 ? (
        <EmptyState
          message="You haven't applied to any jobs yet."
          action={
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Loading demo data…' : 'Load Demo Applications'}
              </button>
              <Link to="/jobs" className="btn btn-primary">Browse open positions</Link>
            </div>
          }
        />
      ) : (
        <>
          {/* Status filter pills */}
          <div className="skill-filter-row" style={{ marginBottom: 'var(--space-4)' }}>
            {['', 'pending', 'reviewed', 'hired', 'rejected'].map(s => (
              <button
                key={s || 'all'}
                className={`skill-filter-pill ${filterStatus === s ? 'active' : ''}`}
                style={s && filterStatus === s ? { borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s] } : {}}
                onClick={() => setFilterStatus(s)}
              >
                {s || 'All'}
                {s && stats?.statusBreakdown?.[s] > 0 && (
                  <span style={{ marginLeft: 5, opacity: 0.7 }}>({stats.statusBreakdown[s]})</span>
                )}
              </button>
            ))}
          </div>

          {filteredApps.length === 0 ? (
            <div className="empty-state">
              <p>No applications with status "{filterStatus}".</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {filteredApps.map(app => (
                <div key={app.id} className="applicant-card">
                  {/* ── Row top: job info + score + status ── */}
                  <div className="applicant-card__header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Link
                          to={`/jobs/${app.jobs?.id}`}
                          style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}
                        >
                          {app.jobs?.title || '—'}
                        </Link>
                        <span
                          className={`badge ${STATUS_CLASS[app.status] || ''}`}
                          style={{ borderLeft: `3px solid ${STATUS_COLOR[app.status] || '#475569'}` }}
                        >
                          {app.status}
                        </span>
                        {app.status === 'pending' && (
                          <span className="pending-hint">· recruiter hasn't reviewed yet</span>
                        )}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 3 }}>
                        {app.jobs?.profiles?.full_name || '—'} · Applied {formatDate(app.applied_at)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <ScoreBadge score={app.match_score} />
                      {app.resume_url && (
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          📄 View Resume
                        </a>
                      )}
                    </div>
                  </div>

                  {/* ── AI Summary ── */}
                  {app.match_summary && (
                    <div className="applicant-card__summary">
                      <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        AI Analysis
                      </span>
                      <p className="text-sm" style={{ marginTop: 4 }}>{app.match_summary}</p>
                    </div>
                  )}

                  {/* ── Change Resume widget (pending only) ── */}
                  {app.status === 'pending' && (
                    <ChangeResumeWidget
                      appId={app.id}
                      onUpdated={handleResumeUpdated}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
