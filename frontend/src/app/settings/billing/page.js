'use client';
import dynamic from 'next/dynamic';

const Billing = dynamic(() => import('@/modules/settings/billing/billing'), {
  ssr: false,
});

export default function BillingPage() {
    return (
        <Billing />
    )
}