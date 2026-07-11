import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';
import { createAdminClient } from '@/lib/supabase-admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const checkAdmin = (user) => !!(user && user.email === ADMIN_EMAIL);

// GET — fetch admin config (UPI, WhatsApp, prices)
export async function GET() {
  const { user } = await getAuthUser();
  if (!checkAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT — update admin config
export async function PUT(request) {
  const { user } = await getAuthUser();
  if (!checkAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();

  const { error } = await admin
    .from('admin_config')
    .update({
      upi_id: body.upi_id ?? '',
      whatsapp_number: body.whatsapp_number ?? '',
      upi_qr_url: body.upi_qr_url ?? '',
      payment_note: body.payment_note ?? '',
      basic_price: Number(body.basic_price) || 999,
      pro_price: Number(body.pro_price) || 1999,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
