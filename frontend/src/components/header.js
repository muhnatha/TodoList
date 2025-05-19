import {React} from 'react';
import { UserCircleIcon, Bell } from 'lucide-react';

export default function Header({ title }) {

    return (
        <>
            <div className={`flex items-center justify-center text-[#232360] ${title.toLowerCase() === 'dashboard' ? 'bg-white' : 'bg-[#FBFAFF]'}`}>
                <h1 className='text-2xl font-semibold'>{title}</h1>
                <div className="absolute top-0 right-0 mr-7 mt-5 flex flex-row gap-5">
                    <Bell className='w-6 h-6 mt-2.5 hover:cursor-pointer text-[#768396]'/>
                    <UserCircleIcon className='w-10 h-10 hover:cursor-pointer text-[#768396]'/>
                </div>
            </div>
        </>
    );
};