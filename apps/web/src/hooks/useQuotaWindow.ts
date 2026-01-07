import { useState, useEffect, useCallback } from 'react';
import type { QuotaWindowStatus } from '../types';

interface UseQuotaWindowResult {
  data: QuotaWindowStatus | null;
  loading: boolean;
  error: string | null;
  lastRefresh: number;
  refresh: () => Promise<void>;
}

export function useQuotaWindow(pollingMs: number = 30000): UseQuotaWindowResult {
  const [data, setData] = useState<QuotaWindowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchWindowStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts/quota-window-status');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastRefresh(Date.now());
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch quota window status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchWindowStatus();
  }, [fetchWindowStatus]);

  useEffect(() => {
    fetchWindowStatus();
    
    const interval = setInterval(fetchWindowStatus, pollingMs);
    return () => clearInterval(interval);
  }, [fetchWindowStatus, pollingMs]);

  return { data, loading, error, lastRefresh, refresh };
}

// Utility functions for formatting

export function formatTimeUntilReset(ms: number): string {
  if (ms <= 0) return 'Now';
  
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatAbsoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getProgressColor(_progressPercent: number, quotaPercent: number): string {
  // Color based on quota remaining, not time progress
  if (quotaPercent >= 60) return 'bg-emerald-500';
  if (quotaPercent >= 30) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function getQuotaTextColor(percent: number): string {
  if (percent >= 60) return 'text-emerald-400';
  if (percent >= 30) return 'text-amber-400';
  return 'text-rose-400';
}
