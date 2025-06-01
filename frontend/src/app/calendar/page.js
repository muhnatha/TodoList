'use client';
import dynamic from 'next/dynamic';

const Calendar = dynamic(() => import('@/modules/calendar/calendar'), {
  ssr: false,
});

export default function CalendarPage() {
    return (
        <Calendar />
    )
}