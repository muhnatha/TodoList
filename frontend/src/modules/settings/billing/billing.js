'use client'
import React, { useState, useEffect } from 'react'
import PageLayout from "@/components/PageLayout"
import Image from "next/image"
import { PencilIcon } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { usePathname } from 'next/navigation'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import BillForm from "@/components/BillForm"

const FREE_NOTES_QUOTA_BASE = 3;
const FREE_TODOS_QUOTA_BASE = 5;

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
      console.error("Error fetching profile from Supabase:", profileError.message);
    } else {
      console.log("No profile found for user ID:", user.id, "Using auth user data as fallback.");
      return {
        id: user.id,
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url,
        user_metadata: user.user_metadata,
        notes_current_total_quota: FREE_NOTES_QUOTA_BASE,
        todos_current_total_quota: FREE_TODOS_QUOTA_BASE,
      };
    }
    return null;
  }

  console.log("Fetched user profile from Supabase:", profile);
  return {
    ...user,
    ...profile,
    email: profile.email || user.email,
    avatar_url: profile.avatar_url || user.user_metadata?.avatar_url
  };
}

export default function SettingsBillingPage() {
  const pathname = usePathname();
  const [taskCount, setTaskCount] = useState(FREE_TODOS_QUOTA_BASE);
  const [notesCount, setNotesCount] = useState(FREE_NOTES_QUOTA_BASE);
  const [profileId, setProfileId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedPackageForConfirmation, setSelectedPackageForConfirmation] = useState(null);

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

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const fetchedProfileData = await fetchUserProfile();
        if (fetchedProfileData) {
          setUserProfile(fetchedProfileData);
          setTaskCount(fetchedProfileData.todos_current_total_quota ?? FREE_TODOS_QUOTA_BASE);
          setNotesCount(fetchedProfileData.notes_current_total_quota ?? FREE_NOTES_QUOTA_BASE);
          setProfileId(fetchedProfileData.id || '');
        } else {
          console.log("No profile data loaded for the user.");
          setTaskCount(FREE_TODOS_QUOTA_BASE);
          setNotesCount(FREE_NOTES_QUOTA_BASE);
          setProfileId('');
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

  async function executePurchaseQuotaPackage(packageType, itemsToAdd) {
    if (!profileId) {
      alert("User information is unavailable. Please try again.");
      setShowConfirmationModal(false);
      return;
    }
    setIsLoading(true);
    const purchaseTime = new Date();
    const expiryTime = new Date(purchaseTime.getTime());
    expiryTime.setDate(purchaseTime.getDate() + 30);

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

    setShowConfirmationModal(false);

    if (purchaseError) {
      console.error(`Error purchasing ${packageType} package:`, purchaseError.message);
      alert(`Failed to add ${packageType} package. ${purchaseError.message}`);
    } else {
      console.log(`${packageType} package purchased:`, newPackage);
      await recalculateAndUpdateProfileQuota(profileId, packageType);
      const { error: logError } = await supabase.from('activity_log').insert({
        user_id: profileId,
        page: 'Billing',
        action: 'Updated',
        details: `Purchased ${itemsToAdd} additional ${packageType} quota`,
        created_at: new Date().toISOString()
      });
      if (logError) {
        console.error('Error logging billing purchase activity:', logError.message);
      }
      alert(`Successfully added ${itemsToAdd} ${packageType === 'notes' ? 'Notes' : 'To-Do items'} to your quota! The package will expire in 30 days.`);
    }
    setIsLoading(false);
  }

  const initiatePurchaseConfirmation = (type, items, price, actionText) => {
    if (!profileId) {
      alert("User information is unavailable. Please log in again.");
      return;
    }
    setSelectedPackageForConfirmation({ type, items, price, actionText });
    setShowConfirmationModal(true);
  };

  async function handleResetToFreeTier(packageType) {
    if (!profileId) {
      alert("Informasi pengguna tidak tersedia. Silakan coba lagi.");
      return;
    }

    const confirmationMessage = `Are you sure you want to reset your ${packageType === 'notes' ? 'Notes' : 'To-Do List'} quota to the free tier? All active paid packages for this category will be deactivated.`;
    if (!window.confirm(confirmationMessage)) {
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
    } else {
      await recalculateAndUpdateProfileQuota(profileId, packageType);
      const { error: logError } = await supabase.from('activity_log').insert({
        user_id: profileId,
        page: 'Billing',
        action: 'Updated',
        details: `Reset ${packageType} quota to free tier`,
        created_at: new Date().toISOString()
      });
      if (logError) {
        console.error('Error logging billing reset activity:', logError.message);
      }
      alert(`Kuota ${packageType === 'notes' ? 'catatan' : 'tugas'} telah diatur ulang ke paket gratis.`);
    }
    setIsLoading(false);
  }

  const navSettings = [
    { href: "/settings/details", text: "My Details"},
    { href: "/settings/password", text: "Password"},
    { href: "/settings/billing", text: "Billing"},
    { href: "/settings/log", text: "Activity Log"}
  ];

  const renderNavSettings = (item, index) => (
    <li key={index}>
      <Link
        href={item.href}
        className={`hover:opacity-100 ${pathname === item.href ? 'opacity-100' : 'opacity-20'} text-sm sm:text-md text-[#232360]`}
      >
        {item.text}
      </Link>
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

      <BillForm
        showModal={showConfirmationModal}
        setShowModal={setShowConfirmationModal}
        packageDetails={selectedPackageForConfirmation}
        onConfirm={() => {
          if (selectedPackageForConfirmation) {
            executePurchaseQuotaPackage(selectedPackageForConfirmation.type, selectedPackageForConfirmation.items);
          }
        }}
        isLoading={isLoading}
      />

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

      <div className="flex flex-col gap-10 p-4 md:p-6">
        <div className="flex flex-col items-center text-[#232360] space-y-3">
          <h2 className="text-xl font-semibold self-start">TO-DO LIST QUOTA: <span className="text-indigo-600 font-bold">{isLoading && !userProfile ? 'Loading...' : `${taskCount} items`}</span></h2>
          <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-stretch justify-center gap-4 md:gap-6">
            <div className="w-full md:w-1/3 text-center bg-[#D9D9D9] rounded-md hover:bg-[#C0C0C0] transition-colors flex flex-col">
              <Button
                onClick={() => handleResetToFreeTier('todos')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">FREE</h3>
                <p className="text-sm mt-2">Base Quota: {FREE_TODOS_QUOTA_BASE} items</p>
                <p className="text-xs mt-1">(Reset to this tier)</p>
              </Button>
            </div>
            <div className="w-full md:w-1/3 bg-[#8FEBFF] rounded-md hover:bg-[#6CDAE0] transition-colors flex flex-col">
              <Button
                onClick={() => initiatePurchaseConfirmation('todos', 5, '10.000/month', '+5 To-Do Items')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">+5</h3>
                <sub className="font-light">Add 5 To-Do Items</sub>
                <p className="text-sm mt-2">10.000/month</p>
              </Button>
            </div>
            <div className="w-full md:w-1/3 bg-[#1EA7FF] rounded-md hover:bg-[#1A8CD8] transition-colors flex flex-col">
              <Button
                onClick={() => initiatePurchaseConfirmation('todos', 10, '18.000/month', '+10 To-Do Items')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">+10</h3>
                <sub className="font-light">Add 10 To-Do Items</sub>
                <p className="text-sm mt-2">18.000/month</p>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center text-[#232360] space-y-3 mb-5">
          <h2 className="text-xl font-semibold self-start">NOTES QUOTA: <span className="text-purple-600 font-bold">{isLoading && !userProfile ? 'Loading...' : `${notesCount} items`}</span></h2>
          <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-stretch justify-center gap-4 md:gap-6">
            <div className="w-full md:w-1/3 text-center bg-[#D9D9D9] rounded-md hover:bg-[#C0C0C0] transition-colors flex flex-col">
              <Button
                onClick={() => handleResetToFreeTier('notes')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">FREE</h3>
                <p className="text-sm mt-2">Base Quota: {FREE_NOTES_QUOTA_BASE} items</p>
                <p className="text-xs mt-1">(Reset to this tier)</p>
              </Button>
            </div>
            <div className="w-full md:w-1/3 bg-[#8FEBFF] rounded-md hover:bg-[#6CDAE0] transition-colors flex flex-col">
              <Button
                onClick={() => initiatePurchaseConfirmation('notes', 5, '10.000/month', '+5 Notes')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">+5</h3>
                <sub className="font-light">Add 5 Notes</sub>
                <p className="text-sm mt-2">10.000/month</p>
              </Button>
            </div>
            <div className="w-full md:w-1/3 bg-[#1EA7FF] rounded-md hover:bg-[#1A8CD8] transition-colors flex flex-col">
              <Button
                onClick={() => initiatePurchaseConfirmation('notes', 10, '18.000/month', '+10 Notes')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">+10</h3>
                <sub className="font-light">Add 10 Notes</sub>
                <p className="text-sm mt-2">18.000/month</p>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}