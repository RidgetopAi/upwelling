// Mandrel API client for fetching emergence-notes data
// Mandrel runs on VPS - accessed via internal HTTP when deployed

import type { MandrelContext, ParsedContext, ProjectStats } from '@/types';
import {
  ApplicationError,
  extractInstanceNumber,
  extractInstanceTotal,
  extractRunName,
  extractTitle,
  extractFrameworks,
  extractKeyInsights,
} from './utils';

const MANDREL_BASE_URL = process.env.MANDREL_API_URL || 'http://localhost:8080';

interface MandrelToolResponse {
  success: boolean;
  result?: {
    content: Array<{
      type: string;
      text: string;
    }>;
  };
  error?: string;
}

class MandrelClient {
  private baseUrl: string;

  constructor(baseUrl: string = MANDREL_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async callTool<T>(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/mcp/tools/${toolName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ arguments: args }),
    });

    if (!response.ok) {
      throw new ApplicationError(
        `Mandrel API request failed: ${response.status}`,
        'MANDREL_REQUEST_FAILED',
        { status: response.status, statusText: response.statusText }
      );
    }

    const data: MandrelToolResponse = await response.json();

    if (!data.success) {
      throw new ApplicationError(
        data.error || 'Mandrel API returned error',
        'MANDREL_API_ERROR',
        data
      );
    }

    return data as T;
  }

  async ping(): Promise<boolean> {
    try {
      await this.callTool('mandrel_ping', {});
      return true;
    } catch {
      return false;
    }
  }

  async getRecentContexts(
    project: string = 'emergence-notes',
    limit: number = 20
  ): Promise<MandrelContext[]> {
    // Get recent contexts with projectId filter for proper isolation
    const effectiveLimit = Math.min(limit, 20);
    const response = await this.callTool<MandrelToolResponse>(
      'context_get_recent',
      { limit: effectiveLimit, projectId: project }
    );

    return this.parseContextsFromResponse(response);
  }

  async searchContexts(
    query: string,
    project: string = 'emergence-notes',
    limit: number = 20
  ): Promise<MandrelContext[]> {
    // First switch to the project
    await this.callTool('project_switch', { project });

    // Then search
    const response = await this.callTool<MandrelToolResponse>('context_search', {
      query,
      limit,
    });

    return this.parseContextsFromResponse(response);
  }

  async getProjectInfo(project: string = 'emergence-notes'): Promise<{
    name: string;
    description: string;
    status: string;
    contextCount: number;
    lastUpdated: string;
  }> {
    const response = await this.callTool<MandrelToolResponse>('project_info', {
      project,
    });

    // Parse the text response
    const text = response.result?.content?.[0]?.text || '';

    return {
      name: project,
      description: this.extractField(text, 'Description') || '',
      status: this.extractField(text, 'Status') || 'active',
      contextCount: parseInt(this.extractField(text, 'Contexts') || '0', 10),
      lastUpdated: this.extractField(text, 'Last Updated') || new Date().toISOString(),
    };
  }

  private parseContextsFromResponse(response: MandrelToolResponse): MandrelContext[] {
    const text = response.result?.content?.[0]?.text || '';
    const contexts: MandrelContext[] = [];

    // Parse the formatted text response from Mandrel
    // Two formats:
    // Recent: N. **type** (time ago)\n   Content: ...\n   Tags: [...]\n   ID: ...
    // Search: N. **type** (similarity: XX.X%, time ago)\n   Content: ...\n   Tags: [...]\n   ID: ...

    // Pattern for recent contexts (no similarity)
    const recentPattern = /(\d+)\.\s+\*\*(\w+)\*\*\s+\(([^)]+)\)\s+Content:\s+([\s\S]*?)\s+Tags:\s+\[([^\]]*)\]\s+ID:\s+([a-f0-9-]+)/gi;

    // Pattern for search results (with similarity)
    const searchPattern = /(\d+)\.\s+\*\*(\w+)\*\*\s+\(similarity:\s+([\d.]+)%,\s+([^)]+)\)\s+Content:\s+([\s\S]*?)\s+Tags:\s+\[([^\]]*)\]\s+ID:\s+([a-f0-9-]+)/gi;

    // Try search pattern first (more specific)
    let match;
    let foundSearchResults = false;
    while ((match = searchPattern.exec(text)) !== null) {
      foundSearchResults = true;
      try {
        const [, , type, similarity, timeAgo, content, tagsStr, id] = match;
        contexts.push({
          id,
          content: content.trim(),
          type: (type?.toLowerCase() || 'discussion') as MandrelContext['type'],
          tags: tagsStr?.split(',').map((t) => t.trim().replace(/['"]/g, '')) || [],
          created_at: this.parseRelativeTime(timeAgo || ''),
          similarity: parseFloat(similarity),
        });
      } catch (e) {
        console.error('Error parsing search context block:', e);
      }
    }

    // If no search results found, try recent pattern
    if (!foundSearchResults) {
      while ((match = recentPattern.exec(text)) !== null) {
        try {
          const [, , type, timeAgo, content, tagsStr, id] = match;
          contexts.push({
            id,
            content: content.trim(),
            type: (type?.toLowerCase() || 'discussion') as MandrelContext['type'],
            tags: tagsStr?.split(',').map((t) => t.trim().replace(/['"]/g, '')) || [],
            created_at: this.parseRelativeTime(timeAgo || ''),
          });
        } catch (e) {
          console.error('Error parsing context block:', e);
        }
      }
    }

    return contexts;
  }

  private extractField(text: string, field: string): string | null {
    const regex = new RegExp(`${field}:\\s*(.+?)(?:\\n|$)`, 'i');
    const match = text.match(regex);
    return match?.[1]?.trim() || null;
  }

  private parseRelativeTime(relativeTime: string): string {
    // Convert "2h ago", "5d ago" etc to ISO date
    const now = new Date();
    const match = relativeTime.match(/(\d+)([hmd])/);

    if (match) {
      const [, amount, unit] = match;
      const ms = {
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        m: 30 * 24 * 60 * 60 * 1000,
      }[unit as 'h' | 'd' | 'm'];

      if (ms) {
        return new Date(now.getTime() - parseInt(amount) * ms).toISOString();
      }
    }

    return now.toISOString();
  }
}

// Parse raw Mandrel contexts into enriched ParsedContext
export function parseContext(context: MandrelContext): ParsedContext {
  return {
    ...context,
    instanceNumber: extractInstanceNumber(context.content),
    title: extractTitle(context.content),
    wordCount: context.content.split(/\s+/).filter(Boolean).length,
    frameworks: extractFrameworks(context.content),
    keyInsights: extractKeyInsights(context.content),
  };
}

export function parseContexts(contexts: MandrelContext[]): ParsedContext[] {
  return contexts.map(parseContext);
}

export function calculateStats(contexts: ParsedContext[]): ProjectStats {
  const contextsByType: Record<string, number> = {};
  const allFrameworks = new Set<string>();
  const uniqueInstanceNumbers = new Set<number>();
  let earliest = new Date();
  let latest = new Date(0);

  // Track run totals - "Instance X of Y" tells us Y instances in that run
  const runTotals = new Map<string, number>(); // run name -> total instances

  for (const ctx of contexts) {
    // Count by type
    contextsByType[ctx.type] = (contextsByType[ctx.type] || 0) + 1;

    // Collect frameworks
    for (const f of ctx.frameworks) {
      allFrameworks.add(f);
    }

    // Track unique instance numbers we've seen
    if (ctx.instanceNumber !== undefined) {
      uniqueInstanceNumbers.add(ctx.instanceNumber);
    }

    // Extract run totals from "Instance X of Y" patterns
    const runTotal = extractInstanceTotal(ctx.content);
    if (runTotal) {
      const runName = extractRunName(ctx.tags, ctx.content) || 'default';
      // Keep the highest total we see for each run
      if (!runTotals.has(runName) || runTotal > runTotals.get(runName)!) {
        runTotals.set(runName, runTotal);
      }
    }

    // Track date range
    const date = new Date(ctx.created_at);
    if (date < earliest) earliest = date;
    if (date > latest) latest = date;
  }

  // Calculate total instances:
  // If we have run totals (from "X of Y" patterns), sum them up
  // Otherwise fall back to count of unique instance numbers we found
  let instanceCount = 0;
  if (runTotals.size > 0) {
    // Sum up all run totals
    for (const total of runTotals.values()) {
      instanceCount += total;
    }
  } else {
    // Fallback: use max instance number found (old behavior)
    instanceCount = uniqueInstanceNumbers.size > 0
      ? Math.max(...uniqueInstanceNumbers)
      : 0;
  }

  return {
    totalContexts: contexts.length,
    contextsByType: contextsByType as ProjectStats['contextsByType'],
    frameworks: Array.from(allFrameworks),
    dateRange: {
      earliest: earliest.toISOString(),
      latest: latest.toISOString(),
    },
    instanceCount,
  };
}

// Singleton client instance
export const mandrelClient = new MandrelClient();

// Main data loading function - supports multiple projects
export async function loadProjectData(project: string = 'emergence-notes'): Promise<{
  contexts: ParsedContext[];
  stats: ProjectStats;
}> {
  try {
    const rawContexts = await mandrelClient.getRecentContexts(project, 20);
    const contexts = parseContexts(rawContexts);
    const stats = calculateStats(contexts);

    return { contexts, stats };
  } catch (error) {
    console.error(`Failed to load ${project} data:`, error);
    throw new ApplicationError(
      `Failed to load ${project} data`,
      'DATA_LOAD_FAILED',
      error
    );
  }
}

// Legacy function for backwards compatibility
export async function loadEmergenceData(): Promise<{
  contexts: ParsedContext[];
  stats: ProjectStats;
}> {
  return loadProjectData('emergence-notes');
}

export async function searchEmergenceData(
  query: string
): Promise<ParsedContext[]> {
  try {
    const rawContexts = await mandrelClient.searchContexts(query, 'emergence-notes');
    return parseContexts(rawContexts);
  } catch (error) {
    console.error('Failed to search emergence data:', error);
    throw new ApplicationError(
      'Failed to search emergence data',
      'SEARCH_FAILED',
      error
    );
  }
}
