'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function HubNav() {
  const pathname = usePathname();
  const isAcm = pathname.startsWith('/acm');

  return (
    <nav className="bg-white border-b px-6 py-0 flex items-center justify-between">
      <div className="flex items-center gap-2 py-3">
        <span className="text-blue-600 font-bold text-lg">RealHub</span>
      </div>
      <div className="flex">
        <Link
          href="/"
          className={`px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
            !isAcm
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Propsearch
        </Link>
        <Link
          href="/acm/nuevo"
          className={`px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
            isAcm
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          ACM
        </Link>
      </div>
      <div className="w-24" />
    </nav>
  );
}
