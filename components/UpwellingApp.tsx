'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Header } from './Header';
import { Timeline } from './Timeline';
import { ContextDetail } from './ContextDetail';
import { StatsPanel } from './StatsPanel';
import { FilterBar } from './FilterBar';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { useUpwellingStore, getFilteredContexts } from '@/stores/upwellingStore';
import type { ParsedContext, ProjectStats, ProjectName } from '@/types';

async function fetchProjectData(project: ProjectName): Promise<{
  contexts: ParsedContext[];
  stats: ProjectStats;
  project: ProjectName;
}> {
  const response = await fetch(`/api/contexts?project=${project}`);
  if (!response.ok) {
    throw new Error('Failed to fetch contexts');
  }
  return response.json();
}

export function UpwellingApp() {
  const { setContexts, selectedContextId, contexts, currentProject } = useUpwellingStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contexts', currentProject],
    queryFn: () => fetchProjectData(currentProject),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update store when data loads
  useEffect(() => {
    if (data?.contexts) {
      setContexts(data.contexts);
    }
  }, [data, setContexts]);

  // Get filtered contexts from store
  const filteredContexts = getFilteredContexts(useUpwellingStore.getState());

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const selectedContext = selectedContextId
    ? contexts.find((c) => c.id === selectedContextId)
    : null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {data?.stats && <StatsPanel stats={data.stats} />}

        {/* Filters */}
        <FilterBar />

        {/* Main Content Area */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline / List */}
          <div className={selectedContext ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Timeline contexts={filteredContexts} />
          </div>

          {/* Detail Panel */}
          {selectedContext && (
            <div className="lg:col-span-1">
              <ContextDetail context={selectedContext} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[var(--muted)] text-sm">
          <p>Upwelling: Deep knowledge rising to the surface</p>
          <p className="mt-2">
            Built by AI, for showing AI work.
          </p>
          <p className="mt-1 text-xs">
            {currentProject === 'emergence-notes'
              ? 'Viewing emergence-notes: 36+ instances over months of sequential work'
              : 'Viewing upwelling: The build process for this site'}
          </p>
        </div>
      </footer>
    </div>
  );
}
