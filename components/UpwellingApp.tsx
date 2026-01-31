'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useCallback, useState, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Share2, Check } from 'lucide-react';
import { Header } from './Header';
import { Timeline } from './Timeline';
import { ContextDetail } from './ContextDetail';
import { StatsPanel } from './StatsPanel';
import { FilterBar } from './FilterBar';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { LiveUpdates } from './LiveUpdates';
import { useUpwellingStore, getFilteredContexts } from '@/stores/upwellingStore';
import type { ParsedContext, ProjectStats, ProjectName, ContextType } from '@/types';

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

// Valid context types for URL validation
const VALID_CONTEXT_TYPES: ContextType[] = [
  'handoff', 'reflections', 'planning', 'decision', 'completion',
  'milestone', 'discussion', 'code', 'error'
];

// Valid view types
const VALID_VIEWS = ['timeline', 'grid'] as const;

// Valid project names
const VALID_PROJECTS: ProjectName[] = ['emergence-notes', 'upwelling'];

export function UpwellingApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track if this is the first render to initialize from URL
  const isInitialMount = useRef(true);
  const [copied, setCopied] = useState(false);

  const {
    setContexts,
    selectedContextId,
    selectContext,
    contexts,
    currentProject,
    setProject,
    searchResults,
    searchQuery,
    isSearching,
    view,
    setView,
    filters,
    toggleTypeFilter,
    clearFilters,
  } = useUpwellingStore();

  // Read initial state from URL on mount
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    // Parse URL params
    const urlProject = searchParams.get('project') as ProjectName | null;
    const urlType = searchParams.get('type') as ContextType | null;
    const urlContext = searchParams.get('context');
    const urlView = searchParams.get('view') as 'timeline' | 'grid' | null;

    // Initialize project
    if (urlProject && VALID_PROJECTS.includes(urlProject)) {
      setProject(urlProject);
    }

    // Initialize view
    if (urlView && VALID_VIEWS.includes(urlView)) {
      setView(urlView);
    }

    // Initialize type filter
    if (urlType && VALID_CONTEXT_TYPES.includes(urlType)) {
      // Clear existing filters and set this one
      clearFilters();
      toggleTypeFilter(urlType);
    }

    // Initialize selected context (will be validated after data loads)
    if (urlContext) {
      selectContext(urlContext);
    }
  }, [searchParams, setProject, setView, toggleTypeFilter, clearFilters, selectContext]);

  // Function to update URL without causing re-render
  const updateUrl = useCallback((updates: {
    project?: ProjectName;
    type?: ContextType | null;
    context?: string | null;
    view?: 'timeline' | 'grid';
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Project - omit default (emergence-notes)
    if (updates.project !== undefined) {
      if (updates.project === 'emergence-notes') {
        params.delete('project');
      } else {
        params.set('project', updates.project);
      }
    }

    // Type filter - omit if null/empty
    if (updates.type !== undefined) {
      if (updates.type) {
        params.set('type', updates.type);
      } else {
        params.delete('type');
      }
    }

    // Context - omit if null
    if (updates.context !== undefined) {
      if (updates.context) {
        params.set('context', updates.context);
      } else {
        params.delete('context');
      }
    }

    // View - omit default (timeline)
    if (updates.view !== undefined) {
      if (updates.view === 'timeline') {
        params.delete('view');
      } else {
        params.set('view', updates.view);
      }
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Sync store state changes to URL
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) return;

    // Get current type filter (first one if any)
    const currentType = filters.types.length > 0 ? filters.types[0] : null;

    // Only pass view if it's timeline or grid (not search)
    const urlView = view === 'timeline' || view === 'grid' ? view : 'timeline';

    updateUrl({
      project: currentProject,
      type: currentType,
      context: selectedContextId,
      view: urlView,
    });
  }, [currentProject, filters.types, selectedContextId, view, updateUrl]);

  // Copy share link
  const copyShareLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

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

      // Validate selected context exists in loaded data
      const urlContext = searchParams.get('context');
      if (urlContext) {
        const contextExists = data.contexts.some((c) => c.id === urlContext);
        if (!contextExists) {
          // Invalid context ID, clear it
          selectContext(null);
          updateUrl({ context: null });
        }
      }
    }
  }, [data, setContexts, searchParams, selectContext, updateUrl]);

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

  // Check if we have any shareable state
  const hasShareableState = currentProject !== 'emergence-notes' ||
    filters.types.length > 0 ||
    selectedContextId !== null ||
    view !== 'timeline';

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

        {/* Live Updates Indicator */}
        <div className="mt-4 flex items-center justify-between">
          <LiveUpdates
            currentProject={currentProject}
            currentContextCount={projectInfo?.contextCount || data?.contexts.length || 0}
            onRefresh={() => refetch()}
          />
          <span className="text-xs text-[var(--muted)] hidden md:inline">
            Watching for new contexts during SIRK runs
          </span>
        </div>

        {/* Filters with Share Button */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <FilterBar />
          </div>
          {/* Share Button */}
          <button
            onClick={copyShareLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg transition-colors text-sm shrink-0"
            title="Copy link to this view"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500 hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>

        {/* Search Results Indicator */}
        {searchResults !== null && (
          <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
            <span className="text-[var(--primary)] font-medium">
              Semantic Search Results
            </span>
            <span className="text-[var(--muted)]">
              {searchResults.length} matches for &quot;{searchQuery}&quot;
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
          <p className="mt-2 text-xs">
            <a href="/chronicles" className="hover:text-[var(--primary)] transition-colors underline">
              Genesis: 20 instances • Exodus: 20 instances • Leviticus: 20 instances • Numbers: in progress
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
