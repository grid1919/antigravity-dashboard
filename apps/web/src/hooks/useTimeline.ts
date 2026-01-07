import { useState, useEffect, useCallback } from 'react';
import type { TimelineSlice } from '../types';

export function useTimeline(email?: string, hours: number = 24, pollingMs: number = 60000) {
  const [slices, setSlices] = useState<TimelineSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      const url = email 
        ? `/api/accounts/timeline?email=${encodeURIComponent(email)}&hours=${hours}`
        : `/api/accounts/timeline?hours=${hours}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setSlices(data.data || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch timeline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [email, hours]);

  useEffect(() => {
    fetchTimeline();
    const interval = setInterval(fetchTimeline, pollingMs);
    return () => clearInterval(interval);
  }, [fetchTimeline, pollingMs]);

  return { slices, loading, error, refresh: fetchTimeline };
}
