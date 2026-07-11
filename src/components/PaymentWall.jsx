'use client';
import { Train, LogOut, MessageCircle, QrCode, Clock } from 'lucide-react';

const T = {
  ink: '#16233F', paper: '#F6F5EF', card: '#FFFFFF',
  line: '#E5E2D8', slate: '#5B6472', slateSoft: '#8A909B',
  amber: '#DE8F2C', amberDk: '#A9691A', amberBg: '#FBEEDA',
  red: '#BC443B', redBg: '#F8E8E6',
};

const PLAN_LABELS = { trial: 'Trial', basic: 'Basic', pro: 'Pro' };

export default function PaymentWall({ sub, onLogout }) {
  const cfg = sub.config || {};
  const isSuspended = sub.status === 'suspended';

  const planLabel = PLAN_LABELS[sub.plan] || sub.plan || 'Trial';

  const whatsappMsg = encodeURIComponent(
    `Hi! I have made the payment for RailPay OBHS renewal (${planLabel} plan). Please activate my account.\n\nEmail: (your registered email)`
  );
  const whatsappUrl = cfg.whatsapp_number
    ? `https://wa.me/${cfg.whatsapp_number}?text=${whatsappMsg}`
    : null;

  return (
    <div style={{ minHeight: '100vh', background: T.paper, fontFamily: 'Inter, system-ui, sans-serif' }}
      className="flex flex-col items-center justify-center px-4 py-8">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .track{letter-spacing:.14em}`}</style>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: T.ink }}>
          <Train size={22} color={T.amber} />
        </div>
        <div>
          <div className="text-lg font-extrabold" style={{ color: T.ink }}>
            RailPay <span style={{ color: T.amber }}>OBHS</span>
          </div>
          <div className="text-[11px] track uppercase" style={{ color: T.slateSoft }}>
            Trip-based staff payroll
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Status card */}
        <div className="rounded-2xl p-5 mb-4 text-center"
          style={{ background: isSuspended ? T.redBg : T.amberBg, border: `1px solid ${isSuspended ? T.red : T.amber}` }}>
          <Clock size={28} color={isSuspended ? T.red : T.amberDk} className="mx-auto mb-2" />
          <div className="font-extrabold text-lg mb-1" style={{ color: isSuspended ? T.red : T.amberDk }}>
            {isSuspended ? 'Account Suspended' : 'Subscription Expired'}
          </div>
          <div className="text-[13px]" style={{ color: isSuspended ? T.red : T.amberDk }}>
            {isSuspended
              ? 'Your account has been suspended. Please contact your service provider.'
              : `Your ${planLabel} plan has expired. Renew to continue using RailPay OBHS.`
            }
          </div>
        </div>

        {/* Payment card */}
        {!isSuspended && (
          <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <div className="text-sm font-bold mb-4" style={{ color: T.ink }}>Renew Your Plan</div>

            {/* UPI QR */}
            {cfg.upi_qr_url ? (
              <div className="flex justify-center mb-4">
                <img src={cfg.upi_qr_url} alt="UPI QR Code"
                  className="w-44 h-44 rounded-xl object-contain"
                  style={{ border: `1px solid ${T.line}` }} />
              </div>
            ) : (
              <div className="flex items-center justify-center w-44 h-44 rounded-xl mx-auto mb-4"
                style={{ background: T.paper, border: `2px dashed ${T.line}` }}>
                <div className="text-center">
                  <QrCode size={32} color={T.slateSoft} className="mx-auto mb-1" />
                  <div className="text-[11px]" style={{ color: T.slateSoft }}>QR not set</div>
                </div>
              </div>
            )}

            {/* UPI ID */}
            {cfg.upi_id && (
              <div className="text-center mb-3">
                <div className="text-[11px] track uppercase font-semibold mb-1" style={{ color: T.slateSoft }}>
                  UPI ID
                </div>
                <div className="font-bold text-[15px]" style={{ color: T.ink, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {cfg.upi_id}
                </div>
              </div>
            )}

            {/* Payment note */}
            {cfg.payment_note && (
              <div className="text-[12px] text-center mb-4 px-2" style={{ color: T.slate }}>
                {cfg.payment_note}
              </div>
            )}

            {/* WhatsApp button */}
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white mb-2"
                style={{ background: '#25D366' }}>
                <MessageCircle size={17} />
                I&apos;ve Paid — Notify on WhatsApp
              </a>
            )}

            <div className="text-[11px] text-center" style={{ color: T.slateSoft }}>
              After payment, your provider will activate your account within a few hours.
            </div>
          </div>
        )}

        {/* Logout */}
        <button onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>
          <LogOut size={15} /> Logout
        </button>
      </div>
    </div>
  );
}
