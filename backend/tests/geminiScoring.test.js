'use strict';

/**
 * Unit tests for geminiScoring.js
 *
 * Strategy: mock @google/generative-ai so no real API calls are made.
 * We test:
 *   1. Successful parse — Gemini returns valid JSON
 *   2. Malformed JSON fallback — Gemini returns junk/unparseable text
 *   3. API error fallback — Gemini throws a generic error
 *   4. Rate-limit retry + eventual fallback (429 on both attempts)
 *   5. stripCodeFences helper
 *   6. localKeywordScore edge cases
 */

// ── Mock @google/generative-ai before requiring the module under test ─────────

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

// Now require the module (after mocks are set up)
const {
  scoreResume,
  localKeywordScore,
  stripCodeFences,
} = require('../src/services/geminiScoring');

// ── Helpers ───────────────────────────────────────────────────────────────────

const SAMPLE_RESUME = `
  John Doe
  Skills: JavaScript, Node.js, React, PostgreSQL
  Experience: 3 years at Acme Corp building REST APIs.
`;

const SAMPLE_JOB = {
  title:          'Senior Backend Engineer',
  description:    'Build scalable APIs using Node.js and PostgreSQL.',
  requiredSkills: ['Node.js', 'PostgreSQL', 'Docker', 'TypeScript'],
};

function makeGeminiResponse(text) {
  return {
    response: {
      text: () => text,
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('stripCodeFences', () => {
  test('removes leading ```json and trailing ```', () => {
    const input    = '```json\n{"score": 80}\n```';
    const expected = '{"score": 80}';
    expect(stripCodeFences(input)).toBe(expected);
  });

  test('removes plain ``` fences', () => {
    const input = '```\n{"score": 50}\n```';
    expect(stripCodeFences(input)).toBe('{"score": 50}');
  });

  test('returns plain JSON unchanged', () => {
    const input = '{"score": 75}';
    expect(stripCodeFences(input)).toBe('{"score": 75}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('localKeywordScore', () => {
  test('returns 50 and empty lists when no required skills', () => {
    const result = localKeywordScore(SAMPLE_RESUME, []);
    expect(result.score).toBe(50);
    expect(result.matched_skills).toHaveLength(0);
    expect(result.missing_skills).toHaveLength(0);
  });

  test('correctly identifies matched and missing skills', () => {
    const result = localKeywordScore(SAMPLE_RESUME, ['Node.js', 'Docker', 'React']);
    // Node.js and React are in the resume; Docker is not
    expect(result.matched_skills).toContain('Node.js');
    expect(result.matched_skills).toContain('React');
    expect(result.missing_skills).toContain('Docker');
    expect(result.score).toBeCloseTo(Math.round((2 / 3) * 100), 0);
  });

  test('score is 100 when all skills match', () => {
    const result = localKeywordScore(SAMPLE_RESUME, ['Node.js', 'JavaScript']);
    expect(result.score).toBe(100);
  });

  test('score is 0 when no skills match', () => {
    const result = localKeywordScore(SAMPLE_RESUME, ['Rust', 'Go', 'Erlang']);
    expect(result.score).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('scoreResume', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  // ── Test 1: Successful parse ────────────────────────────────────────────────
  test('returns parsed Gemini result on success', async () => {
    const geminiPayload = {
      score: 82,
      matched_skills: ['Node.js', 'PostgreSQL'],
      missing_skills: ['Docker', 'TypeScript'],
      summary: 'Strong backend skills. Missing containerisation experience.',
    };

    mockGenerateContent.mockResolvedValueOnce(
      makeGeminiResponse(JSON.stringify(geminiPayload))
    );

    const result = await scoreResume(
      SAMPLE_RESUME,
      SAMPLE_JOB.title,
      SAMPLE_JOB.description,
      SAMPLE_JOB.requiredSkills
    );

    expect(result.score).toBe(82);
    expect(result.matched_skills).toEqual(['Node.js', 'PostgreSQL']);
    expect(result.missing_skills).toEqual(['Docker', 'TypeScript']);
    expect(typeof result.summary).toBe('string');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: Gemini wraps response in code fences ────────────────────────────
  test('correctly strips markdown code fences from Gemini response', async () => {
    const geminiPayload = {
      score: 60,
      matched_skills: ['Node.js'],
      missing_skills: ['Docker', 'TypeScript', 'PostgreSQL'],
      summary: 'Partial match. Needs more cloud experience.',
    };

    mockGenerateContent.mockResolvedValueOnce(
      makeGeminiResponse('```json\n' + JSON.stringify(geminiPayload) + '\n```')
    );

    const result = await scoreResume(
      SAMPLE_RESUME,
      SAMPLE_JOB.title,
      SAMPLE_JOB.description,
      SAMPLE_JOB.requiredSkills
    );

    expect(result.score).toBe(60);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // ── Test 3: Malformed JSON → fallback ──────────────────────────────────────
  test('falls back to local keyword scorer when Gemini returns unparseable text', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      makeGeminiResponse('Sorry, I cannot evaluate this resume.')
    );

    const result = await scoreResume(
      SAMPLE_RESUME,
      SAMPLE_JOB.title,
      SAMPLE_JOB.description,
      SAMPLE_JOB.requiredSkills
    );

    // Should fall back to localKeywordScore — result must still be valid
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.matched_skills)).toBe(true);
    expect(Array.isArray(result.missing_skills)).toBe(true);
    expect(result.summary).toMatch(/local keyword match/i);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // ── Test 4: API error → fallback ───────────────────────────────────────────
  test('falls back to local keyword scorer when Gemini API throws an error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Internal server error from Gemini'));

    const result = await scoreResume(
      SAMPLE_RESUME,
      SAMPLE_JOB.title,
      SAMPLE_JOB.description,
      SAMPLE_JOB.requiredSkills
    );

    expect(typeof result.score).toBe('number');
    expect(result.summary).toMatch(/local keyword match/i);
    // Attempted once, then fell back (no retry for non-rate-limit errors)
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // ── Test 5: Rate-limit retry + eventual fallback ────────────────────────────
  test('retries once on rate-limit error then falls back to local scorer', async () => {
    const rateLimitError = Object.assign(new Error('429 Too Many Requests'), { status: 429 });

    // Both attempts fail with rate limit
    mockGenerateContent
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError);

    // Use fake timers so the 5-second sleep doesn't actually wait
    jest.useFakeTimers();

    // Start the async operation (don't await yet — we need to advance timers first)
    const promise = scoreResume(
      SAMPLE_RESUME,
      SAMPLE_JOB.title,
      SAMPLE_JOB.description,
      SAMPLE_JOB.requiredSkills
    );

    // Flush pending microtasks so the first rejection is processed,
    // then advance timers past the 5-second sleep
    await Promise.resolve();
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    jest.useRealTimers();

    const result = await promise;

    expect(result.summary).toMatch(/local keyword match/i);
    // Should have tried twice
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  }, 15000);

  // ── Test 6: No API key → immediate local fallback ──────────────────────────
  test('uses local scorer immediately when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await scoreResume(
      SAMPLE_RESUME,
      SAMPLE_JOB.title,
      SAMPLE_JOB.description,
      SAMPLE_JOB.requiredSkills
    );

    expect(typeof result.score).toBe('number');
    // Gemini should never have been called
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  // ── Test 7: Score clamped to 0-100 ─────────────────────────────────────────
  test('clamps out-of-range score to 0-100', async () => {
    const geminiPayload = {
      score: 150, // out of range
      matched_skills: ['Node.js'],
      missing_skills: [],
      summary: 'Perfect fit plus extra!',
    };

    mockGenerateContent.mockResolvedValueOnce(
      makeGeminiResponse(JSON.stringify(geminiPayload))
    );

    const result = await scoreResume(
      SAMPLE_RESUME,
      SAMPLE_JOB.title,
      SAMPLE_JOB.description,
      SAMPLE_JOB.requiredSkills
    );

    expect(result.score).toBe(100);
  });
});
