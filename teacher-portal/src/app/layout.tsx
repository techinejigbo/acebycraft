import type { Metadata } from 'next';
import './globals.css';
import { TeacherAuthProvider } from '@/lib/teacher-auth-context';
import { TeacherNavbar } from '@/components/TeacherNavbar';

export const metadata: Metadata = {
  title: 'AceByCraft Nigeria | Volunteer Teacher & Question Authoring Portal',
  description: 'Contribute high-quality WAEC/NECO continuous assessment objective questions and detailed pedagogical explanations for secondary school students across Nigeria.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white flex flex-col antialiased">
        <TeacherAuthProvider>
          <TeacherNavbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </TeacherAuthProvider>
      </body>
    </html>
  );
}
