'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Bell, BellOff, Wifi, WifiOff, Radio, Volume2, VolumeX } from 'lucide-react';
import { cn, getNotificationSound } from '@/lib/utils';
import type { ProjectName } from '@/types';

interface LiveUpdatesProps {
  currentProject: ProjectName;
  currentContextCount: number;
  onRefresh: () => void;
  className?: string;
}

// Poll interval in milliseconds
const POLL_INTERVAL = 30000; // 30 seconds - frequent enough for active SIRK runs

export function LiveUpdates({
  currentProject,
  currentContextCount,
  onRefresh,
  className,
}: LiveUpdatesProps) {
  const [isLive, setIsLive] = useState(true); // Live mode on by default during SIRK runs
  const [latestCount, setLatestCount] = useState(currentContextCount);
  const [newContextsAvailable, setNewContextsAvailable] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking' | 'error'>('connected');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationSound = useRef(getNotificationSound());

  // Initialize sound state from localStorage on mount
  useEffect(() => {
    setSoundEnabled(notificationSound.current.isEnabled());
  }, []);

  // Check for new contexts
  const checkForUpdates = useCallback(async () => {
    if (!isLive) return;

    setIsChecking(true);
    setConnectionStatus('checking');

    try {
      const response = await fetch(`/api/project-info?project=${currentProject}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      const serverCount = data.contextCount || 0;

      setLastChecked(new Date());
      setConnectionStatus('connected');

      // Check if there are new contexts
      if (serverCount > latestCount) {
        const newCount = serverCount - latestCount;
        setNewContextsAvailable(newCount);
        // Play notification sound if enabled
        notificationSound.current.play();
      }

      setLatestCount(serverCount);
    } catch (error) {
      console.error('Error checking for updates:', error);
      setConnectionStatus('error');
    } finally {
      setIsChecking(false);
    }
  }, [currentProject, latestCount, isLive]);

  // Start/stop polling based on isLive
  useEffect(() => {
    if (isLive) {
      // Initial check
      checkForUpdates();

      // Set up interval
      pollIntervalRef.current = setInterval(checkForUpdates, POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isLive, checkForUpdates]);

  // Reset when project changes or currentContextCount updates externally
  useEffect(() => {
    setLatestCount(currentContextCount);
    setNewContextsAvailable(0);
  }, [currentProject, currentContextCount]);

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    setNewContextsAvailable(0);
    onRefresh();
  }, [onRefresh]);

  // Toggle live mode
  const toggleLive = useCallback(() => {
    setIsLive(prev => !prev);
    if (!isLive) {
      // Turning on - check immediately
      checkForUpdates();
    }
  }, [isLive, checkForUpdates]);

  // Toggle sound notifications
  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    notificationSound.current.setEnabled(newState);
    // Play a test chime when enabling so user knows what to expect
    if (newState) {
      notificationSound.current.play();
    }
  }, [soundEnabled]);

  // Format last checked time
  const formatLastChecked = (date: Date) => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 10) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Live indicator with pulse when active */}
      <button
        onClick={toggleLive}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
          isLive
            ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
            : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]'
        )}
        title={isLive ? 'Live updates enabled - click to disable' : 'Live updates disabled - click to enable'}
      >
        {isLive ? (
          <>
            <Radio className={cn('w-3 h-3', isChecking && 'animate-pulse')} />
            <span className="hidden sm:inline">Live</span>
          </>
        ) : (
          <>
            <BellOff className="w-3 h-3" />
            <span className="hidden sm:inline">Paused</span>
          </>
        )}
      </button>

      {/* Sound toggle - only show when live mode is enabled */}
      {isLive && (
        <button
          onClick={toggleSound}
          className={cn(
            'flex items-center gap-1 px-1.5 py-1 rounded-md text-xs transition-colors',
            soundEnabled
              ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
              : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
          )}
          title={soundEnabled ? 'Sound notifications enabled - click to disable' : 'Sound notifications disabled - click to enable'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Connection status */}
      {isLive && (
        <span
          className={cn(
            'flex items-center gap-1 text-xs',
            connectionStatus === 'connected' && 'text-green-500',
            connectionStatus === 'checking' && 'text-amber-500',
            connectionStatus === 'error' && 'text-red-500'
          )}
          title={`Last checked: ${formatLastChecked(lastChecked)}`}
        >
          {connectionStatus === 'connected' && <Wifi className="w-3 h-3" />}
          {connectionStatus === 'checking' && <RefreshCw className="w-3 h-3 animate-spin" />}
          {connectionStatus === 'error' && <WifiOff className="w-3 h-3" />}
          <span className="hidden md:inline">{formatLastChecked(lastChecked)}</span>
        </span>
      )}

      {/* New contexts notification */}
      {newContextsAvailable > 0 && (
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white rounded-md text-xs font-medium hover:bg-[var(--primary)]/90 transition-colors animate-pulse"
        >
          <Bell className="w-3 h-3" />
          <span>
            {newContextsAvailable} new context{newContextsAvailable > 1 ? 's' : ''}
          </span>
          <span className="hidden sm:inline">- Click to refresh</span>
        </button>
      )}

      {/* Manual refresh when not live */}
      {!isLive && (
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] rounded-md text-xs transition-colors"
          title="Refresh contexts"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      )}
    </div>
  );
}
