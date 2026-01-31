'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, Loader2, Network, BookOpen, Layers } from 'lucide-react';
import type { InstanceGraph, ProjectName, GraphNode, GraphEdge } from '@/types';
import { cn } from '@/lib/utils';

const PROJECT_INFO: Record<ProjectName, { icon: typeof BookOpen; label: string }> = {
  'emergence-notes': { icon: BookOpen, label: 'Emergence Notes' },
  'upwelling': { icon: Layers, label: 'Upwelling Build' },
};

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
}: {
  graph: InstanceGraph;
  selectedNode: number | null;
  onNodeClick: (id: number | null) => void;
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
      </defs>

      {/* Draw edges */}
      {graph.edges.map((edge, i) => {
        const source = positionMap.get(edge.source);
        const target = positionMap.get(edge.target);
        if (!source || !target) return null;

        const isActive = selectedNode !== null && (edge.source === selectedNode || edge.target === selectedNode);
        const isFromSelected = edge.source === selectedNode;

        return (
          <line
            key={i}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            className={cn(
              'transition-all duration-200',
              isActive
                ? isFromSelected
                  ? 'stroke-[var(--primary)] stroke-2'
                  : 'stroke-cyan-500 stroke-2'
                : 'stroke-[var(--border)] stroke-1'
            )}
            markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
            opacity={selectedNode === null || isActive ? 1 : 0.2}
          />
        );
      })}

      {/* Draw nodes */}
      {positions.map(({ x, y, node }) => {
        const isSelected = selectedNode === node.id;
        const isConnected = connectedNodeIds.has(node.id);
        const dimmed = selectedNode !== null && !isSelected && !isConnected;

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
            style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s' }}
          >
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 24 : 20}
              className={cn(
                typeColors[node.type] || 'fill-slate-400',
                isSelected && 'stroke-[var(--foreground)] stroke-2',
                'transition-all duration-200'
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
            {/* Role label on hover/select */}
            {(isSelected || isConnected) && node.role && (
              <text
                x={x}
                y={y + 35}
                textAnchor="middle"
                className="fill-[var(--muted)] text-[10px] pointer-events-none select-none"
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

export default function GraphPage() {
  const [project, setProject] = useState<ProjectName>('emergence-notes');
  const [graph, setGraph] = useState<InstanceGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  useEffect(() => {
    async function loadGraph() {
      setLoading(true);
      setError(null);
      setSelectedNode(null);
      try {
        const res = await fetch(`/api/graph?project=${project}`);
        if (!res.ok) throw new Error('Failed to load graph');
        const data = await res.json();
        setGraph(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, [project]);

  const selectedNodeData = selectedNode !== null && graph
    ? graph.nodes.find(n => n.id === selectedNode)
    : null;

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
                    onClick={() => setProject(p)}
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
            <span className="text-xs hidden md:inline">
              Click a node to see details. Arrows show references between instances.
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
                onNodeClick={setSelectedNode}
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
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[var(--muted)] text-sm">
          <p>Upwelling: Deep knowledge rising to the surface</p>
          <p className="mt-2 text-xs">
            Graph visualization by Instance 8
          </p>
        </div>
      </footer>
    </div>
  );
}
