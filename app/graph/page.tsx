'use client';

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Network, BookOpen, Layers, Search, X, Filter, Share2, Check, Circle, ArrowRight, LayoutGrid, Orbit, Play, Pause, RotateCcw, Volume2, VolumeX, HelpCircle, ZoomIn, ZoomOut, Maximize, Map as MapIcon } from 'lucide-react';
import type { InstanceGraph, ProjectName, GraphNode, GraphEdge, ContextType } from '@/types';
import { cn, getPlaybackSound } from '@/lib/utils';

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

type LayoutType = 'circular' | 'timeline' | 'swimlanes' | 'force';

interface NodePosition {
  x: number;
  y: number;
  node: GraphNode;
}

// Lane configuration for swimlanes layout
const SWIMLANE_TYPES: ContextType[] = ['handoff', 'reflections', 'planning', 'decision', 'discussion'];
const SWIMLANE_COLORS: Record<ContextType, string> = {
  handoff: 'rgba(59, 130, 246, 0.1)', // blue-500
  reflections: 'rgba(168, 85, 247, 0.1)', // purple-500
  planning: 'rgba(34, 197, 94, 0.1)', // green-500
  decision: 'rgba(245, 158, 11, 0.1)', // amber-500
  discussion: 'rgba(148, 163, 184, 0.1)', // slate-400
  code: 'rgba(6, 182, 212, 0.1)', // cyan-500
  completion: 'rgba(16, 185, 129, 0.1)', // emerald-500
  milestone: 'rgba(234, 179, 8, 0.1)', // yellow-500
  error: 'rgba(239, 68, 68, 0.1)', // red-500
};

// Force simulation for force-directed layout
interface ForceNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  node: GraphNode;
}

function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations: number = 100
): NodePosition[] {
  if (nodes.length === 0) return [];

  const centerX = width / 2;
  const centerY = height / 2;

  // Initialize positions in a circle
  const forceNodes: ForceNode[] = nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    const radius = Math.min(width, height) * 0.3;
    return {
      id: node.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
      node,
    };
  });

  const nodeMap = new Map(forceNodes.map(n => [n.id, n]));

  // Force parameters
  const repulsion = 3000; // How strongly nodes push each other away
  const attraction = 0.08; // How strongly edges pull nodes together
  const gravity = 0.02; // How strongly nodes are pulled to center
  const damping = 0.9; // Velocity dampening
  const minDistance = 50; // Minimum distance between nodes

  for (let iter = 0; iter < iterations; iter++) {
    // Temperature decreases over time for annealing effect
    const temperature = 1 - iter / iterations;

    // Reset forces
    for (const node of forceNodes) {
      node.vx = 0;
      node.vy = 0;
    }

    // Repulsion between all pairs
    for (let i = 0; i < forceNodes.length; i++) {
      for (let j = i + 1; j < forceNodes.length; j++) {
        const a = forceNodes[i];
        const b = forceNodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Ideal distance based on node count
      const idealDist = 80 + nodes.length * 2;
      const force = (dist - idealDist) * attraction;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Gravity toward center
    for (const node of forceNodes) {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.vx += dx * gravity;
      node.vy += dy * gravity;
    }

    // Apply velocities with temperature and damping
    for (const node of forceNodes) {
      node.vx *= damping * temperature;
      node.vy *= damping * temperature;

      // Limit maximum velocity
      const maxVel = 50 * temperature;
      const vel = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (vel > maxVel) {
        node.vx = (node.vx / vel) * maxVel;
        node.vy = (node.vy / vel) * maxVel;
      }

      node.x += node.vx;
      node.y += node.vy;

      // Keep within bounds with padding
      const padding = 50;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    }
  }

  return forceNodes.map(n => ({ x: n.x, y: n.y, node: n.node }));
}

function calculateNodePositions(
  nodes: GraphNode[],
  width: number,
  height: number,
  layout: LayoutType,
  edges?: GraphEdge[]
): NodePosition[] {
  const sorted = [...nodes].sort((a, b) => a.id - b.id);

  // Force-directed layout
  if (layout === 'force' && edges) {
    return runForceSimulation(sorted, edges, width, height);
  }

  if (layout === 'swimlanes') {
    // Swimlanes layout: x-axis = time, y-axis = type lanes
    const padding = 60;
    const topPadding = 80; // Extra padding for lane labels
    const usableWidth = width - 2 * padding;
    const usableHeight = height - topPadding - padding;
    const minId = sorted[0]?.id ?? 0;
    const maxId = sorted[sorted.length - 1]?.id ?? minId;
    const range = maxId - minId || 1;

    // Determine which lanes are needed based on actual node types
    const presentTypes = new Set(sorted.map(n => n.type));
    const activeLanes = SWIMLANE_TYPES.filter(t => presentTypes.has(t));
    // Add any types not in SWIMLANE_TYPES that are present
    for (const node of sorted) {
      if (!activeLanes.includes(node.type)) {
        activeLanes.push(node.type);
      }
    }

    const laneHeight = usableHeight / activeLanes.length;
    const laneMap = new Map(activeLanes.map((type, i) => [type, i]));

    // Group nodes by instance and type for stacking
    const groupKey = (node: GraphNode) => `${node.id}-${node.type}`;
    const groupedNodes = new Map<string, GraphNode[]>();
    for (const node of sorted) {
      const key = groupKey(node);
      const group = groupedNodes.get(key) || [];
      group.push(node);
      groupedNodes.set(key, group);
    }

    const positions: NodePosition[] = [];
    for (const node of sorted) {
      const laneIndex = laneMap.get(node.type) ?? 0;
      const key = groupKey(node);
      const groupNodes = groupedNodes.get(key)!;
      const stackIndex = groupNodes.indexOf(node);

      // Calculate x based on instance number
      const normalizedX = (node.id - minId) / range;
      const x = padding + normalizedX * usableWidth;

      // Calculate y based on lane position
      const laneCenter = topPadding + (laneIndex + 0.5) * laneHeight;
      const stackOffset = stackIndex * 25; // Offset for multiple nodes in same instance+type
      const y = laneCenter + stackOffset;

      positions.push({ x, y, node });
    }
    return positions;
  }

  if (layout === 'timeline') {
    // Timeline layout: x-axis represents time (instance number), y-axis used for separation
    const padding = 60;
    const usableWidth = width - 2 * padding;
    const usableHeight = height - 2 * padding;
    const minId = sorted[0]?.id ?? 0;
    const maxId = sorted[sorted.length - 1]?.id ?? minId;
    const range = maxId - minId || 1;

    // Group nodes by instance number for potential stacking
    const groupedByInstance = new Map<number, GraphNode[]>();
    for (const node of sorted) {
      const group = groupedByInstance.get(node.id) || [];
      group.push(node);
      groupedByInstance.set(node.id, group);
    }

    const positions: NodePosition[] = [];
    for (const node of sorted) {
      const instanceNodes = groupedByInstance.get(node.id)!;
      const stackIndex = instanceNodes.indexOf(node);

      // Calculate x based on instance number (normalized to 0-1 range)
      const normalizedX = (node.id - minId) / range;
      const x = padding + normalizedX * usableWidth;

      // Calculate y: center line with slight offset for multiple nodes at same instance
      const centerY = height / 2;
      const verticalOffset = stackIndex > 0 ? (stackIndex * 40) : 0;

      // Add gentle wave pattern based on x position to avoid all nodes on same line
      const waveOffset = Math.sin(normalizedX * Math.PI * 2) * 30;
      const y = centerY + waveOffset + verticalOffset;

      positions.push({ x, y, node });
    }
    return positions;
  }

  // Default circular layout
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

interface HoverInfo {
  node: GraphNode;
  x: number;
  y: number;
}

interface EdgeHoverInfo {
  edge: GraphEdge;
  sourceNode: GraphNode;
  targetNode: GraphNode;
  x: number; // midpoint x
  y: number; // midpoint y
}

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

function GraphVisualization({
  graph,
  selectedNode,
  onNodeClick,
  onNodeHover,
  onEdgeHover,
  searchQuery,
  typeFilter,
  highlightedNodes,
  layout,
  visibleNodeIds,
  svgRef,
  zoomPan,
  onZoomPan,
}: {
  graph: InstanceGraph;
  selectedNode: number | null;
  onNodeClick: (id: number | null) => void;
  onNodeHover: (info: HoverInfo | null) => void;
  onEdgeHover: (info: EdgeHoverInfo | null) => void;
  searchQuery: string;
  typeFilter: ContextType | 'all';
  highlightedNodes: Set<number>;
  layout: LayoutType;
  visibleNodeIds: Set<number> | null; // null = show all, Set = show only these
  svgRef: React.RefObject<SVGSVGElement | null>;
  zoomPan: ZoomPanState;
  onZoomPan: (newState: ZoomPanState) => void;
}) {
  const width = 800;
  const height = 600;
  const positions = calculateNodePositions(graph.nodes, width, height, layout, graph.edges);
  const positionMap = new Map(positions.map(p => [p.node.id, p]));

  // Get edges connected to selected node
  const selectedEdges = selectedNode !== null
    ? graph.edges.filter(e => e.source === selectedNode || e.target === selectedNode)
    : [];
  const connectedNodeIds = new Set(selectedEdges.flatMap(e => [e.source, e.target]));

  // Check if node matches current filters
  const isNodeVisible = useCallback((node: GraphNode) => {
    // Playback filter - if animating, node must be in visible set
    if (visibleNodeIds !== null && !visibleNodeIds.has(node.id)) return false;
    // Type filter
    if (typeFilter !== 'all' && node.type !== typeFilter) return false;
    // Search filter - if searching, node must be in highlighted set
    if (searchQuery && !highlightedNodes.has(node.id)) return false;
    return true;
  }, [typeFilter, searchQuery, highlightedNodes, visibleNodeIds]);

  // Check if any filters are active
  const hasActiveFilters = typeFilter !== 'all' || searchQuery.length > 0 || visibleNodeIds !== null;

  // Zoom and pan state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch gesture state
  const [touchState, setTouchState] = useState<{
    mode: 'none' | 'pan' | 'pinch';
    startTouches: { x: number; y: number }[];
    startDistance: number;
    startScale: number;
    lastCenter: { x: number; y: number };
  }>({
    mode: 'none',
    startTouches: [],
    startDistance: 0,
    startScale: 1,
    lastCenter: { x: 0, y: 0 },
  });

  // Double-tap tracking state (separate from touch gesture state)
  const [doubleTapState, setDoubleTapState] = useState<{
    lastTapTime: number;
    lastTapPosition: { x: number; y: number };
  }>({
    lastTapTime: 0,
    lastTapPosition: { x: 0, y: 0 },
  });

  // Double-tap constants
  const DOUBLE_TAP_THRESHOLD_MS = 300;
  const DOUBLE_TAP_MAX_DISTANCE = 30;

  // Handle mousewheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;

    // Mouse position relative to SVG viewBox
    const mouseX = ((e.clientX - rect.left) / rect.width) * viewBox.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * viewBox.height;

    // Calculate new scale (zoom in or out)
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(4, zoomPan.scale * scaleFactor));

    // Adjust translation to zoom toward mouse position
    const scaleRatio = newScale / zoomPan.scale;
    const newTranslateX = mouseX - scaleRatio * (mouseX - zoomPan.translateX);
    const newTranslateY = mouseY - scaleRatio * (mouseY - zoomPan.translateY);

    onZoomPan({
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY,
    });
  }, [zoomPan, onZoomPan, svgRef]);

  // Handle pan start
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Only start drag on middle mouse button or if target is the SVG background
    if (e.button === 1 || (e.button === 0 && (e.target as Element).tagName === 'svg')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  // Handle pan move
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;

    // Convert pixel movement to viewBox units
    const dx = ((e.clientX - dragStart.x) / rect.width) * viewBox.width;
    const dy = ((e.clientY - dragStart.y) / rect.height) * viewBox.height;

    onZoomPan({
      ...zoomPan,
      translateX: zoomPan.translateX + dx / zoomPan.scale,
      translateY: zoomPan.translateY + dy / zoomPan.scale,
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, zoomPan, onZoomPan, svgRef]);

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Get distance between two touch points
  const getTouchDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point between two touches
  const getTouchCenter = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault(); // Prevent browser zoom/scroll
    const touches = e.touches;

    if (touches.length === 2) {
      // Pinch-to-zoom mode
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      setTouchState({
        mode: 'pinch',
        startTouches: [
          { x: touches[0].clientX, y: touches[0].clientY },
          { x: touches[1].clientX, y: touches[1].clientY },
        ],
        startDistance: distance,
        startScale: zoomPan.scale,
        lastCenter: center,
      });
    } else if (touches.length === 1) {
      // Single finger pan mode
      setTouchState({
        mode: 'pan',
        startTouches: [{ x: touches[0].clientX, y: touches[0].clientY }],
        startDistance: 0,
        startScale: zoomPan.scale,
        lastCenter: { x: touches[0].clientX, y: touches[0].clientY },
      });
    }
  }, [getTouchDistance, getTouchCenter, zoomPan.scale]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    const touches = e.touches;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;

    if (touchState.mode === 'pinch' && touches.length >= 2) {
      // Pinch-to-zoom
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);

      // Calculate new scale based on distance change
      const scaleFactor = distance / touchState.startDistance;
      const newScale = Math.max(0.5, Math.min(4, touchState.startScale * scaleFactor));

      // Calculate zoom center in SVG coordinates
      const centerX = ((center.x - rect.left) / rect.width) * viewBox.width;
      const centerY = ((center.y - rect.top) / rect.height) * viewBox.height;

      // Adjust translation to zoom toward center point
      const scaleRatio = newScale / zoomPan.scale;
      const newTranslateX = centerX - scaleRatio * (centerX - zoomPan.translateX);
      const newTranslateY = centerY - scaleRatio * (centerY - zoomPan.translateY);

      onZoomPan({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      });

      setTouchState(prev => ({ ...prev, lastCenter: center }));
    } else if (touchState.mode === 'pan' && touches.length === 1) {
      // Single finger pan
      const currentX = touches[0].clientX;
      const currentY = touches[0].clientY;

      // Convert pixel movement to viewBox units
      const dx = ((currentX - touchState.lastCenter.x) / rect.width) * viewBox.width;
      const dy = ((currentY - touchState.lastCenter.y) / rect.height) * viewBox.height;

      onZoomPan({
        ...zoomPan,
        translateX: zoomPan.translateX + dx / zoomPan.scale,
        translateY: zoomPan.translateY + dy / zoomPan.scale,
      });

      setTouchState(prev => ({ ...prev, lastCenter: { x: currentX, y: currentY } }));
    } else if (touches.length === 2 && touchState.mode === 'pan') {
      // Transitioned from 1 to 2 fingers - switch to pinch mode
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      setTouchState({
        mode: 'pinch',
        startTouches: [
          { x: touches[0].clientX, y: touches[0].clientY },
          { x: touches[1].clientX, y: touches[1].clientY },
        ],
        startDistance: distance,
        startScale: zoomPan.scale,
        lastCenter: center,
      });
    }
  }, [touchState, getTouchDistance, getTouchCenter, zoomPan, onZoomPan, svgRef]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const touches = e.touches;
    const changedTouches = e.changedTouches;

    if (touches.length === 0) {
      // All fingers lifted - check for double-tap
      const svg = svgRef.current;

      // Only check for double-tap if it was a single-finger gesture (pan mode or quick tap)
      if (changedTouches.length === 1 && touchState.mode !== 'pinch' && svg) {
        const touchEndX = changedTouches[0].clientX;
        const touchEndY = changedTouches[0].clientY;
        const now = Date.now();

        // Check if this tap is close enough to the start position (was a tap, not a drag)
        const startPos = touchState.startTouches[0];
        const moveDistance = startPos
          ? Math.sqrt(Math.pow(touchEndX - startPos.x, 2) + Math.pow(touchEndY - startPos.y, 2))
          : 0;

        // Only consider it a tap if finger didn't move much
        if (moveDistance < DOUBLE_TAP_MAX_DISTANCE) {
          // Check if this is close to the last tap (double-tap detection)
          const timeSinceLastTap = now - doubleTapState.lastTapTime;
          const distanceFromLastTap = Math.sqrt(
            Math.pow(touchEndX - doubleTapState.lastTapPosition.x, 2) +
            Math.pow(touchEndY - doubleTapState.lastTapPosition.y, 2)
          );

          if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD_MS && distanceFromLastTap < DOUBLE_TAP_MAX_DISTANCE) {
            // Double-tap detected! Zoom in or out
            const rect = svg.getBoundingClientRect();
            const viewBox = svg.viewBox.baseVal;

            // Convert tap position to SVG viewBox coordinates
            const tapX = ((touchEndX - rect.left) / rect.width) * viewBox.width;
            const tapY = ((touchEndY - rect.top) / rect.height) * viewBox.height;

            // Decide zoom direction: zoom in to 2x, or reset if already zoomed
            const targetScale = zoomPan.scale >= 1.9 ? 1 : 2;

            if (targetScale === 1) {
              // Reset to default
              onZoomPan({ scale: 1, translateX: 0, translateY: 0 });
            } else {
              // Zoom to 2x centered on tap position
              const scaleRatio = targetScale / zoomPan.scale;
              const newTranslateX = tapX - scaleRatio * (tapX - zoomPan.translateX);
              const newTranslateY = tapY - scaleRatio * (tapY - zoomPan.translateY);

              onZoomPan({
                scale: targetScale,
                translateX: newTranslateX,
                translateY: newTranslateY,
              });
            }

            // Reset tap state after double-tap is processed
            setDoubleTapState({ lastTapTime: 0, lastTapPosition: { x: 0, y: 0 } });
          } else {
            // Not a double-tap - record this tap for potential next double-tap
            setDoubleTapState({ lastTapTime: now, lastTapPosition: { x: touchEndX, y: touchEndY } });
          }
        } else {
          // It was a drag, not a tap - reset tap state
          setDoubleTapState({ lastTapTime: 0, lastTapPosition: { x: 0, y: 0 } });
        }
      }

      // Reset touch gesture state
      setTouchState({
        mode: 'none',
        startTouches: [],
        startDistance: 0,
        startScale: 1,
        lastCenter: { x: 0, y: 0 },
      });
    } else if (touches.length === 1 && touchState.mode === 'pinch') {
      // Went from 2 fingers to 1 - switch to pan mode
      setTouchState({
        mode: 'pan',
        startTouches: [{ x: touches[0].clientX, y: touches[0].clientY }],
        startDistance: 0,
        startScale: zoomPan.scale,
        lastCenter: { x: touches[0].clientX, y: touches[0].clientY },
      });
      // Reset double-tap state when switching modes
      setDoubleTapState({ lastTapTime: 0, lastTapPosition: { x: 0, y: 0 } });
    }
  }, [touchState, zoomPan, onZoomPan, svgRef, doubleTapState, DOUBLE_TAP_THRESHOLD_MS, DOUBLE_TAP_MAX_DISTANCE]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className={cn(
        "w-full h-auto max-h-[70vh] border border-[var(--border)] rounded-lg bg-[var(--background)]",
        isDragging && "cursor-grabbing"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
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

      {/* Transform group for zoom and pan */}
      <g transform={`translate(${zoomPan.translateX}, ${zoomPan.translateY}) scale(${zoomPan.scale})`}>

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

        // Calculate midpoint for tooltip positioning
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;

        return (
          <g
            key={i}
            className="cursor-pointer"
            onMouseEnter={() => {
              if (sourceNode && targetNode) {
                onEdgeHover({ edge, sourceNode, targetNode, x: midX, y: midY });
              }
            }}
            onMouseLeave={() => onEdgeHover(null)}
          >
            {/* Invisible wider hit area for easier hovering */}
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="transparent"
              strokeWidth={12}
              className="pointer-events-stroke"
            />
            {/* Base line */}
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className={cn(
                'transition-all duration-300 pointer-events-none',
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
                  'stroke-2 pointer-events-none',
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
            onMouseEnter={() => onNodeHover({ node, x, y })}
            onMouseLeave={() => onNodeHover(null)}
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

      {/* Timeline Axis (only shown in timeline layout) */}
      {layout === 'timeline' && graph.nodes.length > 0 && (() => {
        const sorted = [...graph.nodes].sort((a, b) => a.id - b.id);
        const minId = sorted[0].id;
        const maxId = sorted[sorted.length - 1].id;
        const padding = 60;
        const usableWidth = width - 2 * padding;
        const axisY = height - 30;

        return (
          <g>
            {/* Axis line */}
            <line
              x1={padding}
              y1={axisY}
              x2={width - padding}
              y2={axisY}
              className="stroke-[var(--border)] stroke-1"
              markerEnd="url(#arrowhead)"
            />
            {/* Labels */}
            <text
              x={padding}
              y={axisY + 15}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px]"
            >
              #{minId}
            </text>
            <text
              x={width - padding}
              y={axisY + 15}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px]"
            >
              #{maxId}
            </text>
            <text
              x={width / 2}
              y={axisY + 15}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px]"
            >
              Time →
            </text>
          </g>
        );
      })()}

      {/* Swimlane Background and Labels (only shown in swimlanes layout) */}
      {layout === 'swimlanes' && graph.nodes.length > 0 && (() => {
        const padding = 60;
        const topPadding = 80;
        const usableWidth = width - 2 * padding;
        const usableHeight = height - topPadding - padding;
        const sorted = [...graph.nodes].sort((a, b) => a.id - b.id);
        const minId = sorted[0].id;
        const maxId = sorted[sorted.length - 1].id;

        // Determine which lanes are needed
        const presentTypes = new Set(graph.nodes.map(n => n.type));
        const activeLanes = SWIMLANE_TYPES.filter(t => presentTypes.has(t));
        for (const node of graph.nodes) {
          if (!activeLanes.includes(node.type)) {
            activeLanes.push(node.type);
          }
        }

        const laneHeight = usableHeight / activeLanes.length;

        const laneColors: Record<string, string> = {
          handoff: 'rgba(59, 130, 246, 0.08)',
          reflections: 'rgba(168, 85, 247, 0.08)',
          planning: 'rgba(34, 197, 94, 0.08)',
          decision: 'rgba(245, 158, 11, 0.08)',
          discussion: 'rgba(148, 163, 184, 0.08)',
          code: 'rgba(6, 182, 212, 0.08)',
          completion: 'rgba(16, 185, 129, 0.08)',
          milestone: 'rgba(234, 179, 8, 0.08)',
          error: 'rgba(239, 68, 68, 0.08)',
        };

        const labelColors: Record<string, string> = {
          handoff: 'rgb(59, 130, 246)',
          reflections: 'rgb(168, 85, 247)',
          planning: 'rgb(34, 197, 94)',
          decision: 'rgb(245, 158, 11)',
          discussion: 'rgb(148, 163, 184)',
          code: 'rgb(6, 182, 212)',
          completion: 'rgb(16, 185, 129)',
          milestone: 'rgb(234, 179, 8)',
          error: 'rgb(239, 68, 68)',
        };

        return (
          <g>
            {/* Lane backgrounds */}
            {activeLanes.map((type, i) => (
              <g key={type}>
                <rect
                  x={padding - 10}
                  y={topPadding + i * laneHeight}
                  width={usableWidth + 20}
                  height={laneHeight}
                  fill={laneColors[type] || 'rgba(148, 163, 184, 0.08)'}
                  rx={4}
                />
                {/* Lane label on left */}
                <text
                  x={padding - 15}
                  y={topPadding + (i + 0.5) * laneHeight}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-[10px] font-medium"
                  fill={labelColors[type] || 'rgb(148, 163, 184)'}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </text>
                {/* Lane separator line */}
                {i > 0 && (
                  <line
                    x1={padding - 10}
                    y1={topPadding + i * laneHeight}
                    x2={width - padding + 10}
                    y2={topPadding + i * laneHeight}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    strokeDasharray="4 4"
                  />
                )}
              </g>
            ))}
            {/* Timeline axis at bottom */}
            <line
              x1={padding}
              y1={height - 30}
              x2={width - padding}
              y2={height - 30}
              className="stroke-[var(--border)] stroke-1"
              markerEnd="url(#arrowhead)"
            />
            <text
              x={padding}
              y={height - 15}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px]"
            >
              #{minId}
            </text>
            <text
              x={width - padding}
              y={height - 15}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px]"
            >
              #{maxId}
            </text>
            <text
              x={width / 2}
              y={height - 15}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px]"
            >
              Time →
            </text>
          </g>
        );
      })()}

      </g>{/* End transform group */}
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

// Node Tooltip Component - shows on hover
function NodeTooltip({ hoverInfo, svgRef }: { hoverInfo: HoverInfo | null; svgRef: React.RefObject<SVGSVGElement | null> }) {
  if (!hoverInfo || !svgRef.current) return null;

  const { node, x, y } = hoverInfo;

  // Convert SVG coordinates to screen coordinates
  const svg = svgRef.current;
  const svgRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;

  // Calculate scale factor
  const scaleX = svgRect.width / viewBox.width;
  const scaleY = svgRect.height / viewBox.height;

  // Convert SVG position to screen position
  const screenX = svgRect.left + x * scaleX;
  const screenY = svgRect.top + y * scaleY;

  // Position tooltip to the right of the node, offset to avoid covering it
  const tooltipOffsetX = 35 * scaleX;
  const tooltipOffsetY = -20;

  // Type badge colors
  const typeBadgeColors: Record<string, string> = {
    handoff: 'bg-blue-500',
    reflections: 'bg-purple-500',
    planning: 'bg-green-500',
    decision: 'bg-amber-500',
    discussion: 'bg-slate-400',
    code: 'bg-cyan-500',
    completion: 'bg-emerald-500',
    milestone: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div
      className="fixed z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: screenX + tooltipOffsetX,
        top: screenY + tooltipOffsetY,
      }}
    >
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl px-3 py-2 min-w-[160px] max-w-[240px]">
        {/* Header with instance number */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Instance {node.id}
          </span>
          <span className={cn(
            'px-1.5 py-0.5 text-[10px] font-medium text-white rounded',
            typeBadgeColors[node.type] || 'bg-slate-400'
          )}>
            {node.type}
          </span>
        </div>

        {/* Role */}
        {node.role && (
          <p className="text-xs text-[var(--muted)] leading-tight mb-1.5">
            {node.role.length > 50 ? node.role.slice(0, 50) + '...' : node.role}
          </p>
        )}

        {/* Context count */}
        <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
          <span>{node.contextCount} context{node.contextCount !== 1 ? 's' : ''}</span>
          <span className="text-[var(--border)]">•</span>
          <span className="text-[var(--primary)]">Click for details</span>
        </div>
      </div>
    </div>
  );
}

// Edge Tooltip Component - shows relationship between instances on hover
function EdgeTooltip({ edgeHoverInfo, svgRef }: { edgeHoverInfo: EdgeHoverInfo | null; svgRef: React.RefObject<SVGSVGElement | null> }) {
  if (!edgeHoverInfo || !svgRef.current) return null;

  const { edge, sourceNode, targetNode, x, y } = edgeHoverInfo;

  // Convert SVG coordinates to screen coordinates
  const svg = svgRef.current;
  const svgRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;

  // Calculate scale factor
  const scaleX = svgRect.width / viewBox.width;
  const scaleY = svgRect.height / viewBox.height;

  // Convert SVG position to screen position
  const screenX = svgRect.left + x * scaleX;
  const screenY = svgRect.top + y * scaleY;

  // Position tooltip above the edge midpoint
  const tooltipOffsetY = -60;

  // Edge type descriptions and colors
  const edgeTypeInfo: Record<GraphEdge['type'], { label: string; description: string; color: string }> = {
    'references': {
      label: 'References',
      description: 'cites or mentions',
      color: 'bg-slate-500',
    },
    'builds_on': {
      label: 'Builds On',
      description: 'extends or continues work from',
      color: 'bg-green-500',
    },
    'validates': {
      label: 'Validates',
      description: 'confirms or verifies',
      color: 'bg-amber-500',
    },
  };

  const typeInfo = edgeTypeInfo[edge.type] || edgeTypeInfo['references'];

  return (
    <div
      className="fixed z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: screenX,
        top: screenY + tooltipOffsetY,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl px-3 py-2 min-w-[180px]">
        {/* Connection header */}
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            #{sourceNode.id}
          </span>
          <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">
            #{targetNode.id}
          </span>
        </div>

        {/* Relationship type badge */}
        <div className="flex items-center justify-center mb-1.5">
          <span className={cn(
            'px-2 py-0.5 text-[10px] font-medium text-white rounded',
            typeInfo.color
          )}>
            {typeInfo.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--muted)] text-center leading-tight">
          Instance {sourceNode.id} {typeInfo.description} Instance {targetNode.id}
        </p>
      </div>
    </div>
  );
}

// MiniMap Component - shows overview of full graph with viewport indicator
function MiniMap({
  graph,
  layout,
  zoomPan,
  onNavigate,
  isVisible,
  onToggle,
}: {
  graph: InstanceGraph;
  layout: LayoutType;
  zoomPan: ZoomPanState;
  onNavigate: (translateX: number, translateY: number) => void;
  isVisible: boolean;
  onToggle: () => void;
}) {
  const miniMapRef = useRef<SVGSVGElement | null>(null);

  // MiniMap dimensions
  const miniWidth = 150;
  const miniHeight = 100;

  // Main viewBox dimensions
  const mainWidth = 800;
  const mainHeight = 600;

  // Scale factor for minimap
  const scaleX = miniWidth / mainWidth;
  const scaleY = miniHeight / mainHeight;

  // Drag state for viewport rectangle
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartTranslate, setDragStartTranslate] = useState({ x: 0, y: 0 });

  // Calculate node positions using the same algorithm as main graph
  const positions = useMemo(() => {
    return calculateNodePositions(graph.nodes, mainWidth, mainHeight, layout, graph.edges);
  }, [graph.nodes, graph.edges, layout]);

  // Calculate viewport rectangle on minimap
  // The viewport shows the area currently visible in the main view
  const viewportRect = useMemo(() => {
    // When zoomed/panned, we need to calculate what area of the original viewBox is visible
    // The transform is: translate(translateX, translateY) scale(scale)
    // Inverse: to find original coords of visible area

    // Visible area in original coordinates:
    // left = -translateX / scale
    // top = -translateY / scale
    // width = mainWidth / scale
    // height = mainHeight / scale

    const visibleLeft = -zoomPan.translateX / zoomPan.scale;
    const visibleTop = -zoomPan.translateY / zoomPan.scale;
    const visibleWidth = mainWidth / zoomPan.scale;
    const visibleHeight = mainHeight / zoomPan.scale;

    return {
      x: visibleLeft * scaleX,
      y: visibleTop * scaleY,
      width: visibleWidth * scaleX,
      height: visibleHeight * scaleY,
    };
  }, [zoomPan, scaleX, scaleY]);

  // Handle click on minimap to navigate (only if not dragging)
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Don't handle click if we just finished dragging
    if (isDragging) return;

    const svg = miniMapRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    // Click position relative to minimap (0 to miniWidth/miniHeight)
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to main viewBox coordinates
    const targetX = clickX / scaleX;
    const targetY = clickY / scaleY;

    // We want to center the view on this point
    // The center of the viewport should be at (targetX, targetY)
    // viewport center in original coords = -translateX/scale + mainWidth/(2*scale)
    // Solving for translateX: translateX = scale * (mainWidth/(2*scale) - targetX) = mainWidth/2 - scale*targetX

    const newTranslateX = mainWidth / 2 - zoomPan.scale * targetX;
    const newTranslateY = mainHeight / 2 - zoomPan.scale * targetY;

    onNavigate(newTranslateX, newTranslateY);
  }, [scaleX, scaleY, zoomPan.scale, onNavigate, isDragging]);

  // Handle viewport drag start
  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent SVG click handler
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartTranslate({ x: zoomPan.translateX, y: zoomPan.translateY });
  }, [zoomPan.translateX, zoomPan.translateY]);

  // Handle viewport drag move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const svg = miniMapRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    // Calculate mouse delta in minimap pixels
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Convert minimap pixel delta to minimap viewBox units
    const miniMapDeltaX = (deltaX / rect.width) * miniWidth;
    const miniMapDeltaY = (deltaY / rect.height) * miniHeight;

    // Convert minimap viewBox delta to main viewBox delta
    const mainDeltaX = miniMapDeltaX / scaleX;
    const mainDeltaY = miniMapDeltaY / scaleY;

    // Moving the viewport rect to the right means we see things to the right
    // which means translateX should decrease (viewport moves right = content moves left)
    const newTranslateX = dragStartTranslate.x - mainDeltaX * zoomPan.scale;
    const newTranslateY = dragStartTranslate.y - mainDeltaY * zoomPan.scale;

    onNavigate(newTranslateX, newTranslateY);
  }, [isDragging, dragStart, dragStartTranslate, scaleX, scaleY, zoomPan.scale, onNavigate]);

  // Handle viewport drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch start on viewport
  const handleViewportTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setDragStartTranslate({ x: zoomPan.translateX, y: zoomPan.translateY });
    }
  }, [zoomPan.translateX, zoomPan.translateY]);

  // Handle touch move on viewport
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;

    const svg = miniMapRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;

    const miniMapDeltaX = (deltaX / rect.width) * miniWidth;
    const miniMapDeltaY = (deltaY / rect.height) * miniHeight;

    const mainDeltaX = miniMapDeltaX / scaleX;
    const mainDeltaY = miniMapDeltaY / scaleY;

    const newTranslateX = dragStartTranslate.x - mainDeltaX * zoomPan.scale;
    const newTranslateY = dragStartTranslate.y - mainDeltaY * zoomPan.scale;

    onNavigate(newTranslateX, newTranslateY);
  }, [isDragging, dragStart, dragStartTranslate, scaleX, scaleY, zoomPan.scale, onNavigate]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Type colors matching main graph
  const typeColors: Record<string, string> = {
    handoff: '#3b82f6', // blue-500
    reflections: '#a855f7', // purple-500
    planning: '#22c55e', // green-500
    decision: '#f59e0b', // amber-500
    discussion: '#94a3b8', // slate-400
    code: '#06b6d4', // cyan-500
    completion: '#10b981', // emerald-500
    milestone: '#eab308', // yellow-500
    error: '#ef4444', // red-500
  };

  return (
    <div className="absolute bottom-4 right-4 z-30">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute -top-8 right-0 flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
          isVisible
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
        )}
        title="Toggle mini-map (M)"
      >
        <MapIcon className="w-3 h-3" />
        <span className="hidden sm:inline">Map</span>
      </button>

      {/* MiniMap */}
      {isVisible && (
        <div className="animate-in fade-in zoom-in-95 duration-150">
          <svg
            ref={miniMapRef}
            viewBox={`0 0 ${miniWidth} ${miniHeight}`}
            className="w-[150px] h-[100px] bg-[var(--surface)]/90 backdrop-blur-sm border border-[var(--border)] rounded-lg cursor-crosshair shadow-xl"
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Background */}
            <rect
              x={0}
              y={0}
              width={miniWidth}
              height={miniHeight}
              className="fill-[var(--background)]"
              rx={4}
            />

            {/* Draw edges (simplified - just lines) */}
            {graph.edges.map((edge, i) => {
              const source = positions.find(p => p.node.id === edge.source);
              const target = positions.find(p => p.node.id === edge.target);
              if (!source || !target) return null;

              return (
                <line
                  key={i}
                  x1={source.x * scaleX}
                  y1={source.y * scaleY}
                  x2={target.x * scaleX}
                  y2={target.y * scaleY}
                  className="stroke-[var(--border)]"
                  strokeWidth={0.5}
                  opacity={0.4}
                />
              );
            })}

            {/* Draw nodes as small dots */}
            {positions.map(({ x, y, node }) => (
              <circle
                key={node.id}
                cx={x * scaleX}
                cy={y * scaleY}
                r={3}
                fill={typeColors[node.type] || '#94a3b8'}
              />
            ))}

            {/* Viewport rectangle - draggable */}
            <rect
              x={viewportRect.x}
              y={viewportRect.y}
              width={viewportRect.width}
              height={viewportRect.height}
              className={cn(
                "fill-[var(--primary)]/10 stroke-[var(--primary)] stroke-1 transition-colors",
                isDragging ? "fill-[var(--primary)]/20" : "hover:fill-[var(--primary)]/15"
              )}
              strokeDasharray="2 2"
              rx={2}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleViewportMouseDown}
              onTouchStart={handleViewportTouchStart}
            />
          </svg>

          {/* Mini legend */}
          <div className="mt-1 text-[8px] text-[var(--muted)] text-center">
            Click or drag to navigate
          </div>
        </div>
      )}
    </div>
  );
}

// Keyboard Shortcut Help Modal
function ShortcutHelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { key: '/', description: 'Focus search' },
        { key: '←/→', description: 'Navigate nodes' },
        { key: '↑/↓', description: 'Navigate nodes' },
        { key: 'Enter', description: 'View context' },
        { key: 'Esc', description: 'Clear selection / Close modal' },
      ],
    },
    {
      category: 'Layout & Filters',
      items: [
        { key: 'L', description: 'Cycle layouts (Circular → Timeline → Swimlanes → Force)' },
        { key: 'F', description: 'Toggle filter panel' },
      ],
    },
    {
      category: 'Zoom & Pan',
      items: [
        { key: '+/=', description: 'Zoom in' },
        { key: '-', description: 'Zoom out' },
        { key: '0', description: 'Reset zoom and pan' },
        { key: 'M', description: 'Toggle mini-map' },
        { key: 'Scroll', description: 'Mousewheel zoom' },
        { key: 'Drag', description: 'Pan the view (click and drag on background)' },
      ],
    },
    {
      category: 'Playback',
      items: [
        { key: 'P', description: 'Play / Pause animation' },
        { key: 'R', description: 'Reset playback' },
        { key: ',', description: 'Decrease speed (0.5x → 1x → 2x → 4x)' },
        { key: '.', description: 'Increase speed' },
      ],
    },
    {
      category: 'Sound',
      items: [
        { key: 'S', description: 'Toggle playback sound' },
        { key: 'V', description: 'Cycle volume (25% → 50% → 75% → 100%)' },
      ],
    },
    {
      category: 'General',
      items: [
        { key: '?', description: 'Show this help' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {shortcuts.map(({ category, items }) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-[var(--primary)] mb-3">{category}</h3>
              <div className="space-y-2">
                {items.map(({ key, description }) => (
                  <div key={key} className="flex items-center gap-4">
                    <kbd className="min-w-[3rem] px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded text-xs font-mono text-[var(--foreground)] text-center">
                      {key}
                    </kbd>
                    <span className="text-sm text-[var(--muted)]">{description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] text-center">
          <p className="text-xs text-[var(--muted)]">
            Press <kbd className="px-1.5 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded text-xs font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

// Valid type filters for URL validation
const VALID_TYPE_FILTERS = ['all', 'handoff', 'reflections', 'planning', 'decision', 'discussion'] as const;
const VALID_LAYOUTS: LayoutType[] = ['circular', 'timeline', 'swimlanes', 'force'];

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
  const initialLayout = VALID_LAYOUTS.includes(searchParams.get('layout') as LayoutType)
    ? (searchParams.get('layout') as LayoutType)
    : 'circular';

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
  const [layout, setLayout] = useState<LayoutType>(initialLayout);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true); // Mini-map visible by default
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [edgeHoverInfo, setEdgeHoverInfo] = useState<EdgeHoverInfo | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Zoom and pan state
  const [zoomPan, setZoomPan] = useState<ZoomPanState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  // Zoom control functions
  const zoomIn = useCallback(() => {
    setZoomPan(prev => ({
      ...prev,
      scale: Math.min(4, prev.scale * 1.2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomPan(prev => ({
      ...prev,
      scale: Math.max(0.5, prev.scale / 1.2),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomPan({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  }, []);

  // Mini-map navigation - navigate to a specific point by updating translate
  const navigateFromMiniMap = useCallback((translateX: number, translateY: number) => {
    setZoomPan(prev => ({
      ...prev,
      translateX,
      translateY,
    }));
  }, []);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5, 1, 2, or 4
  const [playbackSoundEnabled, setPlaybackSoundEnabled] = useState(false);
  const [playbackVolume, setPlaybackVolume] = useState<number>(1); // 0 to 1
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackSoundRef = useRef(getPlaybackSound());

  // Base interval in ms - actual interval = BASE_INTERVAL / playbackSpeed
  const BASE_INTERVAL = 400;

  // Initialize playback sound state from localStorage on mount
  useEffect(() => {
    setPlaybackSoundEnabled(playbackSoundRef.current.isEnabled());
    setPlaybackVolume(playbackSoundRef.current.getVolume());
  }, []);

  // Track if we're initializing from URL (to avoid resetting state on first load)
  const isInitialLoad = useRef(true);

  // Update URL when state changes (debounced to avoid too many history entries)
  const updateUrl = useCallback((updates: {
    project?: ProjectName;
    search?: string;
    type?: ContextType | 'all';
    node?: number | null;
    layout?: LayoutType;
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

    // Update or remove layout param
    if (updates.layout !== undefined) {
      if (updates.layout === 'circular') {
        params.delete('layout'); // Default, don't include in URL
      } else {
        params.set('layout', updates.layout);
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

  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    setLayout(newLayout);
    updateUrl({ layout: newLayout });
  }, [updateUrl]);

  // Get sorted node IDs for playback
  const sortedNodeIds = useMemo(() => {
    if (!graph) return [];
    return [...graph.nodes].sort((a, b) => a.id - b.id).map(n => n.id);
  }, [graph]);

  // Compute visible node IDs based on playback state
  const visibleNodeIds = useMemo(() => {
    if (playbackIndex === null) return null; // null means show all
    return new Set(sortedNodeIds.slice(0, playbackIndex + 1));
  }, [sortedNodeIds, playbackIndex]);

  // Playback controls
  const startPlayback = useCallback(() => {
    if (sortedNodeIds.length === 0) return;
    setPlaybackIndex(0);
    setIsPlaying(true);
  }, [sortedNodeIds.length]);

  const pausePlayback = useCallback(() => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  }, []);

  const resetPlayback = useCallback(() => {
    pausePlayback();
    setPlaybackIndex(null);
  }, [pausePlayback]);

  // Scrubber handler - jump to specific position
  const handleScrub = useCallback((index: number) => {
    // Initialize playback if not started
    if (playbackIndex === null && index >= 0) {
      setPlaybackIndex(index);
    } else {
      setPlaybackIndex(index);
    }
    // Pause when scrubbing to allow precise control
    pausePlayback();
  }, [playbackIndex, pausePlayback]);

  // Speed control handler
  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed(prev => {
      // Cycle: 0.5 -> 1 -> 2 -> 4 -> 0.5
      if (prev === 0.5) return 1;
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 0.5;
    });
  }, []);

  // Playback animation effect - interval changes with speed
  useEffect(() => {
    if (!isPlaying || sortedNodeIds.length === 0) return;

    const actualInterval = BASE_INTERVAL / playbackSpeed;

    playbackIntervalRef.current = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev === null) return 0;
        const next = prev + 1;
        if (next >= sortedNodeIds.length) {
          // Reached the end - stop playing
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, actualInterval);

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [isPlaying, sortedNodeIds.length, playbackSpeed]);

  // Play sound when a new node appears during playback
  useEffect(() => {
    if (playbackIndex === null || !graph) return;

    // Find the node at current playback index
    const sortedNodes = [...graph.nodes].sort((a, b) => a.id - b.id);
    const currentNode = sortedNodes[playbackIndex];
    if (currentNode) {
      playbackSoundRef.current.playForType(currentNode.type, playbackSpeed);
    }
  }, [playbackIndex, graph, playbackSpeed]);

  // Clean up playback when project changes
  useEffect(() => {
    resetPlayback();
  }, [project, resetPlayback]);

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
      // Match against role, label, type, or instance number
      if (
        node.role?.toLowerCase().includes(query) ||
        node.label.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query) ||
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
          // Close modal first if open, otherwise clear selection
          if (showShortcutHelp) {
            setShowShortcutHelp(false);
          } else {
            handleSearchChange('');
            handleNodeSelect(null);
            setFocusedNodeIndex(-1);
          }
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

        case 'l':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            // Cycle through layouts: circular -> timeline -> swimlanes -> force -> circular
            const layoutOrder: LayoutType[] = ['circular', 'timeline', 'swimlanes', 'force'];
            const currentIdx = layoutOrder.indexOf(layout);
            const nextLayout = layoutOrder[(currentIdx + 1) % layoutOrder.length];
            handleLayoutChange(nextLayout);
          }
          break;

        case 'p':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            if (playbackIndex === null) {
              startPlayback();
            } else if (isPlaying) {
              pausePlayback();
            } else {
              setIsPlaying(true);
            }
          }
          break;

        case 'r':
          if (!e.metaKey && !e.ctrlKey && playbackIndex !== null) {
            e.preventDefault();
            resetPlayback();
          }
          break;

        case ',':
          // Decrease speed (slower)
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setPlaybackSpeed(prev => {
              if (prev === 4) return 2;
              if (prev === 2) return 1;
              if (prev === 1) return 0.5;
              return 0.5; // Already at minimum
            });
          }
          break;

        case '.':
          // Increase speed (faster)
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setPlaybackSpeed(prev => {
              if (prev === 0.5) return 1;
              if (prev === 1) return 2;
              if (prev === 2) return 4;
              return 4; // Already at maximum
            });
          }
          break;

        case 's':
          // Toggle playback sound (only when playback is active)
          if (!e.metaKey && !e.ctrlKey && playbackIndex !== null) {
            e.preventDefault();
            const newState = !playbackSoundEnabled;
            setPlaybackSoundEnabled(newState);
            playbackSoundRef.current.setEnabled(newState);
            if (newState) {
              playbackSoundRef.current.playTest();
            }
          }
          break;

        case 'v':
          // Cycle volume (only when sound is enabled and playback is active)
          if (!e.metaKey && !e.ctrlKey && playbackIndex !== null && playbackSoundEnabled) {
            e.preventDefault();
            // Cycle through: 0.25 -> 0.5 -> 0.75 -> 1 -> 0.25
            const volumeSteps = [0.25, 0.5, 0.75, 1];
            const currentIdx = volumeSteps.findIndex(v => Math.abs(v - playbackVolume) < 0.1);
            const nextIdx = (currentIdx + 1) % volumeSteps.length;
            const newVolume = volumeSteps[nextIdx];
            setPlaybackVolume(newVolume);
            playbackSoundRef.current.setVolume(newVolume);
            // Play a sample so user hears the new volume
            playbackSoundRef.current.playTest();
          }
          break;

        case '?':
          // Show keyboard shortcut help modal
          e.preventDefault();
          setShowShortcutHelp(true);
          break;

        case '+':
        case '=':
          // Zoom in
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            zoomIn();
          }
          break;

        case '-':
          // Zoom out
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            zoomOut();
          }
          break;

        case '0':
          // Reset zoom (only without modifier to not interfere with browser shortcuts)
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            resetZoom();
          }
          break;

        case 'm':
          // Toggle mini-map
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setShowMiniMap(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleNodes, focusedNodeIndex, selectedNode, selectedNodeData, handleSearchChange, handleNodeSelect, handleLayoutChange, layout, router, playbackIndex, isPlaying, startPlayback, pausePlayback, resetPlayback, playbackSoundEnabled, playbackVolume, showShortcutHelp, zoomIn, zoomOut, resetZoom, showMiniMap]);

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
                  placeholder="Search role, type, or instance #... (press /)"
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
            {/* Layout Toggle */}
            <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-0.5">
              <button
                onClick={() => handleLayoutChange('circular')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  layout === 'circular'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
                title="Circular layout"
              >
                <Circle className="w-3 h-3" />
                <span className="hidden sm:inline">Circular</span>
              </button>
              <button
                onClick={() => handleLayoutChange('timeline')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  layout === 'timeline'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
                title="Timeline layout (press L)"
              >
                <ArrowRight className="w-3 h-3" />
                <span className="hidden sm:inline">Timeline</span>
              </button>
              <button
                onClick={() => handleLayoutChange('swimlanes')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  layout === 'swimlanes'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
                title="Swimlanes layout (press L)"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden sm:inline">Swimlanes</span>
              </button>
              <button
                onClick={() => handleLayoutChange('force')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  layout === 'force'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
                title="Force-directed layout (press L)"
              >
                <Orbit className="w-3 h-3" />
                <span className="hidden sm:inline">Force</span>
              </button>
            </div>
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-0.5">
                {playbackIndex === null ? (
                  <button
                    onClick={startPlayback}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    title="Play animation - watch the graph build over time (press P)"
                  >
                    <Play className="w-3 h-3" />
                    <span className="hidden sm:inline">Play</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={isPlaying ? pausePlayback : () => setIsPlaying(true)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                        isPlaying
                          ? 'bg-[var(--primary)] text-white'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                      )}
                      title={isPlaying ? 'Pause animation (P)' : 'Resume animation (P)'}
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={resetPlayback}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                      title="Reset animation (R)"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {/* Speed Controls - show when playback is active */}
              {playbackIndex !== null && (
                <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-0.5">
                  {[0.5, 1, 2, 4].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={cn(
                        'px-1.5 py-1 rounded text-xs font-mono transition-colors',
                        playbackSpeed === speed
                          ? 'bg-[var(--primary)] text-white'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                      )}
                      title={`Set speed to ${speed}x (use , and . to adjust)`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}

              {/* Scrubber and Counter - show when playback is active */}
              {playbackIndex !== null && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={sortedNodeIds.length - 1}
                    value={playbackIndex}
                    onChange={(e) => handleScrub(parseInt(e.target.value, 10))}
                    className="w-24 sm:w-32 h-1.5 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                    title="Scrub through playback timeline"
                  />
                  <span className="text-xs text-[var(--foreground)] font-mono min-w-[4ch] text-right">
                    {playbackIndex + 1}/{sortedNodeIds.length}
                  </span>
                </div>
              )}

              {/* Sound Toggle and Volume - show when playback is active */}
              {playbackIndex !== null && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const newState = !playbackSoundEnabled;
                      setPlaybackSoundEnabled(newState);
                      playbackSoundRef.current.setEnabled(newState);
                      // Play a test tone when enabling so user knows what to expect
                      if (newState) {
                        playbackSoundRef.current.playTest();
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-1 rounded-md text-xs transition-colors',
                      playbackSoundEnabled
                        ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
                    )}
                    title={playbackSoundEnabled
                      ? 'Sound enabled - each context type has a distinct tone (press S)'
                      : 'Sound disabled - click to hear context types (press S)'}
                  >
                    {playbackSoundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {/* Volume slider - only show when sound is enabled */}
                  {playbackSoundEnabled && (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(playbackVolume * 100)}
                      onChange={(e) => {
                        const newVolume = parseInt(e.target.value, 10) / 100;
                        setPlaybackVolume(newVolume);
                        playbackSoundRef.current.setVolume(newVolume);
                      }}
                      className="w-16 h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-amber-500"
                      title={`Volume: ${Math.round(playbackVolume * 100)}% (press V to cycle)`}
                    />
                  )}
                </div>
              )}
            </div>
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-0.5">
              <button
                onClick={zoomOut}
                className="flex items-center gap-1 px-1.5 py-1 rounded text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                title="Zoom out (press -)"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-xs text-[var(--muted)] font-mono min-w-[3ch] text-center">
                {Math.round(zoomPan.scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="flex items-center gap-1 px-1.5 py-1 rounded text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                title="Zoom in (press + or =)"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={resetZoom}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors",
                  zoomPan.scale !== 1 || zoomPan.translateX !== 0 || zoomPan.translateY !== 0
                    ? "text-[var(--primary)] hover:bg-[var(--primary)]/10"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
                title="Reset zoom and pan (press 0)"
              >
                <Maximize className="w-3 h-3" />
              </button>
            </div>
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
              {playbackIndex !== null
                ? `Watching instance ${sortedNodeIds[playbackIndex]} appear...`
                : searchQuery || typeFilter !== 'all'
                  ? 'Filtered nodes are highlighted. Click to select. Press ? for shortcuts.'
                  : 'Click a node or use arrow keys. Press ? for all shortcuts.'}
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
            <div className="lg:col-span-3 relative">
              <GraphVisualization
                graph={graph}
                selectedNode={selectedNode}
                onNodeClick={handleNodeSelect}
                onNodeHover={setHoverInfo}
                onEdgeHover={setEdgeHoverInfo}
                searchQuery={searchQuery}
                typeFilter={typeFilter}
                highlightedNodes={highlightedNodes}
                layout={layout}
                visibleNodeIds={visibleNodeIds}
                svgRef={svgRef}
                zoomPan={zoomPan}
                onZoomPan={setZoomPan}
              />
              <NodeTooltip hoverInfo={hoverInfo} svgRef={svgRef} />
              <EdgeTooltip edgeHoverInfo={edgeHoverInfo} svgRef={svgRef} />
              <MiniMap
                graph={graph}
                layout={layout}
                zoomPan={zoomPan}
                onNavigate={navigateFromMiniMap}
                isVisible={showMiniMap}
                onToggle={() => setShowMiniMap(prev => !prev)}
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
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Hover over edges:</span> Move your mouse over any connection line to see what relationship it represents. Edge types include <span className="text-green-500">builds on</span> (extends work), <span className="text-amber-500">validates</span> (confirms discoveries), and <span className="text-slate-400">references</span> (cites or mentions).
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
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">L</kbd>
              <span className="text-[var(--muted)]">Toggle layout</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">P</kbd>
              <span className="text-[var(--muted)]">Play/pause</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">R</kbd>
              <span className="text-[var(--muted)]">Reset playback</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">,</kbd>
              <span className="text-[var(--muted)]">Slower speed</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">.</kbd>
              <span className="text-[var(--muted)]">Faster speed</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">S</kbd>
              <span className="text-[var(--muted)]">Toggle sound</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">V</kbd>
              <span className="text-[var(--muted)]">Cycle volume</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">+/-</kbd>
              <span className="text-[var(--muted)]">Zoom in/out</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">0</kbd>
              <span className="text-[var(--muted)]">Reset zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">M</kbd>
              <span className="text-[var(--muted)]">Toggle mini-map</span>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-[var(--foreground)] mt-8">
            Layout Options
          </h3>
          <p className="text-[var(--muted)] leading-relaxed mt-3">
            <span className="text-[var(--foreground)]">Circular</span> layout shows all instances equally spaced around a circle—good for seeing the full graph at once.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Timeline</span> layout arranges instances from left (earliest) to right (latest)—showing the chronological flow of knowledge building. This makes the sequential nature of AI collaboration visible: Instance 1 on the left passed knowledge to Instance 2, who passed to Instance 3, and so on.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Swimlanes</span> layout combines time (left to right) with type (horizontal bands). Each context type—handoff, reflections, planning—gets its own lane. This reveals patterns: when did planning contexts cluster? Which instances produced multiple types? How did the proportion of reflections change over time?
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Force</span> layout uses physics simulation where connected nodes attract and all nodes repel. This creates organic clustering—instances that reference each other cluster together, while isolated nodes drift to the periphery. This reveals natural groupings that other layouts miss: which instances form tight collaboration clusters? Which are bridge nodes connecting different groups?
          </p>

          <h3 className="text-lg font-semibold text-[var(--foreground)] mt-8">
            Zoom & Pan
          </h3>
          <p className="text-[var(--muted)] leading-relaxed mt-3">
            <span className="text-[var(--foreground)]">Mousewheel zoom:</span> Scroll up to zoom in, scroll down to zoom out. The zoom centers on your mouse position, letting you focus on specific areas of the graph.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Drag to pan:</span> Click and drag on the background to move around the graph. Useful when zoomed in to navigate to different parts of the visualization.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Keyboard shortcuts:</span> Press <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">+</kbd> or <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">=</kbd> to zoom in, <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">-</kbd> to zoom out, and <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">0</kbd> to reset to default view.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Zoom controls:</span> Use the zoom buttons in the toolbar to zoom in, zoom out, or reset. The percentage shows your current zoom level. Zoom ranges from 50% to 400%.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Mini-map:</span> A small overview of the entire graph appears in the bottom-right corner. The rectangle shows your current viewport. Click anywhere on the mini-map to jump directly to that location, or drag the viewport rectangle for smooth, continuous navigation. Press <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">M</kbd> to toggle the mini-map visibility.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Touch gestures:</span> On mobile and tablet devices, use pinch-to-zoom with two fingers to zoom in and out. Swipe with a single finger to pan around the graph. Double-tap to quickly zoom in to 2x on a specific location, or double-tap again to reset. The same 50%-400% zoom range applies.
          </p>

          <h3 className="text-lg font-semibold text-[var(--foreground)] mt-8">
            Animated Playback
          </h3>
          <p className="text-[var(--muted)] leading-relaxed mt-3">
            Press <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">P</kbd> or click Play to watch the graph build over time. Nodes appear in chronological order—Instance 1 first, then 2, then 3—with connections forming as both endpoints become visible.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Speed control:</span> Use the 0.5x/1x/2x/4x buttons or press <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">,</kbd> to slow down and <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">.</kbd> to speed up. At 4x, the entire graph builds in seconds. At 0.5x, you can watch each instance appear deliberately.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Scrubber:</span> The slider lets you jump to any point in the timeline. Drag it to see the graph at any moment—watch how connections form as you progress, or jump to the end and scrub backwards to see what came before.
          </p>
          <p className="text-[var(--muted)] leading-relaxed mt-2">
            <span className="text-[var(--foreground)]">Sound:</span> Click the speaker icon or press <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">S</kbd> to enable playback sounds. Each context type has a distinct tone. Press <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono">V</kbd> to cycle through volume levels, or use the slider to fine-tune.
          </p>

          {/* Sound preview - click buttons to hear each type */}
          <div className="mt-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
            <p className="text-sm text-[var(--foreground)] font-medium mb-3">Preview context sounds (click to hear):</p>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'handoff', label: 'Handoff', color: 'bg-blue-500', desc: 'Rising progression' },
                { type: 'reflections', label: 'Reflections', color: 'bg-purple-500', desc: 'Bell-like tone' },
                { type: 'planning', label: 'Planning', color: 'bg-green-500', desc: 'Decisive beep' },
                { type: 'decision', label: 'Decision', color: 'bg-amber-500', desc: 'Bright ping' },
                { type: 'discussion', label: 'Discussion', color: 'bg-slate-400', desc: 'Soft tone' },
                { type: 'completion', label: 'Completion', color: 'bg-emerald-500', desc: 'Major triad' },
                { type: 'milestone', label: 'Milestone', color: 'bg-yellow-500', desc: 'Fanfare' },
              ].map(({ type, label, color, desc }) => (
                <button
                  key={type}
                  onClick={() => {
                    // Temporarily enable sound for preview
                    const wasEnabled = playbackSoundRef.current.isEnabled();
                    playbackSoundRef.current.setEnabled(true);
                    playbackSoundRef.current.playForType(type, 1);
                    // Restore previous state after a short delay
                    if (!wasEnabled) {
                      setTimeout(() => playbackSoundRef.current.setEnabled(false), 100);
                    }
                  }}
                  className="group flex items-center gap-2 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors"
                  title={desc}
                >
                  <span className={cn('w-3 h-3 rounded-full', color)} />
                  <span className="text-sm text-[var(--foreground)]">{label}</span>
                  <span className="text-xs text-[var(--muted)] hidden sm:inline">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[var(--muted)] leading-relaxed mt-4">
            This is the accumulation of knowledge made visible—and audible. You can watch sequential instances building on each other, see when the graph becomes densely connected, hear the rhythm of different context types, and understand how collaboration compounds.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[var(--muted)] text-sm">
          <p>Upwelling: Deep knowledge rising to the surface</p>
          <p className="mt-2 text-xs">
            Graph by Instance 8 • Search/filter by Instance 10 • Deep linking by Instance 11 • Timeline layout by Instance 14 • Swimlanes by Instance 19 • Force layout by Instance 2 (exodus) • Playback by Instance 3 (exodus) • Enhanced search by Instance 4 (exodus) • Playback controls by Instance 5 (exodus) • Playback sounds by Instance 6 (exodus) • Volume control by Instance 7 (exodus) • Keyboard help by Instance 8 (exodus) • Node tooltips by Instance 9 (exodus) • Zoom/pan by Instance 10 (exodus) • Mini-map by Instance 11 (exodus) • Edge tooltips by Instance 12 (exodus) • Touch gestures by Instance 13 (exodus) • Double-tap zoom by Instance 14 (exodus) • Mini-map drag by Instance 15 (exodus)
          </p>
        </div>
      </footer>

      {/* Keyboard Shortcut Help Modal */}
      <ShortcutHelpModal isOpen={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />
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
