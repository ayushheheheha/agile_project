'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip markdown code fences from a string so we can JSON.parse it.
 * Gemini often wraps JSON in ```json ... ``` blocks.
 */
function stripCodeFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/**
 * Simple local fallback scorer.
 * Counts how many required skills appear (case-insensitive) in the resume text.
 * Returns a score 0-100 and basic skill lists.
 *
 * @param {string}   resumeText
 * @param {string[]} requiredSkills
 * @returns {{ score: number, matched_skills: string[], missing_skills: string[], summary: string }}
 */
function localKeywordScore(resumeText, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) {
    return {
      score: 50,
      matched_skills: [],
      missing_skills: [],
      summary: 'No required skills specified. Score is neutral. Please review the resume manually.',
    };
  }

  const lower = resumeText.toLowerCase();
  const matched = requiredSkills.filter(skill => lower.includes(skill.toLowerCase()));
  const missing = requiredSkills.filter(skill => !lower.includes(skill.toLowerCase()));
  const matchPct = Math.round((matched.length / requiredSkills.length) * 100);

  let summaryLine;
  if (matched.length === 0) {
    summaryLine = `The candidate's resume did not match any of the ${requiredSkills.length} required skills for this role. A different skill set or more targeted experience would be needed.`;
  } else if (matched.length === requiredSkills.length) {
    summaryLine = `Strong match — the candidate demonstrates all ${requiredSkills.length} required skills including ${matched.slice(0, 3).join(', ')}. Well-suited for this role.`;
  } else {
    summaryLine = `The candidate matched ${matched.length} of ${requiredSkills.length} required skills (${matchPct}%), including ${matched.slice(0, 3).join(', ')}. Missing coverage in ${missing.slice(0, 3).join(', ')}.`;
  }

  return {
    score: matchPct,
    matched_skills: matched,
    missing_skills: missing,
    summary: summaryLine,
  };
}

/**
 * Sleep for ms milliseconds (used for retry back-off).
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main scoring function ─────────────────────────────────────────────────────

/**
 * Score a resume against a job using the Gemini API.
 *
 * Falls back to local keyword scoring if:
 *  - GEMINI_API_KEY is not set
 *  - The Gemini API returns an error (including rate-limit 429)
 *  - The response cannot be parsed as valid JSON
 *
 * @param {string}   resumeText       Full text extracted from the resume PDF
 * @param {string}   jobTitle         Title of the job posting
 * @param {string}   jobDescription   Full job description
 * @param {string[]} requiredSkills   Array of skill strings
 * @returns {Promise<{ score: number, matched_skills: string[], missing_skills: string[], summary: string }>}
 */
async function scoreResume(resumeText, jobTitle, jobDescription, requiredSkills) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[geminiScoring] GEMINI_API_KEY not set — using local fallback scorer');
    return localKeywordScore(resumeText, requiredSkills);
  }

  const skillsList = Array.isArray(requiredSkills) ? requiredSkills.join(', ') : '';

  const prompt = `
You are an expert technical recruiter AI. Evaluate the following resume against the job posting.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

REQUIRED SKILLS: ${skillsList}

RESUME TEXT:
${resumeText}

Respond with ONLY a JSON object — no markdown, no explanation, no code fences. The JSON must have exactly these keys:
{
  "score": <integer 0-100, overall match score>,
  "matched_skills": [<skills from REQUIRED SKILLS that appear in the resume>],
  "missing_skills": [<skills from REQUIRED SKILLS that do NOT appear in the resume>],
  "summary": "<exactly 2 sentences summarising the candidate's fit for this role>"
}
`.trim();

  const genAI  = new GoogleGenerativeAI(apiKey);
  const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let lastError;

  // 1 initial attempt + 1 retry on rate-limit
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result   = await model.generateContent(prompt);
      const rawText  = result.response.text();
      const cleaned  = stripCodeFences(rawText);
      const parsed   = JSON.parse(cleaned);

      // Basic shape validation
      if (
        typeof parsed.score !== 'number' ||
        !Array.isArray(parsed.matched_skills) ||
        !Array.isArray(parsed.missing_skills) ||
        typeof parsed.summary !== 'string'
      ) {
        throw new Error('Gemini response missing required fields');
      }

      // Clamp score to 0-100
      parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
      return parsed;

    } catch (err) {
      lastError = err;

      // Detect rate-limit errors (HTTP 429 or "quota" in message)
      const isRateLimit =
        err.status === 429 ||
        (err.message && err.message.toLowerCase().includes('429')) ||
        (err.message && err.message.toLowerCase().includes('quota'));

      if (isRateLimit && attempt === 1) {
        console.warn('[geminiScoring] Rate limit hit — waiting 5 s before retry…');
        await sleep(5000);
        continue;
      }

      // JSON parse or shape error — no point retrying
      if (err instanceof SyntaxError || err.message === 'Gemini response missing required fields') {
        console.warn('[geminiScoring] Could not parse Gemini JSON — using local fallback');
        return localKeywordScore(resumeText, requiredSkills);
      }

      // Any other non-rate-limit error on first attempt → fallback immediately
      if (attempt === 1 && !isRateLimit) {
        break;
      }
    }
  }

  // All attempts exhausted
  console.warn('[geminiScoring] Gemini API failed — using local fallback. Last error:', lastError?.message);
  return localKeywordScore(resumeText, requiredSkills);
}

module.exports = { scoreResume, localKeywordScore, stripCodeFences };
