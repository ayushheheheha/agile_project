import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../lib/api.js';
import { Loading, EmptyState, ErrorAlert, SkillList, formatDate } from '../components/ui.jsx';

export default function JobList() {
  const navigate = useNavigate();
  const [jobs, setJobs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    jobsApi.list()
      .then(data => setJobs(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-wrapper">
      <Loading message="Loading jobs…" />
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Open Positions</h1>
        <span className="text-muted text-sm">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
      </div>

      <ErrorAlert message={error} />

      {jobs.length === 0 ? (
        <EmptyState message="No jobs posted yet. Check back later." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table" id="jobs-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Recruiter</th>
                <th>Required Skills</th>
                <th>Posted</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  title="View job and apply"
                >
                  <td>
                    <strong>{job.title}</strong>
                  </td>
                  <td className="text-muted">
                    {job.profiles?.full_name || '—'}
                  </td>
                  <td>
                    <SkillList skills={job.required_skills} />
                  </td>
                  <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(job.created_at)}
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
