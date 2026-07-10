import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client — uses service_role key.
 * Only call this from server-side API routes, never from the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
