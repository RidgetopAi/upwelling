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

async function fetchProjectInfo(project: ProjectName): Promise<{
  contextCount: number;
}> {
  const response = await fetch(`/api/project-info?project=${project}`);
  if (!response.ok) {
    throw new Error('Failed to fetch project info');
  }
  return response.json();
}

export function UpwellingApp() {
  const {
    setContexts,
    selectedContextId,
    contexts,
    currentProject,
    searchResults,
    searchQuery,
    isSearching,
  } = useUpwellingStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contexts', currentProject],
    queryFn: () => fetchProjectData(currentProject),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: projectInfo } = useQuery({
    queryKey: ['projectInfo', currentProject],
    queryFn: () => fetchProjectInfo(currentProject),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update store when data loads
  useEffect(() => {
    if (data?.contexts) {
      setContexts(data.contexts);
    }
  }, [data, setContexts]);

  // Get filtered contexts from store (applies to non-search results)
  const storeState = useUpwellingStore.getState();
  const filteredContexts = searchResults !== null
    ? searchResults
    : getFilteredContexts(storeState);

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
        {data?.stats && (
          <StatsPanel
            stats={data.stats}
            projectTotalContexts={projectInfo?.contextCount}
            currentProject={currentProject}
          />
        )}

        {/* Filters */}
        <FilterBar />

        {/* Search Results Indicator */}
        {searchResults !== null && (
          <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
            <span className="text-[var(--primary)] font-medium">
              Semantic Search Results
            </span>
            <span className="text-[var(--muted)]">
              {searchResults.length} matches for "{searchQuery}"
            </span>
            {searchResults.length > 0 && searchResults[0].similarity && (
              <span className="text-xs text-[var(--muted)] ml-auto">
                Sorted by relevance
              </span>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline / List */}
          <div className={selectedContext ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[var(--muted)]">Searching Mandrel...</div>
              </div>
            ) : (
              <Timeline contexts={filteredContexts} />
            )}
          </div>

          {/* Detail Panel - Desktop: sidebar, Mobile: full-screen overlay */}
          {selectedContext && (
            <>
              {/* Mobile overlay */}
              <div className="lg:hidden fixed inset-0 z-50 bg-[var(--background)]">
                <div className="h-full overflow-y-auto overscroll-contain">
                  <ContextDetail context={selectedContext} />
                </div>
              </div>
              {/* Desktop sidebar */}
              <div className="hidden lg:block lg:col-span-1">
                <ContextDetail context={selectedContext} />
              </div>
            </>
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
