import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { statsApi } from '../lib/api.js';
import { Loading, ErrorAlert } from '../components/ui.jsx';
import { StatCard, MiniBarChart, SparkLine, DonutChart } from '../components/charts.jsx';

const STATUS_COLORS = {
  pending:  '#f59e0b',
  reviewed: '#3b82f6',
  hired:    '#10b981',
  rejected: '#ef4444',
};

export default function RecruiterAnalytics() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    statsApi.recruiter()
      .then(data => setStats(data))
      .catch(err  => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-wrapper"><Loading message="Loading analytics…" /></div>
  );

  if (error) return (
    <div className="page-wrapper"><ErrorAlert message={error} /></div>
  );

  const { totalJobs, totalApplicants, avgScore, statusBreakdown, scoreDistribution, topJobs, dailyApplications } = stats;

  const donutSegments = Object.entries(statusBreakdown).map(([label, value]) => ({
    label, value, color: STATUS_COLORS[label] || '#64748b',
  }));

  // Score color
  const scoreAccent = avgScore == null ? '#64748b' : avgScore >= 70 ? '#10b981' : avgScore >= 40 ? '#3b82f6' : '#ef4444';

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1>Recruitment Analytics</h1>
          <span className="text-muted text-sm">Live stats across all your job postings</span>
        </div>
        <Link to="/dashboard/recruiter" className="btn btn-secondary">← Dashboard</Link>
      </div>

      {/* ── KPI row ── */}
      <div className="stat-grid">
        <StatCard
          label="Jobs Posted"
          value={totalJobs}
          icon="📋"
          accent="#6366f1"
          sub="total active listings"
        />
        <StatCard
          label="Total Applicants"
          value={totalApplicants}
          icon="👥"
          accent="#3b82f6"
          sub="across all jobs"
        />
        <StatCard
          label="Avg AI Score"
          value={avgScore != null ? `${avgScore}/100` : 'N/A'}
          icon="🤖"
          accent={scoreAccent}
          sub="match quality index"
        />
        <StatCard
          label="Hired"
          value={statusBreakdown.hired}
          icon="✅"
          accent="#10b981"
          sub={`of ${totalApplicants} applicants`}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="analytics-grid">

        {/* Daily trend sparkline */}
        <div className="panel analytics-panel">
          <div className="panel-title">Applications Over Last 14 Days</div>
          {dailyApplications.length > 0 ? (
            <>
              <SparkLine data={dailyApplications} color="#6366f1" height={100} />
              <div className="spark-labels">
                <span className="text-xs text-muted">{dailyApplications[0]?.date}</span>
                <span className="text-xs text-muted">{dailyApplications[dailyApplications.length - 1]?.date}</span>
              </div>
            </>
          ) : (
            <p className="text-muted text-sm" style={{ marginTop: 12 }}>No application data yet.</p>
          )}
        </div>

        {/* Status donut */}
        <div className="panel analytics-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="panel-title" style={{ width: '100%' }}>Application Status Breakdown</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 12 }}>
            <DonutChart segments={donutSegments} size={140} />
            <div className="donut-legend">
              {donutSegments.map(seg => (
                <div key={seg.label} className="donut-legend-item">
                  <span className="donut-legend-dot" style={{ background: seg.color }} />
                  <span className="text-sm">{seg.label}</span>
                  <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score distribution bar chart */}
        <div className="panel analytics-panel">
          <div className="panel-title">AI Score Distribution</div>
          <MiniBarChart
            data={scoreDistribution}
            color="#3b82f6"
            height={100}
          />
          <div className="text-xs text-muted" style={{ marginTop: 8, textAlign: 'center' }}>
            Score buckets (0-39 = low, 40-69 = mid, 70-100 = strong)
          </div>
        </div>

        {/* Top jobs */}
        <div className="panel analytics-panel">
          <div className="panel-title">Top Jobs by Applicants</div>
          {topJobs.length === 0 ? (
            <p className="text-muted text-sm" style={{ marginTop: 12 }}>No jobs yet.</p>
          ) : (
            <div className="top-jobs-list" style={{ marginTop: 12 }}>
              {topJobs.map((j, i) => (
                <div key={i} className="top-job-row">
                  <span className="top-job-rank">{i + 1}</span>
                  <div className="top-job-bar-wrap">
                    <div className="top-job-title text-sm">{j.title}</div>
                    <div className="top-job-bar-track">
                      <div
                        className="top-job-bar-fill"
                        style={{
                          width: `${Math.round((j.count / Math.max(topJobs[0].count, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted" style={{ minWidth: 28, textAlign: 'right' }}>{j.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
