'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Activity, Grid, List, BookOpen, Layers, X, Loader2, Info } from 'lucide-react';
import { useUpwellingStore } from '@/stores/upwellingStore';
import { cn } from '@/lib/utils';
import type { ProjectName, ParsedContext } from '@/types';

const PROJECT_INFO: Record<ProjectName, { icon: typeof BookOpen; label: string; description: string }> = {
  'emergence-notes': {
    icon: BookOpen,
    label: 'Emergence Notes',
    description: '56+ contexts from 36 instances',
  },
  'upwelling': {
    icon: Layers,
    label: 'Upwelling Build',
    description: 'Building this site',
  },
};

async function performSearch(
  query: string,
  project: ProjectName
): Promise<{ contexts: ParsedContext[]; resultCount: number }> {
  const response = await fetch(
    `/api/contexts/search?q=${encodeURIComponent(query)}&project=${project}&limit=20`
  );
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return response.json();
}

export function Header() {
  const {
    view,
    setView,
    searchQuery,
    setSearchQuery,
    currentProject,
    setProject,
    setSearchResults,
    setIsSearching,
    isSearching,
    searchResults,
    clearSearch,
  } = useUpwellingStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = useCallback(async () => {
    if (!localQuery.trim()) {
      clearSearch();
      return;
    }

    setIsSearching(true);
    setSearchQuery(localQuery);
    try {
      const results = await performSearch(localQuery, currentProject);
      setSearchResults(results.contexts);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [localQuery, currentProject, setSearchQuery, setSearchResults, setIsSearching, clearSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
      if (e.key === 'Escape') {
        setLocalQuery('');
        clearSearch();
      }
    },
    [handleSearch, clearSearch]
  );

  const handleClear = useCallback(() => {
    setLocalQuery('');
    clearSearch();
  }, [clearSearch]);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--foreground)]">
                Upwelling
              </h1>
              <p className="text-xs text-[var(--muted)]">
                Deep knowledge rising
              </p>
            </div>
          </div>

          {/* Project Switcher */}
          <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-1">
            {(Object.keys(PROJECT_INFO) as ProjectName[]).map((project) => {
              const info = PROJECT_INFO[project];
              const Icon = info.icon;
              return (
                <button
                  key={project}
                  onClick={() => setProject(project)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm',
                    currentProject === project
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                  title={info.description}
                >
                  <Icon className="w-4 h-4" />
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)] animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              )}
              <input
                type="text"
                placeholder="Semantic search... (Enter to search)"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-10 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
              {(localQuery || searchResults) && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchResults && (
              <div className="absolute mt-1 text-xs text-[var(--muted)]">
                {searchResults.length} semantic matches for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-1">
            <button
              onClick={() => setView('timeline')}
              className={cn(
                'p-2 rounded-md transition-colors',
                view === 'timeline'
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              )}
              title="Timeline view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                view === 'grid'
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              )}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* About Link */}
          <Link
            href="/about"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title="Learn about Upwelling"
          >
            <Info className="w-4 h-4" />
            <span>About</span>
          </Link>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden py-3 space-y-3">
          {/* Top row: Logo + View Toggle + About */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-semibold text-[var(--foreground)]">
                Upwelling
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-1">
                <button
                  onClick={() => setView('timeline')}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    view === 'timeline'
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                  title="Timeline view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('grid')}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    view === 'grid'
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
              <Link
                href="/about"
                className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                title="Learn about Upwelling"
              >
                <Info className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Project Switcher row */}
          <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-1">
            {(Object.keys(PROJECT_INFO) as ProjectName[]).map((project) => {
              const info = PROJECT_INFO[project];
              const Icon = info.icon;
              return (
                <button
                  key={project}
                  onClick={() => setProject(project)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md transition-colors text-xs',
                    currentProject === project
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                  title={info.description}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search row */}
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)] animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            )}
            <input
              type="text"
              placeholder="Semantic search..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-10 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
            {(localQuery || searchResults) && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
