import Image from 'next/image'

export default function BackgroundPage() {
    return (
        <div className='-z-1 fixed w-100vw h-100vh'>
            <Image src="/home-bg.svg" alt='Background image' layout='fill' objectFit='cover' />
        </div>
    );
}