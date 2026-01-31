'use client';

import { useEffect, useState, useCallback } from 'react';
import { Activity, CheckCircle, AlertCircle, XCircle, RefreshCw, ExternalLink, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthData {
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

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'All systems operational',
  },
  degraded: {
    icon: AlertCircle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Degraded performance',
  },
  down: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'System unavailable',
  },
};

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function HealthStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      setHealth({
        status: 'down',
        mandrel: { connected: false },
        data: { dataFreshness: 'unknown' },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchHealth(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs">
        <Activity className="w-3 h-3 animate-pulse" />
        <span className="hidden sm:inline">Checking...</span>
      </div>
    );
  }

  if (!health) return null;

  const config = STATUS_CONFIG[health.status];
  const StatusIcon = config.icon;

  return (
    <div className="relative">
      {/* Status indicator button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all',
          config.bgColor,
          config.borderColor,
          'border',
          'hover:opacity-80'
        )}
        title="System status - click for details"
      >
        <StatusIcon className={cn('w-3 h-3', config.color)} />
        <span className={cn('hidden sm:inline', config.color)}>
          {health.status === 'healthy' ? 'OK' : health.status}
        </span>
      </button>

      {/* Expanded status panel */}
      {expanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setExpanded(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl">
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between px-4 py-3 border-b border-[var(--border)]',
              config.bgColor
            )}>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('w-4 h-4', config.color)} />
                <span className={cn('font-medium text-sm', config.color)}>
                  {config.label}
                </span>
              </div>
              <button
                onClick={() => fetchHealth(true)}
                disabled={refreshing}
                className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                title="Refresh status"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              </button>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3 text-sm">
              {/* Mandrel connection */}
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Mandrel API</span>
                <span className={cn(
                  'flex items-center gap-1',
                  health.mandrel.connected ? 'text-green-500' : 'text-red-500'
                )}>
                  {health.mandrel.connected ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Connected
                      {health.mandrel.responseTime && (
                        <span className="text-[var(--muted)] text-xs">
                          ({health.mandrel.responseTime}ms)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      Disconnected
                    </>
                  )}
                </span>
              </div>

              {/* Data freshness */}
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Data Freshness</span>
                <span className={cn(
                  health.data.dataFreshness === 'fresh' && 'text-green-500',
                  health.data.dataFreshness === 'stale' && 'text-amber-500',
                  health.data.dataFreshness === 'unknown' && 'text-[var(--muted)]'
                )}>
                  {health.data.dataFreshness === 'fresh' && 'Fresh'}
                  {health.data.dataFreshness === 'stale' && 'Stale'}
                  {health.data.dataFreshness === 'unknown' && 'Unknown'}
                </span>
              </div>

              {/* Last update */}
              {health.data.lastContextTime && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Last Context</span>
                  <span className="text-[var(--foreground)]">
                    {formatRelativeTime(health.data.lastContextTime)}
                  </span>
                </div>
              )}

              {/* Context count */}
              {health.data.contextCount && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Total Contexts</span>
                  <span className="text-[var(--foreground)]">
                    {health.data.contextCount}
                  </span>
                </div>
              )}

              {/* Last checked */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted)]">Checked</span>
                <span className="text-[var(--muted)]">
                  {formatRelativeTime(health.timestamp)}
                </span>
              </div>
            </div>

            {/* Footer with feedback link */}
            <div className="border-t border-[var(--border)] px-4 py-3">
              <a
                href="https://github.com/RidgetopAi/upwelling/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                Report an Issue
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
