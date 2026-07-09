'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Train } from 'lucide-react';

const T = {
  ink: '#16233F', paper: '#F6F5EF', card: '#FFFFFF',
  line: '#E5E2D8', slateSoft: '#8A909B', amber: '#DE8F2C', red: '#BC443B',
  green: '#2C7A5B', greenBg: '#E7F1EC',
};

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess('Account created! Check your email to confirm, then sign in.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{ background: T.paper, fontFamily: 'Inter, system-ui, sans-serif' }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        input:focus { outline: 2px solid ${T.amber}; outline-offset: 1px; }`}</style>

      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: T.ink }}
          >
            <Train size={20} color={T.amber} />
          </div>
          <div>
            <div className="font-extrabold text-lg" style={{ color: T.ink }}>
              RailPay <span style={{ color: T.amber }}>OBHS</span>
            </div>
            <div className="text-xs" style={{ color: T.slateSoft }}>
              Create your contractor account
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: T.card, border: `1px solid ${T.line}` }}
        >
          {success ? (
            <div className="text-center py-4">
              <div
                className="rounded-lg px-4 py-3 text-sm font-semibold mb-4"
                style={{ background: T.greenBg, color: T.green }}
              >
                {success}
              </div>
              <a href="/login" style={{ color: T.ink, fontWeight: 700 }}>
                Go to sign in →
              </a>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <label className="block">
                <span
                  className="text-xs font-semibold uppercase"
                  style={{ color: T.slateSoft, letterSpacing: '0.1em' }}
                >
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
                />
              </label>

              <label className="block">
                <span
                  className="text-xs font-semibold uppercase"
                  style={{ color: T.slateSoft, letterSpacing: '0.1em' }}
                >
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
                />
              </label>

              <label className="block">
                <span
                  className="text-xs font-semibold uppercase"
                  style={{ color: T.slateSoft, letterSpacing: '0.1em' }}
                >
                  Confirm password
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
                />
              </label>

              {error && (
                <div className="text-sm rounded-lg px-3 py-2" style={{ color: T.red, background: '#F8E8E6' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-bold text-white mt-2 transition-opacity"
                style={{ background: T.ink, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {!success && (
            <p className="text-center text-sm mt-5" style={{ color: T.slateSoft }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: T.ink, fontWeight: 700 }}>
                Sign in
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
