'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { PencilIcon, LucideEye, LucideEyeClosed } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname, useRouter } from 'next/navigation'
import Link from "next/link"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient.js';
import { translateSupabaseError } from '@/lib/translateError.js';

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
    return null;
  }
  
  console.log("Fetched user profile:", profile);
  return { ...profile, userId: user.id }; // Include user ID for logging
}

export default function SettingsPasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const profile = await fetchUserProfile();
      setUserProfile(profile);
    }
    loadProfile(); 
  }, []);

  let avatarSrc = `https://ui-avatars.com/api/?name=User&background=random`;
  let avatarFallback = 'U';
  let userEmail = 'User';

  if (userProfile) {
    userEmail = userProfile.email || 'User';
    avatarSrc = userProfile.avatar_url ||
                userProfile.user_metadata?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=random`;
    
    if (userEmail && userEmail.includes('@')) {
      avatarFallback = userEmail.substring(0, 2).toUpperCase();
    } else if (userEmail) {
      avatarFallback = userEmail.substring(0, 1).toUpperCase();
    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== newConfirm) {
      setErrorMsg('New password and confirmation password do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      return;
    }

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user.email,
        password: oldPassword,
      });

      if (signInError) {
        setErrorMsg('Current password is incorrect');
        return;
      }

      const { data: { user }, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setErrorMsg(translateSupabaseError(updateError));
      } else {
        // Log activity to activity_log table
        const { error: logError } = await supabase.from('activity_log').insert({
          user_id: user.id,
          page: 'Password',
          action: 'Updated',
          details: 'Changed password',
          created_at: new Date().toISOString()
        });

        if (logError) {
          console.error('Error logging password change activity:', logError.message);
        } else {
          setSuccessMsg('Password updated successfully');
          setOldPassword('');
          setNewPassword('');
          setNewConfirm('');
          router.push('/settings'); // Redirect to settings page
        }
      }
    } catch (error) {
      setErrorMsg('An unexpected error occurred');
      console.error('Error updating password:', error);
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
      <div className="w-full h-[240px] relative">
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

          <div className="flex space-x-3">
            <Link href='/settings' className="border-3 rounded-lg bg-white py-2 px-4 hover:cursor-pointer font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-md hidden sm:block">
              Cancel
            </Link>
            <button type="submit" className="rounded-lg bg-[#5051F9] py-2 px-4 hover:cursor-pointer font-semibold text-white hover:bg-indigo-700 transition-colors text-sm sm:text-md hidden sm:block">
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
          {errorMsg && (
            <div className="text-red-500 text-sm mb-4">{errorMsg}</div>
          )}
          {successMsg && (
            <div className="text-green-500 text-sm mb-4">{successMsg}</div>
          )}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col">
              <label className="text-[#232360]">Old Password</label>
              <div className="flex flex-row relative sm:w-2/5 md:w-1/3 [@media(min-width:890px)]:w-1/4">
                <input 
                  type={showOldPassword ? 'text' : 'password'} 
                  id='oldPass' 
                  className='block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold bg-white/50 w-full' 
                  value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} 
                  required 
                  placeholder='XXXXXXXXXXX'/>
                <button
                  type="button"
                  className="absolute right-2 top-3 flex items-center text-black dark:text-white text-sm font-medium"
                  onClick={() => setShowOldPassword((prev) => !prev)}
                >
                  {showOldPassword ? 
                    <LucideEye className='opacity-50 hover:cursor-pointer' /> : <LucideEyeClosed className='opacity-50 hover:cursor-pointer' />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-10">
              <div className="flex flex-col sm:w-2/5 md:w-1/3 [@media(min-width:890px)]:w-1/4">
                <label className="text-[#232360]">New Password</label>
                <div className="flex flex-row relative">
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    id='newPass' 
                    className='block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold bg-white/50 w-full' 
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                    placeholder='Enter your password'/>
                  <button
                    type="button"
                    className="absolute right-2 top-3 flex items-center text-black dark:text-white text-sm font-medium"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                  >
                    {showNewPassword ? 
                      <LucideEye className='opacity-50 hover:cursor-pointer' /> : <LucideEyeClosed className='opacity-50 hover:cursor-pointer' />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:w-2/5 md:w-1/3 [@media(min-width:890px)]:w-1/4">
                <label className="text-[#232360]">Confirm New Password</label>
                <div className="flex flex-row relative">
                  <input 
                    type={showNewConfirm ? 'text' : 'password'} 
                    id='confirmNewPass' 
                    className='block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold bg-white/50 w-full' 
                    value={newConfirm} onChange={(e) => setNewConfirm(e.target.value)} 
                    required 
                    placeholder='Enter your password'/>
                  <button
                    type="button"
                    className="absolute right-2 top-3 flex items-center text-black dark:text-white text-sm font-medium"
                    onClick={() => setShowNewConfirm((prev) => !prev)}
                  >
                    {showNewConfirm ? 
                      <LucideEye className='opacity-50 hover:cursor-pointer' /> : <LucideEyeClosed className='opacity-50 hover:cursor-pointer' />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-5">
            <Link href='/settings' className="border-3 rounded-lg bg-white py-2 px-4 hover:cursor-pointer font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-md block sm:hidden">
              Cancel
            </Link>
            <button type="submit" className="rounded-lg bg-[#5051F9] py-2 px-7 hover:cursor-pointer font-semibold text-white hover:bg-indigo-700 transition-colors text-sm sm:text-md block sm:hidden">
              Save
            </button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}