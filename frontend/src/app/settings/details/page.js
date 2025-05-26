'use client';
import dynamic from 'next/dynamic';

const Details = dynamic(() => import('@/modules/settings/details/details'), {
  ssr: false,
});

export default function DetailsPage() {
    return (
        <Details />
    )
}