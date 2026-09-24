import React from 'react';

/**
 * MiniBarChart – a pure CSS/SVG bar chart for quick stats.
 * @param {{ label: string, count: number }[]} data
 * @param {string} color - CSS color for bars
 */
export function MiniBarChart({ data = [], color = '#3b82f6', height = 120 }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data yet</div>;
  }
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="mini-bar-chart" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="mini-bar-col" title={`${item.label}: ${item.count}`}>
          <div
            className="mini-bar-fill"
            style={{
              height: `${Math.max((item.count / max) * 100, item.count > 0 ? 8 : 0)}%`,
              background: color,
            }}
          />
          <div className="mini-bar-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * SparkLine – SVG sparkline for daily trend data.
 * @param {{ date: string, count: number }[]} data
 */
export function SparkLine({ data = [], color = '#3b82f6', width = '100%', height = 80 }) {
  if (!data || data.length < 2) {
    return <div className="chart-empty">Collecting data…</div>;
  }
  const counts = data.map(d => d.count);
  const maxVal = Math.max(...counts, 1);

  const svgW = 300;
  const svgH = 80;
  const pad  = 10;

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (svgW - pad * 2);
    const y = svgH - pad - ((d.count / maxVal) * (svgH - pad * 2));
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const areaPoints = [
    `${pad},${svgH - pad}`,
    ...points,
    `${svgW - pad},${svgH - pad}`,
  ].join(' ');

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      preserveAspectRatio="none"
      style={{ width, height, overflow: 'visible', display: 'block' }}
    >
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkGrad-${color.replace('#', '')})`}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const [x, y] = points[i].split(',').map(Number);
        return d.count > 0 ? (
          <circle key={i} cx={x} cy={y} r="3" fill={color} />
        ) : null;
      })}
    </svg>
  );
}

/**
 * DonutChart – SVG donut for status breakdown.
 * @param {{ label: string, value: number, color: string }[]} segments
 */
export function DonutChart({ segments = [], size = 120 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <circle cx="60" cy="60" r="42" fill="none" stroke="#1e2d3d" strokeWidth="18" />
        <text x="60" y="65" textAnchor="middle" fill="#475569" fontSize="12">No data</text>
      </svg>
    );
  }

  const radius = 42;
  const cx = 60, cy = 60;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const arcs = segments.map(seg => {
    const fraction = seg.value / total;
    const offset   = circumference * (1 - cumulative);
    const dash     = circumference * fraction;
    cumulative += fraction;
    return { ...seg, dash, offset };
  });

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* background track */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1e2d3d" strokeWidth="18" />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth="18"
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={arc.offset}
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      ))}
    </svg>
  );
}

/**
 * StatCard – a single KPI tile.
 */
export function StatCard({ label, value, sub, accent = '#3b82f6', icon }) {
  return (
    <div className="stat-card" style={{ borderTopColor: accent }}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__body">
        <div className="stat-card__value" style={{ color: accent }}>{value ?? '—'}</div>
        <div className="stat-card__label">{label}</div>
        {sub && <div className="stat-card__sub">{sub}</div>}
      </div>
    </div>
  );
}
