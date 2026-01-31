'use client';

import { FileText, Users, Calendar, Boxes } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { ProjectStats } from '@/types';

interface StatsPanelProps {
  stats: ProjectStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon={<FileText className="w-5 h-5" />}
        label="Total Contexts"
        value={stats.totalContexts}
        color="blue"
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="Instances"
        value={stats.instanceCount}
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
