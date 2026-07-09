import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const { data } = await supabase
    .from('contractors')
    .select('firm_name, owner_name, phone, city')
    .eq('user_id', user.id)
    .single();

  if (!data) return NextResponse.json(null);

  return NextResponse.json({
    name: data.firm_name,
    owner: data.owner_name,
    phone: data.phone,
    city: data.city,
  });
}

export async function PUT(request) {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const firm = await request.json();

  const { error } = await supabase.from('contractors').upsert(
    {
      user_id: user.id,
      firm_name: firm.name || '',
      owner_name: firm.owner || '',
      phone: firm.phone || '',
      city: firm.city || '',
    },
    { onConflict: 'user_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
