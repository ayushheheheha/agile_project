import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobsApi, applicationsApi } from '../lib/api.js';
import {
  Loading, ErrorAlert, SuccessAlert, ScoreBadge, SkillList, formatDate,
} from '../components/ui.jsx';

const STATUS_OPTIONS = ['pending', 'reviewed', 'rejected', 'hired'];

export default function RecruiterApplicants() {
  const { id } = useParams(); // job id

  const [job, setJob]                     = useState(null);
  const [applications, setApplications]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [statusMsg, setStatusMsg]         = useState('');
  const [updatingId, setUpdatingId]       = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [jobData, apps] = await Promise.all([
          jobsApi.get(id),
          jobsApi.applicants(id),
        ]);
        setJob(jobData);
        setApplications(apps);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleStatusChange(applicationId, newStatus) {
    setUpdatingId(applicationId);
    setStatusMsg('');
    setError('');
    try {
      const updated = await applicationsApi.updateStatus(applicationId, newStatus);
      setApplications(prev =>
        prev.map(a => a.id === applicationId ? { ...a, status: updated.status } : a)
      );
      setStatusMsg(`Status updated to "${newStatus}"`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setError('Failed to update status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return (
    <div className="page-wrapper"><Loading message="Loading applicants…" /></div>
  );

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <Link to="/dashboard/recruiter" className="text-muted text-sm">← Back to Dashboard</Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{job?.title || 'Job'} — Applicants</h1>
          <span className="text-muted text-sm">
            {applications.length} applicant{applications.length !== 1 ? 's' : ''}, sorted by AI match score
          </span>
        </div>
      </div>

      <ErrorAlert message={error} />
      <SuccessAlert message={statusMsg} />

      {applications.length === 0 ? (
        <div className="empty-state">
          <p>No applications yet for this job.</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table" id="applicants-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Score</th>
                <th>Matched Skills</th>
                <th>Summary</th>
                <th>Applied</th>
                <th>Status</th>
                <th>Resume</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id} className="no-hover">
                  <td>
                    <strong>{app.profiles?.full_name || '—'}</strong>
                  </td>
                  <td>
                    <ScoreBadge score={app.match_score} />
                  </td>
                  <td>
                    <SkillList skills={app.jobs?.required_skills?.filter(s =>
                      app.match_summary?.toLowerCase().includes(s.toLowerCase())
                    ) || []} />
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    <span className="text-sm text-muted">
                      {app.match_summary || '—'}
                    </span>
                  </td>
                  <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(app.applied_at)}
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={app.status}
                      disabled={updatingId === app.id}
                      onChange={e => handleStatusChange(app.id, e.target.value)}
                      aria-label="Update status"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {updatingId === app.id && (
                      <span className="spinner" style={{ marginLeft: 4 }} />
                    )}
                  </td>
                  <td>
                    {app.resume_url ? (
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: 'var(--font-size-xs)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        View PDF
                      </a>
                    ) : (
                      <span className="text-faint text-xs">N/A</span>
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
