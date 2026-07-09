import { redirect } from 'next/navigation';

// Root "/" always redirects to dashboard.
// If the user is not logged in, the middleware will redirect them to /login.
export default function Home() {
  redirect('/dashboard');
}
