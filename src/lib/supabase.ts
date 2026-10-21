import { createClient } from '@supabase/supabase-js';

// Supabase project credentials configured via environment variables
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://yjrlhzwbanutrtxwcyxa.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_1QJHgEEYIqBXPTiqjACYmw_gGTPhdhd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
