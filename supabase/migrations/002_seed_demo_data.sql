-- =============================================================================
-- HireSignal — 002 Seed Demo Data (Direct SQL Migration)
-- NOTE: If you already ran `npm run seed`, your database is already populated!
-- This SQL script is provided if you want to seed directly via Supabase SQL Editor.
-- =============================================================================

-- Enable pgcrypto for password hashing if not already available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Insert into auth.users first to satisfy foreign key (profiles_id_fkey)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'recruiter@hiresignal.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sarah Jenkins (Lead Recruiter)","role":"recruiter"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'aryan.mehta@hiresignal.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Aryan Mehta","role":"candidate"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'priya.sharma@hiresignal.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Priya Sharma","role":"candidate"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rahul.gupta@hiresignal.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Rahul Gupta","role":"candidate"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sneha.patel@hiresignal.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sneha Patel","role":"candidate"}',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Insert into public.profiles
INSERT INTO public.profiles (id, role, full_name)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'recruiter', 'Sarah Jenkins (Lead Recruiter)'),
  ('00000000-0000-0000-0000-000000000002', 'candidate', 'Aryan Mehta'),
  ('00000000-0000-0000-0000-000000000003', 'candidate', 'Priya Sharma'),
  ('00000000-0000-0000-0000-000000000004', 'candidate', 'Rahul Gupta'),
  ('00000000-0000-0000-0000-000000000005', 'candidate', 'Sneha Patel')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 3. Insert 3 Technical Jobs
INSERT INTO public.jobs (id, recruiter_id, title, description, required_skills)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Senior Backend Engineer',
    'We are seeking a Senior Backend Engineer to scale our distributed microservices. You will architect high-throughput PostgreSQL databases, build resilient Node.js / TypeScript REST APIs, and manage container deployments using Docker and Kubernetes on AWS.',
    ARRAY['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Kubernetes', 'REST API', 'AWS']
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Frontend React Developer',
    'Join our core UI engineering team to build accessible, lightning-fast web applications. You will deliver responsive user interfaces using React, modern CSS, Redux Toolkit, and comprehensive automated testing with Jest and Cypress.',
    ARRAY['React', 'TypeScript', 'CSS', 'Redux', 'Jest', 'Cypress', 'Accessibility']
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Machine Learning Engineer',
    'Build and deploy state-of-the-art NLP and predictive evaluation models into production pipelines. You will develop ML models with PyTorch and scikit-learn, manage feature tracking with MLflow, and serve models via FastAPI on GCP.',
    ARRAY['Python', 'PyTorch', 'scikit-learn', 'MLflow', 'NLP', 'FastAPI', 'SQL', 'GCP']
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Scored Demo Applications
INSERT INTO public.applications (candidate_id, job_id, resume_url, resume_text, match_score, match_summary, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'https://placeholder.supabase.co/storage/v1/object/public/resumes/demo_resume.pdf',
    'Backend Engineer with extensive Node.js, TypeScript, PostgreSQL, Docker, Kubernetes, and AWS production experience.',
    100,
    'Candidate demonstrates exceptional alignment with all required backend technologies. Extensive experience designing distributed Node.js/TypeScript microservices, advanced PostgreSQL optimization, and production Kubernetes deployments on AWS.',
    'hired'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    'https://placeholder.supabase.co/storage/v1/object/public/resumes/demo_resume.pdf',
    'Senior Frontend Developer with 5+ years React, CSS design systems, Redux, Jest, and Cypress testing.',
    95,
    'Superb frontend candidate with 5+ years of React and modern CSS systems. Deep knowledge of web accessibility (WCAG AA), component architecture, and end-to-end testing with Jest and Cypress.',
    'hired'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000003',
    'https://placeholder.supabase.co/storage/v1/object/public/resumes/demo_resume.pdf',
    'Machine learning specialist in Python, PyTorch, scikit-learn, MLflow, and FastAPI model deployment.',
    92,
    'Strong machine learning background focusing on NLP and PyTorch model serving. Familiar with MLflow lifecycle management and FastAPI microservice integration on GCP.',
    'reviewed'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    'https://placeholder.supabase.co/storage/v1/object/public/resumes/demo_resume.pdf',
    'Backend developer with Node.js, TypeScript, PostgreSQL, and Docker foundations.',
    71,
    'Strong backend foundations in Node.js, TypeScript, PostgreSQL, and Docker. Missing cloud architecture (AWS) and container orchestration (Kubernetes) requirements.',
    'reviewed'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    'https://placeholder.supabase.co/storage/v1/object/public/resumes/demo_resume.pdf',
    'Full stack engineer with React, JavaScript, and CSS experience.',
    57,
    'Familiar with React and modern CSS basics, but lacks Redux state architecture and Cypress testing experience.',
    'pending'
  )
ON CONFLICT DO NOTHING;
