import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationsApi, jobsApi } from '../lib/api.js';
import {
  Loading, EmptyState, ErrorAlert, ScoreBadge, formatDate,
} from '../components/ui.jsx';

const STATUS_CLASS = {
  pending:  'badge-pending',
  reviewed: 'badge-reviewed',
  rejected: 'badge-rejected',
  hired:    'badge-hired',
};

export default function CandidateDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [seeding, setSeeding]           = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  function loadApplications() {
    setLoading(true);
    applicationsApi.mine()
      .then(data => setApplications(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleSeed() {
    setSeeding(true);
    setError('');
    try {
      await jobsApi.seed();
      loadApplications();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  }

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
              {applications.map(app => (
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
                    <span className={`badge ${STATUS_CLASS[app.status] || ''}`}>
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
    </div>
  );
}
