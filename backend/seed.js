'use strict';

/**
 * =============================================================================
 * HireSignal — Database Seeder
 * =============================================================================
 * Populates your Supabase database with realistic demonstration data:
 *   - 1 Demo Recruiter (recruiter@hiresignal.demo / Password123!)
 *   - 3 Realistic Tech Jobs (Backend, Frontend, ML)
 *   - 5 Demo Candidates with scored applications
 *   - Links to any currently existing candidate (e.g. Ayush Yadav)
 *
 * Usage:
 *   node seed.js
 * =============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[seed] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

async function findOrCreateUser(email, password, role, fullName) {
  // Check if profile or user exists
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('full_name', fullName);

  if (existingProfiles && existingProfiles.length > 0) {
    return existingProfiles[0].id;
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId;
  if (authError) {
    if (authError.message.includes('already exists') || authError.status === 422) {
      // Find user by listUsers
      const { data: userList } = await supabase.auth.admin.listUsers();
      const found = userList?.users?.find(u => u.email === email);
      if (found) {
        userId = found.id;
      } else {
        throw authError;
      }
    } else {
      throw authError;
    }
  } else {
    userId = authData.user.id;
  }

  // Ensure profile exists
  await supabase.from('profiles').upsert({
    id: userId,
    role,
    full_name: fullName,
  });

  return userId;
}

async function seed(targetRecruiterId) {
  console.log('🌱 Starting HireSignal database seed on:', process.env.SUPABASE_URL);

  // 1. Create or use Recruiter
  let recruiterId = targetRecruiterId;
  if (!recruiterId) {
    console.log('  → Creating Recruiter: Sarah Jenkins (recruiter@hiresignal.demo)...');
    recruiterId = await findOrCreateUser(
      'recruiter@hiresignal.demo',
      'Password123!',
      'recruiter',
      'Sarah Jenkins'
    );
  } else {
    console.log(`  → Using existing logged-in recruiter (ID: ${recruiterId})...`);
  }

  // 2. Create Jobs
  console.log('  → Posting 3 technical jobs...');
  const jobsData = [
    {
      recruiter_id: recruiterId,
      title: 'Senior Backend Engineer',
      description: 'We are seeking a Senior Backend Engineer to scale our distributed microservices. You will architect high-throughput PostgreSQL databases, build resilient Node.js / TypeScript REST APIs, and manage container deployments using Docker and Kubernetes on AWS.',
      required_skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Kubernetes', 'REST API', 'AWS'],
    },
    {
      recruiter_id: recruiterId,
      title: 'Frontend React Developer',
      description: 'Join our core UI engineering team to build accessible, lightning-fast web applications. You will deliver responsive user interfaces using React, modern CSS, Redux Toolkit, and comprehensive automated testing with Jest and Cypress.',
      required_skills: ['React', 'TypeScript', 'CSS', 'Redux', 'Jest', 'Cypress', 'Accessibility'],
    },
    {
      recruiter_id: recruiterId,
      title: 'Machine Learning Engineer',
      description: 'Build and deploy state-of-the-art NLP and predictive evaluation models into production pipelines. You will develop ML models with PyTorch and scikit-learn, manage feature tracking with MLflow, and serve models via FastAPI on GCP.',
      required_skills: ['Python', 'PyTorch', 'scikit-learn', 'MLflow', 'NLP', 'FastAPI', 'SQL', 'GCP'],
    },
  ];

  const createdJobs = [];
  for (const j of jobsData) {
    const { data: existing } = await supabase
      .from('jobs')
      .select('id, title')
      .eq('title', j.title)
      .eq('recruiter_id', recruiterId);

    if (existing && existing.length > 0) {
      createdJobs.push(existing[0]);
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('jobs')
        .insert(j)
        .select()
        .single();
      if (insertErr) {
        console.error('Error inserting job:', insertErr);
      } else {
        createdJobs.push(inserted);
      }
    }
  }

  const backendJob  = createdJobs.find(j => j.title.includes('Backend'));
  const frontendJob = createdJobs.find(j => j.title.includes('Frontend'));
  const mlJob       = createdJobs.find(j => j.title.includes('Machine Learning'));

  // 3. Create Demo Candidates
  console.log('  → Creating 4 demo candidates and applications...');
  const candidatesData = [
    {
      name: 'Aryan Mehta',
      email: 'aryan.mehta@hiresignal.demo',
      applications: [
        {
          jobId: backendJob?.id,
          score: 100,
          status: 'hired',
          summary: 'Candidate demonstrates exceptional alignment with all required backend technologies. Extensive experience designing distributed Node.js/TypeScript microservices, advanced PostgreSQL optimization, and production Kubernetes deployments on AWS.',
        },
        {
          jobId: frontendJob?.id,
          score: 14,
          status: 'rejected',
          summary: 'Candidate has strong backend experience but lacks core frontend requirements (React, modern CSS, Cypress).',
        },
      ],
    },
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@hiresignal.demo',
      applications: [
        {
          jobId: frontendJob?.id,
          score: 95,
          status: 'hired',
          summary: 'Superb frontend candidate with 5+ years of React and modern CSS systems. Deep knowledge of web accessibility (WCAG AA), component architecture, and end-to-end testing with Jest and Cypress.',
        },
      ],
    },
    {
      name: 'Rahul Gupta',
      email: 'rahul.gupta@hiresignal.demo',
      applications: [
        {
          jobId: mlJob?.id,
          score: 92,
          status: 'reviewed',
          summary: 'Strong machine learning background focusing on NLP and PyTorch model serving. Familiar with MLflow lifecycle management and FastAPI microservice integration on GCP.',
        },
      ],
    },
    {
      name: 'Sneha Patel',
      email: 'sneha.patel@hiresignal.demo',
      applications: [
        {
          jobId: backendJob?.id,
          score: 71,
          status: 'reviewed',
          summary: 'Strong backend foundations in Node.js, TypeScript, PostgreSQL, and Docker. Missing cloud architecture (AWS) and container orchestration (Kubernetes) requirements.',
        },
        {
          jobId: frontendJob?.id,
          score: 57,
          status: 'pending',
          summary: 'Familiar with React and modern CSS basics, but lacks Redux state architecture and Cypress testing experience.',
        },
      ],
    },
  ];

  for (const c of candidatesData) {
    const candidateId = await findOrCreateUser(
      c.email,
      'Password123!',
      'candidate',
      c.name
    );

    for (const app of c.applications) {
      if (!app.jobId) continue;
      const { data: existingApp } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', candidateId)
        .eq('job_id', app.jobId);

      if (!existingApp || existingApp.length === 0) {
        await supabase.from('applications').insert({
          candidate_id: candidateId,
          job_id: app.jobId,
          resume_url: 'https://placeholder.supabase.co/storage/v1/object/public/resumes/demo_resume.pdf',
          resume_text: 'Demo resume containing full skills matching candidate profile.',
          match_score: app.score,
          match_summary: app.summary,
          status: app.status,
        });
      }
    }
  }

  // 4. Attach applications to any existing user (e.g. Ayush Yadav)
  const { data: allProfiles } = await supabase.from('profiles').select('*');
  const existingNonDemo = allProfiles?.filter(p => !p.email?.includes('@hiresignal.demo') && p.role === 'candidate');

  if (existingNonDemo && existingNonDemo.length > 0) {
    for (const user of existingNonDemo) {
      console.log(`  → Adding demo applications for existing candidate: ${user.full_name}...`);
      if (frontendJob) {
        const { data: hasApp } = await supabase
          .from('applications')
          .select('id')
          .eq('candidate_id', user.id)
          .eq('job_id', frontendJob.id);

        if (!hasApp || hasApp.length === 0) {
          await supabase.from('applications').insert({
            candidate_id: user.id,
            job_id: frontendJob.id,
            resume_url: 'https://placeholder.supabase.co/storage/v1/object/public/resumes/demo_resume.pdf',
            resume_text: 'Frontend developer resume with React, TypeScript, CSS, Jest, and UI design experience.',
            match_score: 88,
            match_summary: 'Candidate profile shows solid proficiency in React, TypeScript, and modern CSS layout design. Well-structured applications with comprehensive Jest unit testing.',
            status: 'reviewed',
          });
        }
      }

      if (backendJob) {
        const { data: hasApp } = await supabase
          .from('applications')
          .select('id')
          .eq('candidate_id', user.id)
          .eq('job_id', backendJob.id);

        if (!hasApp || hasApp.length === 0) {
          await supabase.from('applications').insert({
            candidate_id: user.id,
            job_id: backendJob.id,
            resume_url: 'https://placeholder.supabase.co/storage/v1/object/public/resumes/demo_resume.pdf',
            resume_text: 'Backend engineer resume with Node.js, Express, PostgreSQL, REST APIs, and Docker.',
            match_score: 82,
            match_summary: 'Strong backend development experience using Node.js and PostgreSQL. Demonstrates good grasp of RESTful APIs, containerization with Docker, and data modeling.',
            status: 'pending',
          });
        }
      }
    }
  }

  console.log('\n✔ Demo data successfully seeded!');
  console.log('\nDemo Credentials:');
  console.log('  Recruiter: recruiter@hiresignal.demo / Password123!');
  console.log('  Candidate: aryan.mehta@hiresignal.demo / Password123!');
  console.log('  Candidate: priya.sharma@hiresignal.demo / Password123!');
  console.log('  Candidate: rahul.gupta@hiresignal.demo / Password123!');
  console.log('  Candidate: sneha.patel@hiresignal.demo / Password123!');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal seed error:', err);
      process.exit(1);
    });
}

module.exports = { seed };
