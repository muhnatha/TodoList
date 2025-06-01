'use client';
import dynamic from 'next/dynamic';

const ForgotPassword = dynamic(() => import('@/modules/forgot-password/forgot-password'), {
  ssr: false,
});

export default function ForgotPasswordPage() {
    return (
        <ForgotPassword />
    )
}