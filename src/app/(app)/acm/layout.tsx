import HubNav from '@/components/HubNav';

export const metadata = { title: 'ACM — RealHub' };

export default function AcmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <HubNav />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
