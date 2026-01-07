import { useState, useEffect, useCallback } from 'react';
import type { AccountBurnRate } from '../types';

export function useBurnRate(pollingMs: number = 60000) {
  const [burnRates, setBurnRates] = useState<AccountBurnRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const fetchBurnRates = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts/burn-rate');
      const data = await response.json();
      
      if (data.success) {
        setBurnRates(data.data || []);
        setLastRefresh(Date.now());
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch burn rates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBurnRates();
    const interval = setInterval(fetchBurnRates, pollingMs);
    return () => clearInterval(interval);
  }, [fetchBurnRates, pollingMs]);

  return { burnRates, loading, error, lastRefresh, refresh: fetchBurnRates };
}
