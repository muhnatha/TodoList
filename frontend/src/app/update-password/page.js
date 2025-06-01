// frontend/src/app/update-password/page.js
'use client'; // Penting jika komponen update-password menggunakan hooks
import dynamic from 'next/dynamic';

// Pastikan path ke komponen update-password Anda benar
const UpdatePassword = dynamic(() => import('@/modules/update-password/update-password'), {
  ssr: false, // Set ssr: false jika komponen Anda memiliki banyak interaksi client-side atau menggunakan window object
});

export default function UpdatePasswordPage() {
    return (
        <UpdatePassword />
    )
}