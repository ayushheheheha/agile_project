import React, { useEffect, useState } from 'react';
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

export default function CandidateDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [seeding, setSeeding]           = useState(false);

  const [stats, setStats]               = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
            <div className="data-table-wrap">
              <table className="data-table" id="candidate-applications-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Recruiter</th>
                    <th>Applied</th>
                    <th>AI Score</th>
                    <th>Status</th>
                    <th>Summary</th>
                    <th>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map(app => (
                    <tr key={app.id} className="no-hover">
                      <td>
                        <Link to={`/jobs/${app.jobs?.id}`}>
                          {app.jobs?.title || '—'}
                        </Link>
                      </td>
                      <td className="text-muted">
                        {app.jobs?.profiles?.full_name || '—'}
                      </td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(app.applied_at)}
                      </td>
                      <td>
                        <ScoreBadge score={app.match_score} />
                      </td>
                      <td>
                        <span
                          className={`badge ${STATUS_CLASS[app.status] || ''}`}
                          style={{ borderLeft: `3px solid ${STATUS_COLOR[app.status] || '#475569'}` }}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span className="text-sm text-muted">
                          {app.match_summary || '—'}
                        </span>
                      </td>
                      <td>
                        {app.resume_url ? (
                          <a
                            href={app.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-faint text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
