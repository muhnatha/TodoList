'use client'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { PencilIcon, Edit, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePathname } from 'next/navigation'
import Link from "next/link"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

async function fetchUserProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user or no user logged in:", userError?.message || "No user session");
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
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
  return profile;
}

export default function SettingsDetailsPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taskCount, setTaskCount] = useState(5);
  const [notesCount, setNotesCount] = useState(3);
  const [profileId, setProfileId] = useState('');
  const [isFirstNameDisabled, setIsFirstNameDisabled] = useState(true);
  const [isLastNameDisabled, setIsLastNameDisabled] = useState(true);
  const [isEmailDisabled, setIsEmailDisabled] = useState(true);
  const [isPhoneDisabled, setIsPhoneDisabled] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const userProfile = await fetchUserProfile();

        if (userProfile) {
          const {
            id = '',
            email = '',
            first_name = '',
            last_name = '',
            phone = '',
            todos_current_total_quota = 5,
            notes_current_total_quota = 3
          } = userProfile;

          setUserProfile(userProfile);

          setProfileId(id ?? '');
          setEmail(email ?? '');
          setFirstName(first_name ?? '');
          setLastName(last_name ?? '');
          setPhone(phone ?? '');
          setTaskCount(todos_current_total_quota ?? 5);
          setNotesCount(notes_current_total_quota ?? 3);

          if (!id) console.error("Profile ID not found in fetched data, even after destructuring.");
          if (!email && id) console.warn("Email not found in profile for user:", id);

        } else {
          console.log("No profile data loaded for the user. Using default states.");
          setProfileId('');
          setEmail('');
          setFirstName('');
          setLastName('');
          setPhone('');
          setTaskCount(5);
          setNotesCount(3);
        }
      } catch (error) {
        console.error("Error in fetch:", error);
        setProfileId('');
        setEmail('');
        setFirstName('');
        setLastName('');
        setPhone('');
        setTaskCount(0);
        setNotesCount(0);
      }
    };

    loadInitialData();
  }, []);

  let avatarSrc = `https://ui-avatars.com/api/?name=User&background=random`; 
  let avatarFallback = 'U';
  let userEmail = 'User';

  if (userProfile) {
      userEmail = userProfile.email || 'User';
      avatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=random`;
      
      if (userEmail && userEmail.includes('@')) {
          avatarFallback = userEmail.substring(0, 2).toUpperCase();
      } else if (userEmail) {
          avatarFallback = userEmail.substring(0, 1).toUpperCase();
      }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error('No authenticated user found:', userError?.message);
      alert('No authenticated user found. Please log in again.');
      return;
    }
    if (email !== userData.user.email) {
      alert('The email you entered does not match your account email.');
      return;
    }

    const { data, error } = await supabase
        .from('profiles')
        .update({
            first_name: firstName,
            last_name: lastName,
            phone: phone
        })
        .eq('id', profileId);
        if (error) {
        console.error('Failed to update profile:', error.message);
        alert('Failed to update profile. Please try again.');
        } else {
        alert('Profile updated successfully!');
        }
    } catch (err) {
        console.error('Unexpected error updating profile:', err);
        alert('Unexpected error updating profile.');
    }
  };

  const handleLogOut = async (e) => {
    e.preventDefault();

    const confirmLogout = window.confirm('Are you sure you want to log out?');
    if (!confirmLogout) {
        return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Failed to log out:', error.message);
    } else {
        console.log('Logout successful');
        router.push('/login');
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

            <div className="flex gap-3">
                <Link href='/settings' className="border-3 rounded-lg bg-white py-2 px-4 hover:cursor-pointer font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-md hidden sm:block">
                Cancel
                </Link>
                <button onClick={handleSave} className="rounded-lg bg-[#5051F9] py-2 px-4 hover:cursor-pointer font-semibold text-white hover:bg-indigo-700 transition-colors text-sm sm:text-md hidden sm:block">
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
            <div className="flex flex-col gap-5">
                <div className="flex flex-row gap-10 w-full lg:w-1/2">
                    <div className="flex flex-col w-1/2">
                        <label className="text-[#232360]">First Name</label>
                        <div className="flex flex-row relative">
                            <input 
                            type='text'
                            id='firstName' 
                            className={`block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold w-full ${isFirstNameDisabled ? 'hover:cursor-not-allowed bg-gray-100' : 'hover:cursor-text bg-white/50'}`} 
                            value={firstName} onChange={(e) => setFirstName(e.target.value)} 
                            disabled={isFirstNameDisabled}/>
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setIsFirstNameDisabled((prev) => !prev);
                                }}
                            >
                                <Edit className='opacity-50 hover:cursor-pointer' />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col w-1/2">
                        <label className="text-[#232360]">Last Name</label>
                        <div className="flex flex-row relative">
                            <input 
                            type='text'
                            id='lastName' 
                            className={`block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold w-full ${isLastNameDisabled ? 'hover:cursor-not-allowed bg-gray-100' : 'hover:cursor-text bg-white/50'}`}
                            value={lastName} onChange={(e) => setLastName(e.target.value)} 
                            disabled={isLastNameDisabled}/>
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setIsLastNameDisabled((prev) => !prev);
                                }}
                            >
                                <Edit className='opacity-50 hover:cursor-pointer'/>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row gap-10 border-b-1 pb-5 w-full lg:w-1/2">
                    <div className="flex flex-col w-1/2">
                        <label className="text-[#232360]">Email</label>
                        <div className="flex flex-row relative">
                            <input 
                            type='email' 
                            id='email' 
                            className={`block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold w-full ${isEmailDisabled ? 'hover:cursor-not-allowed bg-gray-100' : 'hover:cursor-text bg-white/50'}`} 
                            value={email} onChange={(e) => setEmail(e.target.value)} 
                            disabled={isEmailDisabled}/>
                            {/* Can't change email here, must be add 1 more input column for 'new email' like reset password */}
                            {/* <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                disabled
                            >
                                <Edit className='opacity-50 hover:cursor-not-allowed' />
                            </button> */}
                        </div>
                    </div>
                    <div className="flex flex-col w-1/2">
                        <label className="text-[#232360]">Phone</label>
                        <div className="flex flex-row relative">
                            <input 
                            type='phone' 
                            id='phone' 
                            className={`block rounded-sm border-1 mt-1 p-2 text-sm text-black/50 font-bold w-full ${isPhoneDisabled ? 'hover:cursor-not-allowed bg-gray-100' : 'hover:cursor-text bg-white/50'}`}
                            value={phone} onChange={(e) => setPhone(e.target.value)} 
                            disabled={isPhoneDisabled}
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-3 flex items-center
                                        text-black dark:text-white
                                            text-sm font-medium"
                                onClick={() => {
                                    setIsPhoneDisabled((prev) => !prev);
                                }}
                            >
                                <Edit className='opacity-50 hover:cursor-pointer' />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="pl-6 min-[636px]:pl-15 pb-5">
            <div className="border-1 rounded-lg w-full sm:w-2/3 md:w-1/2 text-[#232360]">
                <p className="px-5 pt-5">Your package</p>
                { taskCount <= 5 && notesCount <= 3 ? (
                    <div className="flex flex-row justify-between items-center px-5 ">
                        <h1 className="font-bold text-3xl md:text-4xl">Free</h1>
                        <Image src="/toogas2.svg" alt="Toogas" width={96} height={96}/>
                    </div>
                ) : taskCount > 5 || notesCount > 3 ? (
                    <div className="flex flex-row justify-between items-center px-5 ">
                        <div className="flex flex-col gap-1">
                            <h1 className="font-bold text-3xl md:text-4xl">Quota</h1>
                            <p className="text-sm">To-do: {taskCount} | Notes: {notesCount}</p>
                        </div>
                        <Image src="/toogas2.svg" alt="Toogas" width={96} height={96}/>
                    </div>
                ) : (
                    <div className="flex flex-row justify-between items-center px-5 ">
                        <h1 className="font-bold text-3xl md:text-4xl">Free</h1>
                        <Image src="/toogas2.svg" alt="Toogas" width={96} height={96}/>
                    </div>
                )}
                    
                <div className="flex flex-row gap-1">
                    <p className="opacity-50 pl-5 pb-5 text-sm">Choose another package!</p> 
                    <a href="/settings/billing" className="opacity-100 text-sm hover:underline">Click Here!</a>
                </div>
            </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
            <Link href='/settings' className="border-3 rounded-lg bg-white py-2 px-4 hover:cursor-pointer font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-md block sm:hidden">
            Cancel
            </Link>
            <button onClick={handleSave} className="rounded-lg bg-[#5051F9] py-2 px-4 hover:cursor-pointer font-semibold text-white hover:bg-indigo-700 transition-colors text-sm sm:text-md block sm:hidden">
            Save
            </button>
        </div>
        <div className="md:absolute md:bottom-0 md:right-0 md:pr-6 pb-5 pl-6 min-[636px]:pl-15 md:pl-0">
            <button onClick={handleLogOut} className="bg-[#F54D4D] rounded-sm px-4 py-2 text-white font-semibold text-sm flex flex-row gap-10 justify-between items-center hover:cursor-pointer hover:bg-[rgb(245,10,10)]">
                Logout
                <LogOut className="text-white text-sm"/>
            </button>
        </div>
        </form>
    </PageLayout>
  );
}