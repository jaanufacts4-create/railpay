import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';

export async function GET() {
  const { user } = await getAuthUser();
  return NextResponse.json({
    user_email: user?.email ?? null,
    admin_email_env: process.env.ADMIN_EMAIL ?? 'NOT SET',
    match: user?.email === process.env.ADMIN_EMAIL,
    service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
