'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { UserCircleIcon, PencilIcon, LucideEye, LucideEyeClosed } from "lucide-react"
import { usePathname } from 'next/navigation'
import Link from "next/link"
import { useState } from 'react'

export default function SettingsPasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewConfirm, setShowNewConfirm] = useState(false);

  const pathname = usePathname();

  const handleSave = async (e) => {
    e.preventDefault();

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
                    className={`hover:opacity-100 ${pathname === item.href ? 'opacity-100' : 'opacity-20'}`}
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
        <div className="z-10 py-6 pl-15 mt-[-60] flex justify-between items-end">
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
                <h1 className="text-3xl pb-1 font-bold text-[#232360]">
                Settings
                </h1>
            </div>

            <div className="flex space-x-3">
                <Link href='/settings' className="border-3 rounded-lg bg-white py-2 px-4 hover:cursor-pointer font-semibold hover:bg-gray-200 transition-colors">
                Cancel
                </Link>
                <button onClick={handleSave} className="rounded-lg bg-[#5051F9] py-2 px-4 hover:cursor-pointer font-semibold text-white hover:bg-indigo-700 transition-colors">
                Save
                </button>
            </div>
            </div>

        <div className="p-6"> 
            <nav className="text-black font-semibold">
            <ul className="flex flex-row gap-10 px-10 ">
                {navSettings.map(renderNavSettings)}
            </ul>
            </nav>
        </div>

        <div className="p-6 pl-16">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col">
                    <label>Old Password</label>
                    <div className="flex flex-row relative w-1/4">
                        <input 
                        type={showOldPassword ? 'text' : 'password'} 
                        id='confirm' 
                        className='block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold bg-white/50 w-full' 
                        value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} 
                        required 
                        placeholder='XXXXXXXXXXX'/>
                        <button
                            type="button"
                            className="absolute right-2 top-3 flex items-center
                                    text-black dark:text-white
                                        text-sm font-medium"
                            onClick={() => {
                                setShowOldPassword((prev) => !prev);
                            }}
                        >
                        {showOldPassword ? 
                            <LucideEye className='opacity-50 hover:cursor-pointer' /> : <LucideEyeClosed className='opacity-50 hover:cursor-pointer' />}
                        </button>
                    </div>
                </div>
                <div className="flex flex-row gap-10">
                    <div className="flex flex-col w-1/4">
                        <label>New Password</label>
                        <div className="flex flex-row relative">
                            <input 
                            type={showNewPassword ? 'text' : 'password'} 
                            id='confirm' 
                            className='block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold bg-white/50 w-full' 
                            value={newPassword} onChange={(e) => setNewPassword(e.target.value)} 
                            required 
                            placeholder='Enter your password'/>
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setShowNewPassword((prev) => !prev);
                                }}
                            >
                            {showNewPassword ? 
                                <LucideEye className='opacity-50 hover:cursor-pointer' /> : <LucideEyeClosed className='opacity-50 hover:cursor-pointer' />}
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col w-1/4">
                        <label>Confirm New Password</label>
                        <div className="flex flex-row relative">
                            <input 
                            type={showNewConfirm ? 'text' : 'password'} 
                            id='confirm' 
                            className='block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold bg-white/50 w-full' 
                            value={newConfirm} onChange={(e) => setNewConfirm(e.target.value)} 
                            required 
                            placeholder='Enter your password'/>
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setShowNewConfirm((prev) => !prev);
                                }}
                            >
                            {showNewConfirm ? 
                                <LucideEye className='opacity-50 hover:cursor-pointer' /> : <LucideEyeClosed className='opacity-50 hover:cursor-pointer' />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </form>
    </PageLayout>
  );
}