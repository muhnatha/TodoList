import Image from 'next/image';

export default function AboutPage() {
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
                    <p className='text-justify'><span className='font-bold'>TOOGAS</span> dibuat untuk membantu kamu mencatat, mengatur, dan menyelesaikan berbagai tugas harian dengan lebih mudah dan terorganisir. 
                        Mulai dari hal kecil seperti belanja kebutuhan, sampai merencanakan tugas besar, semuanya bisa kamu kelola dalam satu tempat. Dengan 
                        tampilan yang simpel dan fitur yang praktis, aplikasi ini dirancang agar kamu bisa tetap fokus dan produktif tanpa ribet. Semoga aplikasi 
                        ini bisa jadi teman andalan kamu dalam menjalani hari-hari yang sibuk.</p>
                </div>
            </div>
        </div>
    )
}