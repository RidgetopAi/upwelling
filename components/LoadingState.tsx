'use client';

import { Activity } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center animate-pulse-subtle">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          Upwelling
        </h2>
        <p className="text-[var(--muted)]">Loading emergence-notes from Mandrel...</p>
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" />
        </div>
      </div>
    </div>
  );
}
