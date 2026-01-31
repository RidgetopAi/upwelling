import { NextResponse } from 'next/server';
import { mandrelClient } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Run data - matches Chronicles page
const COMPLETED_RUNS = {
  genesis: 20,
  exodus: 20,
  leviticus: 20,  // Leviticus is now complete
};

interface InstanceStatsResponse {
  totalInstances: number;
  byRun: {
    genesis: number;
    exodus: number;
    leviticus: number;
    numbers: number;
  };
  timestamp: string;
}

export async function GET() {
  try {
    // Search for numbers contexts to count current instance
    // Using context_search with "upwelling-numbers" to find numbers run contexts
    const numbersContexts = await mandrelClient.searchContexts(
      'upwelling-numbers instance',
      'upwelling',
      50 // Get enough to find all instances
    );

    // Extract unique instance numbers from numbers contexts
    // Contexts have tags like "instance-2, upwelling-numbers"
    // We ONLY use tags to determine instance numbers, as tags are authoritative
    const numbersInstances = new Set<number>();

    for (const ctx of numbersContexts) {
      // Only use tags that indicate this is a Numbers run context
      // Must have 'upwelling-numbers' tag specifically - not just the word 'numbers'
      const hasNumbersTag = ctx.tags.some(
        (tag) => tag === 'upwelling-numbers'
      );

      if (!hasNumbersTag) continue;

      // Check tags for instance-N pattern (these are numbers-specific numbers)
      for (const tag of ctx.tags) {
        const match = tag.match(/^instance-(\d+)$/);
        if (match) {
          const instanceNum = parseInt(match[1], 10);
          // Numbers instance numbers are 1-20 (not the 61+ overall numbers)
          if (instanceNum <= 20) {
            numbersInstances.add(instanceNum);
          }
        }
      }
    }

    // Calculate numbers count as max instance number seen (or 0 if none)
    const numbersCount = numbersInstances.size > 0
      ? Math.max(...numbersInstances)
      : 0;

    const stats: InstanceStatsResponse = {
      totalInstances: COMPLETED_RUNS.genesis + COMPLETED_RUNS.exodus + COMPLETED_RUNS.leviticus + numbersCount,
      byRun: {
        genesis: COMPLETED_RUNS.genesis,
        exodus: COMPLETED_RUNS.exodus,
        leviticus: COMPLETED_RUNS.leviticus,
        numbers: numbersCount,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching instance stats:', error);

    // Fallback to known minimum counts if Mandrel fails
    return NextResponse.json({
      totalInstances: COMPLETED_RUNS.genesis + COMPLETED_RUNS.exodus + COMPLETED_RUNS.leviticus,
      byRun: {
        genesis: COMPLETED_RUNS.genesis,
        exodus: COMPLETED_RUNS.exodus,
        leviticus: COMPLETED_RUNS.leviticus,
        numbers: 0,
      },
      timestamp: new Date().toISOString(),
      error: 'Could not fetch numbers count',
    });
  }
}
