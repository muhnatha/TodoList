'use client';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/modules/dashboard/dashboard'), {
  ssr: false,
});

export default function DashboardPage() {
    return (
        <Dashboard />
    )
}