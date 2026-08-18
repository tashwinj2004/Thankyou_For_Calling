import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'THANK YOU FOR CALLING — Sales-Call Intelligence Platform',
  description: 'Asynchronous sales call analysis, dual-speaker diarization, scoring, and analytics portal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#2B5298] text-white antialiased flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
