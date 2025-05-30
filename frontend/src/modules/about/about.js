import Image from 'next/image';
import Link from 'next/link';

export default function About() {
    return (
        <div className='flex flex-col gap-2 min-h-screen relative items-center justify-center'>
            <div className='-z-1 fixed w-screen h-screen'>
                <Image src="/home-bg.svg" alt='Background image' fill style={{ objectFit:'cover'}} priority/>
            </div>
            <div className='flex flex-row items-center justify-center'>
                <Image src="/toogas2.svg" alt='toogas' width={80} height={80} className='mb-2'/>
                <h1 className='text-white text-4xl font-semibold'>About</h1>
            </div>
            <div className='bg-white/50 rounded-lg max-w-2/3 sm:max-w-1/2'>
                <div className='p-5'>
                    <p className='text-justify'><span className='font-bold'>TOOGAS</span> is made to help you record, organize, and 
                    complete various daily tasks more easily and organized. From small things like shopping, to planning big tasks, you 
                    can manage everything in one place. With a simple interface and practical features, this app is designed to keep you 
                    focused and productive without the hassle. Hopefully, this app will become your go-to companion for busy days.</p>
                </div>
            </div>
            <Link href='/login' className='hover:underline text-white font-semibold'>Go to Login →</Link>
        </div>
    )
}