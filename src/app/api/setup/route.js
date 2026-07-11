import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SETUP_SECRET = process.env.SETUP_SECRET; // one-time secret to protect this route

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (!SETUP_SECRET || secret !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Forbidden — pass ?secret=YOUR_SETUP_SECRET' }, { status: 403 });
  }

  const admin = createAdminClient();
  const results = {};

  // 1. Create admin user if not exists
  try {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 100 });
    const existing = list?.users?.find(u => u.email === ADMIN_EMAIL);
    if (existing) {
      results.admin_user = `Already exists (id: ${existing.id})`;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: SETUP_SECRET, // Use setup secret as initial password
        email_confirm: true,
      });
      if (error) results.admin_user = 'ERROR: ' + error.message;
      else results.admin_user = `Created! Email: ${data.user.email}, Password = your SETUP_SECRET value`;
    }
  } catch (e) {
    results.admin_user = 'EXCEPTION: ' + e.message;
  }

  // 2. Check / create tables
  const tables = ['contractors', 'employees', 'trips', 'trains', 'min_wages', 'penalties'];
  results.tables = {};
  for (const table of tables) {
    const { error } = await admin.from(table).select('id').limit(1);
    results.tables[table] = error ? '❌ MISSING — run SQL migration' : '✅ exists';
  }

  results.next_steps = results.tables['contractors']?.includes('MISSING')
    ? 'Tables missing! Go to Supabase → SQL Editor → paste and run supabase/migrations/001_schema.sql'
    : 'All tables exist. You can now log in at /login';

  return NextResponse.json(results, { status: 200 });
}
