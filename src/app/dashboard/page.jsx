'use client';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import RailPayOBHS from '@/components/RailPayOBHS';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return <RailPayOBHS onLogout={handleLogout} />;
}
