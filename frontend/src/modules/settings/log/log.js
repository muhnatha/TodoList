'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { useState, useEffect } from "react"
import { PencilIcon, RefreshCw } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from 'next/navigation'
import { supabase } from "@/lib/supabaseClient"

const ITEMS_PER_PAGE = 10;

async function fetchUserProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user or no user logged in:", userError?.message || "No user session");
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email') 
    .eq('id', user.id)
    .single();

  if (profileError) {
    if (profileError.code !== 'PGRST116') {
      console.error("Error fetching profile:", profileError.message);
    } else {
      console.log("No profile found for user ID:", user.id);
    }
    return { email: user.email, userId: user.id }; 
  }
  
  return { 
    ...profile,
    email: profile.email || user.email, 
    userId: user.id
  };
}

async function fetchActivityLogs(userId, limit = ITEMS_PER_PAGE, offset = 0) {
  try {
    const { data: logs, error, count } = await supabase 
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching activity logs:", error.message);
      return { data: [], error, count: 0 };
    }
    
    return { data: logs || [], error: null, count: count === null || count === undefined ? 0 : count }; 
  } catch (err) {
    console.error('Unexpected error fetching activity logs:', err);
    return { data: [], error: err, count: 0 }; 
  }
}

function formatActivityDate(dateString) {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  
  return `${dayName}, ${day}/${month}/${year}`;
}

function formatActivityTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

export default function SettingsLogPage() {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState(null); 
  const [activityLogs, setActivityLogs] = useState([]); 
  const [loading, setLoading] = useState(true);         
  const [refreshing, setRefreshing] = useState(false);   
  const [currentPage, setCurrentPage] = useState(1);     
  const [totalLogsCount, setTotalLogsCount] = useState(0); 

  
  useEffect(() => {
    async function loadProfile() {
      setLoading(true); 
      const profile = await fetchUserProfile();
      setUserProfile(profile);

      if (!profile || !profile.userId) {
        setActivityLogs([]);
        setTotalLogsCount(0);
        setLoading(false);
      }
    }
    loadProfile();
  }, []); 

  useEffect(() => {
    async function loadLogs() {
      if (userProfile && userProfile.userId) {
        setLoading(true); 
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
        const { data: newLogs, count: newTotalCount, error } = await fetchActivityLogs(
          userProfile.userId,
          ITEMS_PER_PAGE,
          offset
        );

        if (error) {
          console.error("Error in useEffect loading logs:", error.message);
          setActivityLogs([]);
          setTotalLogsCount(0);
        } else {
          setActivityLogs(newLogs);
          setTotalLogsCount(newTotalCount);
        }
        setLoading(false); 
      }
    }

    if (userProfile?.userId) {
      loadLogs();
    }
  }, [userProfile, currentPage]); 

  const handleRefresh = async () => {
    if (!userProfile || !userProfile.userId || loading || refreshing) return; 
    
    setRefreshing(true); 
    setLoading(true);   

    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const { data: newLogs, count: newTotalCount, error } = await fetchActivityLogs(
      userProfile.userId,
      ITEMS_PER_PAGE,
      offset
    );

    if (error) {
      console.error("Error refreshing activity logs:", error.message);
    } else {
      setActivityLogs(newLogs);
      setTotalLogsCount(newTotalCount);
    }
    setLoading(false);  
    setRefreshing(false);
  };
  
  let avatarSrc = `https://ui-avatars.com/api/?name=User&background=random`;
  let avatarFallback = 'U';
  let userEmail = 'User';

  if (userProfile) {
      userEmail = userProfile.email || 'User';
      avatarSrc = userProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=random`;
      
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
          <a 
              href={item.href}
              className={`hover:opacity-100 ${pathname === item.href ? 'opacity-100' : 'opacity-20'} text-sm sm:text-md text-[#232360]`}
          >
              {item.text}
          </a>
      </li>
  );

  const totalPages = totalLogsCount > 0 ? Math.ceil(totalLogsCount / ITEMS_PER_PAGE) : 0;

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  let activityLogContent;
  if (loading && activityLogs.length === 0 && currentPage === 1) {
    activityLogContent = <div className="text-center py-8 text-gray-500">Loading activity logs...</div>;
  } else if (!loading && (!userProfile || !userProfile.userId)) {
    activityLogContent = <div className="text-center py-8 text-gray-500">Could not load user profile to fetch activity logs.</div>;
  } else if (!loading && activityLogs.length === 0 && userProfile && userProfile.userId) {
    activityLogContent = (
      <div className="overflow-x-auto">
        <table className="w-full text-left table-fixed border-collapse">
          <thead> 
            <tr className="border-b-2 border-gray-300">
              <th className="w-1/6 py-3 px-2 font-semibold text-[#232360]">Time</th>
              <th className="w-1/6 py-3 px-2 font-semibold text-[#232360]">Page</th>
              <th className="w-1/6 py-3 px-2 font-semibold text-[#232360]">Activity</th>
              <th className="w-1/2 py-3 px-2 font-semibold text-[#232360]">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="4" className="text-center py-8 text-gray-500">
                No activity logs found
              </td>
            </tr>
          </tbody>
        </table>
      </div> 
    );
  } else {
    activityLogContent = (
      <div className="overflow-x-auto">
        <table className="w-full text-left table-fixed border-collapse">
          <thead> 
            <tr className="border-b-2 border-gray-300">
              <th className="w-1/6 py-3 px-2 font-semibold text-[#232360]">Time</th>
              <th className="w-1/6 py-3 px-2 font-semibold text-[#232360]">Page</th>
              <th className="w-1/6 py-3 px-2 font-semibold text-[#232360]">Activity</th>
              <th className="w-1/2 py-3 px-2 font-semibold text-[#232360]">Details</th>
            </tr>
          </thead>
          <tbody>
            {activityLogs.map((log, index) => (
              <tr key={log.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
                <td className="py-3 px-2 text-sm">
                  <div>{formatActivityDate(log.created_at)}</div>
                  <div className="text-xs text-gray-500">{formatActivityTime(log.created_at)}</div>
                </td>
                <td className="py-3 px-2 text-sm font-medium">{log.page}</td>
                <td className="py-3 px-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    log.action === 'Created' ? 'bg-green-100 text-green-800' :
                    log.action === 'Updated' ? 'bg-blue-100 text-blue-800' :
                    log.action === 'Deleted' ? 'bg-red-100 text-red-800' :
                    log.action === 'Visited' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-2 text-sm text-gray-700 break-words">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination Controls */}
        {totalPages > 0 && activityLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t">
            <div className="mb-2 sm:mb-0">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                {' '}to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalLogsCount)}</span>
                {' '}of <span className="font-medium">{totalLogsCount}</span> results
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || loading || refreshing}
                className="px-4 py-2 text-sm font-medium bg-[#232360] text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 px-2">
                Page {currentPage} of {totalPages > 0 ? totalPages : 1}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading || refreshing || totalPages === 0}
                className="px-4 py-2 text-sm font-medium bg-[#232360] text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <PageLayout title="SETTINGS">
      <div className="w-full h-[240px] relative">
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

      {/* Activity Log Section */}
      <div className="pl-5 sm:pl-16 w-full pr-5 sm:pr-16">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#232360]">Recent Activity</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading} 
            className="flex items-center gap-2 px-3 py-1 text-sm bg-[#232360] text-white rounded hover:bg-opacity-90 disabled:opacity-50 hover:cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {activityLogContent}
      </div>
    </PageLayout>
  );
}