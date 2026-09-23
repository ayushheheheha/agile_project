import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api.js';
import { useAuth } from '../components/AuthContext.jsx';
import { ErrorAlert } from '../components/ui.jsx';

export default function Signup() {
  const navigate = useNavigate();
  const { setSessionFromBackend } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'candidate',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleRoleSelect(role) {
    setForm(f => ({ ...f, role }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim()) {
      setError('Full name is required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.signup({
        email:     form.email,
        password:  form.password,
        full_name: form.full_name.trim(),
        role:      form.role,
      });

      if (data.session) {
        await setSessionFromBackend(data.session, {
          id:        data.user.id,
          email:     data.user.email,
          role:      data.user.role,
          full_name: data.user.full_name,
        });
        navigate(form.role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/candidate');
      } else {
        // Account created but no session (edge case) — redirect to login
        navigate('/login');
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1>Create account</h1>
        <p className="subtitle">HireSignal Recruitment Platform</p>

        <ErrorAlert message={error} />

        <form onSubmit={handleSubmit} noValidate>
          {/* Role selector */}
          <div className="form-group">
            <label className="form-label">I am a <span className="required">*</span></label>
            <div className="role-selector">
              <label
                id="role-candidate"
                className={`role-option ${form.role === 'candidate' ? 'selected' : ''}`}
                onClick={() => handleRoleSelect('candidate')}
              >
                <input type="radio" name="role" value="candidate" readOnly checked={form.role === 'candidate'} />
                <div className="role-option__title">Candidate</div>
                <div className="role-option__desc">Looking for a job</div>
              </label>
              <label
                id="role-recruiter"
                className={`role-option ${form.role === 'recruiter' ? 'selected' : ''}`}
                onClick={() => handleRoleSelect('recruiter')}
              >
                <input type="radio" name="role" value="recruiter" readOnly checked={form.role === 'recruiter'} />
                <div className="role-option__title">Recruiter</div>
                <div className="role-option__desc">Posting jobs</div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">
              Full name <span className="required">*</span>
            </label>
            <input
              id="signup-name"
              type="text"
              name="full_name"
              className="form-input"
              value={form.full_name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">
              Email <span className="required">*</span>
            </label>
            <input
              id="signup-email"
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
            <label className="form-label" htmlFor="signup-password">
              Password <span className="required">*</span>
            </label>
            <input
              id="signup-password"
              type="password"
              name="password"
              className="form-input"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
              minLength={6}
            />
            <span className="form-hint">Minimum 6 characters</span>
          </div>

          <button
            id="signup-submit"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" />Creating account…</>
              : 'Create account'
            }
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
