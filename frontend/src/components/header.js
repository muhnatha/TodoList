import {React} from 'react'
import { UserCircleIcon, Bell } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export default function Header({ title }) {

    return (
        <>
            <div className={`flex items-center justify-center text-[#232360] ${title.toLowerCase() === 'dashboard' ? 'bg-white' : 'bg-[#FBFAFF]'}`}>
                <h1 className='text-2xl font-semibold'>{title}</h1>
                <div className="absolute top-0 right-0 mx-7 my-3.5 flex flex-row gap-5 justify-center items-center">
                    <Bell className='size-7 hover:cursor-pointer text-[#768396] pt-0.5'/>
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" className="size-13" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </>
    );
};