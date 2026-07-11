import { NextResponse } from 'next/server';
import { getAuthUser, getContractorId } from '@/lib/api-helper';
import { createAdminClient } from '@/lib/supabase-admin';

// GET — check current user's subscription status
export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json({ status: 'unauthenticated' }, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) {
    // New user, no contractor record yet — give grace access
    return NextResponse.json({ status: 'active', plan: 'trial', daysLeft: 30 });
  }

  const admin = createAdminClient();

  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    // No subscription record — grace access
    return NextResponse.json({ status: 'active', plan: 'grace', daysLeft: 7 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(sub.end_date);
  endDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

  // Auto-expire if past end_date and still marked active
  if (daysLeft < 0 && sub.status === 'active') {
    await admin
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    sub.status = 'expired';
  }

  // Fetch admin config for payment wall
  let config = null;
  if (sub.status !== 'active') {
    const { data: cfg } = await admin
      .from('admin_config')
      .select('upi_id, whatsapp_number, upi_qr_url, payment_note, basic_price, pro_price')
      .eq('id', 1)
      .single();
    config = cfg;
  }

  return NextResponse.json({
    status: sub.status,       // 'active' | 'expired' | 'suspended'
    plan: sub.plan,           // 'trial' | 'basic' | 'pro'
    endDate: sub.end_date,
    daysLeft: Math.max(0, daysLeft),
    config,                   // null if active, payment info if not
  });
}
