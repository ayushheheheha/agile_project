import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobsApi, applicationsApi } from '../lib/api.js';
import {
  Loading, ErrorAlert, SuccessAlert, ScoreBadge, SkillList, formatDate,
} from '../components/ui.jsx';

const STATUS_OPTIONS = ['pending', 'reviewed', 'rejected', 'hired'];

const STATUS_COLOR = {
  pending:  '#f59e0b',
  reviewed: '#3b82f6',
  hired:    '#10b981',
  rejected: '#ef4444',
};

export default function RecruiterApplicants() {
  const { id } = useParams(); // job id

  const [job, setJob]                   = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [statusMsg, setStatusMsg]       = useState('');
  const [updatingId, setUpdatingId]     = useState(null);

  // Notes state: { [appId]: string }
  const [notesMap, setNotesMap]         = useState({});
  const [savingNotes, setSavingNotes]   = useState(null); // id being saved
  const [expandedNotes, setExpandedNotes] = useState({}); // { [appId]: boolean }

  // Filter
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [jobData, apps] = await Promise.all([
          jobsApi.get(id),
          jobsApi.applicants(id),
        ]);
        setJob(jobData);
        setApplications(apps);
        // Pre-fill notesMap from loaded data
        const nm = {};
        apps.forEach(a => { nm[a.id] = a.recruiter_notes || ''; });
        setNotesMap(nm);
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

  async function handleSaveNotes(applicationId) {
    setSavingNotes(applicationId);
    try {
      await applicationsApi.updateNotes(applicationId, notesMap[applicationId] || '');
      setStatusMsg('Notes saved');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setError('Failed to save notes: ' + err.message);
    } finally {
      setSavingNotes(null);
    }
  }

  function toggleNotes(appId) {
    setExpandedNotes(prev => ({ ...prev, [appId]: !prev[appId] }));
  }

  const filteredApps = filterStatus
    ? applications.filter(a => a.status === filterStatus)
    : applications;

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

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="text-sm text-muted">Filter:</span>
          {['', ...STATUS_OPTIONS].map(s => (
            <button
              key={s || 'all'}
              className={`skill-filter-pill ${filterStatus === s ? 'active' : ''}`}
              style={s && filterStatus === s ? { borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s] } : {}}
              onClick={() => setFilterStatus(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <ErrorAlert message={error} />
      <SuccessAlert message={statusMsg} />

      {filteredApps.length === 0 ? (
        <div className="empty-state">
          <p>{applications.length === 0 ? 'No applications yet for this job.' : `No applicants with status "${filterStatus}".`}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredApps.map((app, idx) => (
            <div key={app.id} className="applicant-card">
              {/* Card header */}
              <div className="applicant-card__header">
                <div className="applicant-card__rank">#{idx + 1}</div>
                <div className="applicant-card__name">
                  <strong>{app.profiles?.full_name || '—'}</strong>
                  <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
                    Applied {formatDate(app.applied_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                  <ScoreBadge score={app.match_score} />
                  <select
                    className="status-select"
                    value={app.status}
                    disabled={updatingId === app.id}
                    onChange={e => handleStatusChange(app.id, e.target.value)}
                    aria-label="Update status"
                    style={{ borderColor: STATUS_COLOR[app.status] || 'var(--card-border)' }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {updatingId === app.id && <span className="spinner" />}
                  {app.resume_url && (
                    <a
                      href={app.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '3px 10px', fontSize: 'var(--font-size-xs)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      📄 Resume
                    </a>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {app.match_summary && (
                <div className="applicant-card__summary">
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Analysis</span>
                  <p className="text-sm" style={{ marginTop: 4 }}>{app.match_summary}</p>
                </div>
              )}

              {/* Matched skills */}
              {app.jobs?.required_skills?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <SkillList skills={app.jobs.required_skills} />
                </div>
              )}

              {/* Recruiter Notes toggle */}
              <div style={{ marginTop: 10 }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '3px 10px', fontSize: 'var(--font-size-xs)' }}
                  onClick={() => toggleNotes(app.id)}
                >
                  {expandedNotes[app.id] ? '▲ Hide Notes' : '📝 Recruiter Notes'}
                  {notesMap[app.id] ? ' ●' : ''}
                </button>
                {expandedNotes[app.id] && (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Add private notes about this candidate…"
                      value={notesMap[app.id] || ''}
                      onChange={e => setNotesMap(prev => ({ ...prev, [app.id]: e.target.value }))}
                      style={{ marginBottom: 8 }}
                    />
                    <button
                      className="btn btn-primary"
                      style={{ padding: '4px 14px', fontSize: 'var(--font-size-xs)' }}
                      disabled={savingNotes === app.id}
                      onClick={() => handleSaveNotes(app.id)}
                    >
                      {savingNotes === app.id ? <><span className="spinner" />Saving…</> : 'Save Notes'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
