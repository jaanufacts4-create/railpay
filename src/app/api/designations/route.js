import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const { data } = await supabase
    .from('contractors')
    .select('designations')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json(data?.designations ?? ['Supervisor', 'Housekeeper', 'Cleaner']);
}

export async function PUT(request) {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const designations = await request.json();

  const { error } = await supabase
    .from('contractors')
    .update({ designations })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
