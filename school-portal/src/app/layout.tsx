import type { Metadata } from 'next';
import './globals.css';
import { SchoolAuthProvider } from '@/lib/school-auth-context';
import { SchoolNavbar } from '@/components/SchoolNavbar';

export const metadata: Metadata = {
  title: 'AceByCraft Nigeria | School Performance & Continuous Assessment Diagnostics',
  description: 'Dedicated analytics and student assessment monitoring console for registered secondary schools in Nigeria.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white flex flex-col antialiased">
        <SchoolAuthProvider>
          <SchoolNavbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </SchoolAuthProvider>
      </body>
    </html>
  );
}
