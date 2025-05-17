'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserCircleIcon, LucideEye, LucideEyeClosed } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabaseClient';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');


  
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (password !== confirm) {
    alert("Password dan Konfirmasi Password tidak sama");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      console.log('fail to fetch');
    } else {
      setMessage("Pendaftaran berhasil! Silakan cek email Anda.");
      router.push('/login');
    }
  };

  return (
    <div className='flex flex-col items-center min-h-screen justify-center relative'>
      <div className='-z-1 fixed w-screen h-screen'>
        <Image src="/home-bg.svg" alt='Background image' fill style={{ objectFit:'cover'}} priority/>
      </div>
      <h2 className='text-center font-bold text-[#010000] mb-5'>{message}</h2>
      <UserCircleIcon className='w-30 h-30 text-[#A4B6DF]'/>
      <form onSubmit={handleSubmit} className='p-4'>
        <h1 className='text-center font-bold text-3xl mb-3 px-20'>WELCOME TO TOOGAS!</h1>
        <h2 className='text-center text-[#010000] mb-5'>CREATE YOUR ACCOUNT!</h2>
        <div className='flex flex-col gap-5'>
          <div className='mt-5 flex flex-col gap-2'>
            <div className='flex flex-col gap-2'>
              <label className='font-bold'>Email</label>
              <input type="email" className='rounded-sm p-2 text-sm text-black/50 font-bold bg-white/50' value={email} onChange={(e) => setEmail(e.target.value)} required placeholder='Enter your email here'/>
            </div>
            <div className='flex flex-col gap-2'>
                <label className='font-bold'>Password</label>
              <div className='flex flex-row relative'>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id='password' 
                  className='block rounded-sm p-2 text-sm text-black/50 font-bold bg-white/50 w-full' 
                  value={password} onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder='Enter your password here'/>
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center
                           text-black dark:text-white
                             text-sm font-medium"
                  onClick={() => {
                    setShowPassword((prev) => !prev);
                  }}
                >
                  {showPassword ? 
                    <LucideEye className='opacity-50 hover:cursor-pointer' /> : <LucideEyeClosed className='opacity-50 hover:cursor-pointer' />}
                </button>
              </div>
            </div>
              <div className='flex flex-row relative'>
                <input 
                  type={showConfirm ? 'text' : 'password'} 
                  id='confirm' 
                  className='block rounded-sm p-2 text-sm text-black/50 font-bold bg-white/50 w-full' 
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} 
                  required 
                  placeholder='Confirm your password here'/>
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center
                           text-black dark:text-white
                             text-sm font-medium"
                  onClick={() => {
                    setShowConfirm((prev) => !prev);
                  }}
                >
                  {showConfirm ? 
                    <LucideEye className='opacity-50 hover:cursor-pointer' /> : <LucideEyeClosed className='opacity-50 hover:cursor-pointer' />}
                </button>
              </div>
          </div>
          <div className='flex flex-col gap-2 justify-center items-center mt-10'>
            <button type="submit" className='justify-center rounded-sm py-1 w-full hover:cursor-pointer bg-[#5051F9]/50'><span className='font-bold'>SIGN UP</span></button>
          </div>
        </div>
      </form>
    </div>
  );
}