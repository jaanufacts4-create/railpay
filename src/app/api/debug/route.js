import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  const { user } = await getAuthUser();

  // Try listing auth users to verify service role key works
  let authTest = 'not tested';
  let userCount = 0;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 5 });
    if (error) authTest = 'ERROR: ' + error.message;
    else { authTest = 'OK'; userCount = data?.users?.length ?? 0; }
  } catch (e) {
    authTest = 'EXCEPTION: ' + e.message;
  }

  // Check if contractors table exists
  let tableTest = 'not tested';
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('contractors').select('id').limit(1);
    tableTest = error ? 'MISSING: ' + error.message : 'EXISTS';
  } catch (e) {
    tableTest = 'EXCEPTION: ' + e.message;
  }

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NOT SET',
    admin_email: process.env.ADMIN_EMAIL ?? 'NOT SET',
    service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    logged_in_user: user?.email ?? null,
    auth_api_test: authTest,
    registered_users: userCount,
    contractors_table: tableTest,
  });
}
