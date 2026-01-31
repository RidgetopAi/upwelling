import { NextResponse } from 'next/server';
import { mandrelClient } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  mandrel: {
    connected: boolean;
    responseTime?: number;
  };
  data: {
    lastContextTime?: string;
    contextCount?: number;
    dataFreshness: 'fresh' | 'stale' | 'unknown';
  };
  timestamp: string;
}

export async function GET() {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    mandrel: {
      connected: false,
    },
    data: {
      dataFreshness: 'unknown',
    },
    timestamp: new Date().toISOString(),
  };

  try {
    // Test Mandrel connection
    const pingStart = Date.now();
    const connected = await mandrelClient.ping();
    health.mandrel.connected = connected;
    health.mandrel.responseTime = Date.now() - pingStart;

    if (!connected) {
      health.status = 'down';
      return NextResponse.json(health, { status: 503 });
    }

    // Check data freshness by getting recent contexts from upwelling project
    try {
      const recentContexts = await mandrelClient.getRecentContexts('upwelling', 1);
      if (recentContexts.length > 0) {
        health.data.lastContextTime = recentContexts[0].created_at;

        // Check how fresh the data is
        const lastTime = new Date(recentContexts[0].created_at);
        const now = new Date();
        const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

        if (hoursSince < 1) {
          health.data.dataFreshness = 'fresh';
        } else if (hoursSince < 24) {
          health.data.dataFreshness = 'stale';
          health.status = 'degraded';
        } else {
          health.data.dataFreshness = 'stale';
        }
      }

      // Get context count from project info
      const projectInfo = await mandrelClient.getProjectInfo('upwelling');
      health.data.contextCount = projectInfo.contextCount;
    } catch (e) {
      // Data check failed but Mandrel is connected
      console.error('Data freshness check failed:', e);
      health.status = 'degraded';
    }

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    health.status = 'down';
    return NextResponse.json(health, { status: 503 });
  }
}
