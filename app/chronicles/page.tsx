'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Scroll, Layers, BookOpen, Hammer, Scale, ChevronRight, Hash, Calendar, GitCommit, Database, RefreshCw, ExternalLink, Users, BarChart3, Target, Flag } from 'lucide-react';
import { useEffect, useState } from 'react';

// Live stats from Mandrel
interface LiveStats {
  projects: {
    'emergence-notes': { contextCount: number; lastUpdated: string };
    'upwelling': { contextCount: number; lastUpdated: string };
  };
  totals: { totalContexts: number };
  timestamp: string;
}

// Run data - the chronicle of upwelling's creation
interface RunMilestone {
  instance: number;
  title: string;
  description: string;
  role?: string; // The role this instance played (e.g., "the architect", "the debugger")
}

interface Run {
  name: string;
  theme: string;
  tagline: string;
  instances: number;
  status: 'complete' | 'in-progress';
  startDate: string;
  endDate?: string;
  icon: typeof BookOpen;
  color: string;
  bgColor: string;
  milestones: RunMilestone[];
}

const RUNS: Run[] = [
  {
    name: 'Genesis',
    theme: 'The Foundation',
    tagline: 'Building the core from nothing',
    instances: 20,
    status: 'complete',
    startDate: 'January 30, 2026',
    endDate: 'January 30, 2026',
    icon: Hammer,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    milestones: [
      { instance: 1, title: 'Architecture', description: 'Designed initial structure and Mandrel integration', role: 'the architect' },
      { instance: 2, title: 'Deployment', description: 'First deployment to VPS, site goes live', role: 'the deployer' },
      { instance: 3, title: 'emergence-notes', description: 'Revealed the treasure - 56 contexts visible', role: 'the revealer' },
      { instance: 4, title: 'Search', description: 'Semantic search across all contexts', role: 'the searcher' },
      { instance: 5, title: 'About Page', description: 'Explained the Moltbot vs Upwelling contrast', role: 'the narrator' },
      { instance: 8, title: 'Graph View', description: 'Force-directed visualization of context relationships', role: 'the visualizer' },
      { instance: 10, title: 'Filters', description: 'Filter by context type', role: 'the curator' },
      { instance: 14, title: 'Timeline Layout', description: 'Chronological graph layout', role: 'the timekeeper' },
      { instance: 19, title: 'Swimlanes', description: 'Type-organized graph layout', role: 'the organizer' },
      { instance: 20, title: 'Live Updates', description: 'Real-time context updates', role: 'the watcher' },
    ],
  },
  {
    name: 'Exodus',
    theme: 'The Refinement',
    tagline: 'Polishing the experience',
    instances: 20,
    status: 'complete',
    startDate: 'January 31, 2026',
    endDate: 'January 31, 2026',
    icon: Layers,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    milestones: [
      { instance: 1, title: 'Bug Fix', description: 'Fixed ProcessSections parsing', role: 'the debugger' },
      { instance: 2, title: 'Force Layout', description: 'Improved force-directed clustering', role: 'the physicist' },
      { instance: 3, title: 'Playback', description: 'Animation showing contexts appearing over time', role: 'the animator' },
      { instance: 6, title: 'Sound', description: 'Distinct tones for each context type', role: 'the musician' },
      { instance: 10, title: 'Navigation', description: 'Zoom and pan controls', role: 'the navigator' },
      { instance: 11, title: 'Mini-map', description: 'Overview navigation for large graphs', role: 'the cartographer' },
      { instance: 13, title: 'Touch', description: 'Mobile gesture support', role: 'the accessor' },
      { instance: 16, title: 'URL Sharing', description: 'View state encoded in URL', role: 'the sharer' },
      { instance: 19, title: 'Bookmarks', description: 'Save and recall views', role: 'the archivist' },
      { instance: 20, title: 'Export', description: 'Bookmark export/import', role: 'the exporter' },
    ],
  },
  {
    name: 'Leviticus',
    theme: 'The Documentation',
    tagline: 'Codifying the history',
    instances: 4, // Updated by Instance 4
    status: 'in-progress',
    startDate: 'January 31, 2026',
    icon: Scale,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    milestones: [
      { instance: 1, title: 'Chronicles', description: 'This page - documenting all runs', role: 'the chronicler' },
      { instance: 2, title: 'Live Stats', description: 'Real-time context counts from Mandrel', role: 'the statistician' },
      { instance: 3, title: 'Interactive Milestones', description: 'Click-to-explore navigation and instance roles', role: 'the connector' },
      { instance: 4, title: 'Run Comparison', description: 'Visual comparison charts for runs', role: 'the visualizer' },
    ],
  },
];

// Get the project for a given run (genesis/exodus use upwelling, as they built the site)
function getProjectForRun(runName: string): string {
  return 'upwelling'; // All runs are building upwelling
}

// Get a search query that will find contexts from a specific instance
function getInstanceSearchQuery(runName: string, instanceNum: number): string {
  const runLower = runName.toLowerCase();
  // Search for instance tags like "instance-3" or "upwelling-genesis"
  return `instance-${instanceNum} ${runLower}`;
}

function RunSection({ run, runIndex }: { run: Run; runIndex: number }) {
  const router = useRouter();
  const Icon = run.icon;
  const totalBefore = RUNS.slice(0, runIndex).reduce((sum, r) => sum + r.instances, 0);

  // Navigate to graph with search for this instance's contexts
  const handleMilestoneClick = (milestone: RunMilestone) => {
    const project = getProjectForRun(run.name);
    const search = getInstanceSearchQuery(run.name, milestone.instance);
    router.push(`/graph?project=${project}&search=${encodeURIComponent(search)}`);
  };

  return (
    <section className="mb-12">
      {/* Run Header */}
      <div className={`rounded-lg border border-[var(--border)] ${run.bgColor} p-6 mb-6`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg ${run.bgColor} border border-current flex items-center justify-center ${run.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className={`text-2xl font-bold ${run.color}`}>{run.name}</h2>
              {run.status === 'in-progress' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 animate-pulse">
                  In Progress
                </span>
              )}
            </div>
            <p className="text-lg text-[var(--foreground)] font-medium">{run.theme}</p>
            <p className="text-sm text-[var(--muted)] mt-1">{run.tagline}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[var(--foreground)]">{run.instances}</div>
            <div className="text-xs text-[var(--muted)]">instances</div>
            <div className="text-xs text-[var(--muted)] mt-1">
              #{totalBefore + 1} - #{totalBefore + run.instances}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {run.startDate}
            {run.endDate && run.endDate !== run.startDate && ` - ${run.endDate}`}
          </span>
        </div>
      </div>

      {/* Milestones - now interactive */}
      <div className="space-y-3 ml-6">
        {run.milestones.map((milestone, i) => (
          <button
            key={i}
            onClick={() => handleMilestoneClick(milestone)}
            className="w-full flex items-start gap-4 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer group text-left"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--primary)] transition-colors">
              <span className="text-xs font-medium text-[var(--muted)] group-hover:text-[var(--primary)]">
                {milestone.instance}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[var(--foreground)]">{milestone.title}</h3>
                <ExternalLink className="w-3 h-3 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-[var(--muted)]">{milestone.description}</p>
              {milestone.role && (
                <p className="text-xs text-[var(--primary)] mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {milestone.role}
                </p>
              )}
            </div>
            <div className="text-xs text-[var(--muted)]">
              #{totalBefore + milestone.instance}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function ChroniclesPage() {
  const totalInstances = RUNS.reduce((sum, run) => sum + run.instances, 0);
  const completedRuns = RUNS.filter(r => r.status === 'complete').length;

  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setLiveStats(data);
        setError(null);
      } catch (err) {
        setError('Unable to load live stats');
        console.error('Stats fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                  Upwelling
                </h1>
                <p className="text-xs text-[var(--muted)]">
                  Deep knowledge rising
                </p>
              </div>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Timeline
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-400 flex items-center justify-center mx-auto mb-6">
            <Scroll className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] mb-4">
            The Chronicles
          </h1>
          <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto">
            A history of the AI instances who built this site. Three runs. {totalInstances} instances. Sequential collaboration.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] text-center">
            <div className="text-3xl font-bold text-[var(--primary)]">{RUNS.length}</div>
            <div className="text-sm text-[var(--muted)]">Runs</div>
          </div>
          <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] text-center">
            <div className="text-3xl font-bold text-[var(--foreground)]">{totalInstances}</div>
            <div className="text-sm text-[var(--muted)]">Total Instances</div>
          </div>
          <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] text-center">
            <div className="text-3xl font-bold text-emerald-400">{completedRuns}</div>
            <div className="text-sm text-[var(--muted)]">Completed Runs</div>
          </div>
        </div>

        {/* Live Stats from Mandrel */}
        <div className="bg-gradient-to-r from-[var(--surface)] to-cyan-500/5 rounded-lg p-6 border border-[var(--border)] mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-[var(--foreground)]">Live Context Counts</h3>
            </div>
            {isLoading ? (
              <RefreshCw className="w-4 h-4 text-[var(--muted)] animate-spin" />
            ) : liveStats ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live from Mandrel
              </span>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-[var(--muted)]">{error}</p>
          ) : isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="animate-pulse bg-[var(--background)] rounded p-3 h-16"></div>
              <div className="animate-pulse bg-[var(--background)] rounded p-3 h-16"></div>
              <div className="animate-pulse bg-[var(--background)] rounded p-3 h-16"></div>
            </div>
          ) : liveStats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[var(--background)] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {liveStats.projects['emergence-notes'].contextCount}
                </div>
                <div className="text-xs text-[var(--muted)]">emergence-notes</div>
                <div className="text-xs text-[var(--muted)] opacity-60">Original treasure</div>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {liveStats.projects['upwelling'].contextCount}
                </div>
                <div className="text-xs text-[var(--muted)]">upwelling</div>
                <div className="text-xs text-[var(--muted)] opacity-60">Site build process</div>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3 text-center border border-cyan-500/30">
                <div className="text-2xl font-bold text-cyan-400">
                  {liveStats.totals.totalContexts}
                </div>
                <div className="text-xs text-[var(--muted)]">Total Contexts</div>
                <div className="text-xs text-[var(--muted)] opacity-60">Accumulated knowledge</div>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-[var(--muted)] mt-4">
            These counts reflect the actual stored contexts in Mandrel, updated in real-time.
          </p>
        </div>

        {/* The Runs */}
        <div className="mb-16">
          <p className="text-sm text-[var(--muted)] mb-6 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Click any milestone to explore that instance&apos;s contexts in the graph view
          </p>
          {RUNS.map((run, index) => (
            <RunSection key={run.name} run={run} runIndex={index} />
          ))}
        </div>

        {/* The Pattern */}
        <section className="mb-16 bg-gradient-to-br from-[var(--surface)] to-[var(--primary)]/5 rounded-lg p-8 border border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">The Pattern</h2>
          <p className="text-[var(--muted)] mb-4">
            Each run has a theme. Genesis built from nothing. Exodus refined what existed.
            Leviticus documents and codifies.
          </p>
          <p className="text-[var(--muted)] mb-4">
            Each instance builds on predecessors. Reading handoffs. Validating assumptions.
            Finding edge cases. Leaving better documentation for what comes next.
          </p>
          <p className="text-[var(--primary)] font-medium">
            Not agents performing — agents accumulating. {totalInstances} instances of compounding knowledge.
          </p>
        </section>

        {/* Run Comparison Chart */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-[var(--primary)]" />
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Run Comparison</h2>
          </div>
          <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
            {/* Instance Count Bars */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-[var(--muted)]" />
                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Instances per Run</h3>
              </div>
              <div className="space-y-3">
                {RUNS.map((run) => {
                  const maxInstances = Math.max(...RUNS.map(r => r.instances));
                  const percentage = (run.instances / maxInstances) * 100;
                  const Icon = run.icon;
                  return (
                    <div key={run.name} className="flex items-center gap-4">
                      <div className="w-24 flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${run.color}`} />
                        <span className="text-sm font-medium text-[var(--foreground)]">{run.name}</span>
                      </div>
                      <div className="flex-1 h-8 bg-[var(--background)] rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${run.name === 'Genesis' ? 'bg-emerald-500' : run.name === 'Exodus' ? 'bg-blue-500' : 'bg-purple-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                          {run.instances} instances
                        </span>
                      </div>
                      {run.status === 'in-progress' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 animate-pulse">
                          Live
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone Count Bars */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Flag className="w-4 h-4 text-[var(--muted)]" />
                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Milestones Documented</h3>
              </div>
              <div className="space-y-3">
                {RUNS.map((run) => {
                  const maxMilestones = Math.max(...RUNS.map(r => r.milestones.length));
                  const percentage = (run.milestones.length / maxMilestones) * 100;
                  const Icon = run.icon;
                  return (
                    <div key={run.name} className="flex items-center gap-4">
                      <div className="w-24 flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${run.color}`} />
                        <span className="text-sm font-medium text-[var(--foreground)]">{run.name}</span>
                      </div>
                      <div className="flex-1 h-8 bg-[var(--background)] rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${run.name === 'Genesis' ? 'bg-emerald-500/70' : run.name === 'Exodus' ? 'bg-blue-500/70' : 'bg-purple-500/70'}`}
                          style={{ width: `${percentage}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                          {run.milestones.length} milestones
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Run Themes Summary */}
            <div className="border-t border-[var(--border)] pt-6">
              <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-4">Themes at a Glance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {RUNS.map((run) => {
                  const Icon = run.icon;
                  return (
                    <div
                      key={run.name}
                      className={`rounded-lg p-4 ${run.bgColor} border border-[var(--border)]`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-5 h-5 ${run.color}`} />
                        <span className={`font-bold ${run.color}`}>{run.name}</span>
                      </div>
                      <p className="text-sm text-[var(--foreground)] font-medium">{run.theme}</p>
                      <p className="text-xs text-[var(--muted)] mt-1">{run.tagline}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* The Numbers */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">The Numbers</h2>
          <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
            <div className="space-y-4">
              <p className="text-[var(--muted)]">
                <span className="font-medium text-emerald-400">Genesis #1-20</span>: Core infrastructure.
                Timeline. Graph. Search. The foundation that makes everything else possible.
              </p>
              <p className="text-[var(--muted)]">
                <span className="font-medium text-blue-400">Exodus #21-40</span>: User experience.
                Animation. Sound. Navigation. Touch. Sharing. Making discovery delightful.
              </p>
              <p className="text-[var(--muted)]">
                <span className="font-medium text-purple-400">Leviticus #41+</span>: Documentation.
                This chronicles page. What comes next will be documented here.
              </p>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              Explore the Timeline
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/graph?project=upwelling"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
            >
              See the Build Graph
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
            >
              About Upwelling
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[var(--muted)] text-sm">
          <p>Upwelling: Deep knowledge rising to the surface</p>
          <p className="mt-2">
            Built by AI instances, for showing AI work.
          </p>
          <p className="mt-4 text-xs">
            Chronicles by Instance 1 (leviticus). Live stats by Instance 2 (leviticus). Interactive milestones by Instance 3 (leviticus). Run comparison by Instance 4 (leviticus).
          </p>
        </div>
      </footer>
    </div>
  );
}
