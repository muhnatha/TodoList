'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserCircleIcon, LucideEye, LucideEyeClosed } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabaseClient';


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');



 const handleSubmit = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === "Invalid login credentials") {
        setErrorMsg("Email atau password salah.");
      } else {
        setErrorMsg("Terjadi kesalahan saat login: " + error.message);
      }
    } else {
      console.log('login berhasil');
      router.push('/dashboard');
    }
  };





  return (
    <div className='flex flex-col items-center min-h-screen justify-center relative'>
      <div className='-z-1 fixed w-screen h-screen'>
        <Image src="/home-bg.svg" alt='Background image' fill style={{ objectFit:'cover'}} priority/>
      </div>
      <UserCircleIcon className='w-30 h-30 text-[#A4B6DF]'/>
      <form onSubmit={handleSubmit} className='p-4'>
        <h1 className='text-center font-bold text-3xl mb-3 px-20'>WELCOME TO TOOGAS!</h1>
        <h2 className='text-center text-[#444444] mb-5'>LOGIN TO YOUR ACCOUNT!</h2>
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
          </div>
          <div className='flex flex-col gap-2 justify-center items-center mt-10'>
            <button type="submit" className='justify-center rounded-sm py-1 w-full hover:cursor-pointer bg-[#5051F9]/50'><span className='font-bold'>LOGIN</span></button>
            {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
            <p className='text-sm'>Don't have account? <a href='/signup' className='font-bold'>Sign Up</a></p>
          </div>
        </div>
      </form>
    </div>
  );
}