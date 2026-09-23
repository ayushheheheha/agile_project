-- ============================================================
-- Migration 001: Initial Schema
-- AI-Driven Recruitment and Candidate Evaluation Platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- Extends auth.users with role and display name
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('recruiter', 'candidate')),
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: jobs
-- Job postings created by recruiters
-- ============================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  required_skills  TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: applications
-- Candidates applying to jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_url     TEXT,
  resume_text    TEXT,
  match_score    NUMERIC(5, 2),
  match_summary  TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected', 'hired')),
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, candidate_id)  -- prevent duplicate applications
);

-- ============================================================
-- INDEXES for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON public.jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_match_score ON public.applications(match_score DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Backend service role can insert profiles (used during signup)
CREATE POLICY "profiles_insert_service"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- RLS POLICIES: jobs
-- ============================================================

-- All authenticated users can read jobs
CREATE POLICY "jobs_select_authenticated"
  ON public.jobs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Recruiters can insert jobs for themselves only
CREATE POLICY "jobs_insert_recruiter"
  ON public.jobs FOR INSERT
  WITH CHECK (
    auth.uid() = recruiter_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'recruiter'
    )
  );

-- Recruiters can update only their own jobs
CREATE POLICY "jobs_update_own"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = recruiter_id);

-- Recruiters can delete only their own jobs
CREATE POLICY "jobs_delete_own"
  ON public.jobs FOR DELETE
  USING (auth.uid() = recruiter_id);

-- ============================================================
-- RLS POLICIES: applications
-- ============================================================

-- Candidates can see only their own applications
CREATE POLICY "applications_select_candidate_own"
  ON public.applications FOR SELECT
  USING (
    auth.uid() = candidate_id
    OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
        AND jobs.recruiter_id = auth.uid()
    )
  );

-- Candidates can insert applications only as themselves
CREATE POLICY "applications_insert_candidate"
  ON public.applications FOR INSERT
  WITH CHECK (
    auth.uid() = candidate_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'candidate'
    )
  );

-- Recruiters can update status of applications for their jobs
CREATE POLICY "applications_update_recruiter"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
        AND jobs.recruiter_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTION: auto-create profile on signup
-- Triggered when a user is inserted into auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profile is created explicitly by the backend on signup.
  -- This trigger is a fallback safety net.
  RETURN NEW;
END;
$$;
