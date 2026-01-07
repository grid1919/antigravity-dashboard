import { useState, useEffect, useCallback } from 'react';
import { Zap, Cpu, TrendingDown, RefreshCw, Server } from 'lucide-react';
import { useLanguageServer, formatCredits, getCreditsColor, getCreditsTextColor } from '../hooks/useLanguageServer';
import type { PromptCreditsInfo, FlowCreditsInfo } from '../types';

interface CreditBarProps {
  label: string;
  icon: React.ReactNode;
  credits: PromptCreditsInfo | FlowCreditsInfo | null;
  tooltip: string;
}

function CreditBar({ label, icon, credits, tooltip }: CreditBarProps) {
  if (!credits) return null;

  const percent = credits.remainingPercentage;
  const colorClass = getCreditsColor(percent);
  const textColorClass = getCreditsTextColor(percent);

  return (
    <div className="flex-1" title={tooltip}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono font-bold ${textColorClass}`}>
            {formatCredits(credits.available)}
          </span>
          <span className="text-xs text-text-muted">/ {formatCredits(credits.monthly)}</span>
        </div>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-text-muted">
          {credits.usedPercentage.toFixed(1)}% used
        </span>
        <span className={`text-[10px] font-bold ${textColorClass}`}>
          {percent.toFixed(1)}% remaining
        </span>
      </div>
    </div>
  );
}

interface RunwayDisplayProps {
  usageRate: number;
  runway: string;
}

function RunwayDisplay({ usageRate, runway }: RunwayDisplayProps) {
  const rateColor = usageRate > 20 ? 'text-red-400' : usageRate > 10 ? 'text-yellow-400' : 'text-green-400';
  
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5" title="Usage rate: Average percentage of quota consumed per hour">
        <TrendingDown size={14} className={rateColor} />
        <span className={`font-mono font-bold ${rateColor}`}>
          {usageRate.toFixed(1)}%/h
        </span>
      </div>
      <span className="text-text-muted">·</span>
      <div className="flex items-center gap-1.5" title="Runway: Estimated time until quota exhaustion">
        <span className="text-text-secondary">Runway:</span>
        <span className="font-mono font-bold text-text-primary">{runway}</span>
      </div>
    </div>
  );
}

export function CreditsCard() {
  const { 
    tokenUsage, 
    promptCredits, 
    flowCredits, 
    isConnected, 
    isLoading,
    error,
    forceRefresh,
    lastRefresh 
  } = useLanguageServer(90000);

  // Fetch runway predictions from API
  const [runway, setRunway] = useState<{ usageRate: number; runway: string } | null>(null);
  
  const fetchRunwayPrediction = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/prediction');
      const result = await response.json();
      if (result.success && result.data?.overall) {
        setRunway(result.data.overall);
      }
    } catch (err) {
      console.error('Failed to fetch runway prediction:', err);
    }
  }, []);

  useEffect(() => {
    fetchRunwayPrediction();
    // Refresh every 60 seconds
    const interval = setInterval(fetchRunwayPrediction, 60000);
    return () => clearInterval(interval);
  }, [fetchRunwayPrediction]);

  // Don't render if no data and not connected
  if (!isConnected && !tokenUsage && !isLoading) {
    return (
      <div className="glass-card p-5 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              <Server size={18} className="text-text-muted" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-secondary">AI Credits</h3>
              <p className="text-xs text-text-muted">Language Server not connected</p>
            </div>
          </div>
          <button
            onClick={forceRefresh}
            disabled={isLoading}
            className="btn-icon"
            title="Retry connection"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>
    );
  }

  // Show loading state
  if (isLoading && !tokenUsage) {
    return (
      <div className="glass-card p-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 animate-pulse">
            <Zap size={18} className="text-text-muted" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-white/10 rounded w-24 mb-2 animate-pulse" />
            <div className="h-2 bg-white/5 rounded w-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // No credits data available
  if (!promptCredits && !flowCredits) {
    return null;
  }

  return (
    <div className="glass-card p-5 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
            <Zap size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">AI Credits</h3>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              {isConnected ? 'Language Server Connected' : 'Cached Data'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {runway && <RunwayDisplay usageRate={runway.usageRate} runway={runway.runway} />}
          <button
            onClick={forceRefresh}
            disabled={isLoading}
            className="btn-icon"
            title="Refresh credits"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Credits Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CreditBar
          label="Prompt Credits"
          icon={<Zap size={12} />}
          credits={promptCredits}
          tooltip="Reasoning Credits: Consumed by conversation input and result generation (thinking)"
        />
        <CreditBar
          label="Flow Credits"
          icon={<Cpu size={12} />}
          credits={flowCredits}
          tooltip="Execution Credits: Consumed by search, modification, and command execution (operations)"
        />
      </div>

      {/* Overall progress */}
      {tokenUsage && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">
              Overall: {formatCredits(tokenUsage.totalAvailable)} / {formatCredits(tokenUsage.totalMonthly)} credits available
            </span>
            <span className={`font-bold ${getCreditsTextColor(tokenUsage.overallRemainingPercentage)}`}>
              {tokenUsage.overallRemainingPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Last refresh indicator */}
      {lastRefresh && (
        <div className="mt-2 text-[10px] text-text-muted text-right">
          Updated {Math.round((Date.now() - lastRefresh) / 1000)}s ago
        </div>
      )}
    </div>
  );
}
