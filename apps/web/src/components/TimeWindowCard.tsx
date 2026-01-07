import { useEffect, useState } from 'react';
import { Clock, Sparkles, Bot, ImageIcon, Zap } from 'lucide-react';

interface ModelQuotaWindow {
  id: string;
  displayName: string;
  icon: 'gemini-pro' | 'gemini-flash' | 'gemini-image' | 'claude';
  percentage: number;
  resetTime: number | null;
  accountCount: number;
}

interface QuotaWindowsData {
  models: ModelQuotaWindow[];
  nextReset: number | null;
  totalAccounts: number;
}

interface TimeWindowCardProps {
  data: QuotaWindowsData | null;
  loading?: boolean;
}

function formatTimeUntil(resetTime: number | null): string {
  if (!resetTime) return '--';
  
  const now = Date.now();
  const diff = resetTime - now;
  
  if (diff <= 0) return 'Now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatResetTimeAbsolute(resetTime: number | null): string {
  if (!resetTime) return '--';
  
  return new Date(resetTime).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getQuotaColor(percentage: number): string {
  if (percentage >= 70) return 'text-emerald-400';
  if (percentage >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

function getQuotaBgColor(percentage: number): string {
  if (percentage >= 70) return 'bg-emerald-500';
  if (percentage >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getModelIcon(icon: ModelQuotaWindow['icon']) {
  switch (icon) {
    case 'gemini-pro':
      return <Sparkles className="w-4 h-4 text-blue-400" />;
    case 'gemini-flash':
      return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'gemini-image':
      return <ImageIcon className="w-4 h-4 text-purple-400" />;
    case 'claude':
      return <Bot className="w-4 h-4 text-orange-400" />;
  }
}

interface ModelRowProps {
  model: ModelQuotaWindow;
}

function ModelRow({ model }: ModelRowProps) {
  const [timeLeft, setTimeLeft] = useState(formatTimeUntil(model.resetTime));
  
  useEffect(() => {
    if (!model.resetTime) return;
    
    const interval = setInterval(() => {
      setTimeLeft(formatTimeUntil(model.resetTime));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [model.resetTime]);
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-none bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
      {/* Model Icon & Name */}
      <div className="flex items-center gap-2 min-w-[120px]">
        {getModelIcon(model.icon)}
        <span className="text-sm font-bold text-text-primary uppercase tracking-wide font-mono">{model.displayName}</span>
      </div>
      
      {/* Progress Bar */}
      <div className="flex-1">
        <div className="h-2 bg-white/10 rounded-none overflow-hidden relative">
          <div 
            className={`h-full ${getQuotaBgColor(model.percentage)} transition-all duration-500`}
            style={{ width: `${model.percentage}%` }}
          />
        </div>
      </div>
      
      {/* Percentage */}
      <div className={`text-sm font-bold min-w-[45px] text-right font-mono ${getQuotaColor(model.percentage)}`}>
        {model.percentage}%
      </div>
      
      {/* Reset Time */}
      <div className="flex items-center gap-1.5 min-w-[80px] text-right">
        <Clock className="w-3 h-3 text-text-muted" />
        <span className="text-xs text-text-secondary font-mono">{timeLeft}</span>
      </div>
      
      {/* Account Count */}
      <div className="text-[10px] text-text-muted min-w-[50px] text-right font-mono">
        {model.accountCount} ACC
      </div>
    </div>
  );
}

export function TimeWindowCard({ data, loading }: TimeWindowCardProps) {
  const [nextResetCountdown, setNextResetCountdown] = useState('--');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    if (!data?.nextReset) return;

    const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

    const update = () => {
      const now = Date.now();
      const resetTime = data.nextReset!;
      const windowStart = resetTime - FIVE_HOURS_MS;

      // Calculate progress through the 5-hour window
      const elapsed = now - windowStart;
      const progress = Math.max(0, Math.min(100, (elapsed / FIVE_HOURS_MS) * 100));

      setProgressPercent(progress);
      setNextResetCountdown(formatTimeUntil(data.nextReset));
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [data?.nextReset]);

  if (loading) {
    return (
      <div className="glass-card p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-white/10 rounded w-1/3 mb-3" />
          <div className="h-8 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          Reset Status
        </h3>
        <div className="text-center py-4 text-text-muted text-sm">
          No quota data available
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          Reset Status
        </h3>

        <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10">
          <Clock className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-text-muted uppercase tracking-wide">Next:</span>
          <span className="text-xs font-mono font-medium text-blue-400">
            {nextResetCountdown}
          </span>
          {data.nextReset && (
            <span className="text-[10px] text-text-muted font-mono">
              ({formatResetTimeAbsolute(data.nextReset)})
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>5-hour quota window</span>
          <span className="font-mono">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span>{data.totalAccounts} {data.totalAccounts === 1 ? 'account' : 'accounts'}</span>
          <span>Quotas refresh hourly (PRO) or daily (FREE)</span>
        </div>
      </div>
    </div>
  );
}

// Hook to fetch quota windows data
export function useQuotaWindows(refreshInterval = 30000) {
  const [data, setData] = useState<QuotaWindowsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchData = async () => {
    try {
      const res = await fetch('/api/accounts/quota-windows');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch quota windows:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  return { data, loading, refresh: fetchData };
}
