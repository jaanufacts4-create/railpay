import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';
import { createAdminClient } from '@/lib/supabase-admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function checkAdmin(user) {
  if (!user || user.email !== ADMIN_EMAIL) return false;
  return true;
}

// DELETE — permanently delete a user and all their data
export async function DELETE(request, { params }) {
  const { user } = await getAuthUser();
  if (!(await checkAdmin(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — disable or enable a user
export async function PATCH(request, { params }) {
  const { user } = await getAuthUser();
  if (!(await checkAdmin(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action } = await request.json(); // action: "disable" | "enable"
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(params.id, {
    ban_duration: action === 'disable' ? '87600h' : 'none',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
