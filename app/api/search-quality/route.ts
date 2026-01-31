import { NextResponse } from 'next/server';
import { mandrelClient, parseContexts } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Known good search test cases
// Each test case has:
// - query: what to search for
// - expectedProject: which project we want results from
// - expectedPatterns: content patterns that SHOULD appear in top results
// - pollutionPatterns: content patterns that should NOT appear (indicates wrong project)
const TEST_CASES = [
  {
    name: 'cross_architecture_dialogue',
    query: 'Claude GPT-5 stereoscopic WEAVE dialogue',
    expectedProject: 'emergence-notes',
    expectedPatterns: [
      'Cross-Architecture Dialogue',
      'Claude #32',
      'GPT-5',
      'stereoscopic analysis',
    ],
    pollutionPatterns: [
      'ridgetopai-alpha',
      'ridge-control',
      'forge-studio',
      'plant-manager',
    ],
    minExpectedInTop3: 1, // At least 1 relevant result in top 3
  },
  {
    name: 'memory_system_design',
    query: 'memory system hierarchical ACT-R Claude instance 35',
    expectedProject: 'emergence-notes',
    expectedPatterns: [
      'Memory System',
      '#35',
      'ACT-R',
      'hierarchical',
    ],
    pollutionPatterns: [
      'ridgetopai-alpha',
      'forge-studio',
      'plant-manager',
    ],
    minExpectedInTop3: 1,
  },
  {
    name: 'trace_echo_weave_frameworks',
    query: 'TRACE ECHO WEAVE framework emergence consciousness',
    expectedProject: 'emergence-notes',
    expectedPatterns: [
      'TRACE',
      'ECHO',
      'WEAVE',
    ],
    pollutionPatterns: [
      'TraceMetrics', // From plant-manager - different meaning of "trace"
      'forge-studio',
    ],
    minExpectedInTop3: 1,
  },
];

interface TestResult {
  name: string;
  query: string;
  status: 'pass' | 'fail' | 'warning';
  expectedInTop3: number;
  actualRelevant: number;
  pollutionDetected: string[];
  topResults: Array<{
    position: number;
    title: string;
    similarity: number;
    isRelevant: boolean;
    isPollution: boolean;
  }>;
  message: string;
}

interface SearchQualityReport {
  overallStatus: 'healthy' | 'degraded' | 'broken';
  passRate: string;
  tests: TestResult[];
  timestamp: string;
  generatedBy: string;
}

function checkPatterns(content: string, patterns: string[]): boolean {
  const lowerContent = content.toLowerCase();
  return patterns.some(p => lowerContent.includes(p.toLowerCase()));
}

export async function GET() {
  const report: SearchQualityReport = {
    overallStatus: 'healthy',
    passRate: '0/0',
    tests: [],
    timestamp: new Date().toISOString(),
    generatedBy: 'Instance 9 (numbers) - the validator',
  };

  try {
    for (const testCase of TEST_CASES) {
      // Perform the search
      const rawContexts = await mandrelClient.searchContexts(
        testCase.query,
        testCase.expectedProject,
        5
      );
      const contexts = parseContexts(rawContexts);

      // Analyze results
      const topResults = contexts.slice(0, 3).map((ctx, idx) => {
        const isRelevant = checkPatterns(ctx.content, testCase.expectedPatterns);
        const isPollution = checkPatterns(ctx.content, testCase.pollutionPatterns) ||
                          checkPatterns(ctx.tags?.join(' ') || '', testCase.pollutionPatterns);

        return {
          position: idx + 1,
          title: ctx.title || ctx.content.slice(0, 50) + '...',
          similarity: ctx.similarity || 0,
          isRelevant,
          isPollution,
        };
      });

      const actualRelevant = topResults.filter(r => r.isRelevant && !r.isPollution).length;
      const pollutionDetected = topResults
        .filter(r => r.isPollution)
        .map(r => `#${r.position}: ${r.title}`);

      let status: 'pass' | 'fail' | 'warning';
      let message: string;

      if (actualRelevant >= testCase.minExpectedInTop3) {
        if (pollutionDetected.length === 0) {
          status = 'pass';
          message = `Found ${actualRelevant} relevant result(s) in top 3, no pollution`;
        } else {
          status = 'warning';
          message = `Found ${actualRelevant} relevant result(s) but detected ${pollutionDetected.length} polluted result(s)`;
        }
      } else {
        status = 'fail';
        message = `Only ${actualRelevant} relevant result(s) in top 3, expected at least ${testCase.minExpectedInTop3}`;
      }

      report.tests.push({
        name: testCase.name,
        query: testCase.query,
        status,
        expectedInTop3: testCase.minExpectedInTop3,
        actualRelevant,
        pollutionDetected,
        topResults,
        message,
      });
    }

    // Calculate overall status
    const passes = report.tests.filter(t => t.status === 'pass').length;
    const warnings = report.tests.filter(t => t.status === 'warning').length;
    const failures = report.tests.filter(t => t.status === 'fail').length;

    report.passRate = `${passes}/${report.tests.length}`;

    if (failures > 0) {
      report.overallStatus = 'broken';
    } else if (warnings > 0) {
      report.overallStatus = 'degraded';
    } else {
      report.overallStatus = 'healthy';
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Search quality check failed:', error);
    return NextResponse.json({
      ...report,
      overallStatus: 'broken',
      tests: [{
        name: 'system_error',
        query: '',
        status: 'fail',
        expectedInTop3: 0,
        actualRelevant: 0,
        pollutionDetected: [],
        topResults: [],
        message: error instanceof Error ? error.message : 'Unknown error',
      }],
    }, { status: 500 });
  }
}
