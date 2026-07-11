'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import {
  Train, Users, Route, Plus, Trash2, X, ShieldCheck,
  LogOut, UserCheck, UserX, RefreshCw, Eye, EyeOff,
  Settings, CreditCard, CalendarDays, CheckCircle, Clock,
} from 'lucide-react';

const T = {
  ink: '#16233F', ink2: '#26365A', paper: '#F6F5EF', card: '#FFFFFF',
  line: '#E5E2D8', lineSoft: '#EFEDE5', slate: '#5B6472', slateSoft: '#8A909B',
  amber: '#DE8F2C', amberDk: '#A9691A', amberBg: '#FBEEDA',
  green: '#2C7A5B', greenBg: '#E7F1EC',
  red: '#BC443B', redBg: '#F8E8E6',
  purple: '#6B3FA0', purpleBg: '#F0EBF8',
};

const PLANS = [
  { value: 'trial', label: 'Trial', days: 15, color: T.amber, bg: T.amberBg },
  { value: 'trial30', label: 'Trial 30d', days: 30, color: T.amber, bg: T.amberBg },
  { value: 'basic', label: 'Basic', days: 30, color: T.green, bg: T.greenBg },
  { value: 'pro', label: 'Pro', days: 30, color: T.purple, bg: T.purpleBg },
];

const planMeta = (plan) => PLANS.find((p) => p.value === plan) || PLANS[0];

function Chip({ color, bg, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(22,35,63,0.5)' }}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl p-6`}
        style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-bold text-base" style={{ color: T.ink }}>{title}</span>
          <button onClick={onClose} className="p-1" style={{ color: T.slateSoft }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <span className="text-[11px] tracking-widest uppercase font-semibold" style={{ color: T.slateSoft }}>{children}</span>;
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

const inp = { background: T.paper, border: `1px solid ${T.line}`, color: T.ink };

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState('clients'); // 'clients' | 'settings'

  // Clients state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPlan, setCreatePlan] = useState('trial');
  const [showPwd, setShowPwd] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Subscription modal
  const [subModal, setSubModal] = useState(null); // user object
  const [subPlan, setSubPlan] = useState('basic');
  const [subLoading, setSubLoading] = useState(false);
  const [subSuccess, setSubSuccess] = useState('');

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Settings state
  const [config, setConfig] = useState({ upi_id: '', whatsapp_number: '', upi_qr_url: '', payment_note: '', basic_price: 999, pro_price: 1999 });
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configError, setConfigError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('');
    const res = await fetch('/api/admin/users');
    if (res.status === 403) { router.push('/dashboard'); return; }
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setUsers(data);
    setLoading(false);
  }, [router]);

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/admin/config');
    if (res.ok) {
      const d = await res.json();
      setConfig({
        upi_id: d.upi_id || '',
        whatsapp_number: d.whatsapp_number || '',
        upi_qr_url: d.upi_qr_url || '',
        payment_note: d.payment_note || '',
        basic_price: d.basic_price || 999,
        pro_price: d.pro_price || 1999,
      });
    }
  }, []);

  useEffect(() => { fetchUsers(); fetchConfig(); }, [fetchUsers, fetchConfig]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  // Create user + assign initial plan
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true); setCreateError(''); setCreateSuccess('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: createEmail, password: createPassword }),
    });
    const data = await res.json();
    if (data.error) { setCreateError(data.error); setCreateLoading(false); return; }

    // Assign plan — but contractor record may not exist yet (created on first login)
    // We store the plan intent; subscription will be assigned after first login creates contractor
    const meta = planMeta(createPlan);
    await fetch(`/api/admin/users/${data.user.id}/subscription`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: meta.value === 'trial30' ? 'trial' : meta.value, days: meta.days }),
    });

    setCreateSuccess(`Account created for ${createEmail}`);
    setCreateEmail(''); setCreatePassword(''); setCreatePlan('trial');
    fetchUsers();
    setCreateLoading(false);
  };

  // Toggle ban
  const handleToggle = async (user) => {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: user.banned ? 'enable' : 'disable' }),
    });
    fetchUsers();
  };

  // Delete user
  const handleDelete = async (user) => {
    await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    setConfirmDelete(null); fetchUsers();
  };

  // Update subscription
  const handleSubSave = async () => {
    setSubLoading(true); setSubSuccess('');
    const meta = planMeta(subPlan);
    const res = await fetch(`/api/admin/users/${subModal.id}/subscription`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: meta.value === 'trial30' ? 'trial' : meta.value, days: meta.days }),
    });
    const d = await res.json();
    if (d.ok) {
      setSubSuccess(`Active until ${d.end_date}`);
      fetchUsers();
    }
    setSubLoading(false);
  };

  // Save admin config
  const handleConfigSave = async (e) => {
    e.preventDefault();
    setConfigLoading(true); setConfigError(''); setConfigSaved(false);
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const d = await res.json();
    if (d.error) setConfigError(d.error);
    else setConfigSaved(true);
    setConfigLoading(false);
  };

  const totalEmployees = users.reduce((s, u) => s + u.employees, 0);
  const totalTrips = users.reduce((s, u) => s + u.trips, 0);
  const activeUsers = users.filter((u) => !u.banned).length;

  return (
    <div style={{ background: T.paper, color: T.ink, fontFamily: 'Inter, system-ui, sans-serif' }}
      className="min-h-screen w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .track{letter-spacing:.14em} .num{font-family:'IBM Plex Mono',monospace}
        .rowhover:hover{background:${T.lineSoft}}
        input:focus,select:focus,textarea:focus{outline:2px solid ${T.amber};outline-offset:1px}
      `}</style>

      <div className="mx-auto max-w-6xl px-4 md:px-6 py-5">

        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: T.ink }}>
              <Train size={20} color={T.amber} />
            </div>
            <div>
              <div className="font-extrabold text-[15px]" style={{ color: T.ink }}>
                RailPay <span style={{ color: T.amber }}>OBHS</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] track uppercase" style={{ color: T.slateSoft }}>
                <ShieldCheck size={11} /> Super Admin
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ background: T.card, border: `1px solid ${T.line}`, color: T.slate }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ background: T.card, border: `1px solid ${T.line}`, color: T.slate }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Clients', value: users.length, icon: Users, color: T.ink },
            { label: 'Active', value: activeUsers, icon: UserCheck, color: T.green },
            { label: 'Total Employees', value: totalEmployees, icon: Users, color: T.ink2 },
            { label: 'Total Trips', value: totalTrips, icon: Route, color: T.amberDk },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>{s.label}</span>
                <s.icon size={15} color={s.color} />
              </div>
              <div className="text-2xl font-extrabold num" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: T.lineSoft }}>
          {[
            { id: 'clients', label: 'Clients', icon: Users },
            { id: 'settings', label: 'Payment Settings', icon: Settings },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t.id ? T.card : 'transparent',
                color: tab === t.id ? T.ink : T.slateSoft,
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── CLIENTS TAB ── */}
        {tab === 'clients' && (
          <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.line}` }}>
              <div className="font-bold text-sm" style={{ color: T.ink }}>All Clients</div>
              <button onClick={() => { setShowCreate(true); setCreateSuccess(''); setCreateError(''); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: T.ink }}>
                <Plus size={15} /> New Client
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm" style={{ color: T.slateSoft }}>Loading…</div>
            ) : error ? (
              <div className="py-8 text-center text-sm" style={{ color: T.red }}>{error}</div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: T.slateSoft }}>
                No clients yet. Create the first one →
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 780 }}>
                  <thead>
                    <tr style={{ background: T.lineSoft }}>
                      {['Email', 'Firm', 'City', 'Emp', 'Trips', 'Plan', 'Subscription', 'Access', ''].map((h, i) => (
                        <th key={i} className="text-left px-4 py-2.5 text-[11px] track uppercase font-semibold"
                          style={{ color: T.slateSoft }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const pm = planMeta(u.plan);
                      return (
                        <tr key={u.id} className="rowhover" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                          <td className="px-4 py-3 font-medium" style={{ color: T.ink }}>{u.email}</td>
                          <td className="px-4 py-3" style={{ color: T.slate }}>{u.firm_name}</td>
                          <td className="px-4 py-3" style={{ color: T.slate }}>{u.city}</td>
                          <td className="px-4 py-3 num text-center" style={{ color: T.ink }}>{u.employees}</td>
                          <td className="px-4 py-3 num text-center" style={{ color: T.ink }}>{u.trips}</td>
                          <td className="px-4 py-3">
                            {u.plan
                              ? <Chip color={pm.color} bg={pm.bg}>{pm.label}</Chip>
                              : <span style={{ color: T.slateSoft }}>—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {u.sub_end_date ? (
                              <div>
                                <div className="text-[11px] num" style={{ color: u.sub_status === 'expired' ? T.red : T.ink }}>
                                  {u.sub_status === 'expired' ? 'Expired' : `Until ${u.sub_end_date}`}
                                </div>
                                {u.sub_status === 'active' && (
                                  <div className="text-[10px]" style={{ color: T.slateSoft }}>
                                    {u.days_left}d left
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: T.slateSoft, fontSize: 11 }}>No plan set</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.banned
                              ? <Chip color={T.red} bg={T.redBg}>Suspended</Chip>
                              : u.sub_status === 'expired'
                                ? <Chip color={T.amber} bg={T.amberBg}>Expired</Chip>
                                : <Chip color={T.green} bg={T.greenBg}>Active</Chip>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => { setSubModal(u); setSubPlan(u.plan || 'basic'); setSubSuccess(''); }}
                                title="Manage subscription"
                                className="p-1.5 rounded-md" style={{ color: T.green }}>
                                <CalendarDays size={15} />
                              </button>
                              <button onClick={() => handleToggle(u)} title={u.banned ? 'Enable' : 'Suspend'}
                                className="p-1.5 rounded-md"
                                style={{ color: u.banned ? T.green : T.amber }}>
                                {u.banned ? <UserCheck size={15} /> : <UserX size={15} />}
                              </button>
                              <button onClick={() => setConfirmDelete(u)} title="Delete"
                                className="p-1.5 rounded-md" style={{ color: T.red }}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <div className="rounded-xl p-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <div className="font-bold text-sm mb-5" style={{ color: T.ink }}>
              Payment Settings
            </div>
            <form onSubmit={handleConfigSave} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Basic Plan Price (₹/month)">
                  <input type="number" value={config.basic_price}
                    onChange={(e) => setConfig((p) => ({ ...p, basic_price: e.target.value }))}
                    className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm num"
                    style={inp} />
                </Field>
                <Field label="Pro Plan Price (₹/month)">
                  <input type="number" value={config.pro_price}
                    onChange={(e) => setConfig((p) => ({ ...p, pro_price: e.target.value }))}
                    className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm num"
                    style={inp} />
                </Field>
              </div>

              <Field label="Your UPI ID">
                <input type="text" value={config.upi_id} placeholder="yourname@upi"
                  onChange={(e) => setConfig((p) => ({ ...p, upi_id: e.target.value }))}
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                  style={inp} />
              </Field>

              <Field label="Your WhatsApp Number (with country code)">
                <input type="text" value={config.whatsapp_number} placeholder="919876543210"
                  onChange={(e) => setConfig((p) => ({ ...p, whatsapp_number: e.target.value }))}
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm num"
                  style={inp} />
              </Field>

              <Field label="UPI QR Code Image URL">
                <input type="url" value={config.upi_qr_url}
                  placeholder="https://i.ibb.co/... (upload to imgbb.com and paste link)"
                  onChange={(e) => setConfig((p) => ({ ...p, upi_qr_url: e.target.value }))}
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                  style={inp} />
                {config.upi_qr_url && (
                  <img src={config.upi_qr_url} alt="UPI QR Preview"
                    className="mt-2 w-32 h-32 rounded-xl object-contain border"
                    style={{ borderColor: T.line }} />
                )}
                <p className="text-[11px] mt-1" style={{ color: T.slateSoft }}>
                  Apna QR imgbb.com pe upload karo → link yahan paste karo
                </p>
              </Field>

              <Field label="Payment Instructions (shown to client)">
                <textarea value={config.payment_note} rows={3}
                  onChange={(e) => setConfig((p) => ({ ...p, payment_note: e.target.value }))}
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ ...inp, resize: 'vertical' }} />
              </Field>

              {configError && (
                <div className="text-sm rounded-lg px-3 py-2" style={{ color: T.red, background: T.redBg }}>
                  {configError}
                </div>
              )}
              {configSaved && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
                  style={{ color: T.green, background: T.greenBg }}>
                  <CheckCircle size={15} /> Settings saved!
                </div>
              )}

              <button type="submit" disabled={configLoading}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: T.ink, opacity: configLoading ? 0.7 : 1 }}>
                {configLoading ? 'Saving…' : 'Save Settings'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── CREATE CLIENT MODAL ── */}
      {showCreate && (
        <Modal title="Create Client Account" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Email">
              <input type="email" value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)} required
                placeholder="contractor@example.com"
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                style={inp} />
            </Field>

            <Field label="Password">
              <div className="relative mt-1">
                <input type={showPwd ? 'text' : 'password'} value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)} required
                  placeholder="Min 8 characters"
                  className="w-full rounded-lg px-3 py-2.5 text-sm pr-10"
                  style={inp} />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: T.slateSoft }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            <Field label="Plan">
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PLANS.map((p) => (
                  <button key={p.value} type="button"
                    onClick={() => setCreatePlan(p.value)}
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold text-left"
                    style={{
                      background: createPlan === p.value ? p.bg : T.paper,
                      border: `2px solid ${createPlan === p.value ? p.color : T.line}`,
                      color: createPlan === p.value ? p.color : T.slate,
                    }}>
                    <div>{p.label}</div>
                    <div className="text-[10px] font-normal" style={{ color: T.slateSoft }}>
                      {p.days} days
                    </div>
                  </button>
                ))}
              </div>
            </Field>

            {createError && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ color: T.red, background: T.redBg }}>
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
                style={{ color: T.green, background: T.greenBg }}>
                <CheckCircle size={14} /> {createSuccess}
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
                {createLoading ? 'Creating…' : 'Create Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── SUBSCRIPTION MODAL ── */}
      {subModal && (
        <Modal title={`Subscription — ${subModal.email}`} onClose={() => setSubModal(null)}>
          <div className="space-y-4">
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: T.lineSoft }}>
              <div style={{ color: T.slateSoft }}>Current status</div>
              <div className="font-semibold mt-0.5" style={{ color: T.ink }}>
                {subModal.sub_status === 'active'
                  ? `Active · ${subModal.days_left} days left (until ${subModal.sub_end_date})`
                  : subModal.sub_status === 'expired'
                    ? `Expired on ${subModal.sub_end_date}`
                    : 'No subscription'}
              </div>
            </div>

            <div>
              <Label>Assign / Extend Plan</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PLANS.map((p) => (
                  <button key={p.value} type="button"
                    onClick={() => setSubPlan(p.value)}
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold text-left"
                    style={{
                      background: subPlan === p.value ? p.bg : T.paper,
                      border: `2px solid ${subPlan === p.value ? p.color : T.line}`,
                      color: subPlan === p.value ? p.color : T.slate,
                    }}>
                    <div>{p.label}</div>
                    <div className="text-[10px] font-normal" style={{ color: T.slateSoft }}>{p.days} days from today</div>
                  </button>
                ))}
              </div>
            </div>

            {subSuccess && (
              <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
                style={{ color: T.green, background: T.greenBg }}>
                <CheckCircle size={14} /> Subscription updated! {subSuccess}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setSubModal(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>
                Close
              </button>
              <button onClick={handleSubSave} disabled={subLoading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: T.green, opacity: subLoading ? 0.7 : 1 }}>
                {subLoading ? 'Saving…' : 'Activate / Extend'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {confirmDelete && (
        <Modal title="Delete Client?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm mb-5" style={{ color: T.slate }}>
            <strong style={{ color: T.ink }}>{confirmDelete.email}</strong> ka account aur unka saara data
            permanently delete ho jayega. Yeh wapas nahi aayega.
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
