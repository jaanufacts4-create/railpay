import { NextResponse } from 'next/server';
import { getAuthUser, getContractorId } from '@/lib/api-helper';

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json([]);

  const { data } = await supabase
    .from('min_wages')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('effective_from');

  return NextResponse.json(
    (data || []).map((w) => ({
      id: w.id,
      effectiveFrom: w.effective_from,
      ehk: w.ehk,
      janitor: w.janitor,
    }))
  );
}

export async function PUT(request) {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json({ error: 'No contractor record' }, { status: 404 });

  const minWages = await request.json();

  await supabase.from('min_wages').delete().eq('contractor_id', contractorId);

  if (minWages.length > 0) {
    const { error } = await supabase.from('min_wages').insert(
      minWages.map((w) => ({
        id: w.id,
        contractor_id: contractorId,
        effective_from: w.effectiveFrom || '',
        ehk: Number(w.ehk) || 0,
        janitor: Number(w.janitor) || 0,
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
