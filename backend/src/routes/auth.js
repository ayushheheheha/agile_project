'use strict';

const express  = require('express');
const { supabaseAdmin } = require('../services/supabaseClient');

const router = express.Router();

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
/**
 * Body: { email, password, full_name, role: 'recruiter' | 'candidate' }
 *
 * 1. Creates a Supabase Auth user
 * 2. Inserts a matching row into public.profiles (via admin client)
 * 3. Returns the session JWT so the client can immediately make authenticated calls
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, full_name, role } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'email, password, full_name, and role are required' });
    }

    if (!['recruiter', 'candidate'].includes(role)) {
      return res.status(400).json({ error: "role must be 'recruiter' or 'candidate'" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // ── Create Auth user ──────────────────────────────────────────────────────
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm for demo purposes
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // ── Insert profile row ────────────────────────────────────────────────────
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: userId, role, full_name });

    if (profileError) {
      // Clean up the auth user if profile insert fails to avoid orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to create profile: ' + profileError.message });
    }

    // Sign in directly with password using anon key
    const { createClient } = require('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Account created but couldn't auto-sign-in — return partial success
      return res.status(201).json({
        message: 'Account created. Please log in.',
        user: { id: userId, email, role, full_name },
      });
    }

    return res.status(201).json({
      message: 'Account created successfully',
      session: signInData.session,
      user: {
        id: userId,
        email,
        role,
        full_name,
      },
    });

  } catch (err) {
    return next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
/**
 * Body: { email, password }
 * Returns session JWT + user profile
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.json({
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role,
        full_name: profile?.full_name,
      },
    });

  } catch (err) {
    return next(err);
  }
});

module.exports = router;
