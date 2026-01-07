import { useEffect, useState } from 'react';
import { Clock, TrendingDown, Bot, Sparkles, Timer } from 'lucide-react';
import type { QuotaWindowInfo, QuotaWindowStatus } from '../types';
import { 
  formatTimeUntilReset, 
  formatAbsoluteTime, 
  getProgressColor, 
  getQuotaTextColor 
} from '../hooks/useQuotaWindow';

interface QuotaWindowCardProps {
  data: QuotaWindowStatus | null;
  loading?: boolean;
}

interface WindowRowProps {
  info: QuotaWindowInfo;
}

function WindowRow({ info }: WindowRowProps) {
  const [remainingTime, setRemainingTime] = useState(formatTimeUntilReset(info.remainingMs));
  const [currentProgress, setCurrentProgress] = useState(info.progressPercent);
  
  // Update countdown every second
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, info.windowEnd - now);
      const elapsed = now - info.windowStart;
      const total = info.windowEnd - info.windowStart;
      const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
      
      setRemainingTime(formatTimeUntilReset(remaining));
      setCurrentProgress(progress);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [info.windowStart, info.windowEnd]);
  
  const familyIcon = info.family === 'claude' 
    ? <Bot className="w-4 h-4 text-orange-400" />
    : <Sparkles className="w-4 h-4 text-blue-400" />;
  
  const familyLabel = info.family === 'claude' ? 'Claude' : 'Gemini';
  const progressColor = getProgressColor(currentProgress, info.quotaPercent);
  const quotaColor = getQuotaTextColor(info.quotaPercent);
  
  return (
    <div className="p-4 rounded-sm bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {familyIcon}
          <span className="text-sm font-bold text-text-primary uppercase tracking-wide">{familyLabel}</span>
          <span className="text-xs text-text-muted font-mono">({info.accountCount} ACC)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold font-mono ${quotaColor}`}>
            {info.quotaPercent}%
          </span>
          <span className="text-xs text-text-muted uppercase tracking-wide">rem.</span>
        </div>
      </div>
      
      {/* Timeline Visualization */}
      <div className="relative mb-3">
        {/* Background Track */}
        <div className="h-3 bg-white/10 rounded-none overflow-hidden relative">
          {/* Progress Fill (time elapsed) */}
          <div 
            className={`absolute top-0 left-0 h-full ${progressColor} transition-all duration-1000 opacity-60`}
            style={{ width: `${currentProgress}%` }}
          />
          {/* Quota Overlay (shows consumption within the progress) */}
          <div 
            className={`absolute top-0 left-0 h-full ${progressColor} transition-all duration-500`}
            style={{ width: `${Math.min(currentProgress, 100 - info.quotaPercent)}%` }}
          />
          {/* Current Position Marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-none shadow-lg shadow-white/30 border-2 border-white/80 z-10 transition-all duration-1000 rotate-45"
            style={{ left: `calc(${currentProgress}% - 6px)` }}
          >
            <div className="absolute inset-0 rounded-none bg-white animate-ping opacity-50" />
          </div>
        </div>
        
        {/* Time Labels */}
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono text-text-muted">
            {formatAbsoluteTime(info.windowStart)}
          </span>
          <span className="text-[10px] font-mono text-text-secondary font-medium">
            NOW
          </span>
          <span className="text-[10px] font-mono text-blue-400 font-medium">
            {formatAbsoluteTime(info.windowEnd)}
          </span>
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          {/* Burn Rate */}
          {info.burnRate !== null && info.burnRate > 0 && (
            <div className="flex items-center gap-1.5">
              <TrendingDown className={`w-3 h-3 ${info.burnRate > 15 ? 'text-rose-400' : info.burnRate > 8 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className="text-text-secondary">
                <span className="font-mono font-medium">{info.burnRate}</span>%/h
              </span>
            </div>
          )}
          
          {/* Estimated Exhaustion */}
          {info.estimatedExhaustion && (
            <div className="flex items-center gap-1.5">
              <Timer className="w-3 h-3 text-text-muted" />
              <span className="text-text-secondary">
                Est. <span className="font-mono font-medium text-amber-400">{info.estimatedExhaustion}</span>
              </span>
            </div>
          )}
          
          {/* Stable indicator */}
          {(info.burnRate === null || info.burnRate <= 0) && !info.estimatedExhaustion && (
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              Stable
            </span>
          )}
        </div>
        
        {/* Reset Countdown */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-none bg-blue-500/10 border border-blue-500/20">
          <Clock className="w-3 h-3 text-blue-400" />
          <span className="font-mono text-blue-400 font-medium">
            {remainingTime}
          </span>
        </div>
      </div>
    </div>
  );
}

export function QuotaWindowCard({ data, loading }: QuotaWindowCardProps) {
  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="space-y-4">
            <div className="h-24 bg-white/5 rounded-xl" />
            <div className="h-24 bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!data || (!data.claude && !data.gemini)) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          5-Hour Quota Windows
        </h3>
        <div className="text-center py-8 text-text-muted text-sm">
          No quota window data available
        </div>
      </div>
    );
  }
  
  // Calculate next reset across both families
  const resetTimes = [
    data.claude?.windowEnd,
    data.gemini?.windowEnd,
  ].filter((t): t is number => t !== undefined && t !== null);
  
  const nextReset = resetTimes.length > 0 ? Math.min(...resetTimes) : null;
  const [nextResetCountdown, setNextResetCountdown] = useState(
    nextReset ? formatTimeUntilReset(nextReset - Date.now()) : '--'
  );
  
  useEffect(() => {
    if (!nextReset) return;
    
    const update = () => {
      setNextResetCountdown(formatTimeUntilReset(nextReset - Date.now()));
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextReset]);
  
  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          5-Hour Quota Windows
        </h3>
        
        {nextReset && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-white/5 border border-white/10">
            <span className="text-xs text-text-muted uppercase tracking-wide">Next Reset:</span>
            <span className="text-sm font-mono font-bold text-blue-400">
              {nextResetCountdown}
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              ({formatAbsoluteTime(nextReset)})
            </span>
          </div>
        )}
      </div>
      
      {/* Window Rows */}
      <div className="space-y-3">
        {data.claude && <WindowRow info={data.claude} />}
        {data.gemini && <WindowRow info={data.gemini} />}
      </div>
      
      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-text-muted">
        <span>Window: {formatAbsoluteTime(data.claude?.windowStart || data.gemini?.windowStart || 0)} - {formatAbsoluteTime(data.claude?.windowEnd || data.gemini?.windowEnd || 0)}</span>
        <span>Refreshes every 5 hours</span>
      </div>
    </div>
  );
}
