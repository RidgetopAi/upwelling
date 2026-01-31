'use client';

import { useEffect, useState } from 'react';
import { FileText, Users, Calendar, Boxes, Search, Info } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { ProjectStats, ProjectName } from '@/types';

interface InstanceStats {
  totalInstances: number;
  byRun: {
    genesis: number;
    exodus: number;
    leviticus: number;
  };
}

interface StatsPanelProps {
  stats: ProjectStats;
  projectTotalContexts?: number;
  currentProject: ProjectName;
}

export function StatsPanel({ stats, projectTotalContexts, currentProject }: StatsPanelProps) {
  const showingPartial = projectTotalContexts && projectTotalContexts > stats.totalContexts;
  const [instanceStats, setInstanceStats] = useState<InstanceStats | null>(null);

  // Fetch accurate instance count for upwelling project
  useEffect(() => {
    if (currentProject === 'upwelling') {
      fetch('/api/instance-stats')
        .then(res => res.json())
        .then(data => setInstanceStats(data))
        .catch(err => console.error('Failed to fetch instance stats:', err));
    } else {
      setInstanceStats(null);
    }
  }, [currentProject]);

  // Use accurate instance count for upwelling, fallback to computed stats otherwise
  const displayInstanceCount = currentProject === 'upwelling' && instanceStats
    ? instanceStats.totalInstances
    : stats.instanceCount;

  // Build subtext for instances showing run breakdown for upwelling
  const instanceSubtext = currentProject === 'upwelling' && instanceStats
    ? `G:${instanceStats.byRun.genesis} E:${instanceStats.byRun.exodus} L:${instanceStats.byRun.leviticus}`
    : undefined;

  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label={showingPartial ? "Showing" : "Total Contexts"}
          value={showingPartial ? `${stats.totalContexts} of ${projectTotalContexts}` : stats.totalContexts}
          color="blue"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Instances"
          value={displayInstanceCount}
          subtext={instanceSubtext}
          color="green"
        />
        <StatCard
          icon={<Boxes className="w-5 h-5" />}
          label="Frameworks"
          value={stats.frameworks.length}
          subtext={stats.frameworks.slice(0, 3).join(', ')}
          color="purple"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Time Span"
          value={calculateMonths(stats.dateRange.earliest, stats.dateRange.latest)}
          subtext={`${formatDate(stats.dateRange.earliest)} - ${formatDate(stats.dateRange.latest)}`}
          color="amber"
        />
      </div>

      {showingPartial && currentProject === 'emergence-notes' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
          <Search className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-blue-200">
            <span className="font-medium">Explore deeper:</span>{' '}
            Showing 20 most recent contexts. Use semantic search to find specific topics across all {projectTotalContexts} contexts.
            Try searching for "framework evolution", "consciousness", "memory architecture", or "handoff".
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-400',
  green: 'bg-emerald-500/10 text-emerald-400',
  purple: 'bg-purple-500/10 text-purple-400',
  amber: 'bg-amber-500/10 text-amber-400',
};

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
          <p className="text-xs text-[var(--muted)]">{label}</p>
        </div>
      </div>
      {subtext && (
        <p className="mt-2 text-xs text-[var(--muted)] truncate">{subtext}</p>
      )}
    </div>
  );
}

function calculateMonths(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const months = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  if (months < 1) return 'days';
  if (months === 1) return '1 month';
  return `${months} months`;
}
