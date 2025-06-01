'use client';
import dynamic from 'next/dynamic';

const Login = dynamic(() => import('@/modules/login/login'), {
  ssr: false,
});

export default function LoginPage() {
    return (
        <Login />
    )
}