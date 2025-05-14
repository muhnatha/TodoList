'use client'
import React from 'react'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'

export default function PageLayout({ title, children }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <div className='z-10'>
            <Sidebar />
        </div>
        <div className='flex flex-col overflow-y-auto flex-1'>
            <header className='sticky top-0 z-10 w-full bg-white p-6'>
                <Header title={title}/>
            </header>
            <main className="flex-1 p-6">
                { children }
            </main>
        </div>
     </div>
   );
}
