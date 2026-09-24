-- ============================================================
-- Migration 003: Profile Extensions & Application Notes
-- Adds bio, skills fields to profiles
-- Adds recruiter_notes to applications
-- ============================================================

-- Add bio and skills columns to profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio    TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}';

-- Add recruiter_notes column to applications (idempotent)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS recruiter_notes TEXT;

-- ============================================================
-- COMMENT: bio is a free-text blurb candidates can write about themselves.
-- skills is an array of skills candidates can self-tag (separate from required_skills on jobs).
-- recruiter_notes is private text only visible to the recruiter reviewing the application.
-- ============================================================
