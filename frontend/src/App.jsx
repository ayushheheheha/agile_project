import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './components/AuthContext.jsx';
import ProtectedRoute   from './components/ProtectedRoute.jsx';
import TopNav           from './components/TopNav.jsx';

import Login               from './pages/Login.jsx';
import Signup              from './pages/Signup.jsx';
import JobList             from './pages/JobList.jsx';
import JobDetail           from './pages/JobDetail.jsx';
import RecruiterDashboard  from './pages/RecruiterDashboard.jsx';
import RecruiterApplicants from './pages/RecruiterApplicants.jsx';
import RecruiterAnalytics  from './pages/RecruiterAnalytics.jsx';
import CandidateDashboard  from './pages/CandidateDashboard.jsx';
import ProfilePage         from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <TopNav />

        <Routes>
          {/* Public routes */}
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Authenticated: any role */}
          <Route path="/jobs" element={
            <ProtectedRoute><JobList /></ProtectedRoute>
          } />
          <Route path="/jobs/:id" element={
            <ProtectedRoute><JobDetail /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Recruiter-only */}
          <Route path="/dashboard/recruiter" element={
            <ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>
          } />
          <Route path="/dashboard/recruiter/jobs/:id" element={
            <ProtectedRoute role="recruiter"><RecruiterApplicants /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute role="recruiter"><RecruiterAnalytics /></ProtectedRoute>
          } />

          {/* Candidate-only */}
          <Route path="/dashboard/candidate" element={
            <ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/jobs" replace />} />
          <Route path="*" element={<Navigate to="/jobs" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
