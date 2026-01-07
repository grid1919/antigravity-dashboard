import { useState, useEffect, useCallback } from 'react';
import type { AccountQuota } from '../types';

interface UseQuotaResult {
  quotas: AccountQuota[];
  loading: boolean;
  error: string | null;
  cacheAge: number;
  lastRefresh: number;
  refresh: () => Promise<void>;
}

export function useQuota(pollingMs: number = 120000): UseQuotaResult {
  const [quotas, setQuotas] = useState<AccountQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheAge, setCacheAge] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchQuotas = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts/quota');
      const data = await response.json();
      
      if (data.success) {
        setQuotas(data.data.quotas || []);
        setCacheAge(data.data.cacheAge || 0);
        setLastRefresh(Date.now() - (data.data.cacheAge || 0));
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch quotas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounts/quota/refresh', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setQuotas(data.data || []);
        setCacheAge(0);
        setLastRefresh(Date.now());
        setError(null);
      } else {
        setError(data.error || 'Failed to refresh quotas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotas();
    
    const interval = setInterval(fetchQuotas, pollingMs);
    return () => clearInterval(interval);
  }, [fetchQuotas, pollingMs]);

  return { quotas, loading, error, cacheAge, lastRefresh, refresh };
}

export function getQuotaForAccount(quotas: AccountQuota[], email: string): AccountQuota | null {
  return quotas.find(q => q.email === email) || null;
}

export function getQuotaColor(percent: number | null): 'green' | 'yellow' | 'red' {
  if (percent === null) return 'green';
  if (percent > 50) return 'green';
  if (percent > 20) return 'yellow';
  return 'red';
}

export function formatResetTime(resetTimeMs: number | null): string {
  if (!resetTimeMs) return '-';
  
  const now = Date.now();
  const diff = resetTimeMs - now;
  
  if (diff <= 0) return 'Now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
