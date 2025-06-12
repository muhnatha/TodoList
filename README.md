# TOOGAS: Aplikasi To-do SaaS
<p align="center">
<img src="https://github.com/muhnatha/TodoList/blob/main/frontend/public/toogas.png?raw=true" alt="TOOGAS Logo" width="150">
</p>

<h3 align="center">Organize Your Tasks, Simplify Your Life.</h3>

<p align="center">
<img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&amp;logo=nextdotjs&amp;logoColor=white">
<img alt="Supabase" src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&amp;logo=supabase&amp;logoColor=white">
<img alt="Vercel" src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&amp;logo=vercel&amp;logoColor=white">
<img alt="TailwindCSS" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&amp;logo=tailwind-css&amp;logoColor=white">
</p>

## 🚀 Tentang Proyek

**TOOGAS** adalah aplikasi Software as a Service (SaaS) yang dirancang untuk memenuhi tugas proyek akhir mata kuliah Komputasi Awan. Aplikasi ini membantu pengguna mengelola tugas secara efektif dan efisien, mulai dari daftar pekerjaan sederhana hingga merencanakan proyek yang lebih besar.

Sebagai platform SaaS, **TOOGAS** menawarkan kemudahan aksesibilitas—pengguna dapat mengelola tugas dan catatan kapan pun dan di mana pun. Dengan antarmuka pengguna yang sederhana dan fitur-fitur praktis, aplikasi ini dirancang untuk menjaga pengguna tetap terorganisir dan produktif tanpa kerepotan.

### 👨‍💻 Anggota Kelompok
1. Muhammad Ilham Rajo Sikumbang (23/515971/PA/22042)
2. Muhammad Hafiz Ardiansyah (23/517963/PA/22226)
3. Muhammad Akmal Fauzan (23/519741/PA/22303)
4. Muhammad Natha Ulinnuha (23/520253/PA/22362)
5. Rocky Arthama Putra (23/520891/PA/22395)
6. Ahmad Zainurafi Alfikri (23/521008/PA/22397)
7. Destyasti Sri Puspito Widi (24/554312/NPA/19974)

## ✨ Fitur Utama
* 👤 Manajemen Akun Pengguna: Sistem autentikasi lengkap (Sign-up, Login, Reset Password) untuk mengamankan data pengguna.
* 📝 Provisioning Instans: Alokasi sumber daya secara dinamis untuk modul To-do List dan Notes bagi setiap pengguna.
* ⚖️ Penskalaan Instans (Kuota): Pengelolaan kuota dinamis yang dapat ditingkatkan sesuai kebutuhan pengguna.
* 💳 Sistem Billing: Model pembayaran pay-per-use yang transparan untuk penambahan kuota, dengan biaya harian untuk masa aktif paket.
* 🕒 Penjadwal Otomatis: Eksekusi tugas terjadwal (Cron Job) menggunakan Supabase Edge Functions untuk menonaktifkan paket kuota yang kedaluwarsa dan membersihkan data lama.
* 📜 Log Aktivitas: Pencatatan semua aktivitas penting pengguna untuk kemudahan audit dan pemantauan.

## 🛠️ Arsitektur & Teknologi
Proyek ini dibangun dengan arsitektur modern yang memisahkan antara frontend dan backend, memanfaatkan kekuatan Backend as a Service (BaaS) untuk efisiensi pengembangan.
### 1.  Frontend
* Framework: Next.js (dengan App Router)
* Styling: Tailwind CSS dengan komponen siap pakai dari shadcn/ui
* State Management: Kombinasi useState, useEffect, dan useActionState dari React.
* Visualisasi Data: Recharts untuk menampilkan grafik dan data analitik.
* Deployment: Vercel

### 2. Backend as a Service (BaaS) & Database
* Platform: Supabase
* Database: PostgreSQL
* Auth: Supabase Auth untuk manajemen otentikasi.
* Serverless Functions: Supabase Edge Functions (Deno) untuk tugas terjadwal.
* API: Backend kustom menggunakan Express.js untuk menangani logika kompleks jika diperlukan.
