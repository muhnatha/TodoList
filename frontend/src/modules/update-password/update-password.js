'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

// Komponen MessageDisplay (tetap sama)
function MessageDisplay({ type, content }) {
    if (!content) return null;
    const baseClasses = "p-3 rounded-md text-sm flex items-center";
    let typeClasses = "";
    let Icon = null;

    if (type === 'error') {
        typeClasses = "bg-red-100 text-red-700";
        Icon = <AlertCircle className="mr-2 h-5 w-5" />;
    } else if (type === 'success') {
        typeClasses = "bg-green-100 text-green-700";
        Icon = <CheckCircle className="mr-2 h-5 w-5" />;
    } else { 
        typeClasses = "bg-blue-100 text-blue-700";
        Icon = <AlertCircle className="mr-2 h-5 w-5" />; 
    }
    return <div className={`${baseClasses} ${typeClasses}`}>{Icon}{content}</div>;
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

    // State baru untuk memicu redirect setelah pesan ditampilkan
    const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const hasProcessedUrlParams = useRef(false);

    // processAuthCode (tetap sama seperti sebelumnya)
    const processAuthCode = useCallback(async () => {
        const authCode = searchParams.get('code');
        const errorParam = searchParams.get('error');
        console.log("processAuthCode: Memulai...");
        setIsLinkValidationLoading(true);
        if (errorParam) {
            const errorDescription = searchParams.get('error_description');
            console.error("processAuthCode: Error di URL:", errorDescription || errorParam);
            setMessage({ type: 'error', content: errorDescription || 'Terjadi kesalahan pada link reset password.' });
            setIsSessionReadyForUpdate(false);
            router.replace('/update-password', { scroll: false });
            setIsLinkValidationLoading(false);
            return;
        }
        if (authCode) {
            console.log("processAuthCode: Auth Code ditemukan:", authCode);
            setMessage({ type: '', content: 'Memvalidasi link reset password...' });
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
            router.replace('/update-password', { scroll: false }); 
            if (exchangeError) {
                console.error("processAuthCode: Gagal menukar kode:", exchangeError);
                setMessage({ type: 'error', content: `Gagal memvalidasi link: ${exchangeError.message}. Silakan minta link baru.` });
                setIsSessionReadyForUpdate(false);
            } else if (data.session) {
                console.log("processAuthCode: ✅ Sesi berhasil dari exchange code (onAuthStateChange akan mengkonfirmasi):", data.session);
            } else {
                console.warn("processAuthCode: Exchange code berhasil, tapi tidak ada data sesi.");
                setMessage({ type: 'error', content: 'Link reset password tidak valid atau terjadi masalah internal. Silakan coba lagi.' });
                setIsSessionReadyForUpdate(false);
            }
        } else {
            console.warn("processAuthCode: Dipanggil tanpa authCode atau errorParam yang valid.");
            if (!window.location.hash.includes('access_token') && !isSessionReadyForUpdate) {
                setMessage({ type: 'error', content: 'Link reset password tidak valid atau tidak lengkap.' });
            }
        }
        if (!isSessionReadyForUpdate) { 
            setIsLinkValidationLoading(false);
        }
    }, [searchParams, router]);

    // useEffect untuk onAuthStateChange (tetap sama dengan dependensi yang sudah diperbaiki)
    useEffect(() => {
        if (!isSessionReadyForUpdate && !message.type) {
            setIsLinkValidationLoading(true);
        }
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`onAuthStateChange event: ${event}`, session);
            switch (event) {
                case 'PASSWORD_RECOVERY':
                    console.log('✅ PASSWORD_RECOVERY event terdeteksi.');
                    setIsSessionReadyForUpdate(true);
                    setMessage({ type: 'success', content: 'Link pemulihan tervalidasi. Silakan masukkan password baru Anda.' });
                    router.replace('/update-password', { scroll: false });
                    setIsLinkValidationLoading(false);
                    hasProcessedUrlParams.current = true;
                    break;
                case 'SIGNED_IN':
                    if (session) {
                        console.log('✅ SIGNED_IN event terdeteksi.');
                        if (!isSessionReadyForUpdate) {
                            setIsSessionReadyForUpdate(true);
                            setMessage({ type: 'success', content: 'Sesi berhasil divalidasi. Anda dapat mengubah password.' });
                        } else {
                            setIsSessionReadyForUpdate(true); 
                        }
                        setIsLinkValidationLoading(false);
                        hasProcessedUrlParams.current = true; 
                    }
                    break;
                case 'INITIAL_SESSION':
                    console.log('INITIAL_SESSION event terdeteksi.');
                    const code = searchParams.get('code');
                    const errorParam = searchParams.get('error');
                    const hasFragment = window.location.hash.includes('access_token');
                    if (!session && !code && !errorParam && !hasFragment) {
                        if (!isSessionReadyForUpdate) { 
                            setMessage({ type: 'error', content: 'Link reset password tidak valid atau tidak lengkap.' });
                        }
                    }
                    if (!code && !errorParam) { 
                        setIsLinkValidationLoading(false);
                    }
                    break;
                case 'SIGNED_OUT':
                    console.log('SIGNED_OUT event terdeteksi.');
                    setIsSessionReadyForUpdate(false);
                    setIsLinkValidationLoading(false); 
                    hasProcessedUrlParams.current = false;
                    break;
                case 'USER_UPDATED':
                    console.log("Informasi pengguna berhasil diperbarui (event USER_UPDATED).");
                    break;
                default:
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, [router, searchParams]); 

    // useEffect untuk memanggil processAuthCode (tetap sama)
    useEffect(() => {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        if (!isSessionReadyForUpdate && (code || errorParam) && !hasProcessedUrlParams.current) {
            console.log("useEffect: Terdeteksi 'code' atau 'errorParam' BARU, menunda pemanggilan processAuthCode.");
            hasProcessedUrlParams.current = true; 
            const timerId = setTimeout(() => {
                console.log("Memanggil processAuthCode setelah penundaan.");
                processAuthCode();
            }, 700); 
            return () => {
                console.log("useEffect cleanup: Membersihkan timer untuk processAuthCode.");
                clearTimeout(timerId);
            };
        } else if (isSessionReadyForUpdate && (code || errorParam)) {
             if(isLinkValidationLoading) setIsLinkValidationLoading(false);
        }
    }, [searchParams, processAuthCode, isSessionReadyForUpdate]); 

    // PERUBAHAN: useEffect untuk menangani redirect setelah pesan sukses
    useEffect(() => {
        if (shouldRedirectToLogin) {
            const timerId = setTimeout(async () => {
                console.log("Melakukan sign out setelah menampilkan pesan sukses...");
                try {
                    await supabase.auth.signOut();
                    console.log("Sign out berhasil.");
                } catch (signOutError) {
                    console.error("Error signing out after password update:", signOutError);
                    // Opsional: Tangani error sign out jika perlu,
                    // tapi tetap lanjutkan redirect ke login.
                } finally {
                    console.log("Mengarahkan ke halaman login.");
                    router.push('/login');
                    setShouldRedirectToLogin(false); // Reset state pemicu
                }
            }, 3000); // Tampilkan pesan selama 3 detik

            return () => clearTimeout(timerId); // Cleanup timer jika komponen unmount
        }
    }, [shouldRedirectToLogin, router]); // Dependensi: state pemicu dan router

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password.length < 6) {
            setMessage({ type: 'error', content: 'Password minimal harus 6 karakter.' });
            return;
        }
        if (password !== confirmPassword) {
            setMessage({ type: 'error', content: 'Password dan konfirmasi password tidak cocok.' });
            return;
        }
        if (!isSessionReadyForUpdate) {
            setMessage({ type: 'error', content: 'Sesi untuk update password belum siap atau link tidak valid.' });
            return;
        }
        
        setMessage({ type: '', content: '' });
        setSubmitLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });
        
        // Penting: Hentikan loading submit SEGERA setelah updateUser selesai,
        // sebelum menampilkan pesan atau menyiapkan redirect.
        setSubmitLoading(false); 

        if (updateError) {
            setMessage({ type: 'error', content: `Gagal update password: ${updateError.message}` });
            console.error("Supabase updateUser error:", updateError);
        } else {
            // Password berhasil diupdate!
            console.log("Password berhasil diupdate. Menampilkan pesan dan memicu redirect via useEffect.");

            // 1. Tampilkan pesan sukses di halaman INI (/update-password)
            setMessage({ type: 'success', content: 'Password berhasil diupdate! Anda akan segera diarahkan ke halaman login.' });
            
            // 2. Set state untuk memicu useEffect yang akan menangani sign out dan redirect
            setShouldRedirectToLogin(true);
        }
    };

    // Tampilan loading awal (tetap sama)
    if (isLinkValidationLoading && !message.type && !isSessionReadyForUpdate) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 p-4">
                <p className="text-lg text-gray-700">Memvalidasi link...</p>
            </div>
        );
    }

    return (
        // ... Sisa JSX Anda tidak berubah ...
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 p-4 font-sans">
            <div className="w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-lg shadow-2xl rounded-xl">
                <div className="text-center">
                    <Lock className="mx-auto h-12 w-12 text-indigo-600" />
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
                        Update Password Anda
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Masukkan password baru Anda di bawah ini.
                    </p>
                </div>

                {message.content && (
                    <MessageDisplay type={message.type} content={message.content} />
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                     {/* ... input fields Anda ... */}
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 sr-only">
                            Password Baru
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Password Baru"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={!isSessionReadyForUpdate || submitLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700"
                                disabled={!isSessionReadyForUpdate || submitLoading}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 sr-only">
                            Konfirmasi Password Baru
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Konfirmasi Password Baru"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={!isSessionReadyForUpdate || submitLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700"
                                disabled={!isSessionReadyForUpdate || submitLoading}
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={submitLoading || !isSessionReadyForUpdate}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {submitLoading ? 'Memperbarui...' : 'Update Password'}
                        </button>
                    </div>
                </form>
                 <p className="mt-4 text-center text-xs text-gray-500">
                    Ingat password Anda? <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Login di sini</a>
                </p>
            </div>
        </div>
    );
}