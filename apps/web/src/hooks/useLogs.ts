import { useState, useEffect, useCallback } from 'react';
import type { CombinedLogEntry, LogFilters } from '../types';

export function useLogs(initialFilters: LogFilters = {}, pollingMs: number = 10000) {
  const [logs, setLogs] = useState<CombinedLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>(initialFilters);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async (currentFilters: LogFilters) => {
    try {
      const params = new URLSearchParams();
      if (currentFilters.accountEmail) params.append('accountEmail', currentFilters.accountEmail);
      if (currentFilters.model) params.append('model', currentFilters.model);
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.type) params.append('type', currentFilters.type);
      if (currentFilters.startDate) params.append('startDate', currentFilters.startDate.toString());
      if (currentFilters.endDate) params.append('endDate', currentFilters.endDate.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.limit) params.append('limit', currentFilters.limit.toString());
      if (currentFilters.offset) params.append('offset', currentFilters.offset.toString());

      const response = await fetch(`/api/logs/combined?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(filters);
  }, [fetchLogs, filters]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchLogs(filters), pollingMs);
    return () => clearInterval(interval);
  }, [fetchLogs, filters, autoRefresh, pollingMs]);

  const updateFilters = (newFilters: Partial<LogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return { logs, loading, error, filters, updateFilters, autoRefresh, setAutoRefresh, refresh: () => fetchLogs(filters) };
}
