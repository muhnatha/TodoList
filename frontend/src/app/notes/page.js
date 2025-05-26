'use client';
import dynamic from 'next/dynamic';

const Notes = dynamic(() => import('@/modules/notes/notes'), {
  ssr: false,
});

export default function NotesPage() {
    return (
        <Notes />
    )
}