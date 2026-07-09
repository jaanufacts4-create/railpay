import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const { data } = await supabase
    .from('contractors')
    .select('janitor_rate, ehk_rate')
    .eq('user_id', user.id)
    .single();

  if (!data) return NextResponse.json({ janitorRate: 70.88, ehkRate: '' });

  return NextResponse.json({
    janitorRate: data.janitor_rate ?? 70.88,
    ehkRate: data.ehk_rate ?? '',
  });
}

export async function PUT(request) {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const rates = await request.json();

  const { error } = await supabase
    .from('contractors')
    .update({
      janitor_rate: Number(rates.janitorRate) || 70.88,
      ehk_rate: rates.ehkRate ? Number(rates.ehkRate) : null,
    })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
