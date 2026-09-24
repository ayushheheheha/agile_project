# Sprint Retrospectives — HireSignal Recruitment Platform

> Course: Agile Development & DevOps  
> Team: Ayush Yadav  
> Project: HireSignal AI-Driven Recruitment Platform  

---

## Sprint 1 Retrospective
**Sprint Goal:** Auth, infrastructure & DevOps setup (20 Story Points + DevOps)

### What Went Well
- **Multi-Stage Containerization:** Successfully built multi-stage Dockerfiles for both backend (Node 20 Alpine) and frontend (Vite build -> Nginx Alpine), keeping final image footprint under 30MB for the frontend.
- **Automated CI Setup:** GitHub Actions CI workflow created early in the sprint, catching syntax and type mismatches immediately on feature branch pushes.
- **Database Isolation with RLS:** Supabase Row Level Security policies applied cleanly in migration `001_initial_schema.sql`, providing data security at the database layer.

### What Didn't Go Well / Impediments
- **Configuration Drift:** Managing duplicate `.env` files in both `backend/` and `frontend/` led to missing environment variables during local testing.
- **ESLint v9 Migration:** ESLint flat config (`eslint.config.js`) initially raised module type warnings with CommonJS backend code.

### Action Items for Next Sprint
| # | Action | Owner | Target |
|---|--------|-------|--------|
| 1 | Migrate backend linting to `.mjs` and configure single root `.env` loading in both Vite and Express | Ayush Yadav | Sprint 2 |
| 2 | Add pre-commit checks to verify Docker build before opening pull requests | Ayush Yadav | Sprint 2 |

---

## Sprint 2 Retrospective
**Sprint Goal:** Job posting, resume upload & Gemini integration (28 Story Points)

### What Went Well
- **In-Memory Streaming:** Multer memory storage allowed streaming PDF buffers directly to `pdf-parse` for text extraction and Supabase Storage without writing temporary files to disk.
- **Prompt Engineering Quality:** Google Gemini 1.5 Flash demonstrated high evaluation precision when guided by strict JSON schema instructions.
- **Clean Component System:** React UI implemented with a dense, tabular internal-tool aesthetic without unnecessary marketing overhead.

### What Didn't Go Well / Impediments
- **Gemini Free-Tier Rate Limits:** Bulk candidate evaluations triggered HTTP 429 errors from Google Gemini API (~15 requests per minute limit).
- **Markdown Code Fence Inconsistencies:** The LLM occasionally wrapped its JSON output in ````json ... ```` fences, causing `JSON.parse` syntax errors.

### Action Items for Next Sprint
| # | Action | Owner | Target |
|---|--------|-------|--------|
| 1 | Build a resilient markdown stripper and 5-second exponential backoff retry for Gemini API calls | Ayush Yadav | Sprint 3 |
| 2 | Design a local keyword-overlap fallback algorithm that guarantees 100% service uptime even if AI is unavailable | Ayush Yadav | Sprint 3 |

---

## Sprint 3 Retrospective
**Sprint Goal:** AI fallback, recruiter review dashboard & project polish (24 Story Points)

### What Went Well
- **Zero-Downtime Fallback Architecture:** The local keyword-overlap fallback scorer worked seamlessly. Regardless of API key absence, rate limits, or network failures, applicant evaluations consistently succeeded.
- **Jest Mocking & Test Coverage:** Comprehensive test suite achieved 100% pass rate across 14 test scenarios with external AI dependencies fully mocked.
- **Recruiter Applicant Ranking:** Clean tabular dashboard allowing recruiters to view applicants sorted by AI match score and update hiring status (`pending`, `reviewed`, `hired`, `rejected`) in real-time.
- **Interactive Simulation Mode:** Created `simulate.js` and database seeder script to enable zero-config demonstrations for evaluators.

### What Didn't Go Well / Impediments
- **GitHub Token Scope in CD:** Pushing to GitHub Container Registry initially required manual PAT configuration. Refactored to leverage GitHub's native `GITHUB_TOKEN` with `packages: write` permissions.

### Action Items (Post-Project / Future Work)
| # | Action | Owner | Target |
|---|--------|-------|--------|
| 1 | Implement Supabase Realtime WebSocket subscriptions for instant recruiter status notifications | Ayush Yadav | Future |
| 2 | Integrate `pgvector` for semantic candidate embeddings and vector search across candidate pools | Ayush Yadav | Future |

---

## Overall Project Retrospective

### Summary of Velocity

| Sprint | Planned | Delivered | Velocity % | Notes |
|--------|---------|-----------|------------|-------|
| 1 | 20 | 20 | 100% | Foundation: Auth, Supabase DB schema, Docker, CI/CD |
| 2 | 28 | 28 | 100% | Core Features: Jobs, PDF upload, Gemini integration |
| 3 | 24 | 24 | 100% | Resiliency: AI fallback, recruiter dashboard, demo seeder |
| **Total** | **72** | **72** | **100%** | **All 5 Epics Delivered to Specification** |

### Key Takeaways
1. **DevOps as a Foundation, Not an Afterthought:** Setting up automated linting, unit testing, and Docker builds in Sprint 1 dramatically reduced integration bugs in later sprints.
2. **Graceful Degradation in AI Products:** Generative AI APIs can be unpredictable due to rate limits and network latency. Designing a robust fallback mechanism is essential for enterprise-grade reliability.
3. **Strict Definition of Done:** Enforcing that every story meets code style, automated testing, and container build criteria kept technical debt minimal throughout the course.

### Technical Debt Identified
1. **Token Refresh Synchronization:** While tokens are now synced across `localStorage` and Supabase client, adding an explicit background token refresh interceptor will improve long-session resilience.
2. **Dynamic Chunk Splitting:** Vite bundle size for the frontend could be further reduced by lazy-loading recruiter and candidate sub-pages via `React.lazy()`.
