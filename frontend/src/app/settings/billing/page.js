'use client'
import React, { useState, useEffect } from 'react'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { PencilIcon } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { usePathname } from 'next/navigation'
import { useActionState } from 'react'
import { confirmBilling } from '@/app/action'
import BillForm from "@/components/BillForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'

// Fetch todo count, notes count, and profile ID from Supabase
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
    .select('todo_count, notes_count, id') 
    .eq('id', user.id)
    .single();

  if (profileError) {
    if (profileError.code !== 'PGRST116') { 
        console.error("Error fetching profile from Supabase:", profileError.message);
    } else {
        console.log("No profile found for user ID:", user.id);
    }
    return null; 
  }
  
  console.log("Fetched user profile from Supabase:", profile);
  return profile; 
}

const initialState = {
  message: '',
  success: false,
};

export default function SettingsBillingPage() {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useActionState(confirmBilling, initialState);
  const pathname = usePathname();
  const [taskCount, setTaskCount] = useState(0);
  const [notesCount, setNotesCount] = useState(3);
  const [profileId, setProfileId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true); // Set loading at the start
      try {
        const userProfile = await fetchUserProfile();

        if (userProfile) {
          // Handle todo_count
          if (userProfile.hasOwnProperty('todo_count')) {
            setTaskCount(userProfile.todo_count);
          } else {
            console.warn("todo_count not found in profile:", userProfile);
            setTaskCount(0); 
          }
          // ✅ Handle notes_count
          if (userProfile.hasOwnProperty('notes_count')) {
            setNotesCount(userProfile.notes_count);
          } else {
            console.warn("notes_count not found in profile:", userProfile);
            setNotesCount(3); // Default to 3 if not found
          }
          // Handle profileId
          if (userProfile.hasOwnProperty('id')) {
            setProfileId(userProfile.id);
          } else {
            console.error("Profile ID not found in fetched data:", userProfile);
          }
        } else {
          console.log("No profile data loaded for the user.");
          // Set defaults if no profile
          setTaskCount(0);
          setNotesCount(3);
        }
      } catch (error) {
        console.error("Error in loadInitialData (useEffect):", error);
        setTaskCount(0);
        setNotesCount(3); // Default on error
        setProfileId('');
      } finally {
        setIsLoading(false); // Clear loading at the end
      }
    };

    loadInitialData();
  }, []);
  
  async function handleUpdateNotesCount(newTargetNotesCount) {
    if (!profileId) {
      console.error("Profile ID is not available. Cannot update notes count.");
      alert("Your profile data hasn't loaded yet. Please wait a moment and try again.");
      return;
    }

    const countToUpdate = Math.max(0, Number(newTargetNotesCount));
    if (isNaN(countToUpdate)) {
        console.error("Invalid target notes count provided:", newTargetNotesCount);
        alert("An invalid count was provided for notes. Please try again.");
        return;
    }
    
    setIsLoading(true); // Consider a more specific loading state if needed
    const { data: updatedData, error: updateError } = await supabase
      .from('profiles')
      .update({ notes_count: countToUpdate })
      .eq('id', profileId)
      .select('notes_count') 
      .single();
    setIsLoading(false);

    if (updateError) {
      console.error("Error updating notes_count in Supabase:", updateError.message, updateError);
      alert(`Failed to update your notes quota. Error: ${updateError.message}`);
      return;
    }

    if (updatedData && updatedData.hasOwnProperty('notes_count')) {
      console.log("Successfully updated notes_count. New count from DB:", updatedData.notes_count);
      setNotesCount(updatedData.notes_count); 
      alert(`Your notes quota has been updated to ${updatedData.notes_count}!`);
    } else {
      console.warn("Notes count update seemed successful, but no updated data was returned from DB or notes_count was missing.");
      alert("Notes quota updated, but couldn't confirm the new value immediately. Please refresh if needed.");
    }
  }

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

      {showForm &&  (
        <BillForm 
          formAction={formAction} 
          state={state} 
          setShowForm={setShowForm} 
        />
      )}

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
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-center justify-center text-[#232360]">
          <p className="lg:w-20 text-center text-semibold">TO-DO LIST</p>
          <div className="flex flex-row gap-6 items-center w-full">
            <div className="w-1/3 text-center lg:px-10 bg-[#D9D9D9] rounded-md hover:bg-[#A0A0A0]">
              <Button
                onClick={() => handleUpdateTodoCount(5)}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">FREE</h1>
                  <p className="text-sm mt-8 mb-[-20] min-[756px]:mb-0">User got free 5 to-do items</p>
                </div>
              </Button>
            </div>
            <div className="w-1/3 bg-[#8FEBFF] rounded-md hover:bg-[#1FABAF] transition-colors">
              <Button 
                onClick={() => handleUpdateTodoCount(taskCount + 5)} 
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0" // Styling for button to fill card
              >
                <div className="flex flex-col justify-center items-center text-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+5</h1>
                  <sub className="font-light">add 5 to-do items</sub>
                  <p className="text-sm mt-8">10.000/month</p>
                </div>
              </Button>
            </div>
            <div className="w-1/3 lg:px-10 bg-[#1EA7FF] rounded-md hover:bg-[#1E57AF]">
              <Button 
                onClick={() => handleUpdateTodoCount(taskCount + 10)} 
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0" // Styling for button to fill card
              >
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+10</h1>
                  <sub className="font-light">add 10 to-do items</sub>
                  <p className="text-sm mt-8">18.000/month</p>
                </div>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-center justify-center text-[#232360] mb-5">
          <p className="w-20 text-center text-semibold">NOTES</p>
          <div className="flex flex-row gap-6 text-center items-center w-full">
            {/* Free Tier for Notes */}
            <div className="w-1/3 text-center lg:px-10 bg-[#D9D9D9] rounded-md hover:bg-[#A0A0A0] transition-colors">
              <Button
                onClick={() => handleUpdateNotesCount(3)} // Set ke 3 untuk tier gratis
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">FREE</h1>
                  <p className="text-sm mt-8 mb-[-20] min-[756px]:mb-0">User got free 3 notes items</p>
                </div>
              </Button>
            </div>
            {/* +5 Notes Tier */}
            <div className="w-1/3 bg-[#8FEBFF] rounded-md hover:bg-[#1FABAF] transition-colors">
              <Button
                onClick={() => handleUpdateNotesCount(notesCount + 5)}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                <div className="flex flex-col justify-center items-center text-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+5</h1>
                  <sub className="font-light">add 5 notes items</sub>
                  <p className="text-sm mt-8">10.000/month</p> {/* Sesuaikan harga jika perlu */}
                </div>
              </Button>
            </div>
            {/* +10 Notes Tier */}
            <div className="w-1/3 bg-[#1EA7FF] rounded-md hover:bg-[#1E57AF] transition-colors">
              <Button
                onClick={() => handleUpdateNotesCount(notesCount + 10)}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+10</h1>
                  <sub className="font-light">add 10 notes items</sub>
                  <p className="text-sm mt-8">18.000/month</p> {/* Sesuaikan harga jika perlu */}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}