import Link from 'next/link';
import Sidebar from '@/components/sidebar';
import '@/app/globals.css';

export const metadata = {
  title: 'My App',
  description: 'Next.js multi-page app with routing',
};

export default function RootLayout({ children }) {
  return (
     <html lang="en">
       <body>
          <main>
             {children}
          </main>
       </body>
     </html>
   );
}