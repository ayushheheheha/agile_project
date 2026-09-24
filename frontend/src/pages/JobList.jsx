import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../lib/api.js';
import { Loading, EmptyState, ErrorAlert, SkillList, formatDate } from '../components/ui.jsx';

export default function JobList() {
  const navigate = useNavigate();
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [seeding, setSeeding]   = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeSkill, setActiveSkill]   = useState('');
  const [sortBy, setSortBy]             = useState('newest');

  useEffect(() => {
    loadJobs();
  }, []);

  function loadJobs() {
    setLoading(true);
    jobsApi.list()
      .then(data => setJobs(data))
      .catch(err  => setError(err.message))
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

  // Collect all unique skills across all jobs for the filter bar
  const allSkills = useMemo(() => {
    const set = new Set();
    jobs.forEach(j => (j.required_skills || []).forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [jobs]);

  // Filtered & sorted jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Text search: match title or recruiter name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.profiles?.full_name || '').toLowerCase().includes(q) ||
        (j.required_skills || []).some(s => s.toLowerCase().includes(q))
      );
    }

    // Skill filter
    if (activeSkill) {
      result = result.filter(j =>
        (j.required_skills || []).some(s => s === activeSkill)
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [jobs, searchQuery, activeSkill, sortBy]);

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
          <span className="text-muted text-sm">
            {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            {activeSkill ? ` matching "${activeSkill}"` : ''}
            {searchQuery.trim() ? ` for "${searchQuery.trim()}"` : ''}
          </span>
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

      {/* ── Search & Sort Bar ── */}
      <div className="search-bar-row">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            id="jobs-search"
            type="text"
            className="search-input"
            placeholder="Search by title, recruiter, or skill…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >×</button>
          )}
        </div>
        <select
          id="jobs-sort"
          className="sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">A → Z</option>
        </select>
      </div>

      {/* ── Skill Filter Pills ── */}
      {allSkills.length > 0 && (
        <div className="skill-filter-row">
          <button
            className={`skill-filter-pill ${!activeSkill ? 'active' : ''}`}
            onClick={() => setActiveSkill('')}
          >
            All
          </button>
          {allSkills.map(skill => (
            <button
              key={skill}
              className={`skill-filter-pill ${activeSkill === skill ? 'active' : ''}`}
              onClick={() => setActiveSkill(s => s === skill ? '' : skill)}
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState
          message="No jobs posted yet."
          action={
            <button className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Loading demo jobs…' : 'Load Demo Jobs'}
            </button>
          }
        />
      ) : filteredJobs.length === 0 ? (
        <div className="empty-state">
          <p>No jobs match your current filters.</p>
          <button
            className="btn btn-secondary"
            onClick={() => { setSearchQuery(''); setActiveSkill(''); }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="jobs-card-grid">
          {filteredJobs.map(job => (
            <div
              key={job.id}
              className="job-card"
              onClick={() => navigate(`/jobs/${job.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/jobs/${job.id}`)}
            >
              <div className="job-card__header">
                <div>
                  <div className="job-card__title">{job.title}</div>
                  <div className="job-card__meta">
                    {job.profiles?.full_name || 'Unknown recruiter'} · {formatDate(job.created_at)}
                  </div>
                </div>
                <span className="job-card__arrow">→</span>
              </div>
              <div className="job-card__body">
                <p className="job-card__desc">
                  {(job.description || '').slice(0, 140)}{(job.description || '').length > 140 ? '…' : ''}
                </p>
              </div>
              <div className="job-card__footer">
                <SkillList skills={job.required_skills} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
