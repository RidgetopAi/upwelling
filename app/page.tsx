'use client';

import { Suspense } from 'react';
import { Providers } from './providers';
import { UpwellingApp } from '@/components/UpwellingApp';
import { Loader2 } from 'lucide-react';

function HomePageLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      <span className="ml-3 text-[var(--muted)]">Loading...</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <Providers>
      <Suspense fallback={<HomePageLoading />}>
        <UpwellingApp />
      </Suspense>
    </Providers>
  );
}
