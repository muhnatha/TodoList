'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { UserCircleIcon, PencilIcon } from "lucide-react"
import { usePathname } from 'next/navigation'
import Link from "next/link"

export default function SettingsBillingPage() {
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
            <Link href='/settings' className="border-3 rounded-lg bg-white py-2 px-4 hover:cursor-pointer font-semibold hover:bg-gray-200 transition-colors  text-sm sm:text-md">
              Cancel
            </Link>
            <button onClick={handleSave} className="rounded-lg bg-[#5051F9] py-2 px-4 hover:cursor-pointer font-semibold text-white hover:bg-indigo-700 transition-colors  text-sm sm:text-md">
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
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-center justify-center text-[#232360]">
          <p className="lg:w-20 text-center text-semibold">TO-DO LIST</p>
          <div className="flex flex-row gap-6 items-center w-full">
            <a href="#" className="w-1/3 py-5 px-2 text-center lg:px-10 bg-[#D9D9D9] rounded-md">
              <div className="flex flex-col justify-center items-center bg-[#D9D9D9]">
                <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">FREE</h1>
                <p className="text-sm mt-8 mb-[-20] min-[756px]:mb-0">User got free 5 to-do items</p>
              </div>
            </a>
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#8FEBFF] rounded-md">
              <div className="flex flex-col justify-center items-center">
                <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+5</h1>
                <sub className="font-light">add 5 to-do items</sub>
                <p className="text-sm mt-8">10.000/month</p>
              </div>
            </a>
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#1EA7FF] rounded-md">
              <div className="flex flex-col justify-center items-center">
                <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+10</h1>
                <sub className="font-light">add 10 to-do items</sub>
                <p className="text-sm mt-8">18.000/month</p>
              </div>
            </a>
          </div>
        </div>
        <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-center justify-center text-[#232360] mb-5">
          <p className="w-20 text-center text-semibold">NOTES</p>
          <div className="flex flex-row gap-6 text-center items-center  w-full">
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#D9D9D9] rounded-md">
              <div className="flex flex-col justify-center items-center bg-[#D9D9D9]">
                <h1 className="font-bold text-3xl mt-10">FREE</h1>
                <p className="text-sm mt-8 mb-[-20] min-[756px]:mb-0">User got free 3 notes items</p>
              </div>
            </a>
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#8FEBFF] rounded-md">
              <div className="flex flex-col justify-center items-center">
                <h1 className="font-bold text-3xl mt-10">+5</h1>
                <sub className="font-light">add 5 notes items</sub>
                <p className="text-sm mt-8">10.000/month</p>
              </div>
            </a>
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#1EA7FF] rounded-md">
              <div className="flex flex-col justify-center items-center">
                <h1 className="font-bold text-3xl mt-10">+10</h1>
                <sub className="font-light">add 10 notes items</sub>
                <p className="text-sm mt-8">18.000/month</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}