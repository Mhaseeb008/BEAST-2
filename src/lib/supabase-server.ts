import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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
  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data?.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('Error verifying Supabase token:', err);
    return null;
  }
}
