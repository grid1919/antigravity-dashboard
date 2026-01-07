import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  LanguageServerStatus, 
  TokenUsageInfo, 
  UserInfo, 
  PromptCreditsInfo, 
  FlowCreditsInfo,
  LSModelQuotaInfo
} from '../types';

export interface LanguageServerData {
  status: LanguageServerStatus | null;
  tokenUsage: TokenUsageInfo | null;
  userInfo: UserInfo | null;
  promptCredits: PromptCreditsInfo | null;
  flowCredits: FlowCreditsInfo | null;
  models: LSModelQuotaInfo[];
  lastRefresh: number | null;
  isLoading: boolean;
  error: string | null;
}

export function useLanguageServer(pollingMs: number = 90000) {
  const [data, setData] = useState<LanguageServerData>({
    status: null,
    tokenUsage: null,
    userInfo: null,
    promptCredits: null,
    flowCredits: null,
    models: [],
    lastRefresh: null,
    isLoading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/language-server/status');
      const result = await response.json();
      if (result.success) {
        setData(prev => ({
          ...prev,
          status: result.data,
          models: result.data?.lastSnapshot?.models || [],
        }));
      }
    } catch (err) {
      console.error('Failed to fetch LS status:', err);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/language-server/credits');
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(prev => ({
          ...prev,
          tokenUsage: result.data.tokenUsage || null,
          promptCredits: result.data.promptCredits || null,
          flowCredits: result.data.flowCredits || null,
          lastRefresh: Date.now(),
          isLoading: false,
          error: null,
        }));
      } else {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to fetch credits',
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/language-server/user');
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(prev => ({
          ...prev,
          userInfo: result.data,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true }));
    await Promise.all([fetchStatus(), fetchCredits(), fetchUserInfo()]);
  }, [fetchStatus, fetchCredits, fetchUserInfo]);

  const forceRefresh = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch('/api/language-server/refresh', { method: 'POST' });
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(prev => ({
          ...prev,
          tokenUsage: result.data.tokenUsage || null,
          promptCredits: result.data.promptCredits || null,
          flowCredits: result.data.flowCredits || null,
          userInfo: result.data.userInfo || null,
          lastRefresh: Date.now(),
          isLoading: false,
          error: null,
        }));
      } else {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to refresh',
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Polling
  useEffect(() => {
    if (pollingMs <= 0) return;

    const interval = setInterval(() => {
      fetchCredits();
      fetchStatus();
    }, pollingMs);

    return () => clearInterval(interval);
  }, [pollingMs, fetchCredits, fetchStatus]);

  const claudeModels = useMemo(() => 
    data.models.filter(m => m.label.toLowerCase().includes('claude')),
    [data.models]
  );
  
  const geminiModels = useMemo(() => 
    data.models.filter(m => m.label.toLowerCase().includes('gemini')),
    [data.models]
  );

  const lsClaudeQuota = useMemo(() => {
    if (claudeModels.length === 0) return null;
    return Math.min(...claudeModels.map(m => m.remainingPercentage));
  }, [claudeModels]);

  const lsGeminiQuota = useMemo(() => {
    if (geminiModels.length === 0) return null;
    return Math.min(...geminiModels.map(m => m.remainingPercentage));
  }, [geminiModels]);

  return {
    ...data,
    refresh,
    forceRefresh,
    isConnected: data.status?.connected ?? false,
    claudeModels,
    geminiModels,
    lsClaudeQuota,
    lsGeminiQuota,
  };
}

/**
 * Format credits number for display
 */
export function formatCredits(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Get color class based on percentage
 */
export function getCreditsColor(percent: number): string {
  if (percent <= 10) return 'bg-red-500';
  if (percent <= 30) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Get text color class based on percentage
 */
export function getCreditsTextColor(percent: number): string {
  if (percent <= 10) return 'text-red-400';
  if (percent <= 30) return 'text-yellow-400';
  return 'text-green-400';
}
