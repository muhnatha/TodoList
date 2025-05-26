'use client';
import dynamic from 'next/dynamic';

const About = dynamic(() => import('@/modules/about/about'), {
  ssr: false,
});

export default function AboutPage() {
    return (
        <About />
    )
}