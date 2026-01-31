'use client';

import { create } from 'zustand';
import type { ContextType, FilterState, ViewState, ParsedContext, ProjectName } from '@/types';

interface UpwellingState {
  // Project state
  currentProject: ProjectName;

  // View state
  view: ViewState['view'];
  selectedContextId: string | null;
  expandedContextIds: Set<string>;

  // Filter state
  filters: FilterState;

  // Cached data
  contexts: ParsedContext[];

  // Actions
  setProject: (project: ProjectName) => void;
  setView: (view: ViewState['view']) => void;
  selectContext: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  setSearchQuery: (query: string) => void;
  toggleTypeFilter: (type: ContextType) => void;
  toggleFrameworkFilter: (framework: string) => void;
  clearFilters: () => void;
  setContexts: (contexts: ParsedContext[]) => void;
}

const initialFilters: FilterState = {
  types: [],
  searchQuery: '',
  frameworks: [],
};

export const useUpwellingStore = create<UpwellingState>((set) => ({
  // Initial state
  currentProject: 'emergence-notes',
  view: 'timeline',
  selectedContextId: null,
  expandedContextIds: new Set(),
  filters: initialFilters,
  contexts: [],

  // Actions
  setProject: (project) => set({
    currentProject: project,
    selectedContextId: null,
    expandedContextIds: new Set(),
    contexts: [],
  }),
  setView: (view) => set({ view }),

  selectContext: (id) => set({ selectedContextId: id }),

  toggleExpanded: (id) =>
    set((state) => {
      const newExpanded = new Set(state.expandedContextIds);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedContextIds: newExpanded };
    }),

  setSearchQuery: (searchQuery) =>
    set((state) => ({
      filters: { ...state.filters, searchQuery },
    })),

  toggleTypeFilter: (type) =>
    set((state) => {
      const types = state.filters.types.includes(type)
        ? state.filters.types.filter((t) => t !== type)
        : [...state.filters.types, type];
      return { filters: { ...state.filters, types } };
    }),

  toggleFrameworkFilter: (framework) =>
    set((state) => {
      const frameworks = state.filters.frameworks.includes(framework)
        ? state.filters.frameworks.filter((f) => f !== framework)
        : [...state.filters.frameworks, framework];
      return { filters: { ...state.filters, frameworks } };
    }),

  clearFilters: () => set({ filters: initialFilters }),

  setContexts: (contexts) => set({ contexts }),
}));

// Selector for filtered contexts
export function getFilteredContexts(state: UpwellingState): ParsedContext[] {
  let filtered = state.contexts;

  // Filter by types
  if (state.filters.types.length > 0) {
    filtered = filtered.filter((c) => state.filters.types.includes(c.type));
  }

  // Filter by frameworks
  if (state.filters.frameworks.length > 0) {
    filtered = filtered.filter((c) =>
      c.frameworks.some((f) => state.filters.frameworks.includes(f))
    );
  }

  // Filter by search query (client-side basic filter)
  if (state.filters.searchQuery) {
    const query = state.filters.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.content.toLowerCase().includes(query) ||
        c.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  return filtered;
}
