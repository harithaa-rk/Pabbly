import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '../components/ui/Toast';

export const metadata: Metadata = {
  title: 'Kaira Connect — Automation Workflow Platform',
  description: 'Enterprise-grade SaaS workflow automation platform inspired by Pabbly Connect.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}

