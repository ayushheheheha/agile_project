'use strict';

const { createClient } = require('@supabase/supabase-js');

/**
 * Admin client — uses the service role key, bypasses RLS.
 * Use ONLY in server-side code (never expose to frontend).
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Public (anon) client — respects RLS.
 * Used to validate user JWTs via getUser().
 */
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = { supabaseAdmin, supabaseAnon };
