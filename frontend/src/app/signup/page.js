'use client';
import dynamic from 'next/dynamic';

const SignUp = dynamic(() => import('@/modules/signup/signup'), {
  ssr: false,
});

export default function SignUpPage() {
    return (
        <SignUp />
    )
}