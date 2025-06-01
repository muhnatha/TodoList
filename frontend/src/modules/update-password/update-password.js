// pages/update-password.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link'; // Import Link for navigation
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

// MessageDisplay Component (remains the same, already in English or using props)
function MessageDisplay({ type, content }) {
    if (!content) return null;
    const baseClasses = "p-3 rounded-md text-sm flex items-center";
    let typeClasses = "";
    let IconComponent = null; // Renamed for clarity

    if (type === 'error') {
        typeClasses = "bg-red-100 text-red-700";
        IconComponent = <AlertCircle className="mr-2 h-5 w-5" />;
    } else if (type === 'success') {
        typeClasses = "bg-green-100 text-green-700";
        IconComponent = <CheckCircle className="mr-2 h-5 w-5" />;
    } else { // Default or info type
        typeClasses = "bg-blue-100 text-blue-700";
        IconComponent = <AlertCircle className="mr-2 h-5 w-5" />;
    }
    return <div className={`${baseClasses} ${typeClasses}`}>{IconComponent}{content}</div>;
}

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', content: '' });
    const [isSessionReadyForUpdate, setIsSessionReadyForUpdate] = useState(false);
    const [isLinkValidationLoading, setIsLinkValidationLoading] = useState(true);
    const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const hasProcessedUrlParams = useRef(false);

    const processAuthCode = useCallback(async () => {
        const authCode = searchParams.get('code');
        const errorParam = searchParams.get('error');
        console.log("processAuthCode: Starting...");
        setIsLinkValidationLoading(true);
        if (errorParam) {
            const errorDescription = searchParams.get('error_description');
            console.error("processAuthCode: Error in URL:", errorDescription || errorParam);
            setMessage({ type: 'error', content: errorDescription || 'An error occurred with the password reset link.' });
            setIsSessionReadyForUpdate(false);
            router.replace('/update-password', { scroll: false });
            setIsLinkValidationLoading(false);
            return;
        }
        if (authCode) {
            console.log("processAuthCode: Auth Code found:", authCode);
            setMessage({ type: '', content: 'Validating password reset link...' });
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
            router.replace('/update-password', { scroll: false }); 
            if (exchangeError) {
                console.error("processAuthCode: Failed to exchange code:", exchangeError);
                setMessage({ type: 'error', content: `Failed to validate link: ${exchangeError.message}. Please request a new link.` });
                setIsSessionReadyForUpdate(false);
            } else if (data.session) {
                console.log("processAuthCode: ✅ Session successful from exchange code (onAuthStateChange will confirm):", data.session);
                // onAuthStateChange will handle setting isSessionReadyForUpdate and messages
            } else {
                console.warn("processAuthCode: Exchange code successful, but no session data.");
                setMessage({ type: 'error', content: 'The password reset link is invalid or an internal error occurred. Please try again.' });
                setIsSessionReadyForUpdate(false);
            }
        } else {
            console.warn("processAuthCode: Called without a valid authCode or errorParam.");
            // Only show error if not already processing a valid session via fragment or already ready
            if (!window.location.hash.includes('access_token') && !isSessionReadyForUpdate) {
                setMessage({ type: 'error', content: 'The password reset link is invalid or incomplete.' });
            }
        }
        if (!isSessionReadyForUpdate) { 
            setIsLinkValidationLoading(false);
        }
    }, [searchParams, router]); // Removed isSessionReadyForUpdate from deps as it caused loops

    useEffect(() => {
        if (!isSessionReadyForUpdate && !message.type) { // Only show initial loading if no message is set yet
            setIsLinkValidationLoading(true);
        }
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`onAuthStateChange event: ${event}`, session);
            switch (event) {
                case 'PASSWORD_RECOVERY':
                    console.log('✅ PASSWORD_RECOVERY event detected.');
                    setIsSessionReadyForUpdate(true);
                    setMessage({ type: 'success', content: 'Recovery link validated. Please enter your new password.' });
                    router.replace('/update-password', { scroll: false }); // Clean URL
                    setIsLinkValidationLoading(false);
                    hasProcessedUrlParams.current = true; // Mark as processed
                    break;
                case 'SIGNED_IN':
                    if (session) {
                        console.log('✅ SIGNED_IN event detected.');
                        // This can happen after exchangeCodeForSession if it leads to a sign-in
                        // or if the user was already signed in through the recovery flow.
                        if (!isSessionReadyForUpdate) { // If not already set by PASSWORD_RECOVERY
                           setIsSessionReadyForUpdate(true);
                           setMessage({ type: 'success', content: 'Session validated. You can now update your password.' });
                        } else {
                            // If already ready, ensure loading is false
                           setIsSessionReadyForUpdate(true); 
                        }
                        setIsLinkValidationLoading(false);
                        hasProcessedUrlParams.current = true; // Mark as processed
                    }
                    break;
                case 'INITIAL_SESSION':
                    console.log('INITIAL_SESSION event detected.');
                    const code = searchParams.get('code');
                    const errorParam = searchParams.get('error');
                    const hasFragment = window.location.hash.includes('access_token'); // PKCE flow might use fragment
                    // If no session, no code, no error, and no fragment, it's likely an invalid direct access.
                    if (!session && !code && !errorParam && !hasFragment) {
                        if (!isSessionReadyForUpdate) { // Only if not already validated
                            setMessage({ type: 'error', content: 'The password reset link is invalid or incomplete.' });
                        }
                    }
                    if (!code && !errorParam) { // If no params to process, stop initial loading
                        setIsLinkValidationLoading(false);
                    }
                    break;
                case 'SIGNED_OUT':
                    console.log('SIGNED_OUT event detected.');
                    setIsSessionReadyForUpdate(false);
                    setIsLinkValidationLoading(false); // Stop loading if signed out
                    hasProcessedUrlParams.current = false; // Reset processing flag
                    break;
                case 'USER_UPDATED':
                    console.log("User information successfully updated (USER_UPDATED event).");
                    // This event fires after supabase.auth.updateUser()
                    // The success message and redirect are handled in handleSubmit
                    break;
                default:
                    // Potentially stop loading if no other event handles it and session is not ready
                    if (!isSessionReadyForUpdate && !searchParams.get('code') && !searchParams.get('error') && !window.location.hash.includes('access_token')) {
                        setIsLinkValidationLoading(false);
                    }
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, [router, searchParams, isSessionReadyForUpdate, message.type]); // Added message.type to deps

    useEffect(() => {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        // Only call processAuthCode if there's a code or error in URL and it hasn't been processed,
        // and a session isn't already established for password recovery.
        if (!isSessionReadyForUpdate && (code || errorParam) && !hasProcessedUrlParams.current) {
            console.log("useEffect: Detected 'code' or 'errorParam', delaying processAuthCode call.");
            hasProcessedUrlParams.current = true; // Mark as attempting to process
            const timerId = setTimeout(() => {
                console.log("Calling processAuthCode after delay.");
                processAuthCode();
            }, 700); // Delay to allow onAuthStateChange to potentially fire first
            return () => {
                console.log("useEffect cleanup: Clearing timer for processAuthCode.");
                clearTimeout(timerId);
            };
        } else if (isSessionReadyForUpdate && (code || errorParam)) {
            // If session is ready but params are still in URL, means they were processed.
            // Ensure loading is false.
            if(isLinkValidationLoading) setIsLinkValidationLoading(false);
        }
    }, [searchParams, processAuthCode, isSessionReadyForUpdate, isLinkValidationLoading]); // Added isLinkValidationLoading

    useEffect(() => {
        if (shouldRedirectToLogin) {
            const timerId = setTimeout(async () => {
                console.log("Signing out after displaying success message...");
                try {
                    await supabase.auth.signOut();
                    console.log("Sign out successful.");
                } catch (signOutError) {
                    console.error("Error signing out after password update:", signOutError);
                    // Optional: Handle sign out error if necessary,
                    // but still proceed to redirect to login.
                } finally {
                    console.log("Redirecting to login page.");
                    router.push('/login');
                    setShouldRedirectToLogin(false); // Reset trigger state
                }
            }, 3000); // Display message for 3 seconds

            return () => clearTimeout(timerId); // Cleanup timer if component unmounts
        }
    }, [shouldRedirectToLogin, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password.length < 6) {
            setMessage({ type: 'error', content: 'Password must be at least 6 characters long.' });
            return;
        }
        if (password !== confirmPassword) {
            setMessage({ type: 'error', content: 'Password and confirm password do not match.' });
            return;
        }
        if (!isSessionReadyForUpdate) {
            setMessage({ type: 'error', content: 'Session for password update is not ready or the link is invalid.' });
            return;
        }
        
        setMessage({ type: '', content: '' }); // Clear previous messages
        setSubmitLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });
        
        setSubmitLoading(false); // Stop submit loading immediately after the call

        if (updateError) {
            setMessage({ type: 'error', content: `Failed to update password: ${updateError.message}` });
            console.error("Supabase updateUser error:", updateError);
        } else {
            console.log("Password updated successfully. Displaying message and triggering redirect via useEffect.");
            setMessage({ type: 'success', content: 'Password updated successfully! You will be redirected to the login page shortly.' });
            setShouldRedirectToLogin(true); // Trigger useEffect for sign out and redirect
        }
    };

    if (isLinkValidationLoading && !message.content && !isSessionReadyForUpdate) { // Show loading only if no message is displayed yet
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 p-4">
                <p className="text-lg text-gray-700">Validating link...</p>
                {/* You could add a spinner icon here */}
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 p-4 font-sans">
            <div className="w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-lg shadow-2xl rounded-xl">
                <div className="text-center">
                    <Lock className="mx-auto h-12 w-12 text-indigo-600" />
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
                        Update Your Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter your new password below.
                    </p>
                </div>

                {message.content && (
                    <MessageDisplay type={message.type} content={message.content} />
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 sr-only">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="New Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={!isSessionReadyForUpdate || submitLoading || shouldRedirectToLogin}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 hover:cursor-pointer"
                                disabled={!isSessionReadyForUpdate || submitLoading || shouldRedirectToLogin}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 sr-only">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={!isSessionReadyForUpdate || submitLoading || shouldRedirectToLogin}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 hover:cursor-pointer"
                                disabled={!isSessionReadyForUpdate || submitLoading || shouldRedirectToLogin}
                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={submitLoading || !isSessionReadyForUpdate || shouldRedirectToLogin}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed hover:cursor-pointer"
                        >
                            {submitLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
                 <p className="mt-4 text-center text-xs text-gray-500">
                    Remember your password? <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Login here</Link>
                </p>
            </div>
        </div>
    );
}
