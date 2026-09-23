'use strict';

const { supabaseAnon } = require('../services/supabaseClient');
const { supabaseAdmin } = require('../services/supabaseClient');

/**
 * requireAuth middleware
 * ──────────────────────
 * Validates the Bearer JWT from the Authorization header against Supabase.
 * On success: attaches req.user (Supabase user object) and req.profile
 * (the row from public.profiles with role, full_name, etc.) to the request.
 *
 * On failure: 401
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    // Validate JWT by calling Supabase auth endpoint
    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = data.user;

    // Fetch the user's profile (role etc.) using admin client to bypass RLS
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.profile = profile;
    return next();

  } catch (err) {
    console.error('[auth middleware]', err.message);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * requireRole(role)
 * ──────────────────
 * Factory that returns a middleware ensuring the authenticated user has
 * the given role. Must be used AFTER requireAuth.
 *
 * @param {'recruiter'|'candidate'} role
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.profile.role !== role) {
      return res.status(403).json({
        error: `Forbidden: requires role '${role}', got '${req.profile.role}'`,
      });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
