import { createServerClient } from '@/lib/supabase-server';

/** Returns { supabase, user } — user is null if not authenticated */
export async function getAuthUser() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Returns the contractor UUID for a given auth user, or null if none exists yet */
export async function getContractorId(supabase, userId) {
  const { data } = await supabase
    .from('contractors')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id ?? null;
}
