'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

function MessageDisplay({ type, content }) {
    if (!content) return null;
    const baseClasses = "p-3 rounded-md text-sm flex items-center";
    let typeClasses = "";
    let IconComponent = null; 

    if (type === 'error') {
        typeClasses = "bg-red-100 text-red-700";
        IconComponent = <AlertCircle className="mr-2 h-5 w-5" />;
    } else if (type === 'success') {
        typeClasses = "bg-green-100 text-green-700";
        IconComponent = <CheckCircle className="mr-2 h-5 w-5" />;
    } else { 
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
            } else {
                console.warn("processAuthCode: Exchange code successful, but no session data.");
                setMessage({ type: 'error', content: 'The password reset link is invalid or an internal error occurred. Please try again.' });
                setIsSessionReadyForUpdate(false);
            }
        } else {
            console.warn("processAuthCode: Called without a valid authCode or errorParam.");
            if (!window.location.hash.includes('access_token') && !isSessionReadyForUpdate) {
                setMessage({ type: 'error', content: 'The password reset link is invalid or incomplete.' });
            }
        }
        if (!isSessionReadyForUpdate) { 
            setIsLinkValidationLoading(false);
        }
    }, [searchParams, router]); 

    useEffect(() => {
        if (!isSessionReadyForUpdate && !message.type) { 
            setIsLinkValidationLoading(true);
        }
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`onAuthStateChange event: ${event}`, session);
            switch (event) {
                case 'PASSWORD_RECOVERY':
                    console.log('✅ PASSWORD_RECOVERY event detected.');
                    setIsSessionReadyForUpdate(true);
                    setMessage({ type: 'success', content: 'Recovery link validated. Please enter your new password.' });
                    router.replace('/update-password', { scroll: false }); 
                    setIsLinkValidationLoading(false);
                    hasProcessedUrlParams.current = true;
                    break;
                case 'SIGNED_IN':
                    if (session) {
                        console.log('✅ SIGNED_IN event detected.');
                        if (!isSessionReadyForUpdate) { 
                           setIsSessionReadyForUpdate(true);
                           setMessage({ type: 'success', content: 'Session validated. You can now update your password.' });
                        } else {
                           setIsSessionReadyForUpdate(true); 
                        }
                        setIsLinkValidationLoading(false);
                        hasProcessedUrlParams.current = true; 
                    }
                    break;
                case 'INITIAL_SESSION':
                    console.log('INITIAL_SESSION event detected.');
                    const code = searchParams.get('code');
                    const errorParam = searchParams.get('error');
                    const hasFragment = window.location.hash.includes('access_token'); 
                    if (!session && !code && !errorParam && !hasFragment) {
                        if (!isSessionReadyForUpdate) { 
                            setMessage({ type: 'error', content: 'The password reset link is invalid or incomplete.' });
                        }
                    }
                    if (!code && !errorParam) { 
                        setIsLinkValidationLoading(false);
                    }
                    break;
                case 'SIGNED_OUT':
                    console.log('SIGNED_OUT event detected.');
                    setIsSessionReadyForUpdate(false);
                    setIsLinkValidationLoading(false); 
                    hasProcessedUrlParams.current = false; 
                    break;
                case 'USER_UPDATED':
                    console.log("User information successfully updated (USER_UPDATED event).");
                    break;
                default:
                    if (!isSessionReadyForUpdate && !searchParams.get('code') && !searchParams.get('error') && !window.location.hash.includes('access_token')) {
                        setIsLinkValidationLoading(false);
                    }
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, [router, searchParams, isSessionReadyForUpdate, message.type]); 

    useEffect(() => {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        if (!isSessionReadyForUpdate && (code || errorParam) && !hasProcessedUrlParams.current) {
            console.log("useEffect: Detected 'code' or 'errorParam', delaying processAuthCode call.");
            hasProcessedUrlParams.current = true; 
            const timerId = setTimeout(() => {
                console.log("Calling processAuthCode after delay.");
                processAuthCode();
            }, 700); 
            return () => {
                console.log("useEffect cleanup: Clearing timer for processAuthCode.");
                clearTimeout(timerId);
            };
        } else if (isSessionReadyForUpdate && (code || errorParam)) {
            if(isLinkValidationLoading) setIsLinkValidationLoading(false);
        }
    }, [searchParams, processAuthCode, isSessionReadyForUpdate, isLinkValidationLoading]); 

    useEffect(() => {
        if (shouldRedirectToLogin) {
            const timerId = setTimeout(async () => {
                console.log("Signing out after displaying success message...");
                try {
                    await supabase.auth.signOut();
                    console.log("Sign out successful.");
                } catch (signOutError) {
                    console.error("Error signing out after password update:", signOutError);
                } finally {
                    console.log("Redirecting to login page.");
                    router.push('/login');
                    setShouldRedirectToLogin(false); 
                }
            }, 3000); 

            return () => clearTimeout(timerId);
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
        
        setMessage({ type: '', content: '' }); 
        setSubmitLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });
        
        setSubmitLoading(false); 

        if (updateError) {
            setMessage({ type: 'error', content: `Failed to update password: ${updateError.message}` });
            console.error("Supabase updateUser error:", updateError);
        } else {
            console.log("Password updated successfully. Displaying message and triggering redirect via useEffect.");
            setMessage({ type: 'success', content: 'Password updated successfully! You will be redirected to the login page shortly.' });
            setShouldRedirectToLogin(true);
        }
    };

    if (isLinkValidationLoading && !message.content && !isSessionReadyForUpdate) { 
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 p-4">
                <p className="text-lg text-gray-700">Validating link...</p>
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
