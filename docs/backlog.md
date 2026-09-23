# Product Backlog — HireSignal Recruitment Platform

> Course: Agile Development & DevOps  
> Sprint Duration: 1 week  
> Story Point Scale: Fibonacci (1, 2, 3, 5, 8)

---

## Epic 1: Authentication & Roles

**Goal:** Users can create accounts as either a recruiter or a candidate, and the system enforces role-based access throughout.

| ID   | User Story | Acceptance Criteria | Points |
|------|------------|---------------------|--------|
| A-1  | As a **candidate**, I want to sign up with my name, email, password, and role selection, so that I have an account to apply for jobs. | Signup form validates required fields; account created in Supabase Auth; profile row inserted with correct role. | 3 |
| A-2  | As a **recruiter**, I want to sign up with role "recruiter", so that I can post jobs and view applicants. | Same as A-1; recruiter-specific role stored; dashboard redirect after signup. | 2 |
| A-3  | As a **user**, I want to log in with email and password and receive a session JWT, so that I can make authenticated API calls. | Login returns access\_token; token stored in Supabase JS client; subsequent API calls include Bearer header. | 3 |
| A-4  | As a **user**, I want to be redirected to my role-appropriate dashboard after login/signup, so that I land in the right place immediately. | Recruiter → `/dashboard/recruiter`; Candidate → `/dashboard/candidate`. | 1 |
| A-5  | As a **user**, I want protected routes to redirect me to `/login` if I am not authenticated, so that unauthorised access is prevented. | Unauthenticated requests to `/dashboard/*` or `/jobs` redirect to login page. | 2 |
| A-6  | As a **backend**, I want all API endpoints to validate Supabase JWTs and check the user's role, so that unauthorised calls are rejected with 401/403. | Middleware tests: missing token → 401; wrong role → 403; valid token → req.user populated. | 3 |

**Epic 1 Total: 14 points**

---

## Epic 2: Job Posting Management

**Goal:** Recruiters can create and view job postings; all authenticated users can browse open positions.

| ID   | User Story | Acceptance Criteria | Points |
|------|------------|---------------------|--------|
| B-1  | As a **recruiter**, I want to create a job posting with a title, description, and comma-separated required skills, so that candidates can find and apply to it. | POST `/api/jobs` creates a row in `jobs` table; skills stored as `text[]`; 201 returned. | 3 |
| B-2  | As a **recruiter**, I want to see only my own job postings in my dashboard, so that I am not confused by other recruiters' jobs. | GET `/api/jobs` returns all jobs; frontend filters by `recruiter_id`. | 2 |
| B-3  | As a **candidate**, I want to browse all open job postings in a table showing title, recruiter name, required skills, and date, so that I can quickly identify relevant roles. | GET `/api/jobs` returns jobs joined with recruiter profile; table renders with correct columns. | 3 |
| B-4  | As a **candidate**, I want to click on a job to view its full description and required skills, so that I can decide whether to apply. | GET `/api/jobs/:id` returns job detail; frontend renders description and skill tags. | 2 |
| B-5  | As a **system**, I want Supabase RLS policies to prevent recruiter A from modifying recruiter B's jobs, so that data isolation is enforced at the database level. | Direct Supabase queries from a different user's JWT cannot update/delete another recruiter's job. | 3 |

**Epic 2 Total: 13 points**

---

## Epic 3: Resume Submission & Storage

**Goal:** Candidates can upload PDF resumes which are stored securely, and text is extracted for AI analysis.

| ID   | User Story | Acceptance Criteria | Points |
|------|------------|---------------------|--------|
| C-1  | As a **candidate**, I want to upload a PDF resume when applying to a job, so that my qualifications are submitted alongside my application. | POST `/api/applications` accepts multipart form with `job_id` + PDF file; file validated as PDF; max 10 MB. | 3 |
| C-2  | As a **system**, I want the backend to extract text from the uploaded PDF using `pdf-parse`, so that the text can be analysed by the AI scoring service. | `pdfData.text` is populated for valid PDFs; empty string used as fallback if parsing fails. | 2 |
| C-3  | As a **system**, I want the PDF to be uploaded to Supabase Storage bucket "resumes" under path `{candidate_id}/{job_id}/{timestamp}.pdf`, so that files are organised and retrievable. | Storage upload completes; public URL stored in `applications.resume_url`. | 3 |
| C-4  | As a **recruiter**, I want to see a "View PDF" link for each applicant in the applicants table, so that I can open the original resume in a new tab. | `resume_url` from Supabase Storage displayed as a link; opens correct PDF. | 1 |
| C-5  | As a **candidate**, I want a "Scoring resume…" loading state displayed while my application is processing, so that I know the system is working. | Frontend shows spinner and text "Scoring resume…" during the POST `/api/applications` request. | 1 |
| C-6  | As a **system**, I want the `applications` table to enforce a unique constraint on `(job_id, candidate_id)`, so that a candidate cannot apply to the same job twice. | Duplicate insert returns HTTP 409; frontend shows a meaningful error message. | 2 |

**Epic 3 Total: 12 points**

---

## Epic 4: Gemini-Powered Matching Engine

**Goal:** Each application is scored 0–100 by Google Gemini AI, with matched/missing skills and a summary, with a local fallback if the API is unavailable.

| ID   | User Story | Acceptance Criteria | Points |
|------|------------|---------------------|--------|
| D-1  | As a **system**, I want the `scoreResume` function to call the Gemini 1.5 Flash model with a structured prompt, so that I receive a JSON score object. | Gemini is called with job title, description, skills, and resume text; response parsed to `{ score, matched_skills, missing_skills, summary }`. | 5 |
| D-2  | As a **system**, I want the scoring service to strip markdown code fences from Gemini's response before parsing JSON, so that responses wrapped in ` ```json ``` ` blocks don't crash the parser. | `stripCodeFences()` unit tested; malformed fenced responses parsed correctly. | 2 |
| D-3  | As a **system**, I want the scoring service to fall back to a local keyword-overlap scorer if Gemini returns unparseable JSON, so that the application always completes. | Jest test: mock returns non-JSON string → `localKeywordScore` result returned; score is numeric 0–100. | 3 |
| D-4  | As a **system**, I want the scoring service to retry once after a 5-second delay on 429 rate-limit errors, so that transient rate limits don't fail the request. | Jest test: mock throws 429 error → retry after delay → still fails → local fallback returned. | 3 |
| D-5  | As a **candidate**, I want to see my AI match score, matched skills, missing skills, and a 2-sentence summary immediately after submitting my application, so that I understand my fit for the role. | After apply completes, score card displayed in UI with all four fields. | 3 |
| D-6  | As a **system**, I want the score to be clamped to [0, 100] and stored as `numeric(5,2)` in the database, so that out-of-range values from AI don't cause errors. | Values > 100 clamped to 100; values < 0 clamped to 0 before insert. Jest test covers score=150 case. | 1 |

**Epic 4 Total: 17 points**

---

## Epic 5: Recruiter Review Dashboard

**Goal:** Recruiters can view and rank applicants for each job, and update application statuses.

| ID   | User Story | Acceptance Criteria | Points |
|------|------------|---------------------|--------|
| E-1  | As a **recruiter**, I want to see all applicants for a job I own, sorted by AI match score descending, so that the best candidates appear first. | GET `/api/jobs/:id/applications` returns applications ordered by `match_score DESC`; table renders with score badges. | 3 |
| E-2  | As a **recruiter**, I want to see each applicant's name, score, match summary, and applied date in the applicants table, so that I can quickly assess candidates. | All four fields rendered per row; score displayed as colour-coded badge (green ≥70, blue ≥40, red <40). | 2 |
| E-3  | As a **recruiter**, I want to update an applicant's status (pending → reviewed → rejected → hired) via an inline dropdown, so that I can track the hiring pipeline without leaving the page. | PATCH `/api/applications/:id/status` updates DB; UI reflects new status without page reload; ownership verified server-side. | 3 |
| E-4  | As a **recruiter**, I want the backend to verify that I own the job before showing its applicants or updating statuses, so that I cannot see or modify other recruiters' data. | Requests with a valid JWT but wrong recruiter\_id return 403. | 2 |
| E-5  | As a **candidate**, I want to see all my applications with their status and AI score in my dashboard, so that I can track my job search progress. | GET `/api/applications/mine` returns candidate's applications with job title, status, score; table rendered. | 3 |
| E-6  | As a **system**, I want RLS policies to enforce that candidates can only read their own applications and recruiters can only read applications for their own jobs, so that cross-user data leakage is impossible. | RLS policies defined in migration 001; direct Supabase queries from wrong user return empty/error. | 3 |

**Epic 5 Total: 16 points**

---

## Summary

| Epic | Title | Total Points |
|------|-------|-------------|
| 1 | Authentication & Roles | 14 |
| 2 | Job Posting Management | 13 |
| 3 | Resume Submission & Storage | 12 |
| 4 | Gemini-Powered Matching Engine | 17 |
| 5 | Recruiter Review Dashboard | 16 |
| **Total** | | **72 points** |
