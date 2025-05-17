'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { UserCircleIcon, PencilIcon } from "lucide-react"
import { usePathname } from 'next/navigation'
import Link from "next/link"

export default function SettingsLogPage() {
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
    </PageLayout>
  );
}