'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { useState, useEffect } from "react"
import { PencilIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from 'next/navigation'
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

async function fetchUserProfile() {
  // Get the currently authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user or no user logged in:", userError?.message || "No user session");
    return null; // Return null if no user or error
  }

  // Fetch the profile for this user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  if (profileError) {
    if (profileError.code !== 'PGRST116') { // PGRST116 means 0 rows, not necessarily an "error"
        console.error("Error fetching profile:", profileError.message);
    } else {
        console.log("No profile found for user ID:", user.id);
    }
    return null; // Return null if profile not found or error
  }
  
  console.log("Fetched user profile:", profile);
  return profile; // Returns the profile object or null
}

export default function SettingsBillingPage() {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      const profile = await fetchUserProfile();
      setUserProfile(profile);
    }
    loadProfile();
  }, []);


  let avatarSrc = `https://ui-avatars.com/api/?name=User&background=random`; // Default
  let avatarFallback = 'U';
  let userEmail = 'User';

  if (userProfile) {
      userEmail = userProfile.email || 'User';
      // Prefer avatar_url from profiles table, then from auth.user.user_metadata, then ui-avatars
      avatarSrc = userProfile.avatar_url || // from 'profiles' table
                  userProfile.user_metadata?.avatar_url || // from 'auth.users' table
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=random`;
      
      if (userEmail && userEmail.includes('@')) {
          avatarFallback = userEmail.substring(0, 2).toUpperCase();
      } else if (userEmail) {
          avatarFallback = userEmail.substring(0, 1).toUpperCase();
      }
  }

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
                  <Avatar className={"w-16 h-16"}>
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback>{avatarFallback}</AvatarFallback>
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
      </div>

      <div className="p-6"> 
        <nav className="text-black font-semibold">
          <ul className="flex flex-row gap-10 min-[636px]:px-10">
            {navSettings.map(renderNavSettings)}
          </ul>
        </nav>
      </div>

      <div className="pl-5 sm:pl-16 w-full">
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