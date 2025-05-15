import '@/app/globals.css';
import { DM_Sans } from 'next/font/google'

export const metadata = {
  title: 'TOOGAS',
  description: 'Next.js multi-page app with routing',
};

const dmSans = DM_Sans({
  subsets: ['latin']
})

export default function RootLayout({ children }) {
  return (
     <html lang="en" className={`${dmSans.className}`}>
       <body>
          <main>
             {children}
          </main>
       </body>
     </html>
   );
}