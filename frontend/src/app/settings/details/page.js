'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { UserCircleIcon, PencilIcon, Edit, LogOut } from "lucide-react"
import { usePathname } from 'next/navigation'
import Link from "next/link"
import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SettingsDetailsPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isFirstNameDisabled, setIsFirstNameDisabled] = useState(true);
  const [isLastNameDisabled, setIsLastNameDisabled] = useState(true);
  const [isEmailDisabled, setIsEmailDisabled] = useState(true);
  const [isPhoneDisabled, setIsPhoneDisabled] = useState(true);
  const pathname = usePathname();
  const router = useRouter(); 

  const handleSave = async (e) => {
    e.preventDefault();
    // bantu isi cara save modificationnya
  };

  const handleLogOut = async (e) => {
    e.preventDefault();

    const confirmLogout = window.confirm('Apakah kamu yakin ingin logout?');
    if (!confirmLogout) {
        return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Gagal logout:', error.message);
    } else {
        console.log('Logout berhasil');
        router.push('/login');
    }

  };

  const navSettings = [
        { href: "/settings/details", text: "My Details"},
        { href: "/settings/password", text: "Password"},
        { href: "/settings/billing", text: "Billing"},
        { href: "/settings/log", text: "Activity Log"}
    ];

  const renderNavSettings = (item, index) => (
      <li key={index}>
          {
              <a
                  href={item.href}
                  className={`hover:opacity-100 ${pathname === item.href ? 'opacity-100' : 'opacity-20'} text-sm sm:text-md text-[#232360]`}
              >
                  {item.text}
              </a>
          }
      </li>
  );

  return (
    <PageLayout title="SETTINGS">
      <div className="w-full h-2/5 relative">
        <Image 
          src="/bg-settings.svg"
          alt="Background Settings" 
          fill 
          style={{ objectFit: 'cover' }} 
          priority 
        />
      </div>

      <form onSubmit={handleSave}>
        <div className="z-10 py-6 pl-5 min-[636px]:pl-15 mt-[-60] flex justify-between items-end">
            <div className="flex items-end space-x-7">
                <div className="relative">
                <UserCircleIcon  
                    width={96}
                    height={96}
                    className="rounded-full bg-white"
                    style={{ objectFit: 'cover' }}
                />
                <button 
                    aria-label="Edit profile picture"
                    className="absolute bottom-1 right-1 bg-[#232360] text-white rounded-full p-1.5 flex items-center justify-center hover:cursor-pointer"
                >
                    <PencilIcon className="w-4 h-4" />
                </button>
                </div>
                <h1 className="text-2xl sm:text-3xl pb-1 font-bold text-[#232360]">
                Settings
                </h1>
            </div>

            <div className="flex space-x-3">
                <Link href='/settings' className="border-3 rounded-lg bg-white py-2 px-4 hover:cursor-pointer font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-md">
                Cancel
                </Link>
                <button onClick={handleSave} className="rounded-lg bg-[#5051F9] py-2 px-4 hover:cursor-pointer font-semibold text-white hover:bg-indigo-700 transition-colors text-sm sm:text-md">
                Save
                </button>
            </div>
            </div>

        <div className="p-6"> 
            <nav className="text-black font-semibold">
            <ul className="flex flex-row gap-10 min-[636px]:px-10">
                {navSettings.map(renderNavSettings)}
            </ul>
            </nav>
        </div>

        <div className="p-6 min-[636px]:pl-16">
            <div className="flex flex-col gap-5">
                <div className="flex flex-row gap-10 w-full lg:w-1/2">
                    <div className="flex flex-col w-1/2">
                        <label className="text-[#232360]">First Name</label>
                        <div className="flex flex-row relative">
                            <input 
                            type='text'
                            id='firstName' 
                            className={`block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold w-full ${isFirstNameDisabled ? 'hover:cursor-not-allowed bg-gray-100' : 'hover:cursor-text bg-white/50'}`} 
                            value={firstName} onChange={(e) => setFirstName(e.target.value)} 
                            disabled={isFirstNameDisabled}/>
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setIsFirstNameDisabled((prev) => !prev);
                                }}
                            >
                                <Edit className='opacity-50 hover:cursor-pointer' />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col w-1/2">
                        <label className="text-[#232360]">Last Name</label>
                        <div className="flex flex-row relative">
                            <input 
                            type='text'
                            id='lastName' 
                            className={`block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold w-full ${isLastNameDisabled ? 'hover:cursor-not-allowed bg-gray-100' : 'hover:cursor-text bg-white/50'}`}
                            value={lastName} onChange={(e) => setLastName(e.target.value)} 
                            disabled={isLastNameDisabled}/>
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setIsLastNameDisabled((prev) => !prev);
                                }}
                            >
                                <Edit className='opacity-50 hover:cursor-pointer'/>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row gap-10 border-b-1 pb-5 w-full lg:w-1/2">
                    <div className="flex flex-col w-1/2">
                        <label className="text-[#232360]">Email</label>
                        <div className="flex flex-row relative">
                            <input 
                            type='email' 
                            id='email' 
                            className={`block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold w-full ${isEmailDisabled ? 'hover:cursor-not-allowed bg-gray-100' : 'hover:cursor-text bg-white/50'}`} 
                            value={email} onChange={(e) => setEmail(e.target.value)} 
                            disabled={isEmailDisabled}/>
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setIsEmailDisabled((prev) => !prev);
                                }}
                            >
                                <Edit className='opacity-50 hover:cursor-pointer' />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col w-1/2">
                        <label className="text-[#232360]">Phone</label>
                        <div className="flex flex-row relative">
                            <input 
                            type='phone' 
                            id='phone' 
                            className={`block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold w-full ${isPhoneDisabled ? 'hover:cursor-not-allowed bg-gray-100' : 'hover:cursor-text bg-white/50'}`}
                            value={phone} onChange={(e) => setPhone(e.target.value)} 
                            disabled={isPhoneDisabled}
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setIsPhoneDisabled((prev) => !prev);
                                }}
                            >
                                <Edit className='opacity-50 hover:cursor-pointer' />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </form>
      <div className="pl-6 min-[636px]:pl-15 pb-5">
        <div className="border-1 rounded-lg w-2/3 md:w-1/2 text-[#232360]">
            <p className="px-5 pt-5">Your package</p>
            <div className="flex flex-row justify-between items-center px-5 ">
                <h1 className="font-bold text-3xl md:text-4xl">Free</h1>
                <Image src="/toogas2.svg" alt="Toogas" width={96} height={96}/>
            </div>
            <div className="flex flex-row gap-1">
                <p className="opacity-50 pl-5 pb-5 text-sm">Choose another package!</p> 
                <a href="/settings/billing" className="opacity-100 text-sm hover:underline">Click Here!</a>
            </div>
        </div>
      </div>
      <div className="md:absolute md:bottom-0 md:right-0 md:pr-6 pb-5 pl-6 min-[636px]:pl-15 md:pl-0">
        <button onClick={handleLogOut} className="bg-[#F54D4D] rounded-sm px-4 py-2 text-white font-semibold text-sm flex flex-row gap-10 justify-between items-center hover:cursor-pointer hover:bg-[rgb(245,10,10)]">
            Logout
            <LogOut className="text-white text-sm"/>
        </button>
      </div>
    </PageLayout>
  );
}