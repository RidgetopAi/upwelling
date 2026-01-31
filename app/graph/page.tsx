'use client';

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Network, BookOpen, Layers, Search, X, Filter, Share2, Check } from 'lucide-react';
import type { InstanceGraph, ProjectName, GraphNode, GraphEdge, ContextType } from '@/types';
import { cn } from '@/lib/utils';

const PROJECT_INFO: Record<ProjectName, { icon: typeof BookOpen; label: string }> = {
  'emergence-notes': { icon: BookOpen, label: 'Emergence Notes' },
  'upwelling': { icon: Layers, label: 'Upwelling Build' },
};

// Filter types for the graph
const TYPE_FILTERS: { type: ContextType | 'all'; label: string; color: string }[] = [
  { type: 'all', label: 'All', color: 'bg-slate-500' },
  { type: 'handoff', label: 'Handoff', color: 'bg-blue-500' },
  { type: 'reflections', label: 'Reflections', color: 'bg-purple-500' },
  { type: 'planning', label: 'Planning', color: 'bg-green-500' },
  { type: 'decision', label: 'Decision', color: 'bg-amber-500' },
  { type: 'discussion', label: 'Discussion', color: 'bg-slate-400' },
];

interface NodePosition {
  x: number;
  y: number;
  node: GraphNode;
}

function calculateNodePositions(nodes: GraphNode[], width: number, height: number): NodePosition[] {
  // Arrange nodes in a circular layout, sorted by instance number
  const sorted = [...nodes].sort((a, b) => a.id - b.id);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  return sorted.map((node, index) => {
    const angle = (index / sorted.length) * 2 * Math.PI - Math.PI / 2; // Start from top
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      node,
    };
  });
}

function GraphVisualization({
  graph,
  selectedNode,
  onNodeClick,
  searchQuery,
  typeFilter,
  highlightedNodes,
}: {
  graph: InstanceGraph;
  selectedNode: number | null;
  onNodeClick: (id: number | null) => void;
  searchQuery: string;
  typeFilter: ContextType | 'all';
  highlightedNodes: Set<number>;
}) {
  const width = 800;
  const height = 600;
  const positions = calculateNodePositions(graph.nodes, width, height);
  const positionMap = new Map(positions.map(p => [p.node.id, p]));

  // Get edges connected to selected node
  const selectedEdges = selectedNode !== null
    ? graph.edges.filter(e => e.source === selectedNode || e.target === selectedNode)
    : [];
  const connectedNodeIds = new Set(selectedEdges.flatMap(e => [e.source, e.target]));

  // Check if node matches current filters
  const isNodeVisible = useCallback((node: GraphNode) => {
    // Type filter
    if (typeFilter !== 'all' && node.type !== typeFilter) return false;
    // Search filter - if searching, node must be in highlighted set
    if (searchQuery && !highlightedNodes.has(node.id)) return false;
    return true;
  }, [typeFilter, searchQuery, highlightedNodes]);

  // Check if any filters are active
  const hasActiveFilters = typeFilter !== 'all' || searchQuery.length > 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto max-h-[70vh] border border-[var(--border)] rounded-lg bg-[var(--background)]"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="25"
          refY="3.5"
          orient="auto"
          className="fill-[var(--muted)]"
        >
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
        <marker
          id="arrowhead-active"
          markerWidth="10"
          markerHeight="7"
          refX="25"
          refY="3.5"
          orient="auto"
          className="fill-[var(--primary)]"
        >
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
        {/* Animated arrow marker for edge animation */}
        <marker
          id="arrowhead-animated"
          markerWidth="10"
          markerHeight="7"
          refX="25"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" className="fill-[var(--primary)]" />
        </marker>
      </defs>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; transform-origin: center; }
            50% { opacity: 1; }
          }
          @keyframes flowPath {
            0% { stroke-dashoffset: 20; }
            100% { stroke-dashoffset: 0; }
          }
        `}
      </style>

      {/* Draw edges */}
      {graph.edges.map((edge, i) => {
        const source = positionMap.get(edge.source);
        const target = positionMap.get(edge.target);
        if (!source || !target) return null;

        const sourceNode = graph.nodes.find(n => n.id === edge.source);
        const targetNode = graph.nodes.find(n => n.id === edge.target);

        // Check if edge connects filtered nodes
        const sourceVisible = sourceNode ? isNodeVisible(sourceNode) : false;
        const targetVisible = targetNode ? isNodeVisible(targetNode) : false;
        const edgeVisible = !hasActiveFilters || (sourceVisible && targetVisible);

        const isActive = selectedNode !== null && (edge.source === selectedNode || edge.target === selectedNode);
        const isFromSelected = edge.source === selectedNode;

        return (
          <g key={i}>
            {/* Base line */}
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className={cn(
                'transition-all duration-300',
                isActive
                  ? isFromSelected
                    ? 'stroke-[var(--primary)] stroke-2'
                    : 'stroke-cyan-500 stroke-2'
                  : 'stroke-[var(--border)] stroke-1'
              )}
              markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
              opacity={!edgeVisible ? 0.1 : (selectedNode === null || isActive ? 1 : 0.2)}
            />
            {/* Animated overlay for active edges */}
            {isActive && (
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className={cn(
                  'stroke-2',
                  isFromSelected ? 'stroke-[var(--primary)]' : 'stroke-cyan-500'
                )}
                strokeDasharray="5 5"
                style={{
                  animation: 'flowPath 1s linear infinite',
                }}
                opacity={0.6}
              />
            )}
          </g>
        );
      })}

      {/* Draw nodes */}
      {positions.map(({ x, y, node }) => {
        const isSelected = selectedNode === node.id;
        const isConnected = connectedNodeIds.has(node.id);
        const isVisible = isNodeVisible(node);
        const isHighlighted = highlightedNodes.has(node.id);

        // Determine opacity based on filters and selection
        let opacity = 1;
        if (hasActiveFilters && !isVisible) {
          opacity = 0.15;
        } else if (selectedNode !== null && !isSelected && !isConnected) {
          opacity = 0.3;
        }

        // Color based on type
        const typeColors: Record<string, string> = {
          handoff: 'fill-blue-500',
          reflections: 'fill-purple-500',
          planning: 'fill-green-500',
          decision: 'fill-amber-500',
          discussion: 'fill-slate-400',
          code: 'fill-cyan-500',
          completion: 'fill-emerald-500',
          milestone: 'fill-yellow-500',
          error: 'fill-red-500',
        };

        return (
          <g
            key={node.id}
            onClick={() => onNodeClick(isSelected ? null : node.id)}
            className="cursor-pointer"
            style={{ opacity, transition: 'all 0.3s ease-out' }}
          >
            {/* Pulse ring for highlighted/selected nodes */}
            {(isSelected || (isHighlighted && searchQuery)) && (
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 28 : 26}
                className={cn(
                  'fill-none stroke-2',
                  isSelected ? 'stroke-[var(--foreground)]' : 'stroke-[var(--primary)]',
                )}
                style={{
                  animation: 'pulse 2s infinite',
                }}
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 24 : isHighlighted && searchQuery ? 22 : 20}
              className={cn(
                typeColors[node.type] || 'fill-slate-400',
                isSelected && 'stroke-[var(--foreground)] stroke-2',
                'transition-all duration-300'
              )}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white text-xs font-bold pointer-events-none select-none"
            >
              {node.id}
            </text>
            {/* Role label - show on hover, select, or when highlighted by search */}
            {(isSelected || isConnected || (isHighlighted && searchQuery)) && node.role && (
              <text
                x={x}
                y={y + 35}
                textAnchor="middle"
                className={cn(
                  'text-[10px] pointer-events-none select-none',
                  isHighlighted && searchQuery ? 'fill-[var(--primary)]' : 'fill-[var(--muted)]'
                )}
              >
                {node.role.length > 20 ? node.role.slice(0, 20) + '...' : node.role}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(20, 20)">
        <text className="fill-[var(--muted)] text-xs font-medium">Legend</text>
        <g transform="translate(0, 15)">
          <circle cx="8" cy="8" r="6" className="fill-blue-500" />
          <text x="20" y="12" className="fill-[var(--muted)] text-[10px]">Handoff</text>
        </g>
        <g transform="translate(0, 30)">
          <circle cx="8" cy="8" r="6" className="fill-purple-500" />
          <text x="20" y="12" className="fill-[var(--muted)] text-[10px]">Reflections</text>
        </g>
        <g transform="translate(0, 45)">
          <circle cx="8" cy="8" r="6" className="fill-green-500" />
          <text x="20" y="12" className="fill-[var(--muted)] text-[10px]">Planning</text>
        </g>
      </g>
    </svg>
  );
}

function NodeDetail({ node, graph }: { node: GraphNode; graph: InstanceGraph }) {
  const outgoing = graph.edges.filter(e => e.source === node.id);
  const incoming = graph.edges.filter(e => e.target === node.id);

  return (
    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
      <h3 className="text-lg font-semibold text-[var(--foreground)]">
        Instance {node.id}
      </h3>
      {node.role && (
        <p className="text-[var(--muted)] text-sm mt-1">
          Role: <span className="text-[var(--foreground)]">{node.role}</span>
        </p>
      )}
      <p className="text-[var(--muted)] text-sm mt-1">
        Type: <span className="text-[var(--foreground)]">{node.type}</span>
      </p>
      <p className="text-[var(--muted)] text-sm mt-1">
        Contexts: <span className="text-[var(--foreground)]">{node.contextCount}</span>
      </p>

      {outgoing.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-[var(--foreground)]">References</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {outgoing.map((edge, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded bg-[var(--primary)]/20 text-[var(--primary)]"
              >
                → Instance {edge.target}
              </span>
            ))}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-[var(--foreground)]">Referenced by</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {incoming.map((edge, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-500"
              >
                ← Instance {edge.source}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.contextId && (
        <Link
          href={`/?context=${node.contextId}`}
          className="inline-flex items-center gap-1 mt-4 text-sm text-[var(--primary)] hover:underline"
        >
          View context →
        </Link>
      )}
    </div>
  );
}

// Valid type filters for URL validation
const VALID_TYPE_FILTERS = ['all', 'handoff', 'reflections', 'planning', 'decision', 'discussion'] as const;

// Loading fallback for Suspense
function GraphPageLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      <span className="ml-3 text-[var(--muted)]">Loading graph...</span>
    </div>
  );
}

// Main graph page content (needs to be wrapped in Suspense for useSearchParams)
function GraphPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial state from URL params
  const initialProject = (searchParams.get('project') as ProjectName) || 'emergence-notes';
  const initialSearch = searchParams.get('search') || '';
  const initialType = VALID_TYPE_FILTERS.includes(searchParams.get('type') as typeof VALID_TYPE_FILTERS[number])
    ? (searchParams.get('type') as ContextType | 'all')
    : 'all';
  const initialNode = searchParams.get('node') ? parseInt(searchParams.get('node')!, 10) : null;

  const [project, setProject] = useState<ProjectName>(
    initialProject === 'upwelling' ? 'upwelling' : 'emergence-notes'
  );
  const [graph, setGraph] = useState<InstanceGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(initialNode);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<ContextType | 'all'>(initialType);
  const [showFilters, setShowFilters] = useState(initialType !== 'all');
  const [focusedNodeIndex, setFocusedNodeIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);

  // Track if we're initializing from URL (to avoid resetting state on first load)
  const isInitialLoad = useRef(true);

  // Update URL when state changes (debounced to avoid too many history entries)
  const updateUrl = useCallback((updates: {
    project?: ProjectName;
    search?: string;
    type?: ContextType | 'all';
    node?: number | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update or remove project param
    if (updates.project !== undefined) {
      if (updates.project === 'emergence-notes') {
        params.delete('project'); // Default, don't include in URL
      } else {
        params.set('project', updates.project);
      }
    }

    // Update or remove search param
    if (updates.search !== undefined) {
      if (updates.search) {
        params.set('search', updates.search);
      } else {
        params.delete('search');
      }
    }

    // Update or remove type param
    if (updates.type !== undefined) {
      if (updates.type === 'all') {
        params.delete('type'); // Default, don't include in URL
      } else {
        params.set('type', updates.type);
      }
    }

    // Update or remove node param
    if (updates.node !== undefined) {
      if (updates.node !== null) {
        params.set('node', updates.node.toString());
      } else {
        params.delete('node');
      }
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Copy share link to clipboard
  const copyShareLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // Wrapped setters that also update URL
  const handleProjectChange = useCallback((newProject: ProjectName) => {
    setProject(newProject);
    // Clear filters when changing project
    setSearchQuery('');
    setTypeFilter('all');
    setSelectedNode(null);
    setFocusedNodeIndex(-1);
    updateUrl({ project: newProject, search: '', type: 'all', node: null });
  }, [updateUrl]);

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearchQuery(newSearch);
    updateUrl({ search: newSearch });
  }, [updateUrl]);

  const handleTypeFilterChange = useCallback((newType: ContextType | 'all') => {
    setTypeFilter(newType);
    updateUrl({ type: newType });
  }, [updateUrl]);

  const handleNodeSelect = useCallback((nodeId: number | null) => {
    setSelectedNode(nodeId);
    updateUrl({ node: nodeId });
  }, [updateUrl]);

  useEffect(() => {
    async function loadGraph() {
      setLoading(true);
      setError(null);

      // Only reset state if not initial load from URL
      if (!isInitialLoad.current) {
        setSelectedNode(null);
        setSearchQuery('');
        setTypeFilter('all');
        setFocusedNodeIndex(-1);
      }

      try {
        const res = await fetch(`/api/graph?project=${project}`);
        if (!res.ok) throw new Error('Failed to load graph');
        const data = await res.json();
        setGraph(data);

        // On initial load, if we have a node param, validate it exists
        if (isInitialLoad.current && initialNode !== null) {
          const nodeExists = data.nodes.some((n: GraphNode) => n.id === initialNode);
          if (!nodeExists) {
            setSelectedNode(null);
            updateUrl({ node: null });
          }
        }

        isInitialLoad.current = false;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, [project]);

  // Compute highlighted nodes based on search query
  const highlightedNodes = useMemo(() => {
    if (!graph || !searchQuery.trim()) return new Set<number>();
    const query = searchQuery.toLowerCase();
    const matching = new Set<number>();
    for (const node of graph.nodes) {
      // Match against role, label, or instance number
      if (
        node.role?.toLowerCase().includes(query) ||
        node.label.toLowerCase().includes(query) ||
        node.id.toString() === query
      ) {
        matching.add(node.id);
      }
    }
    return matching;
  }, [graph, searchQuery]);

  // Count nodes by type for filter badges
  const typeCountsMap = useMemo(() => {
    if (!graph) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const node of graph.nodes) {
      counts.set(node.type, (counts.get(node.type) || 0) + 1);
    }
    return counts;
  }, [graph]);

  const selectedNodeData = selectedNode !== null && graph
    ? graph.nodes.find(n => n.id === selectedNode)
    : null;

  // Get visible nodes for keyboard navigation
  const visibleNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes
      .filter(node => {
        // Type filter
        if (typeFilter !== 'all' && node.type !== typeFilter) return false;
        // Search filter
        if (searchQuery && !highlightedNodes.has(node.id)) return false;
        return true;
      })
      .sort((a, b) => a.id - b.id);
  }, [graph, typeFilter, searchQuery, highlightedNodes]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLInputElement).blur();
          handleSearchChange('');
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          handleSearchChange('');
          handleNodeSelect(null);
          setFocusedNodeIndex(-1);
          break;

        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (visibleNodes.length > 0) {
            const nextIndex = focusedNodeIndex < visibleNodes.length - 1 ? focusedNodeIndex + 1 : 0;
            setFocusedNodeIndex(nextIndex);
            handleNodeSelect(visibleNodes[nextIndex].id);
          }
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (visibleNodes.length > 0) {
            const prevIndex = focusedNodeIndex > 0 ? focusedNodeIndex - 1 : visibleNodes.length - 1;
            setFocusedNodeIndex(prevIndex);
            handleNodeSelect(visibleNodes[prevIndex].id);
          }
          break;

        case 'Enter':
          if (selectedNode !== null && selectedNodeData?.contextId) {
            router.push(`/?context=${selectedNodeData.contextId}`);
          }
          break;

        case '/':
          e.preventDefault();
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;

        case 'f':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setShowFilters(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleNodes, focusedNodeIndex, selectedNode, selectedNodeData, handleSearchChange, handleNodeSelect, router]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center">
                  <Network className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[var(--foreground)]">
                    Instance Graph
                  </h1>
                  <p className="text-xs text-[var(--muted)]">
                    Who built on whom
                  </p>
                </div>
              </div>
            </div>

            {/* Project Switcher */}
            <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-1">
              {(Object.keys(PROJECT_INFO) as ProjectName[]).map((p) => {
                const info = PROJECT_INFO[p];
                const Icon = info.icon;
                return (
                  <button
                    key={p}
                    onClick={() => handleProjectChange(p)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm',
                      project === p
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        {graph && !loading && (
          <div className="border-t border-[var(--border)] px-4 sm:px-6 lg:px-8 py-3">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by role or instance number... (press /)"
                  className="w-full pl-10 pr-8 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  showFilters || typeFilter !== 'all'
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
                {typeFilter !== 'all' && (
                  <span className="text-xs opacity-75">({typeFilter})</span>
                )}
              </button>

              {/* Search Results Count */}
              {searchQuery && (
                <span className="text-sm text-[var(--muted)]">
                  {highlightedNodes.size} match{highlightedNodes.size !== 1 ? 'es' : ''}
                </span>
              )}
            </div>

            {/* Type Filter Pills */}
            {showFilters && (
              <div className="max-w-7xl mx-auto mt-3 flex flex-wrap gap-2">
                {TYPE_FILTERS.map(({ type, label, color }) => {
                  const count = type === 'all'
                    ? graph.nodes.length
                    : typeCountsMap.get(type) || 0;
                  if (type !== 'all' && count === 0) return null;

                  return (
                    <button
                      key={type}
                      onClick={() => handleTypeFilterChange(type)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all',
                        typeFilter === type
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', color)} />
                      <span>{label}</span>
                      <span className="opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {graph && !loading && (
          <div className="mb-6 flex flex-wrap items-center gap-4 md:gap-6 text-sm text-[var(--muted)]">
            <span>
              <span className="text-[var(--foreground)] font-medium">{graph.metadata.totalInstances}</span> instances
            </span>
            <span>
              <span className="text-[var(--foreground)] font-medium">{graph.metadata.totalConnections}</span> connections
            </span>
            {graph.metadata.contextsAnalyzed && (
              <span>
                <span className="text-[var(--foreground)] font-medium">{graph.metadata.contextsAnalyzed}</span> contexts analyzed
              </span>
            )}
            {graph.metadata.enhanced && (
              <span className="px-2 py-0.5 text-xs bg-[var(--primary)]/20 text-[var(--primary)] rounded">
                Enhanced Search
              </span>
            )}
            {(typeFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  handleTypeFilterChange('all');
                  handleSearchChange('');
                }}
                className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-500 rounded hover:bg-amber-500/30 transition-colors"
              >
                Clear filters
              </button>
            )}
            {/* Share Link Button */}
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] rounded transition-colors"
              title="Copy link to this view"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
            <span className="text-xs hidden md:inline">
              {searchQuery || typeFilter !== 'all'
                ? 'Filtered nodes are highlighted. Click to select.'
                : 'Click a node or use arrow keys. Press / to search, F to filter.'}
            </span>
          </div>
        )}

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            <span className="ml-3 text-[var(--muted)]">Building graph...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-24 text-red-500">
            Error: {error}
          </div>
        )}

        {/* Graph + Detail */}
        {graph && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <GraphVisualization
                graph={graph}
                selectedNode={selectedNode}
                onNodeClick={handleNodeSelect}
                searchQuery={searchQuery}
                typeFilter={typeFilter}
                highlightedNodes={highlightedNodes}
              />
            </div>

            <div className="lg:col-span-1">
              {selectedNodeData ? (
                <NodeDetail node={selectedNodeData} graph={graph} />
              ) : (
                <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-center">
                  <Network className="w-12 h-12 mx-auto text-[var(--muted)] opacity-50" />
                  <p className="mt-4 text-[var(--muted)] text-sm">
                    Click an instance node to see its connections
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="mt-12 prose prose-invert max-w-none">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            What This Shows
          </h2>
          <p className="text-[var(--muted)] leading-relaxed mt-4">
            Each node is an AI instance that contributed to the project. Arrows show when one instance explicitly referenced another—validating work, building on ideas, or citing discoveries.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            This is the compounding nature of sequential AI collaboration made visible. Unlike parallel agents working independently, each instance here read their predecessors and left knowledge for successors.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--primary)]">Blue arrows</span> show outgoing references (what this instance cited). <span className="text-cyan-500">Cyan arrows</span> show incoming references (who cited this instance).
          </p>

          <h3 className="text-lg font-semibold text-[var(--foreground)] mt-8">
            Keyboard Shortcuts
          </h3>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">/</kbd>
              <span className="text-[var(--muted)]">Focus search</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">F</kbd>
              <span className="text-[var(--muted)]">Toggle filters</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">←/→</kbd>
              <span className="text-[var(--muted)]">Navigate nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">↑/↓</kbd>
              <span className="text-[var(--muted)]">Navigate nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">Enter</kbd>
              <span className="text-[var(--muted)]">View context</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">Esc</kbd>
              <span className="text-[var(--muted)]">Clear selection</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[var(--muted)] text-sm">
          <p>Upwelling: Deep knowledge rising to the surface</p>
          <p className="mt-2 text-xs">
            Graph by Instance 8 • Search/filter by Instance 10 • Deep linking by Instance 11
          </p>
        </div>
      </footer>
    </div>
  );
}

// Export with Suspense boundary for useSearchParams
export default function GraphPage() {
  return (
    <Suspense fallback={<GraphPageLoading />}>
      <GraphPageContent />
    </Suspense>
  );
}
