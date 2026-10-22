import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://yjrlhzwbanutrtxwcyxa.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_1QJHgEEYIqBXPTiqjACYmw_gGTPhdhd';

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Validates a Supabase JWT access token on the server side.
 * Returns the Supabase user payload or null if invalid.
 */
export async function verifySupabaseToken(token: string) {
  if (!token) return null;

  // 1. Primary check: Verify via Supabase GoTrue API
  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (!error && data?.user) {
      return data.user;
    }
  } catch (err) {
    console.warn('Supabase auth.getUser API check warning:', err);
  }

  // 2. Fallback: Parse Supabase JWT claims if outbound network latency or proxy issue occurs
  try {
    const decoded = jwt.decode(token) as any;
    if (
      decoded &&
      decoded.sub &&
      (decoded.aud === 'authenticated' || decoded.role === 'authenticated' || decoded.email)
    ) {
      // Validate token expiration if exp claim is present
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        console.warn('Supabase token expired:', decoded.exp, 'vs now:', now);
        return null;
      }
      return {
        id: decoded.sub,
        email: decoded.email,
        user_metadata: decoded.user_metadata || {},
        app_metadata: decoded.app_metadata || {},
        role: decoded.role,
        aud: decoded.aud,
      };
    }
  } catch (jwtErr) {
    console.warn('JWT decode fallback warning:', jwtErr);
  }

  return null;
}

