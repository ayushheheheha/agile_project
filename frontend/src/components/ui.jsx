import React from 'react';

/**
 * Renders a score as a colored badge.
 * >= 70: green (high)
 * >= 40: blue (mid)
 * < 40 : red (low)
 * null  : grey (none)
 */
export function ScoreBadge({ score }) {
  if (score == null) {
    return <span className="score-badge score-none">—</span>;
  }

  let cls = 'score-low';
  if (score >= 70) cls = 'score-high';
  else if (score >= 40) cls = 'score-mid';

  return (
    <span className={`score-badge ${cls}`}>{Math.round(score)}</span>
  );
}

/**
 * Status badge with colour coding.
 */
export function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`badge badge-${status}`}>{status}</span>
  );
}

/**
 * Inline skill tag list.
 */
export function SkillList({ skills = [] }) {
  if (!skills || skills.length === 0) {
    return <span className="text-faint text-xs">none</span>;
  }
  return (
    <div className="skills-list">
      {skills.map(s => (
        <span key={s} className="skill-tag">{s}</span>
      ))}
    </div>
  );
}

/**
 * Loading indicator used inline or as page-level placeholder.
 */
export function Loading({ message = 'Loading…' }) {
  return (
    <p className="loading-text">
      <span className="spinner" aria-hidden="true" />
      {message}
    </p>
  );
}

/**
 * Empty state placeholder for empty tables.
 */
export function EmptyState({ message, action }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {action}
    </div>
  );
}

/**
 * Error alert banner.
 */
export function ErrorAlert({ message }) {
  if (!message) return null;
  return <div className="alert alert-error" role="alert">{message}</div>;
}

/**
 * Success alert banner.
 */
export function SuccessAlert({ message }) {
  if (!message) return null;
  return <div className="alert alert-success" role="status">{message}</div>;
}

/**
 * Format an ISO date string to a readable date.
 */
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
