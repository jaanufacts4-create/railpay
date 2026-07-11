import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';
import { createAdminClient } from '@/lib/supabase-admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const checkAdmin = (user) => !!(user && user.email === ADMIN_EMAIL);

// PUT — create or update subscription for a contractor (by auth user id)
export async function PUT(request, { params }) {
  const { user } = await getAuthUser();
  if (!checkAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { plan, days } = await request.json();
  // plan: 'trial' | 'basic' | 'pro'
  // days: number of days (15 or 30 for trial; 30 for monthly plans)

  if (!plan || !days) return NextResponse.json({ error: 'plan and days required' }, { status: 400 });

  const admin = createAdminClient();

  // Get contractor_id from auth user id
  const { data: contractor } = await admin
    .from('contractors')
    .select('id')
    .eq('user_id', params.id)
    .single();

  if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + Number(days));

  const toISO = (d) => d.toISOString().slice(0, 10);

  // Upsert subscription (replace existing)
  const { error } = await admin
    .from('subscriptions')
    .upsert(
      {
        contractor_id: contractor.id,
        plan,
        start_date: toISO(startDate),
        end_date: toISO(endDate),
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'contractor_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, end_date: toISO(endDate) });
}
