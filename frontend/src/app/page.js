import { redirect } from 'next/navigation';
import Sidebar from '@/components/sidebar';

export default function Home() {
  // Redirect to login or dashboard based on auth
  // For now, just send to login
  redirect('/login');
}