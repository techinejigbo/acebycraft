import type { Metadata } from 'next';
import './globals.css';
import { AdminAuthProvider } from '@/lib/admin-auth-context';
import { AdminNavbar } from '@/components/AdminNavbar';

export const metadata: Metadata = {
  title: 'AceByCraft Nigeria (ABC Nigeria) | School Analytics & IT Command Console',
  description: 'Registered school performance monitoring, student continuous assessment reports, frequently missed questions diagnostics, and IT unit national assessment management.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white flex flex-col antialiased">
        <AdminAuthProvider>
          <AdminNavbar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
