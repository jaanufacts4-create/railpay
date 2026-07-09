import { NextResponse } from 'next/server';
import { getAuthUser, getContractorId } from '@/lib/api-helper';

export async function GET() {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json([]);

  const { data } = await supabase
    .from('employees')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('created_at');

  return NextResponse.json(
    (data || []).map((e) => ({
      id: e.id,
      empId: e.emp_id,
      name: e.name,
      designation: e.designation,
      perTrip: e.per_trip,
      phone: e.phone,
      status: e.status,
      remarks: e.remarks,
    }))
  );
}

export async function PUT(request) {
  const { supabase, user } = await getAuthUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const contractorId = await getContractorId(supabase, user.id);
  if (!contractorId) return NextResponse.json({ error: 'No contractor record' }, { status: 404 });

  const employees = await request.json();

  await supabase.from('employees').delete().eq('contractor_id', contractorId);

  if (employees.length > 0) {
    const { error } = await supabase.from('employees').insert(
      employees.map((e) => ({
        id: e.id,
        contractor_id: contractorId,
        emp_id: e.empId || '',
        name: e.name || '',
        designation: e.designation || '',
        per_trip: Number(e.perTrip) || 0,
        phone: e.phone || '',
        status: e.status || 'active',
        remarks: e.remarks || '',
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
