'use client';
import dynamic from 'next/dynamic';

const Log = dynamic(() => import('@/modules/settings/log/log'), {
  ssr: false,
});

export default function LogPage() {
    return (
        <Log />
    )
}