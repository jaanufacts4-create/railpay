import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helper';
import { createAdminClient } from '@/lib/supabase-admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const checkAdmin = (user) => !!(user && user.email === ADMIN_EMAIL);

// POST — import staff for a client (by their auth user id)
export async function POST(request, { params }) {
  const { user } = await getAuthUser();
  if (!checkAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { employees } = await request.json();
  if (!Array.isArray(employees) || employees.length === 0)
    return NextResponse.json({ error: 'No employees provided' }, { status: 400 });

  const admin = createAdminClient();

  // Get contractor_id from auth user id
  const { data: contractor } = await admin
    .from('contractors')
    .select('id')
    .eq('user_id', params.id)
    .single();

  if (!contractor) return NextResponse.json({ error: 'Client has no firm set up yet. Ask them to log in once first.' }, { status: 404 });

  const { error } = await admin.from('employees').insert(
    employees.map((e) => ({
      id: e.id,
      contractor_id: contractor.id,
      emp_id: e.empId || '',
      name: e.name || '',
      designation: e.designation || '',
      per_trip: Number(e.perTrip) || 0,
      phone: e.phone || '',
      status: 'active',
      remarks: e.remarks || '',
    }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, imported: employees.length });
}
