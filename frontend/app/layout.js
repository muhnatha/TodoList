import Link from 'next/link';

export const metadata = {
  title: 'My App',
  description: 'Next.js multi-page app with routing',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
          <Link href="/dashboard" style={{ marginRight: '1rem' }}>Dashboard</Link>
          <Link href="/calendar" style={{ marginRight: '1rem' }}>Calendar</Link>
          <Link href="/todo" style={{ marginRight: '1rem' }}>To-Do</Link>
          <Link href="/notes" style={{ marginRight: '1rem' }}>Notes</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <main style={{ padding: '1rem' }}>{children}</main>
      </body>
    </html>
  );
}