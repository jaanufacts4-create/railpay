'use client';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RailPayOBHS from '@/components/RailPayOBHS';
import PaymentWall from '@/components/PaymentWall';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [subState, setSubState] = useState(null); // null = loading

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((d) => setSubState(d))
      .catch(() => setSubState({ status: 'active' })); // fail open
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Still checking
  if (!subState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F6F5EF', fontFamily: 'Inter, system-ui, sans-serif', color: '#8A909B', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  // Subscription expired or suspended — show payment wall
  if (subState.status === 'expired' || subState.status === 'suspended') {
    return <PaymentWall sub={subState} onLogout={handleLogout} />;
  }

  // Active — show the app (with optional expiry warning banner)
  return (
    <>
      {subState.status === 'active' && subState.daysLeft <= 5 && subState.plan !== 'grace' && (
        <div style={{
          background: '#FBEEDA', borderBottom: '1px solid #DE8F2C',
          padding: '8px 16px', textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, color: '#A9691A',
        }}>
          ⚠️ Your {subState.plan} plan expires in <strong>{subState.daysLeft} day{subState.daysLeft !== 1 ? 's' : ''}</strong>. Contact your service provider to renew.
        </div>
      )}
      <RailPayOBHS onLogout={handleLogout} />
    </>
  );
}
