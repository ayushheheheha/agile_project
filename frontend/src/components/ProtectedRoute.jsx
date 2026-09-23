import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * If `role` is provided, also enforces role-based access.
 */
export default function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-wrapper">
        <p className="loading-text"><span className="spinner" />Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (role && profile && profile.role !== role) {
    // Wrong role: send to their appropriate dashboard
    return <Navigate to={`/dashboard/${profile.role}`} replace />;
  }

  return children;
}
