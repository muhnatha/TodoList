'use client'
import { React, useState, useEffect } from 'react' 
import { Bell, X, CheckCircle } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export default function Header({ title, profileEmail }) { 
    const [showNotification, setShowNotification] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [loadingProfile, setLoadingProfile] = useState(true); 

    useEffect(() => {
        async function loadProfile() {
            setLoadingProfile(true);
            setUserEmail(profileEmail);
            setLoadingProfile(false);
        }
        loadProfile();
    }, [profileEmail]);

    let avatarSrc = `https://ui-avatars.com/api/?name=User&background=random`; 
    let avatarFallback = 'U';
    let email = 'User';

    if (userEmail) {
        email = userEmail || 'User';
        avatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`;
        
        if (email && email.includes('@')) {
            avatarFallback = email.substring(0, 2).toUpperCase();
        } else if (email) {
            avatarFallback = email.substring(0, 1).toUpperCase();
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
                <h1 className='text-lg sm:text-xl md:text-2xl font-semibold py-4'>{title}</h1>
                <div className="absolute top-0 right-0 h-full flex items-center mx-7 gap-1">
                    <button
                        className="p-2 pr-0 sm:pr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={() => setShowNotification(!showNotification)}>
                        <Bell className='size-7 hover:cursor-pointer text-[#768396] dark:text-gray-400 pt-0.5' />
                    </button>
                    {loadingProfile ? (
                        <Avatar className={"w-10 h-10 bg-gray-200 animate-pulse"}>
                            <AvatarFallback>...</AvatarFallback> {/* Show loading indicator */}
                        </Avatar>
                    ) : (
                        <a href='/settings/details' className='hover:cursor-pointer'>
                            <Avatar className={"w-10 h-10 hidden sm:block"}>
                                <AvatarImage src={avatarSrc} />
                                <AvatarFallback>{avatarFallback}</AvatarFallback>
                            </Avatar>
                        </a>
                    )}
                </div>
            </div>
        </>
    );
};