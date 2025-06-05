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
const TODO_ITEM_PRICE = 200; // Rp200 per to-do item
const NOTE_ITEM_PRICE = 500; // Rp500 per note item

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
        billing: 0,
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
  const [billing, setBilling] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedPackageForConfirmation, setSelectedPackageForConfirmation] = useState(null);

  const [customTodoValue, setCustomTodoValue] = useState(1);
  const [customNoteValue, setCustomNoteValue] = useState(1);

  async function recalculateAndUpdateProfileQuota(userId, packageType) {
      const baseFreeQuota = packageType === 'notes' ? FREE_NOTES_QUOTA_BASE : FREE_TODOS_QUOTA_BASE;
      const { data: userProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('billing') 
        .eq('id', userId)
        .single(); 

      if (profileFetchError) {
        console.error(`Error fetching profile to get billing amount:`, profileFetchError.message);
      }

      const currentBillingAmount = userProfile?.billing ?? 0;
      console.log(`Fetched current billing amount for UI: ${currentBillingAmount}`);

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
        
        setBilling(currentBillingAmount); 
        console.log(`UI state for billing display updated to: ${currentBillingAmount}`);
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
          setBilling(fetchedProfileData.billing || 0);
        } else {
          console.log("No profile data loaded for the user.");
          setTaskCount(FREE_TODOS_QUOTA_BASE);
          setNotesCount(FREE_NOTES_QUOTA_BASE);
          setProfileId('');
          setBilling(0);
        }
      } catch (error) {
        console.error("Error in loadInitialData (useEffect):", error);
        setTaskCount(FREE_TODOS_QUOTA_BASE);
        setNotesCount(FREE_NOTES_QUOTA_BASE);
        setProfileId('');
        setBilling(0);
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

  async function executePurchaseQuotaPackage(packageType, itemsToAdd, expiryDateString) {
    if (!profileId) {
      alert("User information is unavailable. Please try again.");
      setShowConfirmationModal(false);
      return;
    }
    setIsLoading(true);
    const purchaseTime = new Date();

    const finalExpiryDate = new Date(expiryDateString);
    finalExpiryDate.setHours(23, 59, 59, 999);

    const { data: newPackage, error: purchaseError } = await supabase
      .from('quota_packages')
      .insert({
        user_id: profileId,
        package_type: packageType,
        items_added: itemsToAdd,
        purchased_at: purchaseTime.toISOString(),
        expires_at: finalExpiryDate.toISOString(), 
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
        details: `Purchased ${itemsToAdd} additional ${packageType} quota, expiring on ${finalExpiryDate.toLocaleDateString()}`,
        created_at: new Date().toISOString()
      });
      if (logError) {
        console.error('Error logging billing purchase activity:', logError.message);
      }
      alert(`Successfully added ${itemsToAdd} ${packageType === 'notes' ? 'Notes' : 'To-Do items'} to your quota! The package will expire on ${finalExpiryDate.toLocaleDateString()}.`);
    }
    setIsLoading(false);
  }

  const initiatePurchaseConfirmation = (type, items, priceString, actionText) => {
    if (!profileId) {
      alert("User information is unavailable. Please log in again.");
      return;
    }
    setSelectedPackageForConfirmation({ type, items, price: priceString, actionText });
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
      <div className="w-full h-[240px] relative">
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
        onConfirm={async (chosenExpiryDateFromModal) => {
        // CRITICAL LOG: What is received here?
        console.log('[SettingsBillingPage onConfirm prop] Received date from BillForm:', `"${chosenExpiryDateFromModal}"`, '| Type:', typeof chosenExpiryDateFromModal);

        if (selectedPackageForConfirmation) {
          // Explicit check for undefined or null before calling executePurchaseQuotaPackage
          if (chosenExpiryDateFromModal === undefined || chosenExpiryDateFromModal === null || String(chosenExpiryDateFromModal).trim() === '') {
            console.error('[SettingsBillingPage onConfirm prop] CRITICAL: chosenExpiryDateFromModal is invalid (undefined, null, or empty)! Aborting purchase.');
            alert("Internal error: The expiry date was not correctly received. Please try again.");
            setShowConfirmationModal(false);
            setIsLoading(false);
            return;
          }
          await executePurchaseQuotaPackage(
            selectedPackageForConfirmation.type,
            selectedPackageForConfirmation.items,
            chosenExpiryDateFromModal // This value becomes expiryDateString
          );
        } else {
          console.error('[SettingsBillingPage onConfirm prop] selectedPackageForConfirmation is null/undefined. Cannot proceed.');
          alert("Internal error: Package details missing. Please try again.");
          setShowConfirmationModal(false);
          setIsLoading(false);
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
        {/* TO-DO LIST QUOTA SECTION */}
        <div className="flex flex-col items-center text-[#232360] space-y-3">
          <div className='flex flex-row justify-between w-full'>
            <h2 className="text-xl font-semibold">TO-DO LIST QUOTA: <span className="text-indigo-600 font-bold">{isLoading && !userProfile ? 'Loading...' : `${taskCount} items`}</span> <span>(Rp{TODO_ITEM_PRICE}/item)</span></h2>
            <h2 className="text-xl font-semibold">Total Billing: Rp<span>{billing}</span></h2>
          </div>
          <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-stretch justify-center gap-4 md:gap-6">
            {/* Free Tier */}
            <div className="w-full md:w-1/4 text-center bg-[#D9D9D9] rounded-md hover:bg-[#C0C0C0] transition-colors flex flex-col">
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
            {/* +5 Package */}
            <div className="w-full md:w-1/4 bg-[#8FEBFF] rounded-md hover:bg-[#6CDAE0] transition-colors flex flex-col">
              <Button
                onClick={() => initiatePurchaseConfirmation('todos', 5, `Rp${(5 * TODO_ITEM_PRICE).toLocaleString('id-ID')}`, '+5 To-Do Items')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">+5</h3>
                <sub className="font-light">Add 5 To-Do Items</sub>
              </Button>
            </div>
            {/* +10 Package */}
            <div className="w-full md:w-1/4 bg-[#1EA7FF] rounded-md hover:bg-[#1A8CD8] transition-colors flex flex-col">
              <Button
                onClick={() => initiatePurchaseConfirmation('todos', 10, `Rp${(10 * TODO_ITEM_PRICE).toLocaleString('id-ID')}`, '+10 To-Do Items')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">+10</h3>
                <sub className="font-light">Add 10 To-Do Items</sub>
              </Button>
            </div>
            {/* Custom Amount for Todos */}
            <div className="w-full md:w-1/4 bg-[#A0A0FF] rounded-md hover:bg-[#8080D0] transition-colors flex flex-col p-3 justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1 text-center text-[#232360]">Custom</h3>
                <input
                  type="number"
                  value={customTodoValue}
                  onChange={(e) => setCustomTodoValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 rounded-sm bg-white text-black mb-2 text-center"
                  placeholder="Qty"
                  min="1"
                />
              </div>
              <Button
                onClick={() => {
                  const totalPrice = customTodoValue * TODO_ITEM_PRICE;
                  initiatePurchaseConfirmation('todos', customTodoValue, `Rp${totalPrice.toLocaleString('id-ID')}`, `+${customTodoValue} To-Do Item(s)`);
                }}
                disabled={isLoading || customTodoValue <= 0}
                className="hover:cursor-pointer w-full py-2 px-4 text-[#232360] bg-white hover:bg-gray-200 focus:ring-0"
              >
                Add Items
              </Button>
            </div>
          </div>
        </div>

        {/* NOTES QUOTA SECTION */}
        <div className="flex flex-col items-center text-[#232360] space-y-3 mb-5">
          <h2 className="text-xl font-semibold self-start">NOTES QUOTA: <span className="text-purple-600 font-bold">{isLoading && !userProfile ? 'Loading...' : `${notesCount} items`}</span> <span>(Rp{NOTE_ITEM_PRICE}/item)</span></h2>
          <div className="flex flex-row flex-wrap lg:flex-nowrap w-full items-stretch justify-center gap-4 md:gap-6">
            {/* Free Tier */}
            <div className="w-full md:w-1/4 text-center bg-[#D9D9D9] rounded-md hover:bg-[#C0C0C0] transition-colors flex flex-col">
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
            {/* +5 Package */}
            <div className="w-full md:w-1/4 bg-[#8FEBFF] rounded-md hover:bg-[#6CDAE0] transition-colors flex flex-col">
              <Button
                onClick={() => initiatePurchaseConfirmation('notes', 5, `Rp${(5 * NOTE_ITEM_PRICE).toLocaleString('id-ID')}`, '+5 Notes')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">+5</h3>
                <sub className="font-light">Add 5 Notes</sub>
              </Button>
            </div>
            {/* +10 Package */}
            <div className="w-full md:w-1/4 bg-[#1EA7FF] rounded-md hover:bg-[#1A8CD8] transition-colors flex flex-col">
              <Button
                onClick={() => initiatePurchaseConfirmation('notes', 10, `Rp${(10 * NOTE_ITEM_PRICE).toLocaleString('id-ID')}`, '+10 Notes')}
                disabled={isLoading}
                className="hover:cursor-pointer w-full h-full py-5 px-2 lg:px-7 text-[#232360] bg-transparent hover:bg-transparent focus:ring-0 flex-grow flex flex-col justify-center items-center"
              >
                <h3 className="font-bold text-2xl min-[900px]:text-3xl">+10</h3>
                <sub className="font-light">Add 10 Notes</sub>
              </Button>
            </div>
            {/* Custom Amount for Notes */}
            <div className="w-full md:w-1/4 bg-[#A0A0FF] rounded-md hover:bg-[#8080D0] transition-colors flex flex-col p-3 justify-between"> {/* Light purple-ish color */}
              <div>
                <h3 className="font-bold text-lg mb-1 text-center text-[#232360]">Custom</h3>
                <input
                  type="number"
                  value={customNoteValue}
                  onChange={(e) => setCustomNoteValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 rounded-sm bg-white text-black mb-2 text-center"
                  placeholder="Qty"
                  min="1"
                />
              </div>
              <Button
                onClick={() => {
                  const totalPrice = customNoteValue * NOTE_ITEM_PRICE;
                  initiatePurchaseConfirmation('notes', customNoteValue, `Rp${totalPrice.toLocaleString('id-ID')}`, `+${customNoteValue} Note(s)`);
                }}
                disabled={isLoading || customNoteValue <= 0}
                className="hover:cursor-pointer w-full py-2 px-4 text-[#232360] bg-white hover:bg-gray-200 focus:ring-0"
              >
                Add Items
              </Button>
            </div>
          </div>
        </div>
        <div>
          <button
            className='bg-indigo-600 hover:cursor-pointer text-white font-bold py-2 px-5 rounded-md hover:bg-indigo-950 transition-colors'
            onClick={() => alert("User payment")}
          >
            Pay Bills
          </button>
        </div>
      </div>
    </PageLayout>
  );
}