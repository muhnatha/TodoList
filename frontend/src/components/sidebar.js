'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { LayoutGrid, Calendar, NotebookIcon, ListTodoIcon, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';import { supabase } from '@/lib/supabaseClient'; // Adjust path as necessary

async function fetchUserProfile(supabase) { // Pass supabase instance if not globally available
  // Get the currently authenticated user
  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(); // Renamed to authUser to avoid confusion
  if (userError || !authUser) {
    console.error("Error fetching user or no user logged in:", userError?.message || "No user session");
    return null;
  }

  // Fetch the profile for this user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError) {
    if (profileError.code !== 'PGRST116') {
      console.error("Error fetching profile:", profileError.message);
    } else {
      console.log("No profile found for user ID:", authUser.id);
    }
    // Return the authUser data even if profile is not found,
    // so we can still display email/fallback avatar
    return { id: authUser.id, email: authUser.email, user_metadata: authUser.user_metadata };
  }
  
  console.log("Fetched user profile:", profile);
  return { ...authUser, ...profile }; 
}

const MenuIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
);

const Sidebar = () => {
    const pathName = usePathname()
    // State to manage sidebar visibility on mobile
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    // State to manage dropdown visibility (example)
    const [isPagesDropdownOpen, setIsPagesDropdownOpen] = useState(false);

    // State for user profile in Sidebar
    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            // Check if supabase client is available (it's directly imported)
            if (!supabase) {
                console.error("Supabase client is not available in Sidebar component.");
                setLoadingProfile(false);
                return;
            }
            setLoadingProfile(true);
            const profile = await fetchUserProfile(supabase); // Use the imported supabase client
            setUserProfile(profile);
            setLoadingProfile(false);
        }
        loadProfile();
    }, []);

    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(!isMobileSidebarOpen);
    };

    const togglePagesDropdown = () => {
        setIsPagesDropdownOpen(!isPagesDropdownOpen);
    };

    const navItems = [
        { href: "/dashboard", icon: <LayoutGrid />},
        { href: "/calendar", icon: <Calendar />},
        { href: "/todo", icon: <ListTodoIcon />},
        { href: "/notes", icon: <NotebookIcon />},
        { href: "/settings", icon: <Settings />}
    ];

    const navSettings = [
        { href: "/settings/details" },
        { href: "/settings/password" },
        { href: "/settings/billing" },
        { href: "/settings/log" }
    ]

    const renderNavItem = (item, index) => {
        let isActive = false; // Variable to determine if the nav item is active

        if (item.href === '/settings') {
            // Special logic for the "Settings" nav item
            isActive = pathName === item.href || // Active if path is exactly "/settings"
                    (navSettings && navSettings.some(settingRoute => pathName === settingRoute.href)); // Or active if path matches any href in navSettings
        } else {
            // Standard logic for all other nav items
            isActive = pathName === item.href; // Active if path is an exact match
        }
        
        return (
            <li key={index}>
                <a
                    href={item.href}
                    className={`flex items-center mb-3 space-x-3 px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 group
                        ${isActive 
                            ? 'bg-[#5051F9] text-white' // Active state styles
                            : 'text-slate-700 dark:text-slate-300 hover:bg-[#5051F9] dark:hover:bg-white hover:text-white' // Inactive state styles
                        }
                    `}
                >
                    {item.icon} {/* Ensure item.icon is a valid JSX element e.g. <IconComponent /> */}
                    {/* You might also want to render a label, e.g., item.label */}
                </a>
            </li>
        );
    };
    
    let avatarSrc = `https://ui-avatars.com/api/?name=User&background=random`;
    let avatarFallback = 'U';
    let userNameOrEmail = 'User';

    if (userProfile) {
        const emailForAvatar = userProfile.email || 'User';
        userNameOrEmail = userProfile.full_name || userProfile.email || 'User'; // For display text
        avatarSrc = userProfile.avatar_url || 
                    userProfile.user_metadata?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(emailForAvatar)}&background=random`;
        
        if (emailForAvatar && emailForAvatar.includes('@')) {
            avatarFallback = emailForAvatar.substring(0, 2).toUpperCase();
        } else if (emailForAvatar) {
            avatarFallback = emailForAvatar.substring(0, 1).toUpperCase();
        }
    }

    return (
        <>
            {/* Mobile Menu Button (visible on small screens) */}
            <div className="sm:hidden absolute py-4 px-2 top-0 left-0">
                <button
                    onClick={toggleMobileSidebar}
                    className="p-2 rounded-md"
                    aria-label="Open sidebar"
                >
                    <MenuIcon />
                </button>
            </div>

            {/* Overlay for mobile sidebar */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm sm:hidden"
                    onClick={toggleMobileSidebar}
                    aria-hidden="true"
                ></div>
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 z-40 flex flex-col
                    bg-[#FBFAFF] dark:bg-slate-900 h-screen
                    transform transition-transform duration-300 ease-in-out
                    ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    sm:translate-x-0 sm:static sm:inset-0 sm:z-auto
                    sidebar-custom-scroll overflow-y-auto
                `}
            >
                {/* Sidebar Header */}
                <div className="flex items-center justify-between h-16 px-4">
                    <a href="#" className="flex items-center space-x-2">
                        {/* Replace with your logo SVG or text */}
                        <Image src="/toogas.png" alt='Toogas' width={40} height={40} priority className="w-10 h-auto"/>
                    </a>
                    {/* Close button for mobile (optional, as overlay click also closes) */}
                     <button
                        onClick={toggleMobileSidebar}
                        className="sm:hidden p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Close sidebar"
                    >
                        <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex px-3 py-4 space-y-1 mt-5 items-center justify-center">
                    <ul>
                        {navItems.map(renderNavItem)}
                    </ul>
                </nav>

                {/* Sidebar Footer (Optional) */}
                <div className="flex justify-center items-end py-4">
                    <a href='/settings/details'>
                        <Avatar className={"w-10 h-10 block sm:hidden"}>
                            <AvatarImage src={avatarSrc} />
                            <AvatarFallback>{avatarFallback}</AvatarFallback>
                        </Avatar>
                    </a>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;