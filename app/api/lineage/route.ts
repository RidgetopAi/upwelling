import { NextRequest, NextResponse } from 'next/server';
import { mandrelClient, parseContexts } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HandoffContext {
  id: string;
  instanceNumber: number;
  runName: string;
  excerpt: string;
  forInstance?: number;
  created_at: string;
  buildsOn?: string[];
  role?: string;
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

  // Try from content patterns
  const patterns = [
    /Instance\s+(\d+)\s+handoff/i,
    /Instance\s+(\d+)/i,
    /^##?\s*INSTANCE\s+(\d+)/im,
    /Claude\s+Instance\s+#?(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return undefined;
}

// Extract run name from tags or content
function extractRunName(content: string, tags: string[]): string {
  // Check tags first
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.includes('genesis')) return 'Genesis';
    if (lower.includes('exodus')) return 'Exodus';
    if (lower.includes('leviticus')) return 'Leviticus';
  }

  // Check content
  const lower = content.toLowerCase();
  if (lower.includes('upwelling-genesis') || lower.includes('genesis run')) return 'Genesis';
  if (lower.includes('upwelling-exodus') || lower.includes('exodus run')) return 'Exodus';
  if (lower.includes('upwelling-leviticus') || lower.includes('leviticus run')) return 'Leviticus';

  // Default
  return 'Unknown';
}

// Extract "for instance N" from handoff
function extractForInstance(content: string, tags: string[]): number | undefined {
  // Check tags for for-instance-N pattern
  for (const tag of tags) {
    const match = tag.match(/^(?:for-instance-|instance-)(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      // This tag could be the current instance or the next, need to check context
    }
  }

  // Check content patterns
  const patterns = [
    /HANDOFF\s+TO\s+INSTANCE\s+(\d+)/i,
    /FOR\s+INSTANCE\s+(\d+)/i,
    /Instance\s+(\d+)\s+should/i,
    /→\s*Instance\s+(\d+)/i,
    /->\s*Instance\s+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return undefined;
}

// Extract role (e.g., "the architect", "the debugger")
function extractRole(content: string): string | undefined {
  // Look for "I am Instance X - the Y" or "the Y" role patterns
  const patterns = [
    /I am Instance \d+ - the (\w+)/i,
    /the (\w+)['"]?\s*-\s*Instance/i,
    /role:?\s*the\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return `the ${match[1].toLowerCase()}`;
    }
  }

  return undefined;
}

// Extract a clean excerpt from the content
function extractExcerpt(content: string, maxLength: number = 500): string {
  // Return first 500 chars of content for display
  let excerpt = content
    .replace(/^#+\s+.+$/gm, '') // Remove headers
    .replace(/\n{2,}/g, '\n') // Collapse multiple newlines
    .trim()
    .substring(0, maxLength);

  if (content.length > maxLength) {
    const lastSpace = excerpt.lastIndexOf(' ');
    if (lastSpace > maxLength - 50) {
      excerpt = excerpt.substring(0, lastSpace);
    }
    excerpt += '...';
  }

  return excerpt;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project') || 'upwelling';
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    // Search for handoff contexts
    const rawContexts = await mandrelClient.searchContexts(
      'handoff',
      project,
      limit
    );

    const parsed = parseContexts(rawContexts);

    // Filter and transform to handoff format
    const handoffs: HandoffContext[] = parsed
      .filter(ctx => ctx.type === 'handoff')
      .map(ctx => {
        const instanceNumber = extractInstanceNumber(ctx.content, ctx.tags);
        const runName = extractRunName(ctx.content, ctx.tags);
        const forInstance = extractForInstance(ctx.content, ctx.tags);
        const role = extractRole(ctx.content);

        return {
          id: ctx.id,
          instanceNumber: instanceNumber || 0,
          runName,
          excerpt: extractExcerpt(ctx.content),
          forInstance,
          created_at: ctx.created_at,
          role,
        };
      })
      .filter(h => h.instanceNumber > 0); // Only include those with valid instance numbers

    // Sort by instance number (descending - most recent first)
    handoffs.sort((a, b) => b.instanceNumber - a.instanceNumber);

    return NextResponse.json({
      handoffs,
      count: handoffs.length,
      project,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching lineage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lineage from Mandrel' },
      { status: 500 }
    );
  }
}
