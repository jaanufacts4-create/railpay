import { NextResponse } from 'next/server';
import { getAuthUser, getContractorId } from '@/lib/api-helper';

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json([]);

  const { data } = await supabase
    .from('trains')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('created_at');

  return NextResponse.json(
    (data || []).map((t) => ({
      id: t.id,
      trainNo: t.train_no,
      name: t.name,
      route: t.route,
      days: t.days || [],
      ehk: t.ehk,
      janitors: t.janitors,
      tripHours: t.trip_hours,
      type: t.type,
      validFrom: t.valid_from,
      validTo: t.valid_to,
      cancelledDates: t.cancelled_dates || [],
    }))
  );
}

export async function PUT(request) {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json({ error: 'No contractor record' }, { status: 404 });

  const trains = await request.json();

  await supabase.from('trains').delete().eq('contractor_id', contractorId);

  if (trains.length > 0) {
    const { error } = await supabase.from('trains').insert(
      trains.map((t) => ({
        id: t.id,
        contractor_id: contractorId,
        train_no: t.trainNo || '',
        name: t.name || '',
        route: t.route || '',
        days: t.days || [],
        ehk: Number(t.ehk) || 1,
        janitors: Number(t.janitors) || 0,
        trip_hours: Number(t.tripHours) || 0,
        type: t.type || 'regular',
        valid_from: t.validFrom || null,
        valid_to: t.validTo || null,
        cancelled_dates: t.cancelledDates || [],
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
