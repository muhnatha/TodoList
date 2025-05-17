import React from 'react'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'

export default function PageLayout({ title, children }) {
  return (
    <div className={`flex h-screen ${title.toLowerCase() === 'dashboard' ? 'bg-[#F3F4F8]' : 'bg-white'} dark:bg-slate-950 text-slate-900 dark:text-slate-50`}>
        <div className='z-20'>
            <Sidebar />
        </div>
        <div className='flex flex-col overflow-y-auto flex-1'>
            <header className={`sticky top-0 z-10 w-full ${title.toLowerCase() === 'dashboard' ? 'bg-white' : 'bg-[#FBFAFF]'} p-6`}>
                <Header title={title}/>
            </header>
            <main className="flex-1 p-6">
                { children }
            </main>
        </div>
     </div>
   );
}