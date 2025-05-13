import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to login or dashboard based on auth
  // For now, just send to login
  redirect('/login');
}