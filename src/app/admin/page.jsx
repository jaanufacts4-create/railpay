'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import {
  Train, Users, Route, Plus, Trash2, X, ShieldCheck,
  LogOut, UserCheck, UserX, RefreshCw, Eye, EyeOff,
} from 'lucide-react';

const T = {
  ink: '#16233F', ink2: '#26365A', paper: '#F6F5EF', card: '#FFFFFF',
  line: '#E5E2D8', lineSoft: '#EFEDE5', slate: '#5B6472', slateSoft: '#8A909B',
  amber: '#DE8F2C', amberDk: '#A9691A', amberBg: '#FBEEDA',
  green: '#2C7A5B', greenBg: '#E7F1EC',
  red: '#BC443B', redBg: '#F8E8E6',
};

function Chip({ color, bg, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(22,35,63,0.45)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-bold text-base" style={{ color: T.ink }}>{title}</span>
          <button onClick={onClose} className="p-1" style={{ color: T.slateSoft }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // user object

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/users');
    if (res.status === 403) {
      router.push('/dashboard');
      return;
    }
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setUsers(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: createEmail, password: createPassword }),
    });
    const data = await res.json();
    if (data.error) {
      setCreateError(data.error);
    } else {
      setCreateSuccess(`✓ Account created for ${createEmail}`);
      setCreateEmail('');
      setCreatePassword('');
      fetchUsers();
    }
    setCreateLoading(false);
  };

  const handleToggle = async (user) => {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: user.banned ? 'enable' : 'disable' }),
    });
    fetchUsers();
  };

  const handleDelete = async (user) => {
    await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    fetchUsers();
  };

  const totalEmployees = users.reduce((s, u) => s + u.employees, 0);
  const totalTrips = users.reduce((s, u) => s + u.trips, 0);
  const activeUsers = users.filter((u) => !u.banned).length;

  return (
    <div style={{ background: T.paper, color: T.ink, fontFamily: 'Inter, system-ui, sans-serif' }}
      className="min-h-screen w-full">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .track{letter-spacing:.14em} .num{font-family:'IBM Plex Mono',monospace}
        .rowhover:hover{background:${T.lineSoft}}
        input:focus{outline:2px solid ${T.amber};outline-offset:1px}`}</style>

      <div className="mx-auto max-w-5xl px-4 md:px-6 py-5">

        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ background: T.ink }}>
              <Train size={20} color={T.amber} />
            </div>
            <div>
              <div className="font-extrabold text-[15px]" style={{ color: T.ink }}>
                RailPay <span style={{ color: T.amber }}>OBHS</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] track uppercase"
                style={{ color: T.slateSoft }}>
                <ShieldCheck size={11} />
                Super Admin
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchUsers}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ background: T.card, border: `1px solid ${T.line}`, color: T.slate }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ background: T.card, border: `1px solid ${T.line}`, color: T.slate }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Contractors', value: users.length, icon: Users, color: T.ink },
            { label: 'Active', value: activeUsers, icon: UserCheck, color: T.green },
            { label: 'Total Employees', value: totalEmployees, icon: Users, color: T.ink2 },
            { label: 'Total Trips', value: totalTrips, icon: Route, color: T.amberDk },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4"
              style={{ background: T.card, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>
                  {s.label}
                </span>
                <s.icon size={15} color={s.color} />
              </div>
              <div className="text-2xl font-extrabold num" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="rounded-xl overflow-hidden mb-4"
          style={{ background: T.card, border: `1px solid ${T.line}` }}>

          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${T.line}` }}>
            <div className="font-bold text-sm" style={{ color: T.ink }}>Contractors</div>
            <button onClick={() => { setShowCreate(true); setCreateSuccess(''); setCreateError(''); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: T.ink }}>
              <Plus size={15} /> Create User
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm" style={{ color: T.slateSoft }}>Loading…</div>
          ) : error ? (
            <div className="py-8 text-center text-sm" style={{ color: T.red }}>{error}</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: T.slateSoft }}>
              No contractors yet. Create the first one →
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 700 }}>
                <thead>
                  <tr style={{ background: T.lineSoft }}>
                    {['Email', 'Firm', 'City', 'Employees', 'Trips', 'Status', ''].map((h, i) => (
                      <th key={i} className="text-left px-4 py-2.5 text-[11px] track uppercase font-semibold"
                        style={{ color: T.slateSoft }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="rowhover" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                      <td className="px-4 py-3 font-medium" style={{ color: T.ink }}>{u.email}</td>
                      <td className="px-4 py-3" style={{ color: T.slate }}>{u.firm_name}</td>
                      <td className="px-4 py-3" style={{ color: T.slate }}>{u.city}</td>
                      <td className="px-4 py-3 num text-center" style={{ color: T.ink }}>{u.employees}</td>
                      <td className="px-4 py-3 num text-center" style={{ color: T.ink }}>{u.trips}</td>
                      <td className="px-4 py-3">
                        {u.banned
                          ? <Chip color={T.red} bg={T.redBg}>Disabled</Chip>
                          : u.confirmed
                            ? <Chip color={T.green} bg={T.greenBg}>Active</Chip>
                            : <Chip color={T.amberDk} bg={T.amberBg}>Unconfirmed</Chip>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleToggle(u)} title={u.banned ? 'Enable user' : 'Disable user'}
                            className="p-1.5 rounded-md"
                            style={{ color: u.banned ? T.green : T.amber }}>
                            {u.banned ? <UserCheck size={15} /> : <UserX size={15} />}
                          </button>
                          <button onClick={() => setConfirmDelete(u)} title="Delete user"
                            className="p-1.5 rounded-md" style={{ color: T.red }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <Modal title="Create Contractor Account" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <label className="block">
              <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>
                Email
              </span>
              <input type="email" value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)} required
                placeholder="contractor@example.com"
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
            </label>
            <label className="block">
              <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>
                Password
              </span>
              <div className="relative mt-1">
                <input type={showPwd ? 'text' : 'password'} value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)} required
                  placeholder="Min 8 characters"
                  className="w-full rounded-lg px-3 py-2.5 text-sm pr-10"
                  style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: T.slateSoft }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            {createError && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ color: T.red, background: T.redBg }}>
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ color: T.green, background: T.greenBg }}>
                {createSuccess}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>
                Cancel
              </button>
              <button type="submit" disabled={createLoading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: T.ink, opacity: createLoading ? 0.7 : 1 }}>
                {createLoading ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <Modal title="Delete User?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm mb-5" style={{ color: T.slate }}>
            <strong style={{ color: T.ink }}>{confirmDelete.email}</strong> ka account aur unka saara data
            (firm, employees, trips) permanently delete ho jayega. Yeh wapas nahi aayega.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>
              Cancel
            </button>
            <button onClick={() => handleDelete(confirmDelete)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: T.red }}>
              Haan, Delete Karo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
