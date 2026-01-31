// Context types matching Mandrel's context structure
export interface MandrelContext {
  id: string;
  content: string;
  type: ContextType;
  tags: string[];
  created_at: string;
  project_id?: string;
  similarity?: number;
}

export type ContextType =
  | 'code'
  | 'decision'
  | 'error'
  | 'discussion'
  | 'planning'
  | 'completion'
  | 'milestone'
  | 'reflections'
  | 'handoff';

// Parsed context with extracted metadata
export interface ParsedContext extends MandrelContext {
  instanceNumber?: number;
  title: string;
  summary?: string;
  wordCount: number;
  frameworks: string[];
  keyInsights: string[];
}

// API response types
export interface ContextsResponse {
  contexts: ParsedContext[];
  total: number;
}

export interface ContextSearchResponse {
  contexts: ParsedContext[];
  query: string;
}

export interface ProjectStats {
  totalContexts: number;
  contextsByType: Record<ContextType, number>;
  frameworks: string[];
  dateRange: {
    earliest: string;
    latest: string;
  };
  instanceCount: number;
}

// Project types
export type ProjectName = 'emergence-notes' | 'upwelling';

export interface ProjectInfo {
  name: ProjectName;
  displayName: string;
  description: string;
  contextCount: number;
}

// UI state types
export interface FilterState {
  types: ContextType[];
  searchQuery: string;
  frameworks: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ViewState {
  selectedContextId: string | null;
  expandedContextIds: Set<string>;
  view: 'timeline' | 'grid' | 'search';
}

// Graph types for instance relationship visualization
export interface GraphNode {
  id: number; // Instance number
  label: string;
  type: ContextType;
  role?: string;
  contextCount: number;
  contextId?: string; // Link to a representative context
}

export interface GraphEdge {
  source: number;
  target: number;
  type: 'references' | 'builds_on' | 'validates';
}

export interface InstanceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    project: string;
    totalInstances: number;
    totalConnections: number;
  };
}
