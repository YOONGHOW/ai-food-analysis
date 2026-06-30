import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail-safe check to verify the URL format before initializing the client
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const supabase = isValidUrl(supabaseUrl) && supabaseServiceKey
  ? createClient(supabaseUrl!, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

if (!supabase) {
  console.warn("Supabase connection disabled. (Missing or invalid SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env)");
}
