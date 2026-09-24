# HireSignal — AI-Driven Recruitment & Candidate Evaluation Platform

> **Course Project:** Agile Development & DevOps  
> **Stack:** Node.js · Express · React (Vite) · Supabase · Google Gemini AI · Docker · GitHub Actions

---

## Overview

HireSignal is a full-stack internal recruitment tool that allows **recruiters** to post jobs and **candidates** to apply by uploading PDF resumes. Each application is automatically scored 0–100 by the **Google Gemini 1.5 Flash** AI model, which compares the resume against the job description and required skills. Recruiters see applicants ranked by AI score and can update their status through a simple dashboard.

The project is deliberately built with a dense, functional UI (no gradients, no animations, no marketing aesthetics) — it is designed to feel like an internal engineering tool.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                            │
│  ┌──────────────────┐        ┌──────────────────────────┐  │
│  │  frontend:80     │        │   backend:4000           │  │
│  │  nginx + React   │──/api/─▶  Express REST API        │  │
│  │  (Vite build)    │        │  ┌────────────────────┐  │  │
│  └──────────────────┘        │  │  Routes            │  │  │
│                              │  │  · /api/auth       │  │  │
│                              │  │  · /api/jobs       │  │  │
│                              │  │  · /api/applications│  │  │
│                              │  └────────┬───────────┘  │  │
│                              │           │              │  │
│                              │  ┌────────▼───────────┐  │  │
│                              │  │  Services          │  │  │
│                              │  │  · geminiScoring   │  │  │
│                              │  │  · supabaseClient  │  │  │
│                              │  └────────┬───────────┘  │  │
│                              └───────────┼──────────────┘  │
└───────────────────────────────────────────┼────────────────┘
                                            │
                              ┌─────────────▼─────────────┐
                              │        Supabase            │
                              │  · Postgres DB             │
                              │  · Auth (JWT)              │
                              │  · Storage (resumes)       │
                              └───────────────────────────┘
                                            │
                              ┌─────────────▼─────────────┐
                              │    Google Gemini API       │
                              │  gemini-1.5-flash (free)   │
                              └───────────────────────────┘
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A [Supabase](https://supabase.com/) account (free tier)
- A [Google AI Studio](https://ai.google.dev/) account for the Gemini API key (free tier)

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **API keys** (Settings → API):
   - `SUPABASE_URL` — the project URL (e.g. `https://abc123.supabase.co`)
   - `SUPABASE_ANON_KEY` — safe for browser use
   - `SUPABASE_SERVICE_ROLE_KEY` — secret, backend only
3. In **Storage** (left sidebar), create a new bucket named `resumes`. Set it to **Public** (or use signed URLs — see note below).
4. Run the SQL migration in **SQL Editor**:
   ```sql
   -- Copy and paste the contents of:
   -- supabase/migrations/001_initial_schema.sql
   ```

### 2. Get a Gemini API Key

1. Visit [ai.google.dev](https://ai.google.dev/) and sign in
2. Click **Get API key** → Create API key
3. Note the key — this is your `GEMINI_API_KEY`

> **Free Tier Note:** The free tier of Gemini 1.5 Flash has rate limits (~15 RPM, 1M TPM). If you hit rate limits during a demo, the scoring service automatically falls back to a local keyword-overlap scorer, so the application still completes. See [Rate Limits & Fallback](#gemini-rate-limits--fallback-scoring) below.

### 3. Configure Environment (Single `.env` in Project Root)

You only need **one** `.env` file placed at the root of the project. Both backend and frontend automatically load from it:

```bash
# In the project root:
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:
- `SUPABASE_URL` and `VITE_SUPABASE_URL` (same URL)
- `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY` (same public anon key)
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (optional — omit or leave blank to use the built-in local scorer)

---

### 4. Run with Docker Compose

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:80
- **Backend API:** http://localhost:4000
- **Health check:** http://localhost:4000/health

The nginx frontend container proxies all `/api/*` requests to the backend container automatically.

---

### 5. Run Locally (Without Docker)

Open two terminals from the project root:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev     # starts on port 4000 (loads root .env automatically)
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev     # starts on port 5173 (loads root .env automatically, proxies /api -> localhost:4000)
```

Visit **http://localhost:5173** in your browser.

---

## Full Platform Simulation (Zero-Config Demo)

If you don't have a Gemini API key or a live Supabase instance set up yet, you can run the full end-to-end simulation script. It sets up an in-memory platform, creates recruiters, posts jobs, creates candidates with distinct resumes, evaluates applications through the scoring engine, ranks applicants on the recruiter dashboard, and updates application statuses:

```bash
cd backend
npm run simulate
# or: node simulate.js
```

**What the simulation executes step-by-step:**
1. **Recruiter signs up** and posts 3 realistic tech jobs (Backend, Frontend, ML).
2. **5 candidates sign up** with varied resumes (perfect matches, partial matches, mismatches).
3. **8 applications submitted**: candidates apply with full resume text.
4. **Scoring engine executes**: evaluates candidates against required skills and outputs match scores (0–100), matched skills, missing skills, and evaluation summaries.
5. **Recruiter dashboard**: ranks all applicants per job by score.
6. **Recruiter decisions**: updates candidate status (`hired`, `reviewed`, `rejected`).
7. **Candidate dashboards**: shows each candidate's view of their submissions and statuses.
8. **Summary statistics**: prints platform analytics table (averages, pass rates, etc.).

---

## Running Backend Tests

```bash
cd backend
npm install
npm test                  # run Jest tests
npm run test:coverage     # with coverage report
```

The Gemini client is **fully mocked** in tests — no real API calls are made. Tests run with placeholder Supabase env vars.

**Test coverage includes:**
- `stripCodeFences` — strips ` ```json ``` ` blocks from Gemini responses
- `localKeywordScore` — all edge cases (no skills, full match, zero match)
- `scoreResume` — successful Gemini parse, code fence stripping, malformed JSON fallback, API error fallback, rate-limit retry (both attempts), missing API key, score clamping

---

## API Endpoint Reference

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/auth/signup` | — | — | Create account (email, password, full_name, role) |
| `POST` | `/api/auth/login` | — | — | Sign in, returns session JWT |
| `GET` | `/health` | — | — | Health check |
| `POST` | `/api/jobs` | JWT | recruiter | Create a job posting |
| `GET` | `/api/jobs` | JWT | any | List all jobs |
| `GET` | `/api/jobs/:id` | JWT | any | Get job detail |
| `GET` | `/api/jobs/:id/applications` | JWT | recruiter | List applicants for a job (must own job), sorted by score DESC |
| `POST` | `/api/applications` | JWT | candidate | Submit application with PDF resume (multipart) |
| `GET` | `/api/applications/mine` | JWT | candidate | Get own applications with status and score |
| `PATCH` | `/api/applications/:id/status` | JWT | recruiter | Update application status (must own the job) |

### Authentication

All protected endpoints require:
```
Authorization: Bearer <supabase-access-token>
```

The frontend automatically injects this header via the `api.js` client module.

---

## Gemini Rate Limits & Fallback Scoring

The **Gemini 1.5 Flash free tier** has the following limits (as of 2024):
- **15 requests per minute (RPM)**
- **1 million tokens per day**

**What happens when rate limits are hit:**

1. The backend detects a `429` or quota error from the Gemini API
2. It waits **5 seconds** and retries once
3. If the retry also fails, it transparently falls back to the **local keyword-overlap scorer**
4. The local scorer counts how many required skills appear (case-insensitive) in the resume text and returns `(matched / total) * 100` as the score
5. The response includes a `summary` noting that AI scoring was unavailable
6. **The application always completes** — the candidate and recruiter experience is never blocked by AI API failures

This same fallback is triggered if `GEMINI_API_KEY` is not set (useful for demo/testing without an API key).

---

## Project Structure

```
/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js          # POST /api/auth/signup, /login
│   │   │   ├── jobs.js          # CRUD + applicants list
│   │   │   └── applications.js  # Apply, mine, update status
│   │   ├── services/
│   │   │   ├── geminiScoring.js # Gemini AI + fallback scorer
│   │   │   └── supabaseClient.js# Admin + anon Supabase clients
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT validation + requireRole
│   │   └── server.js            # Express app entry point
│   ├── tests/
│   │   └── geminiScoring.test.js# Jest unit tests (mocked)
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthContext.jsx   # Session management
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── TopNav.jsx
│   │   │   └── ui.jsx           # Shared: badges, alerts, etc.
│   │   ├── lib/
│   │   │   ├── supabaseClient.js
│   │   │   └── api.js           # fetch wrapper with JWT injection
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── JobList.jsx
│   │   │   ├── JobDetail.jsx    # Apply + score display
│   │   │   ├── RecruiterDashboard.jsx
│   │   │   ├── RecruiterApplicants.jsx
│   │   │   └── CandidateDashboard.jsx
│   │   ├── App.jsx              # React Router routes
│   │   ├── main.jsx
│   │   └── index.css            # Complete design system
│   ├── nginx.conf               # SPA routing + /api proxy
│   ├── Dockerfile               # Multi-stage: build + nginx
│   └── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Tables + RLS policies
│
├── docs/
│   ├── backlog.md       # Epics + user stories + story points
│   ├── sprint-plan.md   # 3 sprints with goals + DOD
│   └── retrospective.md # Template (fill after each sprint)
│
├── .github/
│   └── workflows/
│       ├── ci.yml       # Lint + Test + Docker build
│       └── cd.yml       # Build + push to GHCR on main
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Agile & DevOps (Course Submission)

### Sprint Structure

This project was planned across **3 one-week sprints** using a Fibonacci story point scale (1, 2, 3, 5, 8).

| Sprint | Goal | Story Points |
|--------|------|-------------|
| **Sprint 1** | Auth, DB schema, Docker, CI/CD pipeline | 20 + DevOps |
| **Sprint 2** | Job posting, resume upload, Gemini integration | 28 |
| **Sprint 3** | AI fallback, recruiter review dashboard, candidate dashboard | 24 |
| **Total** | | **72 points** |

See [`docs/backlog.md`](./docs/backlog.md) for the full backlog and [`docs/sprint-plan.md`](./docs/sprint-plan.md) for detailed sprint plans.

### CI/CD Pipeline Stages

#### Continuous Integration (`ci.yml`) — triggers on push/PR to `main` or `develop`

```
Push / PR
    │
    ▼
[Job 1: ESLint]
    · npm ci + npm run lint (backend)
    · npm ci + npm run lint (frontend)
    │
    ▼ (on success)
[Job 2: Jest Tests]
    · npm run test:coverage (backend only)
    · Gemini API is mocked — no real calls
    · Coverage report uploaded as artifact
    │
    ▼ (on success)
[Job 3: Docker Build]
    · docker/build-push-action (push: false)
    · Validates both Dockerfiles build successfully
    · Uses GitHub Actions cache for speed
```

#### Continuous Deployment (`cd.yml`) — triggers on merge to `main`

```
Merge to main
    │
    ▼
[Authenticate to GHCR]
    · Uses GHCR_TOKEN secret (PAT with write:packages)
    │
    ▼
[Build & Push backend image]
    · ghcr.io/<owner>/hiresignal-backend:<sha>
    · ghcr.io/<owner>/hiresignal-backend:latest
    │
    ▼
[Build & Push frontend image]
    · ghcr.io/<owner>/hiresignal-frontend:<sha>
    · ghcr.io/<owner>/hiresignal-frontend:latest
    · VITE_ vars injected from repository secrets at build time
```

#### Setting Up GHCR_TOKEN

1. GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Create token with scope: `write:packages`
3. Repository → Settings → Secrets and variables → Actions → New secret
4. Name: `GHCR_TOKEN`, Value: your PAT
5. Also add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as secrets (used for frontend build)

---

## Design Decisions

- **No ORM:** Direct Supabase JS client calls keep the backend lean and the SQL transparent for course review.
- **Memory storage for uploads:** Multer uses memory storage so PDF bytes are available for both `pdf-parse` and Supabase Storage upload without writing temp files.
- **AI fallback is not an afterthought:** The `scoreResume` function is designed so every exit path (missing key, API error, bad JSON, rate limit) returns the same shape `{ score, matched_skills, missing_skills, summary }` — the rest of the codebase never needs to check if AI was used.
- **RLS as the last line of defence:** Even if backend auth middleware is misconfigured, Supabase RLS policies prevent cross-user data access at the database level.
