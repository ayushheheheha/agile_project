/**
 * api.js — Thin wrapper around fetch for backend API calls.
 *
 * All requests include the Supabase session JWT in the Authorization header.
 * The backend API base URL is configured via VITE_API_URL (defaults to /api,
 * which the Vite dev proxy forwards to http://localhost:4000).
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Get the current Supabase session token.
 * Checks localStorage first, then falls back to Supabase client session.
 */
async function getToken() {
  const localToken = localStorage.getItem('hs_access_token');
  if (localToken) return localToken;

  try {
    const { supabase } = await import('./supabaseClient.js');
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || null;
    if (token) {
      localStorage.setItem('hs_access_token', token);
    }
    return token;
  } catch (err) {
    console.warn('[getToken] error fetching session:', err);
    return null;
  }
}

/**
 * Core fetch wrapper.
 *
 * @param {string} path      - e.g. '/jobs' or '/applications/mine'
 * @param {object} [options] - fetch options (method, body, headers, etc.)
 * @param {boolean} [isFormData] - if true, don't set Content-Type (let browser set multipart boundary)
 */
async function apiFetch(path, options = {}, isFormData = false) {
  const token = await getToken();

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Try to parse JSON regardless of status code (error bodies are JSON too)
  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = (typeof data === 'object' && data?.error) || `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (body) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login:  (body) => apiFetch('/auth/login',  { method: 'POST', body: JSON.stringify(body) }),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────

export const jobsApi = {
  list:       ()       => apiFetch('/jobs'),
  get:        (id)     => apiFetch(`/jobs/${id}`),
  create:     (body)   => apiFetch('/jobs', { method: 'POST', body: JSON.stringify(body) }),
  applicants: (jobId)  => apiFetch(`/jobs/${jobId}/applications`),
  seed:       ()       => apiFetch('/jobs/seed', { method: 'POST' }),
};

// ── Applications ──────────────────────────────────────────────────────────────

export const applicationsApi = {
  /**
   * Submit an application with a resume file.
   * @param {string} jobId
   * @param {File}   resumeFile
   */
  apply: (jobId, resumeFile) => {
    const form = new FormData();
    form.append('job_id', jobId);
    form.append('resume', resumeFile);
    return apiFetch('/applications', { method: 'POST', body: form }, true);
  },

  mine: () => apiFetch('/applications/mine'),

  updateStatus: (applicationId, status) =>
    apiFetch(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateNotes: (applicationId, notes) =>
    apiFetch(`/applications/${applicationId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export const statsApi = {
  recruiter: () => apiFetch('/stats/recruiter'),
  candidate: () => apiFetch('/stats/candidate'),
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileApi = {
  get:    ()     => apiFetch('/profile'),
  update: (body) => apiFetch('/profile', { method: 'PATCH', body: JSON.stringify(body) }),
};

