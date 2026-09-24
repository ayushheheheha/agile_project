import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../lib/api.js';
import { Loading, EmptyState, ErrorAlert, SkillList, formatDate } from '../components/ui.jsx';

export default function JobList() {
  const navigate = useNavigate();
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [seeding, setSeeding]   = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  function loadJobs() {
    setLoading(true);
    jobsApi.list()
      .then(data => setJobs(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleSeed() {
    setSeeding(true);
    setError('');
    try {
      await jobsApi.seed();
      loadJobs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  }

  if (loading) return (
    <div className="page-wrapper">
      <Loading message="Loading jobs…" />
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1>Open Positions</h1>
          <span className="text-muted text-sm">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleSeed}
          disabled={seeding}
          title="Populate realistic demo jobs and applicants"
        >
          {seeding ? 'Seeding…' : '⚡ Load Demo Data'}
        </button>
      </div>

      <ErrorAlert message={error} />

      {jobs.length === 0 ? (
        <EmptyState
          message="No jobs posted yet."
          action={
            <button className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Loading demo jobs…' : 'Load Demo Jobs'}
            </button>
          }
        />
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
