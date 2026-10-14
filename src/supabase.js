import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Null when env vars are missing or invalid, so the page still loads without a Supabase project.
let client = null;
if (url && anonKey) {
  try {
    client = createClient(url, anonKey);
  } catch (err) {
    console.error('[supabase] Could not create client — check VITE_SUPABASE_URL in .env:', err.message);
  }
}
export const supabase = client;

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env, fill in both values, and restart the dev server. ' +
      'Form submissions will fail until then.'
  );
}
