'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Activity, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Poll interval - check every 2 minutes (less frequent than live updates)
const POLL_INTERVAL = 120000;

export function HealthIndicator({ className }: { className?: string }) {
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/consistency');
      if (!response.ok) throw new Error('Failed to fetch health status');
      const data = await response.json();
      setReport(data);
      setError(null);
    } catch (err) {
      setError('Unable to check health');
      console.error('Health check error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check and polling
  useEffect(() => {
    checkHealth();
    pollIntervalRef.current = setInterval(checkHealth, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [checkHealth]);

  // Close expanded view when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'consistent':
      case 'pass':
        return <CheckCircle className="w-4 h-4" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'inconsistent':
      case 'fail':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'consistent':
      case 'pass':
        return 'text-green-500';
      case 'degraded':
      case 'warning':
        return 'text-amber-500';
      case 'inconsistent':
      case 'fail':
        return 'text-red-500';
      default:
        return 'text-[var(--muted)]';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'consistent':
      case 'pass':
        return 'bg-green-500/10 border-green-500/30';
      case 'degraded':
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30';
      case 'inconsistent':
      case 'fail':
        return 'bg-red-500/10 border-red-500/30';
      default:
        return 'bg-[var(--surface)] border-[var(--border)]';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-[var(--muted)]', className)}>
        <Activity className="w-3 h-3 animate-pulse" />
        <span className="hidden sm:inline">Checking...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-[var(--muted)]', className)}>
        <Activity className="w-3 h-3" />
        <span className="hidden sm:inline">—</span>
      </div>
    );
  }

  const passCount = report.checks.filter(c => c.status === 'pass').length;
  const totalChecks = report.checks.length;

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Main badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border',
          getStatusBg(report.overallStatus),
          getStatusColor(report.overallStatus),
          'hover:scale-105'
        )}
        title={`System health: ${report.overallStatus} (${passCount}/${totalChecks} checks passing)`}
      >
        {getStatusIcon(report.overallStatus)}
        <span className="hidden sm:inline capitalize">
          {report.overallStatus === 'consistent' ? 'Healthy' : report.overallStatus}
        </span>
        <span className="text-[0.65rem] opacity-70">
          {passCount}/{totalChecks}
        </span>
      </button>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className={cn(
            'px-4 py-3 border-b border-[var(--border)]',
            getStatusBg(report.overallStatus)
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={getStatusColor(report.overallStatus)}>
                  {getStatusIcon(report.overallStatus)}
                </span>
                <span className="font-medium text-[var(--foreground)]">
                  System Health
                </span>
              </div>
              <span className={cn('text-xs font-medium', getStatusColor(report.overallStatus))}>
                {report.overallStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              {passCount} of {totalChecks} checks passing
            </p>
          </div>

          {/* Checks list */}
          <div className="max-h-64 overflow-y-auto">
            {report.checks.map((check, i) => (
              <div
                key={check.name}
                className={cn(
                  'px-4 py-2 border-b border-[var(--border)] last:border-b-0',
                  i % 2 === 0 ? 'bg-[var(--background)]/50' : ''
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={getStatusColor(check.status)}>
                    {getStatusIcon(check.status)}
                  </span>
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {check.name.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] ml-6 mt-0.5">
                  {check.message}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-[var(--background)] border-t border-[var(--border)] text-xs text-[var(--muted)]">
            <div className="flex items-center justify-between">
              <span>
                Built by {report.generatedBy.split(' - ')[0]}
              </span>
              <a
                href="/api/consistency"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[var(--primary)] hover:underline"
              >
                Raw API
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
