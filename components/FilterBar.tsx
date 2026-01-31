'use client';

import { X } from 'lucide-react';
import { useUpwellingStore } from '@/stores/upwellingStore';
import { cn } from '@/lib/utils';
import type { ContextType } from '@/types';

const contextTypes: ContextType[] = [
  'handoff',
  'reflections',
  'planning',
  'decision',
  'completion',
  'milestone',
  'discussion',
  'code',
  'error',
];

const frameworks = ['DICP', 'CIAS', 'CAP', 'BRIDGE', 'TRACE', 'ECHO', 'WEAVE'];

export function FilterBar() {
  const { filters, toggleTypeFilter, toggleFrameworkFilter, clearFilters } =
    useUpwellingStore();

  const hasFilters =
    filters.types.length > 0 ||
    filters.frameworks.length > 0 ||
    filters.searchQuery !== '';

  return (
    <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Context types */}
      <div className="mb-4">
        <p className="text-xs text-[var(--muted)] mb-2">Context Type</p>
        <div className="flex flex-wrap gap-2">
          {contextTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={cn(
                'px-3 py-1 rounded-full text-xs transition-colors',
                filters.types.includes(type)
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Frameworks */}
      <div>
        <p className="text-xs text-[var(--muted)] mb-2">Frameworks</p>
        <div className="flex flex-wrap gap-2">
          {frameworks.map((framework) => (
            <button
              key={framework}
              onClick={() => toggleFrameworkFilter(framework)}
              className={cn(
                'framework-badge transition-opacity',
                `framework-${framework}`,
                filters.frameworks.includes(framework)
                  ? 'opacity-100'
                  : 'opacity-50 hover:opacity-75'
              )}
            >
              {framework}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
