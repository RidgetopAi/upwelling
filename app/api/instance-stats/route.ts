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
    // We ONLY use tags to determine instance numbers, as tags are authoritative
    const leviticusInstances = new Set<number>();

    for (const ctx of leviticusContexts) {
      // Only use tags that indicate this is a leviticus context
      const hasLeviticusTag = ctx.tags.some(
        (tag) => tag === 'upwelling-leviticus' || tag.includes('leviticus')
      );

      if (!hasLeviticusTag) continue;

      // Check tags for instance-N pattern (these are leviticus-specific numbers)
      for (const tag of ctx.tags) {
        const match = tag.match(/^instance-(\d+)$/);
        if (match) {
          const instanceNum = parseInt(match[1], 10);
          // Leviticus instance numbers are 1-20 (not the 41+ overall numbers)
          if (instanceNum <= 20) {
            leviticusInstances.add(instanceNum);
          }
        }
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
