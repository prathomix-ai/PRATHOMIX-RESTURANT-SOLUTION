'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientSession } from '@/lib/auth';

export default function OwnerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getClientSession();
    if (!user || user.role !== 'owner') {
      router.replace('/login?redirect=/admin');
    } else {
      router.replace('/admin');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-[#C5A880]/30 border-t-[#C5A880] rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#EAE6DF]/60 font-semibold tracking-wider uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Verifying Owner Credentials...
        </p>
      </div>
    </div>
  );
}
