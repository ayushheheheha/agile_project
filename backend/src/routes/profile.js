'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin }            = require('../services/supabaseClient');

const router = express.Router();

// ── GET /api/profile ──────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's profile.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json(profile);
  } catch (err) {
    return next(err);
  }
});

// ── PATCH /api/profile ────────────────────────────────────────────────────────
/**
 * Updates the authenticated user's profile.
 * Body: { full_name?, bio?, skills?: string[] | string (CSV) }
 */
router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const { full_name, bio } = req.body;
    let { skills } = req.body;

    // Normalize skills from CSV string to array
    if (typeof skills === 'string') {
      skills = skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (bio       !== undefined) updates.bio       = bio.trim();
    if (skills    !== undefined) updates.skills    = skills;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(profile);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
