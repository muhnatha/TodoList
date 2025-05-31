import React from 'react'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'
import { supabase } from '@/lib/supabaseClient'

export default function PageLayout({ title, children }) {
  return (
    <div className={`flex h-screen ${title.toLowerCase() === 'dashboard' ? 'bg-[#F3F4F8]' : 'bg-white'} dark:bg-slate-950 text-slate-900 dark:text-slate-50`}>
        <div className='z-20'>
            <Sidebar />
        </div>
        <div className='flex flex-col overflow-y-auto flex-1'>
            <header className={`sticky top-0 z-10 w-full p-3 ${title.toLowerCase() === 'dashboard' ? 'bg-white' : 'bg-[#FBFAFF]'}`}>
                <Header title={title} supabase={supabase} />
            </header>
            <main className="flex-1 p-6">
                { children }
            </main>
        </div>
     </div>
   );
}