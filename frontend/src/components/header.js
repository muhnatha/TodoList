'use client'
import { React, useState, useEffect } from 'react' // Added useEffect
import { Bell, X, CheckCircle } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabaseClient'; // Adjust path as necessary

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
  // Ensure the returned object has a structure that includes email and user_metadata for the avatar
  // If 'profile' doesn't directly contain email or avatar_url, merge with authUser
  return { ...authUser, ...profile }; // Spread authUser first, then profile to override if fields exist in both
}

export default function Header({ title, supabase }) { // Pass supabase as a prop
    const [showNotification, setShowNotification] = useState(false);
    const [userProfile, setUserProfile] = useState(null); // State to store user profile
    const [loadingProfile, setLoadingProfile] = useState(true); // State to handle loading

    useEffect(() => {
        async function loadProfile() {
            if (!supabase) {
                console.error("Supabase client is not provided to Header component.");
                setLoadingProfile(false);
                return;
            }
            setLoadingProfile(true);
            const profile = await fetchUserProfile(supabase);
            setUserProfile(profile);
            setLoadingProfile(false);
        }
        loadProfile();
    }, [supabase]); // Re-run if supabase prop changes

    // Determine avatar source and fallback text
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

    return (
        <>
            {showNotification && (
                <div className="fixed top-16 right-4 w-72 md:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        <button
                            onClick={() => setShowNotification(false)}
                            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Close notifications"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            <CheckCircle size={40} className="mx-auto mb-2 text-green-500" />
                            You're all caught up!
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 text-center">
                        <a href="#" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500">
                            View all notifications
                        </a>
                    </div>
                </div>
            )}
            <div className={`flex items-center -my-2 justify-center text-[#232360] relative ${title.toLowerCase() === 'dashboard' ? 'bg-white' : 'bg-[#FBFAFF]'}`}>
                <h1 className='text-2xl font-semibold py-4'>{title}</h1>
                <div className="absolute top-0 right-0 h-full flex items-center mx-7 gap-1">
                    <button
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={() => setShowNotification(!showNotification)}>
                        <Bell className='size-7 hover:cursor-pointer text-[#768396] dark:text-gray-400 pt-0.5' />
                    </button>
                    {loadingProfile ? (
                        <Avatar className={"w-10 h-10 bg-gray-200 animate-pulse"}>
                            <AvatarFallback>...</AvatarFallback> {/* Show loading indicator */}
                        </Avatar>
                    ) : (
                        <Avatar className={"w-10 h-10"}>
                            <AvatarImage src={avatarSrc} />
                            <AvatarFallback>{avatarFallback}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
            </div>
        </>
    );
};