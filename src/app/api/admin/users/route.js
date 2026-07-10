import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';
import { createAdminClient } from '@/lib/supabase-admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function checkAdmin(user) {
  if (!user || user.email !== ADMIN_EMAIL) return false;
  return true;
}

// GET — list all users with their contractor data
export async function GET() {
  const { user } = await getAuthUser();
  if (!(await checkAdmin(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();

  // Get all auth users
  const { data: authData, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get all contractor records
  const { data: contractors } = await admin
    .from('contractors')
    .select('user_id, firm_name, owner_name, city');

  // Get employee counts per contractor
  const { data: empCounts } = await admin
    .from('employees')
    .select('contractor_id');

  // Get trip counts per contractor
  const { data: tripCounts } = await admin
    .from('trips')
    .select('contractor_id');

  const contractorMap = {};
  (contractors || []).forEach((c) => { contractorMap[c.user_id] = c; });

  const empMap = {};
  (empCounts || []).forEach((e) => {
    empMap[e.contractor_id] = (empMap[e.contractor_id] || 0) + 1;
  });

  const tripMap = {};
  (tripCounts || []).forEach((t) => {
    tripMap[t.contractor_id] = (tripMap[t.contractor_id] || 0) + 1;
  });

  // Get contractor id map
  const { data: contractorIds } = await admin
    .from('contractors')
    .select('id, user_id');
  const idMap = {};
  (contractorIds || []).forEach((c) => { idMap[c.user_id] = c.id; });

  const users = (authData?.users || [])
    .filter((u) => u.email !== ADMIN_EMAIL)
    .map((u) => {
      const c = contractorMap[u.user_id] || null;
      const cid = idMap[u.user_id];
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        banned: !!u.banned_until,
        firm_name: c?.firm_name || '—',
        owner_name: c?.owner_name || '—',
        city: c?.city || '—',
        employees: cid ? (empMap[cid] || 0) : 0,
        trips: cid ? (tripMap[cid] || 0) : 0,
        confirmed: !!u.email_confirmed_at,
      };
    });

  return NextResponse.json(users);
}

// POST — create a new user
export async function POST(request) {
  const { user } = await getAuthUser();
  if (!(await checkAdmin(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm, no email verification needed
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email } });
}
