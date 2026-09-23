import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api.js';
import { useAuth } from '../components/AuthContext.jsx';
import { ErrorAlert } from '../components/ui.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { setSessionFromBackend } = useAuth();

  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login({ email: form.email, password: form.password });

      if (data.session) {
        await setSessionFromBackend(data.session, {
          id:        data.user.id,
          email:     data.user.email,
          role:      data.user.role,
          full_name: data.user.full_name,
        });

        // Route to role-appropriate dashboard
        if (data.user.role === 'recruiter') {
          navigate('/dashboard/recruiter');
        } else {
          navigate('/dashboard/candidate');
        }
      } else {
        setError('Login succeeded but no session returned. Try again.');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1>Sign in</h1>
        <p className="subtitle">HireSignal Recruitment Platform</p>

        <ErrorAlert message={error} />

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email <span className="required">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              className="form-input"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password <span className="required">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              className="form-input"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? <><span className="spinner" />Signing in…</> : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}
