'use client';
import Image from 'next/image';
import React from 'react';

export default function Header({ title }) {
    return (
        <>
            <div className='flex items-center justify-center bg-white'>
                <h1 className='text-2xl font-semibold'>{title}</h1>
            </div>
        </>
    );
};