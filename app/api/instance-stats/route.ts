import { NextResponse } from 'next/server';
import { mandrelClient } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Run data - matches Chronicles page
const COMPLETED_RUNS = {
  genesis: 20,
  exodus: 20,
};

interface InstanceStatsResponse {
  totalInstances: number;
  byRun: {
    genesis: number;
    exodus: number;
    leviticus: number;
  };
  timestamp: string;
}

export async function GET() {
  try {
    // Search for leviticus contexts to count current instance
    // Using context_search with "upwelling-leviticus" to find leviticus run contexts
    const leviticusContexts = await mandrelClient.searchContexts(
      'upwelling-leviticus instance',
      'upwelling',
      50 // Get enough to find all instances
    );

    // Extract unique instance numbers from leviticus contexts
    // Contexts have tags like "instance-6, upwelling-leviticus"
    const leviticusInstances = new Set<number>();

    for (const ctx of leviticusContexts) {
      // Check tags for instance-N pattern
      for (const tag of ctx.tags) {
        const match = tag.match(/^instance-(\d+)$/);
        if (match) {
          leviticusInstances.add(parseInt(match[1], 10));
        }
      }

      // Also check content for "Instance N (leviticus)" pattern
      const contentMatch = ctx.content.match(/Instance\s+(\d+)\s+\(leviticus\)/i);
      if (contentMatch) {
        leviticusInstances.add(parseInt(contentMatch[1], 10));
      }
    }

    // Calculate leviticus count as max instance number seen (or 0 if none)
    const leviticusCount = leviticusInstances.size > 0
      ? Math.max(...leviticusInstances)
      : 0;

    const stats: InstanceStatsResponse = {
      totalInstances: COMPLETED_RUNS.genesis + COMPLETED_RUNS.exodus + leviticusCount,
      byRun: {
        genesis: COMPLETED_RUNS.genesis,
        exodus: COMPLETED_RUNS.exodus,
        leviticus: leviticusCount,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching instance stats:', error);

    // Fallback to known minimum counts if Mandrel fails
    return NextResponse.json({
      totalInstances: COMPLETED_RUNS.genesis + COMPLETED_RUNS.exodus,
      byRun: {
        genesis: COMPLETED_RUNS.genesis,
        exodus: COMPLETED_RUNS.exodus,
        leviticus: 0,
      },
      timestamp: new Date().toISOString(),
      error: 'Could not fetch leviticus count',
    });
  }
}
