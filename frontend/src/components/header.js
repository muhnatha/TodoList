import {React} from 'react';

export default function Header({ title }) {

    return (
        <>
            <div className={`flex items-center justify-center text-[#232360] ${title.toLowerCase() === 'dashboard' ? 'bg-white' : 'bg-[#FBFAFF]'}`}>
                <h1 className='text-2xl font-semibold'>{title}</h1>
            </div>
        </>
    );
};