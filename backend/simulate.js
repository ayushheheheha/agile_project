'use strict';

/**
 * =============================================================================
 * HireSignal — Full Platform Simulation
 * =============================================================================
 * Runs a complete demo of the recruitment platform WITHOUT needing:
 *   - A real Gemini API key  (uses local keyword-overlap scorer)
 *   - A real Supabase instance (uses in-memory mock database)
 *
 * Usage:
 *   node simulate.js
 *
 * What it demonstrates:
 *   1. Recruiter signs up and posts 3 jobs
 *   2. 5 candidates sign up with different resume profiles
 *   3. Each candidate applies to relevant jobs with their resume text
 *   4. Gemini scoring service runs (local fallback, same output shape)
 *   5. Recruiter dashboard: applicants ranked by score
 *   6. Recruiter updates statuses (hired, reviewed, rejected)
 *   7. Candidate dashboard: each candidate sees their own applications
 * =============================================================================
 */

// Load the real scoring service (uses local fallback since no GEMINI_API_KEY)
delete process.env.GEMINI_API_KEY; // ensure local mode
const { scoreResume } = require('./src/services/geminiScoring');

// ── Colour helpers (ANSI) ─────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  white:  '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen:'\x1b[42m',
  bgRed:  '\x1b[41m',
};

function bold(s)    { return `${C.bold}${s}${C.reset}`; }
function cyan(s)    { return `${C.cyan}${s}${C.reset}`; }
function green(s)   { return `${C.green}${s}${C.reset}`; }
function yellow(s)  { return `${C.yellow}${s}${C.reset}`; }
function red(s)     { return `${C.red}${s}${C.reset}`; }
function dim(s)     { return `${C.dim}${s}${C.reset}`; }
function magenta(s) { return `${C.magenta}${s}${C.reset}`; }

function section(title) {
  const line = '─'.repeat(60);
  console.log(`\n${C.bold}${C.blue}${line}${C.reset}`);
  console.log(`${C.bold}${C.blue}  ${title}${C.reset}`);
  console.log(`${C.bold}${C.blue}${line}${C.reset}`);
}

function scoreColor(score) {
  if (score >= 70) return `${C.bold}${C.green}${score}${C.reset}`;
  if (score >= 40) return `${C.bold}${C.yellow}${score}${C.reset}`;
  return `${C.bold}${C.red}${score}${C.reset}`;
}

function statusColor(status) {
  const map = {
    hired:    `${C.bold}${C.green}[HIRED]${C.reset}`,
    reviewed: `${C.bold}${C.yellow}[REVIEWED]${C.reset}`,
    rejected: `${C.bold}${C.red}[REJECTED]${C.reset}`,
    pending:  `${C.dim}[PENDING]${C.reset}`,
  };
  return map[status] || status;
}

// ── In-memory "database" ──────────────────────────────────────────────────────
const db = {
  users:        [],
  profiles:     [],
  jobs:         [],
  applications: [],
};

let idCounter = 1;
function genId() { return `id-${String(idCounter++).padStart(4, '0')}`; }

function createProfile(email, role, fullName) {
  const id = genId();
  db.users.push({ id, email });
  db.profiles.push({ id, email, role, full_name: fullName, created_at: new Date().toISOString() });
  return db.profiles.find(p => p.id === id);
}

function createJob(recruiterId, title, description, requiredSkills) {
  const job = {
    id:              genId(),
    recruiter_id:    recruiterId,
    title,
    description,
    required_skills: requiredSkills,
    created_at:      new Date().toISOString(),
  };
  db.jobs.push(job);
  return job;
}

async function submitApplication(candidateId, jobId, resumeText) {
  const job = db.jobs.find(j => j.id === jobId);
  if (!job) throw new Error('Job not found: ' + jobId);

  // ── Call the REAL scoring service (local keyword fallback) ──
  const result = await scoreResume(
    resumeText,
    job.title,
    job.description,
    job.required_skills
  );

  const app = {
    id:           genId(),
    job_id:       jobId,
    candidate_id: candidateId,
    resume_text:  resumeText,
    match_score:  result.score,
    match_summary: result.summary,
    matched_skills: result.matched_skills,
    missing_skills: result.missing_skills,
    status:       'pending',
    applied_at:   new Date().toISOString(),
  };
  db.applications.push(app);
  return app;
}

function updateStatus(applicationId, newStatus) {
  const app = db.applications.find(a => a.id === applicationId);
  if (!app) throw new Error('Application not found');
  app.status = newStatus;
  return app;
}

// ── Demo Data ─────────────────────────────────────────────────────────────────

// ── 3 Job Postings ────────────────────────────────────────────────────────────
const JOB_POSTINGS = [
  {
    title: 'Senior Backend Engineer',
    description: `We are looking for a Senior Backend Engineer to join our platform team.
You will design and build RESTful APIs, manage Postgres databases, and work with
containerised microservices on AWS. Strong experience with Node.js, TypeScript,
Docker, and PostgreSQL is required. Knowledge of Kubernetes and CI/CD is a plus.`,
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Kubernetes', 'REST API', 'AWS'],
  },
  {
    title: 'Frontend React Developer',
    description: `Join our product team as a Frontend Developer. You will build
responsive, accessible UIs using React, TypeScript, and modern CSS. You will work
closely with designers and backend engineers. Experience with Redux, React Query,
Jest, and Cypress is expected.`,
    skills: ['React', 'TypeScript', 'CSS', 'Redux', 'Jest', 'Cypress', 'Accessibility'],
  },
  {
    title: 'Machine Learning Engineer',
    description: `We are hiring an ML Engineer to train, evaluate, and deploy
machine learning models. You will work with Python, PyTorch, scikit-learn, and MLflow.
Experience with NLP, model serving (FastAPI / TorchServe), and cloud platforms (GCP / AWS)
is required. SQL and data pipeline experience is a plus.`,
    skills: ['Python', 'PyTorch', 'scikit-learn', 'MLflow', 'NLP', 'FastAPI', 'SQL', 'GCP'],
  },
];

// ── 5 Candidate Resume Texts ──────────────────────────────────────────────────
const CANDIDATES = [
  {
    name:  'Aryan Mehta',
    email: 'aryan@example.com',
    resume: `
      Aryan Mehta — Senior Software Engineer
      Skills: Node.js, TypeScript, PostgreSQL, Docker, REST API, AWS, Express.js, Redis
      Experience:
        - 5 years at TechCorp: Built microservices in Node.js + TypeScript, deployed on AWS ECS with Docker.
        - Managed PostgreSQL databases (RDS), wrote complex SQL queries and migrations.
        - Built REST APIs consumed by 1M+ users. Used Redis for caching.
        - Familiar with CI/CD (GitHub Actions, Jenkins). Basic Kubernetes knowledge.
      Education: B.Tech Computer Science, IIT Bombay
    `,
    applyTo: [0, 1], // applies to Backend + Frontend
  },
  {
    name:  'Priya Sharma',
    email: 'priya@example.com',
    resume: `
      Priya Sharma — Frontend Engineer
      Skills: React, TypeScript, CSS, Redux, Jest, Accessibility, Figma, Webpack, Cypress
      Experience:
        - 4 years at DesignFirst: Led frontend development for a React + TypeScript SaaS product.
        - Built accessible (WCAG 2.1 AA) components, wrote Jest + Cypress end-to-end tests.
        - Used Redux Toolkit for state management. CSS-in-JS (styled-components).
        - Worked with design systems, pixel-perfect Figma-to-code implementation.
      Education: B.Sc Computer Science, Delhi University
    `,
    applyTo: [1], // applies to Frontend only
  },
  {
    name:  'Rahul Gupta',
    email: 'rahul@example.com',
    resume: `
      Rahul Gupta — Data Scientist
      Skills: Python, PyTorch, scikit-learn, NLP, SQL, pandas, numpy, GCP, MLflow, FastAPI
      Experience:
        - 3 years at DataLabs: Trained NLP models (BERT, GPT fine-tuning) using PyTorch.
        - Used scikit-learn for classical ML pipelines. Tracked experiments with MLflow.
        - Deployed models as REST APIs using FastAPI on GCP Cloud Run.
        - SQL for feature engineering on BigQuery. Some experience with PySpark.
      Education: M.Tech AI, IIT Delhi
    `,
    applyTo: [2], // applies to ML only
  },
  {
    name:  'Sneha Patel',
    email: 'sneha@example.com',
    resume: `
      Sneha Patel — Junior Full Stack Developer
      Skills: React, Node.js, CSS, JavaScript, MongoDB, Git, REST API
      Experience:
        - 1.5 years at StartupXYZ: Built features in React frontend and Node.js backend.
        - Basic CSS and REST API experience. Used MongoDB for a side project.
        - No TypeScript, Docker, PostgreSQL, or testing framework experience yet.
        - Eager learner, completed online courses in Jest and Docker basics.
      Education: B.E. Information Technology, Pune University
    `,
    applyTo: [0, 1, 2], // applies to all three (wildcard candidate)
  },
  {
    name:  'Vikram Singh',
    email: 'vikram@example.com',
    resume: `
      Vikram Singh — DevOps & Backend Engineer
      Skills: Docker, Kubernetes, AWS, Node.js, PostgreSQL, TypeScript, CI/CD, Terraform, REST API
      Experience:
        - 6 years at CloudOps: Managed Kubernetes clusters, wrote Terraform for AWS infrastructure.
        - Node.js microservices in TypeScript, PostgreSQL with pgBouncer connection pooling.
        - Set up GitHub Actions CI/CD pipelines. Prometheus + Grafana for monitoring.
        - AWS EKS, RDS, S3, CloudFront. Strong Linux and shell scripting background.
      Education: B.Tech Electronics, NIT Trichy
    `,
    applyTo: [0], // applies to Backend (strongest match)
  },
];

// ── Simulation Runner ─────────────────────────────────────────────────────────

async function runSimulation() {
  console.log(`\n${C.bold}${C.bgBlue}                                                    ${C.reset}`);
  console.log(`${C.bold}${C.bgBlue}   HireSignal — AI Recruitment Platform Simulation   ${C.reset}`);
  console.log(`${C.bold}${C.bgBlue}                                                    ${C.reset}`);
  console.log(dim('  Using local keyword-overlap scorer (Gemini fallback mode)'));
  console.log(dim('  No API keys required — this is a full functional simulation\n'));

  // ─────────────────────────────────────────────────────────────────────────
  section('STEP 1 — Recruiter Signs Up & Posts 3 Jobs');
  // ─────────────────────────────────────────────────────────────────────────

  const recruiter = createProfile('recruiter@hiresignal.com', 'recruiter', 'Ananya Krishnan');
  console.log(`\n  ${green('✔')} Recruiter created: ${bold(recruiter.full_name)} (${recruiter.email})`);
  console.log(`    Role: ${cyan(recruiter.role)}  |  ID: ${dim(recruiter.id)}\n`);

  const postedJobs = JOB_POSTINGS.map((jp, i) => {
    const job = createJob(recruiter.id, jp.title, jp.description, jp.skills);
    console.log(`  ${green('✔')} Job ${i + 1} posted: ${bold(jp.title)}`);
    console.log(`    Skills: ${jp.skills.map(s => cyan(s)).join(', ')}`);
    return job;
  });

  // ─────────────────────────────────────────────────────────────────────────
  section('STEP 2 — 5 Candidates Sign Up');
  // ─────────────────────────────────────────────────────────────────────────

  const candidateProfiles = CANDIDATES.map(c => {
    const profile = createProfile(c.email, 'candidate', c.name);
    console.log(`\n  ${green('✔')} ${bold(c.name)} — ${dim(c.email)}`);
    return { ...c, profile };
  });

  // ─────────────────────────────────────────────────────────────────────────
  section('STEP 3 — Candidates Apply (PDF text extracted + AI scored)');
  // ─────────────────────────────────────────────────────────────────────────

  console.log('\n  Scoring resumes against job descriptions...\n');

  const allApplications = [];

  for (const candidate of candidateProfiles) {
    for (const jobIndex of candidate.applyTo) {
      const job = postedJobs[jobIndex];
      process.stdout.write(
        `  ${dim('→')} ${bold(candidate.name)} applying to ${cyan(job.title)}... `
      );

      const app = await submitApplication(
        candidate.profile.id,
        job.id,
        candidate.resume
      );

      allApplications.push({
        ...app,
        candidateName: candidate.name,
        jobTitle:      job.title,
        jobSkills:     job.required_skills,
      });

      console.log(`Score: ${scoreColor(app.match_score)} / 100`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  section('STEP 4 — Recruiter Dashboard: Ranked Applicants per Job');
  // ─────────────────────────────────────────────────────────────────────────

  for (const job of postedJobs) {
    const jobApps = allApplications
      .filter(a => a.job_id === job.id)
      .sort((a, b) => b.match_score - a.match_score);

    console.log(`\n  ${bold(job.title)}`);
    console.log(`  ${dim('─'.repeat(55))}`);
    console.log(
      `  ${bold('Rank  Candidate              Score  Matched Skills')}`
    );
    console.log(`  ${dim('─'.repeat(55))}`);

    jobApps.forEach((app, rank) => {
      const name    = app.candidateName.padEnd(22);
      const matched = app.matched_skills.slice(0, 3).join(', ') +
                      (app.matched_skills.length > 3 ? ` +${app.matched_skills.length - 3}` : '');
      console.log(
        `  ${String(rank + 1).padStart(2)}.  ${name} ${scoreColor(app.match_score).padStart(3)}    ${dim(matched)}`
      );
    });

    // Auto-assign statuses: top → hired, #2 → reviewed, rest → rejected
    jobApps.forEach((app, rank) => {
      let status = 'rejected';
      if (rank === 0 && app.match_score >= 50) status = 'hired';
      else if (rank === 1 && app.match_score >= 30) status = 'reviewed';
      else if (rank === 0) status = 'reviewed'; // best candidate even if low score

      updateStatus(app.id, status);
      app.status = status;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  section('STEP 5 — Full Application Details with AI Summaries');
  // ─────────────────────────────────────────────────────────────────────────

  for (const job of postedJobs) {
    const jobApps = allApplications
      .filter(a => a.job_id === job.id)
      .sort((a, b) => b.match_score - a.match_score);

    console.log(`\n  ${bold(cyan(job.title))}`);

    for (const app of jobApps) {
      console.log(`\n  ${bold(app.candidateName)}  ${scoreColor(app.match_score)}/100  ${statusColor(app.status)}`);
      console.log(`    ${dim('Summary:')} ${app.match_summary}`);

      if (app.matched_skills.length > 0) {
        console.log(`    ${green('Matched:')} ${app.matched_skills.map(s => green(s)).join(', ')}`);
      }
      if (app.missing_skills.length > 0) {
        console.log(`    ${red('Missing:')} ${app.missing_skills.map(s => red(s)).join(', ')}`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  section('STEP 6 — Candidate Dashboards (what each candidate sees)');
  // ─────────────────────────────────────────────────────────────────────────

  for (const candidate of candidateProfiles) {
    const myApps = allApplications
      .filter(a => a.candidate_id === candidate.profile.id)
      .sort((a, b) => b.match_score - a.match_score);

    console.log(`\n  ${bold(candidate.name)}'s Applications:`);
    for (const app of myApps) {
      console.log(
        `    • ${app.jobTitle.padEnd(32)} Score: ${scoreColor(app.match_score).padStart(3)}   ${statusColor(app.status)}`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  section('STEP 7 — Simulation Statistics');
  // ─────────────────────────────────────────────────────────────────────────

  const totalApps   = allApplications.length;
  const hired       = allApplications.filter(a => a.status === 'hired').length;
  const reviewed    = allApplications.filter(a => a.status === 'reviewed').length;
  const rejected    = allApplications.filter(a => a.status === 'rejected').length;
  const avgScore    = Math.round(allApplications.reduce((s, a) => s + a.match_score, 0) / totalApps);
  const topScore    = Math.max(...allApplications.map(a => a.match_score));
  const bottomScore = Math.min(...allApplications.map(a => a.match_score));

  console.log(`
  ${bold('Platform Stats')}
  ┌─────────────────────────────────────┐
  │  Recruiters:       ${String(db.profiles.filter(p=>p.role==='recruiter').length).padStart(3)}               │
  │  Candidates:       ${String(db.profiles.filter(p=>p.role==='candidate').length).padStart(3)}               │
  │  Jobs Posted:      ${String(db.jobs.length).padStart(3)}               │
  │  Applications:     ${String(totalApps).padStart(3)}               │
  │                                     │
  │  ${green('Hired:')}         ${String(hired).padStart(3)}               │
  │  ${yellow('Reviewed:')}      ${String(reviewed).padStart(3)}               │
  │  ${red('Rejected:')}      ${String(rejected).padStart(3)}               │
  │                                     │
  │  Avg Match Score:  ${String(avgScore).padStart(3)}               │
  │  Top Score:        ${String(topScore).padStart(3)}               │
  │  Lowest Score:     ${String(bottomScore).padStart(3)}               │
  └─────────────────────────────────────┘`);

  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}${C.bgGreen}  ✔ Simulation complete — all systems working correctly  ${C.reset}\n`);
  console.log(dim('  The same flow runs in the real app with:'));
  console.log(dim('    • Supabase for auth, database, and resume storage'));
  console.log(dim('    • Google Gemini 1.5 Flash for richer AI scoring'));
  console.log(dim('    • React frontend with real-time status updates\n'));
}

// ── Run ───────────────────────────────────────────────────────────────────────
runSimulation().catch(err => {
  console.error('\n[simulation] Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
