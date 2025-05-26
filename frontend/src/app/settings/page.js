'use client';
import dynamic from 'next/dynamic';

const Settings = dynamic(() => import('@/modules/settings/settings'), {
  ssr: false,
});

export default function SettingsPage() {
    return (
        <Settings />
    )
}