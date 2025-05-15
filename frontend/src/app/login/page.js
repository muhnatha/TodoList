'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: perform auth logic
    // On success:
    router.push('/dashboard');
  };

  return (
    <div className='flex flex-col items-center min-h-screen justify-center m-5'>
      <User className='w-30 h-30'/>
      <form onSubmit={handleSubmit} className='p-4'>
        <h1 className='text-center font-bold text-3xl mb-3 px-20'>WELCOME TO TOOGAS!</h1>
        <h2 className='text-center text-[#444444] mb-5'>LOGIN TO YOUR ACCOUNT!</h2>
        <div className='flex flex-col gap-5'>
          <div className='mt-5 flex flex-col gap-2'>
            <div className='flex flex-col gap-2'>
              <label className='font-bold'>Email</label>
              <input type="email" className='border-1 rounded-sm p-1 text-black/50 font-bold' value={email} onChange={(e) => setEmail(e.target.value)} required placeholder='Enter your email here'/>
            </div>
            <div className='flex flex-col gap-2'>
              <label className='font-bold'>Password</label>
              <input type="password" className='border-1 rounded-sm p-1 text-black/50 font-bold' value={password} onChange={(e) => setPassword(e.target.value)} required placeholder='Enter your password here'/>
            </div>
          </div>
          <div className='flex flex-col gap-2 justify-center items-center mt-10'>
            <button type="submit" className='justify-center border-1 rounded-sm py-1 w-full hover:cursor-pointer bg-[#5051F9]/50'><span className='font-bold'>LOGIN</span></button>
            <p className='text-sm'>Don't have account? <span className='font-bold'>Sign Up</span></p>
          </div>
        </div>
      </form>
    </div>
  );
}