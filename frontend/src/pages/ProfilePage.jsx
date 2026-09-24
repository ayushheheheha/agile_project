import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import { profileApi } from '../lib/api.js';
import { Loading, ErrorAlert, SuccessAlert } from '../components/ui.jsx';

export default function ProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [saving, setSaving]     = useState(false);

  // Form state
  const [form, setForm] = useState({ full_name: '', bio: '', skills: '' });

  useEffect(() => {
    profileApi.get()
      .then(data => {
        setProfile(data);
        setForm({
          full_name: data.full_name || '',
          bio:       data.bio       || '',
          skills:    (data.skills || []).join(', '),
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await profileApi.update({
        full_name: form.full_name.trim(),
        bio:       form.bio.trim(),
        skills:    form.skills,
      });
      setProfile(updated);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-wrapper"><Loading message="Loading profile…" /></div>;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <span className="text-muted text-sm">{user?.email} · {profile?.role}</span>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 600 }}>
        <div className="panel-title">Edit Profile</div>

        <ErrorAlert message={error} />
        <SuccessAlert message={success} />

        <form onSubmit={handleSave} noValidate>

          {/* Avatar placeholder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--space-5)' }}>
            <div className="avatar-circle">
              {(form.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="text-sm" style={{ fontWeight: 600 }}>{form.full_name || '—'}</div>
              <div className="text-xs text-muted">{profile?.role} account</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              name="full_name"
              className="form-input"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              name="bio"
              className="form-textarea"
              rows={4}
              value={form.bio}
              onChange={handleChange}
              placeholder={
                profile?.role === 'candidate'
                  ? 'Tell recruiters about yourself, your background, and career goals…'
                  : 'Describe your company or team…'
              }
            />
          </div>

          {profile?.role === 'candidate' && (
            <div className="form-group">
              <label className="form-label" htmlFor="profile-skills">
                My Skills
              </label>
              <input
                id="profile-skills"
                type="text"
                name="skills"
                className="form-input"
                value={form.skills}
                onChange={handleChange}
                placeholder="e.g. Python, React, Docker, SQL"
              />
              <span className="form-hint">Comma-separated list of your skills.</span>
            </div>
          )}

          <div className="form-group" style={{ marginTop: 'var(--space-2)' }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <span className="form-hint">Email cannot be changed here.</span>
          </div>

          <button
            id="save-profile-btn"
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ marginTop: 'var(--space-3)' }}
          >
            {saving ? <><span className="spinner" />Saving…</> : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Info card */}
      <div className="panel" style={{ maxWidth: 600, marginTop: 'var(--space-4)' }}>
        <div className="panel-title">Account Info</div>
        <table style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
          <tbody>
            <tr>
              <td className="text-muted" style={{ padding: '8px 0', width: '40%' }}>User ID</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{user?.id}</td>
            </tr>
            <tr>
              <td className="text-muted" style={{ padding: '8px 0' }}>Role</td>
              <td><span className="badge" style={{ textTransform: 'capitalize' }}>{profile?.role}</span></td>
            </tr>
            <tr>
              <td className="text-muted" style={{ padding: '8px 0' }}>Member since</td>
              <td className="text-muted">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : '—'
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
