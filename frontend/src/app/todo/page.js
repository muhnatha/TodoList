'use client';
import dynamic from 'next/dynamic';

const Todo = dynamic(() => import('@/modules/todo/todo'), {
  ssr: false,
});

export default function TodoPage() {
    return (
        <Todo />
    )
}