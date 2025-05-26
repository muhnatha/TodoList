'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { useState, useEffect } from "react"
import { PencilIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from 'next/navigation'
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

// Fetch user profile by user ID
async function fetchUserProfile(userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error("Error fetching profile:", error.message);
    } else {
      console.log("No profile found for user ID:", userId);
    }
    return null;
  }
  
  console.log("Fetched user profile:", profile);
  return profile;
}

// Fetch activity logs for the user
async function fetchActivityLogs(userId) {
  const { data: logs, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching activity logs:", error.message);
    return [];
  }
  return logs;
}

export default function SettingsActivityLogPage() {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  useEffect(() => {
    async function loadData() {
      // Get the currently authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error fetching user or no user logged in:", userError?.message || "No user session");
        return;
      }

      // Fetch profile and logs using the user ID
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
      const logs = await fetchActivityLogs(user.id);
      setActivityLogs(logs);
    }
    loadData();
  }, []);

  let avatarSrc = `https://ui-avatars.com/api/?name=User&background=random`; // Default
  let avatarFallback = 'U';
  let userEmail = 'User';

  if (userProfile) {
    userEmail = userProfile.email || 'User';
    // Note: avatar_url is not fetched from profiles; adjust if it exists in your schema
    avatarSrc = userProfile.avatar_url || // from 'profiles' table (if added later)
                userProfile.user_metadata?.avatar_url || // from 'auth.users' (not applicable here)
                `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=random`;
    
    if (userEmail && userEmail.includes('@')) {
      avatarFallback = userEmail.substring(0, 2).toUpperCase();
    } else if (userEmail) {
      avatarFallback = userEmail.substring(0, 1).toUpperCase();
    }
  }

  const navSettings = [
    { href: "/settings/details", text: "My Details" },
    { href: "/settings/password", text: "Password" },
    { href: "/settings/billing", text: "Billing" },
    { href: "/settings/log", text: "Activity Log" }
  ];

  const renderNavSettings = (item, index) => (
    <li key={index}>
      <a
        href={item.href}
        className={`hover:opacity-100 ${pathname === item.href ? 'opacity-100' : 'opacity-20'} text-sm sm:text-md text-[#232360]`}
      >
        {item.text}
      </a>
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
            <Avatar className="w-16 h-16">
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
            {activityLogs.length > 0 ? (
              activityLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.page}</td>
                  <td>{log.action}</td>
                  <td>{log.details}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">No activity logs available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}