import { NextResponse } from 'next/server';
import { getAuthUser, getContractorId } from '@/lib/api-helper';

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json([]);

  const { data } = await supabase
    .from('penalties')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('date');

  return NextResponse.json(
    (data || []).map((p) => ({
      id: p.id,
      date: p.date,
      trainNo: p.train_no,
      tripHours: p.trip_hours,
      reqEhk: p.req_ehk,
      reqJan: p.req_jan,
      actEhk: p.act_ehk,
      actJan: p.act_jan,
      note: p.note,
    }))
  );
}

export async function PUT(request) {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json({ error: 'No contractor record' }, { status: 404 });

  const penalties = await request.json();

  await supabase.from('penalties').delete().eq('contractor_id', contractorId);

  if (penalties.length > 0) {
    const { error } = await supabase.from('penalties').insert(
      penalties.map((p) => ({
        id: p.id,
        contractor_id: contractorId,
        date: p.date || '',
        train_no: p.trainNo || '',
        trip_hours: Number(p.tripHours) || 0,
        req_ehk: Number(p.reqEhk) || 0,
        req_jan: Number(p.reqJan) || 0,
        act_ehk: Number(p.actEhk) || 0,
        act_jan: Number(p.actJan) || 0,
        note: p.note || '',
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
