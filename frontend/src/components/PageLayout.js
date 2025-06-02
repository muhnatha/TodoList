import { React, useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'
import { supabase } from '@/lib/supabaseClient'

async function fetchUserProfile() { 
  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(); 
  if (userError || !authUser) {
    console.error("Error fetching user or no user logged in:", userError?.message || "No user session");
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', authUser.id)
    .single();

  if (profileError) {
    if (profileError.code !== 'PGRST116') {
      console.error("Error fetching profile:", profileError.message);
    } else {
      console.log("No profile found for user ID:", authUser.id);
    }
    return { id: authUser.id, email: authUser.email};
  }
  
  // console.log("Fetched user profile (PageLayout):", profile);
  return profile; 
}

export default function PageLayout({ title, children }) {
  const [userProfile, setUserProfile] = useState(null);
  const [profileId, setProfileId] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
      const loadInitialData = async () => {
        try {
          const userProfile = await fetchUserProfile();
  
          if (userProfile) {
            const {
              id = '',
              email = ''
            } = userProfile;
  
            setUserProfile(userProfile);
            setProfileId(id ?? '');
            setUserEmail(email ?? '');
  
            if (!id) console.error("Profile ID not found in fetched data, even after destructuring.");
            if (!email && id) console.warn("Email not found in profile for user:", id); 
  
          } else {
            console.log("No profile data loaded for the user. Using default states.");
            setProfileId('');
            setUserEmail('');
          }
        } catch (error) {
          console.error("Error in fetch:", error);
          setProfileId('');
          setUserEmail('');
        }
      };
  
      loadInitialData();
    }, []);

  return (
    <div className={`flex h-screen ${title.toLowerCase() === 'dashboard' ? 'bg-[#F3F4F8]' : 'bg-white'} dark:bg-slate-950 text-slate-900 dark:text-slate-50`}>
        <div className='z-20'>
            <Sidebar />
        </div>
        <div className='flex flex-col overflow-y-auto flex-1'>
            <header className={`sticky top-0 z-10 w-full p-3 ${title.toLowerCase() === 'dashboard' ? 'bg-white' : 'bg-[#FBFAFF]'}`}>
                <Header title={title} profileEmail={userEmail}/>
            </header>
            <main className="flex-1 p-6">
                { children }
            </main>
        </div>
     </div>
   );
}