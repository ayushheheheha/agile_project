import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function TopNav() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate('/login');
  }

  return (
    <nav className="topnav">
      <NavLink to="/jobs" className="topnav__brand" style={{ textDecoration: 'none' }}>
        Hire<span>Signal</span>
      </NavLink>

      {user && (
        <div className="topnav__links">
          <NavLink
            to="/jobs"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Jobs
          </NavLink>

          {profile?.role === 'recruiter' && (
            <>
              <NavLink
                to="/dashboard/recruiter"
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/analytics"
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                Analytics
              </NavLink>
            </>
          )}

          {profile?.role === 'candidate' && (
            <NavLink
              to="/dashboard/candidate"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              My Applications
            </NavLink>
          )}
        </div>
      )}

      <div className="topnav__right">
        {user ? (
          <>
            <NavLink
              to="/profile"
              className="topnav__avatar"
              title="Edit profile"
            >
              {(profile?.full_name || user.email || '?')[0].toUpperCase()}
            </NavLink>
            <span className="topnav__user">
              {profile?.full_name || user.email}
              {profile?.role && (
                <span className="text-faint"> · {profile.role}</span>
              )}
            </span>
            <button
              id="signout-btn"
              className="btn btn-secondary"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login"  className="btn btn-secondary">Log in</NavLink>
            <NavLink to="/signup" className="btn btn-primary">Sign up</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
