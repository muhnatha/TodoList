'use client';
import dynamic from 'next/dynamic';

const Password = dynamic(() => import('@/modules/settings/password/password'), {
  ssr: false,
});

export default function PasswordPage() {
    return (
        <Password />
    )
}