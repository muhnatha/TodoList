'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { PencilIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"
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
              <div className="relative w-24 h-24 flex items-center justify-center">
                  {/* Same with avatar icon in header */}
                  <Avatar>
                      <AvatarImage src="https://github.com/shadcn.png" className="size-15 rounded-full" />
                      <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <button 
                      aria-label="Edit profile picture"
                      className="absolute bottom-3 right-3 bg-[#232360] text-white rounded-full p-1.5 flex items-center justify-center hover:cursor-pointer"
                  >
                      <PencilIcon className="w-4 h-4" />
                  </button>
              </div>
              <h1 className="text-2xl sm:text-3xl pb-1 font-bold text-[#03030b]">
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

      <div className="pl-16 w-full">
        <table className="w-full text-left table-fixed">
          <thead> 
            <tr className="border-b-2">
              <th>Time</th>
              <th>Page</th>
              <th>Activity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Day, dd/mm/yy</td>
              <td>Note</td>
              <td>Title Name</td>
              <td>Cloud Computing {'>'} Cloud Computinggg</td>
            </tr>
            {/*Ini nanti buat log activity dari session*/}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}