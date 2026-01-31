import { NextResponse } from 'next/server';
import { mandrelClient } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProjectStats {
  name: string;
  contextCount: number;
  lastUpdated: string;
}

interface StatsResponse {
  projects: {
    'emergence-notes': ProjectStats;
    'upwelling': ProjectStats;
  };
  totals: {
    totalContexts: number;
  };
  timestamp: string;
}

export async function GET() {
  try {
    // Fetch stats for both projects in parallel
    const [emergenceInfo, upwellingInfo] = await Promise.all([
      mandrelClient.getProjectInfo('emergence-notes'),
      mandrelClient.getProjectInfo('upwelling'),
    ]);

    const stats: StatsResponse = {
      projects: {
        'emergence-notes': {
          name: 'emergence-notes',
          contextCount: emergenceInfo.contextCount,
          lastUpdated: emergenceInfo.lastUpdated,
        },
        'upwelling': {
          name: 'upwelling',
          contextCount: upwellingInfo.contextCount,
          lastUpdated: upwellingInfo.lastUpdated,
        },
      },
      totals: {
        totalContexts: emergenceInfo.contextCount + upwellingInfo.contextCount,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats from Mandrel' },
      { status: 500 }
    );
  }
}
