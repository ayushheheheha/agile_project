# Sprint Plan — HireSignal Recruitment Platform

> Course: Agile Development & DevOps  
> Sprint Length: 1 week  
> Velocity Target: ~24 story points per sprint  
> Team Size: 1 developer (course project)

---

## Sprint 1 — Foundation: Auth, Infrastructure & DevOps

**Sprint Goal:** Get the project running end-to-end with authentication, database schema, and all DevOps infrastructure (Docker, CI/CD) in place. A recruiter can sign up, log in, and reach their dashboard; a candidate can sign up and log in.

**Dates:** Week 1

### Stories in Sprint 1

| ID | Story Summary | Points | Notes |
|----|---------------|--------|-------|
| A-1 | Candidate signup with role selection | 3 | Backend POST /api/auth/signup |
| A-2 | Recruiter signup | 2 | Same endpoint, different role |
| A-3 | Login returns session JWT | 3 | POST /api/auth/login |
| A-4 | Role-based redirect after login | 1 | Frontend routing logic |
| A-5 | Protected routes redirect unauthenticated users | 2 | ProtectedRoute component |
| A-6 | JWT middleware validates token + role | 3 | auth.js middleware + requireRole |
| B-5 | RLS policies for job data isolation | 3 | SQL migration 001 |
| E-6 | RLS policies for application data isolation | 3 | SQL migration 001 |
| — | Docker + docker-compose | — | Backend Dockerfile, frontend Dockerfile, compose file |
| — | CI workflow (lint + test + docker build) | — | .github/workflows/ci.yml |
| — | CD workflow (push to GHCR on main) | — | .github/workflows/cd.yml |

**Sprint 1 Total: 20 points** *(DevOps tasks are non-story work)*

### Sprint 1 Definition of Done
- [ ] `docker-compose up` starts both services without errors
- [ ] CI pipeline passes on a feature branch PR
- [ ] Signup → login → redirect works for both roles
- [ ] 401 returned for requests with missing/invalid JWT
- [ ] SQL migrations apply cleanly on a fresh Supabase project

---

## Sprint 2 — Core Features: Job Posting & Resume Submission

**Sprint Goal:** Recruiters can post jobs; candidates can browse jobs, view details, and submit PDF resume applications. The Gemini scoring service is integrated and returns a score (or local fallback).

**Dates:** Week 2

### Stories in Sprint 2

| ID | Story Summary | Points | Notes |
|----|---------------|--------|-------|
| B-1 | Recruiter creates a job posting | 3 | POST /api/jobs, RecruiterDashboard form |
| B-2 | Recruiter sees only own jobs in dashboard | 2 | Frontend filter by recruiter_id |
| B-3 | Candidate browses all jobs in a table | 3 | GET /api/jobs, JobList page |
| B-4 | Candidate views job detail + skills | 2 | GET /api/jobs/:id, JobDetail page |
| C-1 | Candidate uploads PDF resume on apply | 3 | POST /api/applications, multer |
| C-2 | Backend extracts text from PDF | 2 | pdf-parse integration |
| C-3 | PDF uploaded to Supabase Storage | 3 | supabaseAdmin.storage.upload |
| C-5 | "Scoring resume…" loading state in UI | 1 | Frontend spinner during apply |
| C-6 | Duplicate application returns 409 | 2 | UNIQUE constraint + error handling |
| D-1 | Gemini 1.5 Flash scoring integration | 5 | geminiScoring.js scoreResume function |
| D-2 | Strip markdown fences from Gemini response | 2 | stripCodeFences helper + Jest test |

**Sprint 2 Total: 28 points**

### Sprint 2 Definition of Done
- [ ] Recruiter can post a job through the UI and it appears in the jobs table
- [ ] Candidate can upload a PDF and receive a score response (or fallback score)
- [ ] "Scoring resume…" loading indicator shown during Gemini API call
- [ ] Duplicate applications rejected with 409
- [ ] PDF stored in Supabase Storage with correct path

---

## Sprint 3 — AI Matching, Recruiter Review & Polish

**Sprint Goal:** Complete the Gemini fallback/retry logic and all recruiter review features. Candidates see scores on their dashboard. All Jest tests pass. Project is fully demo-ready.

**Dates:** Week 3

### Stories in Sprint 3

| ID | Story Summary | Points | Notes |
|----|---------------|--------|-------|
| D-3 | Local keyword fallback when Gemini returns invalid JSON | 3 | Jest test: malformed JSON → fallback |
| D-4 | Retry once on 429 rate-limit, then fallback | 3 | Jest test: rate-limit retry |
| D-5 | Show score card after application submit | 3 | JobDetail post-apply result UI |
| D-6 | Clamp score to [0, 100] | 1 | Jest test: score=150 clamped to 100 |
| E-1 | Recruiter views applicants sorted by score | 3 | GET /api/jobs/:id/applications, RecruiterApplicants |
| E-2 | Applicant table shows name, score, summary, date | 2 | UI column rendering |
| E-3 | Recruiter updates applicant status via dropdown | 3 | PATCH /api/applications/:id/status |
| E-4 | Backend enforces job ownership for applicants | 2 | 403 if recruiter doesn't own job |
| E-5 | Candidate sees all applications in dashboard | 3 | GET /api/applications/mine, CandidateDashboard |
| C-4 | "View PDF" link in applicants table | 1 | resume_url link in RecruiterApplicants |

**Sprint 3 Total: 24 points**

### Sprint 3 Definition of Done
- [ ] All 7 Jest tests pass (`npm test` in `/backend`)
- [ ] Gemini rate-limit retry behaviour confirmed in test
- [ ] Recruiter can see all applicants ranked by score
- [ ] Status dropdown updates DB and reflects in UI without reload
- [ ] Candidate dashboard shows all applications with score and status
- [ ] `docker-compose up` starts cleanly; full user flow works end-to-end
- [ ] README complete with setup instructions, API table, and DevOps section

---

## Sprint Velocity Summary

| Sprint | Points Planned | Focus |
|--------|---------------|-------|
| 1 | 20 + DevOps | Auth, DB schema, Docker, CI/CD |
| 2 | 28 | Jobs, resume upload, Gemini integration |
| 3 | 24 | AI fallback, recruiter dashboard, candidate dashboard |
| **Total** | **72** | |
