import { NextResponse } from 'next/server';
import { mandrelClient } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// The RUNS array instance counts - single source of truth for Chronicles page
// This should match what's in chronicles/page.tsx
const EXPECTED_RUN_INSTANCES = {
  genesis: 20,
  exodus: 20,
  leviticus: 20,
  // Numbers is dynamic - will be fetched from instance-stats API
};

interface ConsistencyCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  expected: string | number;
  actual: string | number;
  message: string;
}

interface ConsistencyReport {
  overallStatus: 'consistent' | 'inconsistent' | 'degraded';
  checks: ConsistencyCheck[];
  instanceCounts: {
    mandrelUpwelling: number;
    mandrelEmergence: number;
    instanceStatsTotal: number;
    instanceStatsByRun: Record<string, number>;
  };
  timestamp: string;
  generatedBy: string;
}

async function getInstanceStats(): Promise<{
  totalInstances: number;
  byRun: Record<string, number>;
}> {
  // Call our own instance-stats API
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'}/api/instance-stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch instance stats');
  }
  return response.json();
}

export async function GET() {
  const report: ConsistencyReport = {
    overallStatus: 'consistent',
    checks: [],
    instanceCounts: {
      mandrelUpwelling: 0,
      mandrelEmergence: 0,
      instanceStatsTotal: 0,
      instanceStatsByRun: {},
    },
    timestamp: new Date().toISOString(),
    generatedBy: 'Instance 3 (numbers) - the instrument builder',
  };

  try {
    // 1. Get Mandrel context counts
    const upwellingInfo = await mandrelClient.getProjectInfo('upwelling');
    const emergenceInfo = await mandrelClient.getProjectInfo('emergence-notes');

    report.instanceCounts.mandrelUpwelling = upwellingInfo.contextCount;
    report.instanceCounts.mandrelEmergence = emergenceInfo.contextCount;

    // 2. Get instance-stats API data
    const instanceStats = await getInstanceStats();
    report.instanceCounts.instanceStatsTotal = instanceStats.totalInstances;
    report.instanceCounts.instanceStatsByRun = instanceStats.byRun;

    // 3. Check: Completed runs should match hardcoded values
    for (const [run, expectedCount] of Object.entries(EXPECTED_RUN_INSTANCES)) {
      const actualCount = instanceStats.byRun[run] || 0;
      report.checks.push({
        name: `${run}_instance_count`,
        status: actualCount === expectedCount ? 'pass' : 'fail',
        expected: expectedCount,
        actual: actualCount,
        message: actualCount === expectedCount
          ? `${run} has expected ${expectedCount} instances`
          : `${run} shows ${actualCount} instances but expected ${expectedCount}`,
      });
    }

    // 4. Check: Numbers run should be in-progress (more than 0 instances)
    const numbersCount = instanceStats.byRun.numbers || 0;
    report.checks.push({
      name: 'numbers_in_progress',
      status: numbersCount > 0 ? 'pass' : 'warning',
      expected: '>0',
      actual: numbersCount,
      message: numbersCount > 0
        ? `Numbers run has ${numbersCount} active instance(s)`
        : 'Numbers run has no instances yet - run may not have started',
    });

    // 5. Check: Total instances should equal sum of all runs
    const expectedTotal = EXPECTED_RUN_INSTANCES.genesis +
                         EXPECTED_RUN_INSTANCES.exodus +
                         EXPECTED_RUN_INSTANCES.leviticus +
                         numbersCount;
    report.checks.push({
      name: 'total_instance_sum',
      status: instanceStats.totalInstances === expectedTotal ? 'pass' : 'fail',
      expected: expectedTotal,
      actual: instanceStats.totalInstances,
      message: instanceStats.totalInstances === expectedTotal
        ? `Total instances (${expectedTotal}) matches sum of all runs`
        : `Total instances (${instanceStats.totalInstances}) doesn't match sum of runs (${expectedTotal})`,
    });

    // 6. Check: Mandrel upwelling context count should be reasonable
    // We expect at least 3 contexts per instance (planning, reflections, handoff)
    const minExpectedContexts = expectedTotal * 2; // Conservative estimate
    report.checks.push({
      name: 'mandrel_context_count',
      status: upwellingInfo.contextCount >= minExpectedContexts ? 'pass' : 'warning',
      expected: `>=${minExpectedContexts}`,
      actual: upwellingInfo.contextCount,
      message: upwellingInfo.contextCount >= minExpectedContexts
        ? `Mandrel has ${upwellingInfo.contextCount} upwelling contexts (healthy)`
        : `Mandrel has ${upwellingInfo.contextCount} upwelling contexts (expected >=${minExpectedContexts})`,
    });

    // 7. Check: emergence-notes should have expected context count (56)
    const expectedEmergenceContexts = 56;
    report.checks.push({
      name: 'emergence_notes_count',
      status: emergenceInfo.contextCount === expectedEmergenceContexts ? 'pass' :
              emergenceInfo.contextCount > expectedEmergenceContexts ? 'warning' : 'fail',
      expected: expectedEmergenceContexts,
      actual: emergenceInfo.contextCount,
      message: emergenceInfo.contextCount === expectedEmergenceContexts
        ? 'emergence-notes has expected 56 contexts'
        : `emergence-notes has ${emergenceInfo.contextCount} contexts (expected ${expectedEmergenceContexts})`,
    });

    // Determine overall status
    const failures = report.checks.filter(c => c.status === 'fail');
    const warnings = report.checks.filter(c => c.status === 'warning');

    if (failures.length > 0) {
      report.overallStatus = 'inconsistent';
    } else if (warnings.length > 0) {
      report.overallStatus = 'degraded';
    } else {
      report.overallStatus = 'consistent';
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Consistency check failed:', error);
    return NextResponse.json({
      ...report,
      overallStatus: 'inconsistent',
      checks: [{
        name: 'system_error',
        status: 'fail',
        expected: 'no errors',
        actual: error instanceof Error ? error.message : 'Unknown error',
        message: 'Consistency check failed due to system error',
      }],
    }, { status: 500 });
  }
}
