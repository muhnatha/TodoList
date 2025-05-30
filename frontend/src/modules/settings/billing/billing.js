'use client'
import React, { useState, useEffect } from 'react'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { PencilIcon } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { usePathname } from 'next/navigation'
import { useActionState } from 'react' 
// import { confirmBilling } from '@/app/action' 
import BillForm from "@/components/BillForm" 
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'

const FREE_NOTES_QUOTA_BASE = 3;
const FREE_TODOS_QUOTA_BASE = 5;

async function fetchUserProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user or no user logged in:", userError?.message || "No user session");
    return null;
  }

  // notes_current_total_quota dan todos_current_total_quota
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('notes_current_total_quota, todos_current_total_quota, id, email') 
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

// const initialState = { // Hapus atau sesuaikan jika confirmBilling tidak digunakan
//   message: '',
//   success: false,
// };

export default function SettingsBillingPage() {
  const [showForm, setShowForm] = useState(false); // Hapus jika BillForm tidak digunakan
  // const [state, formAction] = useActionState(confirmBilling, initialState); // Hapus jika tidak digunakan
  const pathname = usePathname();
  const [taskCount, setTaskCount] = useState(FREE_TODOS_QUOTA_BASE); // MODIFIKASI: State untuk total kuota To-Do
  const [notesCount, setNotesCount] = useState(FREE_NOTES_QUOTA_BASE); // MODIFIKASI: State untuk total kuota Notes
  const [profileId, setProfileId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // State untuk menyimpan profil pengguna

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const userProfile = await fetchUserProfile();

        if (userProfile) {
          setUserProfile(userProfile);
          // MODIFIKASI: Menggunakan kolom total kuota yang baru
          if (userProfile.hasOwnProperty('todos_current_total_quota')) {
            setTaskCount(userProfile.todos_current_total_quota);
          } else {
            console.warn("todos_current_total_quota not found in profile:", userProfile);
            setTaskCount(FREE_TODOS_QUOTA_BASE);
          }
          if (userProfile.hasOwnProperty('notes_current_total_quota')) {
            setNotesCount(userProfile.notes_current_total_quota);
          } else {
            console.warn("notes_current_total_quota not found in profile:", userProfile);
            setNotesCount(FREE_NOTES_QUOTA_BASE);
          }
          if (userProfile.hasOwnProperty('id')) {
            setProfileId(userProfile.id);
          } else {
            console.error("Profile ID not found in fetched data:", userProfile);
          }
        } else {
          console.log("No profile data loaded for the user.");
          setTaskCount(FREE_TODOS_QUOTA_BASE);
          setNotesCount(FREE_NOTES_QUOTA_BASE);
        }
      } catch (error) {
        console.error("Error in loadInitialData (useEffect):", error);
        setTaskCount(FREE_TODOS_QUOTA_BASE);
        setNotesCount(FREE_NOTES_QUOTA_BASE);
        setProfileId('');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
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

  async function recalculateAndUpdateProfileQuota(userId, packageType) {
    const baseFreeQuota = packageType === 'notes' ? FREE_NOTES_QUOTA_BASE : FREE_TODOS_QUOTA_BASE;

    const { data: activePackages, error: fetchError } = await supabase
      .from('quota_packages')
      .select('items_added')
      .eq('user_id', userId)
      .eq('package_type', packageType)
      .eq('is_active', true);

    if (fetchError) {
      console.error(`Error fetching active ${packageType} packages:`, fetchError.message);
      return;
    }

    let totalPaidQuota = 0;
    if (activePackages) {
      totalPaidQuota = activePackages.reduce((sum, pkg) => sum + pkg.items_added, 0);
    }

    const newTotalCurrentQuota = baseFreeQuota + totalPaidQuota;
    const columnToUpdate = packageType === 'notes' ? 'notes_current_total_quota' : 'todos_current_total_quota';

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ [columnToUpdate]: newTotalCurrentQuota })
      .eq('id', userId);

    if (updateProfileError) {
      console.error(`Error updating ${packageType} total quota in profiles:`, updateProfileError.message);
    } else {
      console.log(`Successfully updated ${packageType} total quota for user ${userId} to ${newTotalCurrentQuota}`);
      if (packageType === 'notes') {
        setNotesCount(newTotalCurrentQuota);
      } else {
        setTaskCount(newTotalCurrentQuota);
      }
    }
  }

  async function handlePurchaseQuotaPackage(packageType, itemsToAdd) {
    if (!profileId) {
      alert("Informasi pengguna tidak tersedia. Silakan coba lagi.");
      return;
    }
    setIsLoading(true);
    const purchaseTime = new Date();
    const expiryTime = new Date(purchaseTime.getTime());
    expiryTime.setMinutes(purchaseTime.getMinutes() + 3); // Tambah 30 hari

    const { data: newPackage, error: purchaseError } = await supabase
      .from('quota_packages')
      .insert({
        user_id: profileId,
        package_type: packageType,
        items_added: itemsToAdd,
        purchased_at: purchaseTime.toISOString(),
        expires_at: expiryTime.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error(`Error purchasing ${packageType} package:`, purchaseError.message);
      alert(`Gagal menambahkan paket ${packageType}. ${purchaseError.message}`);
      setIsLoading(false);
      return;
    }

    console.log(`${packageType} package purchased:`, newPackage);
    await recalculateAndUpdateProfileQuota(profileId, packageType);
    setIsLoading(false);
    alert(`Berhasil menambahkan ${itemsToAdd} ${packageType === 'notes' ? 'catatan' : 'tugas'} ke kuota Anda selama 30 hari!`);
  }

  async function handleResetToFreeTier(packageType) {
    if (!profileId) {
      alert("Informasi pengguna tidak tersedia. Silakan coba lagi.");
      return;
    }
    setIsLoading(true);
    const { error: deactivateError } = await supabase
      .from('quota_packages')
      .update({ is_active: false })
      .eq('user_id', profileId)
      .eq('package_type', packageType)
      .eq('is_active', true);

    if (deactivateError) {
      console.error(`Error deactivating ${packageType} packages:`, deactivateError.message);
      alert(`Gagal mengatur ulang ke paket gratis untuk ${packageType}. ${deactivateError.message}`);
      setIsLoading(false);
      return;
    }

    await recalculateAndUpdateProfileQuota(profileId, packageType);
    setIsLoading(false);
    alert(`Kuota ${packageType === 'notes' ? 'catatan' : 'tugas'} telah diatur ulang ke paket gratis.`);
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

  return (
    <PageLayout title="SETTINGS">
      {/* ... Bagian Image, BillForm, Avatar, dll. tetap sama ... */}
      <div className="w-full h-2/5 relative">
        <Image 
          src="/bg-settings.svg"
          alt="Background Settings" 
          fill 
          style={{ objectFit: 'cover' }} 
          priority 
        />
      </div>

      {/* {showForm &&  ( 
        <BillForm 
        //   formAction={formAction} 
        //   state={state} 
          setShowForm={setShowForm} 
        />
      )} */}

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
      
      <div className="flex flex-col gap-6">
        {/* BAGIAN TO-DO LIST */}
        <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-center justify-center text-[#232360]">
          <p className="lg:w-20 text-center text-semibold">TO-DO LIST</p>
          <div className="flex flex-row gap-6 items-center w-full">
            <div className="w-1/3 text-center lg:px-10 bg-[#D9D9D9] rounded-md hover:bg-[#A0A0A0]">
              <Button
                // MODIFIKASI: onClick untuk To-Do
                onClick={() => handleResetToFreeTier('todos')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                {/* ... Konten Tombol FREE ... */}
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">FREE</h1>
                  <p className="text-sm mt-8 mb-[-20] min-[756px]:mb-0">User got free {FREE_TODOS_QUOTA_BASE} to-do items</p>
                </div>
              </Button>
            </div>
            <div className="w-1/3 bg-[#8FEBFF] rounded-md hover:bg-[#1FABAF] transition-colors">
              <Button 
                // MODIFIKASI: onClick untuk To-Do
                onClick={() => handlePurchaseQuotaPackage('todos', 5)}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                {/* ... Konten Tombol +5 ... */}
                <div className="flex flex-col justify-center items-center text-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+5</h1>
                  <sub className="font-light">add 5 to-do items</sub>
                  <p className="text-sm mt-8">10.000/month</p>
                </div>
              </Button>
            </div>
            <div className="w-1/3 lg:px-10 bg-[#1EA7FF] rounded-md hover:bg-[#1E57AF]">
              <Button 
                // MODIFIKASI: onClick untuk To-Do
                onClick={() => handlePurchaseQuotaPackage('todos', 10)}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                {/* ... Konten Tombol +10 ... */}
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+10</h1>
                  <sub className="font-light">add 10 to-do items</sub>
                  <p className="text-sm mt-8">18.000/month</p>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* BAGIAN NOTES */}
        <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-center justify-center text-[#232360] mb-5">
          <p className="w-20 text-center text-semibold">NOTES</p>
          <div className="flex flex-row gap-6 text-center items-center w-full">
            <div className="w-1/3 text-center lg:px-10 bg-[#D9D9D9] rounded-md hover:bg-[#A0A0A0] transition-colors">
              <Button
                // MODIFIKASI: onClick untuk Notes
                onClick={() => handleResetToFreeTier('notes')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">FREE</h1>
                  <p className="text-sm mt-8 mb-[-20] min-[756px]:mb-0">User got free {FREE_NOTES_QUOTA_BASE} notes items</p>
                </div>
              </Button>
            </div>
            <div className="w-1/3 bg-[#8FEBFF] rounded-md hover:bg-[#1FABAF] transition-colors">
              <Button
                // MODIFIKASI: onClick untuk Notes
                onClick={() => handlePurchaseQuotaPackage('notes', 5)}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                <div className="flex flex-col justify-center items-center text-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+5</h1>
                  <sub className="font-light">add 5 notes items</sub>
                  <p className="text-sm mt-8">10.000/month</p>
                </div>
              </Button>
            </div>
            <div className="w-1/3 bg-[#1EA7FF] rounded-md hover:bg-[#1E57AF] transition-colors">
              <Button
                // MODIFIKASI: onClick untuk Notes
                onClick={() => handlePurchaseQuotaPackage('notes', 10)}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0"
              >
                <div className="flex flex-col justify-center items-center">
                  <h1 className="font-bold text-2xl min-[900px]:text-3xl mt-10">+10</h1>
                  <sub className="font-light">add 10 notes items</sub>
                  <p className="text-sm mt-8">18.000/month</p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}