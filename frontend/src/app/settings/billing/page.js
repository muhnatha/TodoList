'use client'
import React, { useState, useEffect } from 'react'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { UserCircleIcon, PencilIcon } from "lucide-react"
import { usePathname } from 'next/navigation'
import { useActionState } from 'react'
import { confirmBilling } from '@/app/action'
import BillForm from "@/components/BillForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'

// Fetch todo count and profile ID from Supabase
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
    .select('todo_count, id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    if (profileError.code !== 'PGRST116') { // PGRST116 means 0 rows, not necessarily an "error"
        console.error("Error fetching profile from Supabase:", profileError.message);
    } else {
        console.log("No profile found for user ID:", user.id);
    }
    return null; // Return null if profile not found or error
  }
  
  console.log("Fetched user profile from Supabase:", profile);
  return profile; // Returns the profile object or null
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
  const [profileId, setProfileId] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const userProfile = await fetchUserProfile();

        if (userProfile) {
          if (userProfile.hasOwnProperty('todo_count')) {
            setTaskCount(userProfile.todo_count);
          } else {
            console.warn("todo_count not found in profile:", userProfile);
            setTaskCount(0); 
          }
          if (userProfile.hasOwnProperty('id')) {
            setProfileId(userProfile.id);
          } else {
            console.error("Profile ID not found in fetched data:", userProfile);
          }
        } else {
          console.log("No profile data loaded for the user.");
        }
      } catch (error) {
        console.error("Error in loadInitialData (useEffect):", error);
        setTaskCount(0);
        setProfileId('');
      }
    };

    loadInitialData();
  }, []);

  async function handleUpdateTodoCount(amountToAdd) {
    if (!profileId) {
      console.error("Profile ID is not available. Cannot update todo count.");
      alert("Your profile data hasn't loaded yet. Please wait a moment and try again.");
      return;
    }

    const newCalculatedCount = taskCount + amountToAdd;

    // Update the database
    const { data: updatedData, error: updateError } = await supabase
      .from('profiles')
      .update({ todo_count: newCalculatedCount })
      .eq('id', profileId)
      .select('todo_count') // Select the updated field to confirm its new value
      .single();           // Expect a single object back

    if (updateError) {
      console.error("Error updating todo_count in Supabase:", updateError.message, updateError);
      alert(`Failed to update your to-do quota. Error: ${updateError.message}`);
      return;
    }

    if (updatedData && updatedData.hasOwnProperty('todo_count')) {
      console.log("Successfully updated todo_count to:", updatedData.todo_count);
      setTaskCount(updatedData.todo_count); // Update state with the confirmed new count
      alert(`Your to-do quota has been updated to ${updatedData.todo_count}!`);
    } else {
      console.warn("Todo count update seemed successful, but no updated data was returned from DB or todo_count was missing. Check RLS and query. Current taskCount:", taskCount);

      alert("Quota updated, but couldn't confirm the new value immediately. Please refresh if needed.");
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
            <a href="#" className="w-1/3 py-5 px-2 text-center lg:px-10 bg-[#D9D9D9] rounded-md hover:bg-[#A0A0A0]">
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">FREE</h1>
                  <p className="text-sm mt-8 mb-[-20] min-[756px]:mb-0">User got free 5 to-do items</p>
                </div>
            </a>
            <div className="w-1/3 bg-[#8FEBFF] rounded-md hover:bg-[#1FABAF] transition-colors">
              <Button 
                onClick={() => handleUpdateTodoCount(5)} 
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0" // Styling for button to fill card
              >
                <div className="flex flex-col justify-center items-center text-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+5</h1>
                  <sub className="font-light">add 5 to-do items</sub>
                  <p className="text-sm mt-8">10.000/month</p>
                </div>
              </Button>
            </div>
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#1EA7FF] rounded-md hover:bg-[#1E57AF]">
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
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#D9D9D9] rounded-md hover:bg-[#A0A0A0]">
              <div className="flex flex-col justify-center items-center">
                <h1 className="font-bold text-3xl mt-10">FREE</h1>
                <p className="text-sm mt-8 mb-[-20] min-[756px]:mb-0">User got free 3 notes items</p>
              </div>
            </a>
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#8FEBFF] rounded-md hover:bg-[#1FABAF]">
              <div className="flex flex-col justify-center items-center">
                <h1 className="font-bold text-3xl mt-10">+5</h1>
                <sub className="font-light">add 5 notes items</sub>
                <p className="text-sm mt-8">10.000/month</p>
              </div>
            </a>
            <a href="#" className="w-1/3 py-5 px-7 lg:px-10 bg-[#1EA7FF] rounded-md hover:bg-[#1E57AF]">
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