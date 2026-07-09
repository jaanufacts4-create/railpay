import { NextResponse } from 'next/server';
import { getAuthUser, getContractorId } from '@/lib/api-helper';

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json([]);

  const { data } = await supabase
    .from('trips')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('date');

  return NextResponse.json(
    (data || []).map((t) => ({
      id: t.id,
      empId: t.emp_id,
      date: t.date,
      trainNo: t.train_no,
      route: t.route,
      food: t.food,
      advance: t.advance,
      note: t.note,
    }))
  );
}

export async function PUT(request) {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json({ error: 'No contractor record' }, { status: 404 });

  const trips = await request.json();

  await supabase.from('trips').delete().eq('contractor_id', contractorId);

  if (trips.length > 0) {
    const { error } = await supabase.from('trips').insert(
      trips.map((t) => ({
        id: t.id,
        contractor_id: contractorId,
        emp_id: t.empId || '',
        date: t.date || '',
        train_no: t.trainNo || '',
        route: t.route || '',
        food: Number(t.food) || 0,
        advance: Number(t.advance) || 0,
        note: t.note || '',
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
