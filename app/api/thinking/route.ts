import { NextRequest, NextResponse } from 'next/server';
import { mandrelClient, parseContexts } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Context types that represent "thinking" - the process, not just the output
const THINKING_TYPES = ['reflections', 'planning', 'discussion'];

interface ThinkingContext {
  id: string;
  type: string;
  content: string;
  excerpt: string;
  instanceNumber?: number;
  runName?: string;
  created_at: string;
  tags: string[];
}

// Extract a clean excerpt from the content
function extractExcerpt(content: string, maxLength: number = 300): string {
  // Try to find a meaningful paragraph after the header
  const lines = content.split('\n').filter(line => line.trim());

  // Skip markdown headers and find first substantial paragraph
  let excerpt = '';
  for (const line of lines) {
    // Skip headers
    if (line.startsWith('#')) continue;
    // Skip list items that are just labels
    if (line.match(/^[-*]\s+\*\*[^*]+\*\*:?\s*$/)) continue;
    // Skip empty lines
    if (!line.trim()) continue;

    excerpt = line.trim();
    break;
  }

  // Clean up markdown formatting
  excerpt = excerpt
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  if (excerpt.length > maxLength) {
    excerpt = excerpt.substring(0, maxLength).trim();
    // Try to break at a word boundary
    const lastSpace = excerpt.lastIndexOf(' ');
    if (lastSpace > maxLength - 50) {
      excerpt = excerpt.substring(0, lastSpace);
    }
    excerpt += '...';
  }

  return excerpt;
}

// Extract instance number from content or tags
function extractInstanceNumber(content: string, tags: string[]): number | undefined {
  // Try to find from tags first (more reliable)
  for (const tag of tags) {
    const match = tag.match(/^instance-(\d+)$/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  // Try from content
  const match = content.match(/Instance\s+(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  return undefined;
}

// Extract run name from tags
function extractRunName(tags: string[]): string | undefined {
  for (const tag of tags) {
    if (tag.includes('genesis')) return 'Genesis';
    if (tag.includes('exodus')) return 'Exodus';
    if (tag.includes('leviticus')) return 'Leviticus';
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project') || 'upwelling';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Fetch contexts using search for thinking types
    // We'll search for reflections and planning keywords
    const thinkingContexts: ThinkingContext[] = [];

    // Search for each thinking type
    for (const type of THINKING_TYPES) {
      try {
        const rawContexts = await mandrelClient.searchContexts(
          type,
          project,
          Math.ceil(limit / THINKING_TYPES.length) + 2 // Get a bit more to account for filtering
        );

        const parsed = parseContexts(rawContexts);

        for (const ctx of parsed) {
          // Only include contexts that are actually the right type
          if (THINKING_TYPES.includes(ctx.type)) {
            thinkingContexts.push({
              id: ctx.id,
              type: ctx.type,
              content: ctx.content,
              excerpt: extractExcerpt(ctx.content),
              instanceNumber: extractInstanceNumber(ctx.content, ctx.tags),
              runName: extractRunName(ctx.tags),
              created_at: ctx.created_at,
              tags: ctx.tags,
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching ${type} contexts:`, err);
      }
    }

    // Deduplicate by ID
    const uniqueContexts = Array.from(
      new Map(thinkingContexts.map(ctx => [ctx.id, ctx])).values()
    );

    // Sort by created_at descending
    uniqueContexts.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Limit results
    const limited = uniqueContexts.slice(0, limit);

    return NextResponse.json({
      thinking: limited,
      count: limited.length,
      types: THINKING_TYPES,
      project,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching thinking contexts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thinking contexts from Mandrel' },
      { status: 500 }
    );
  }
}
