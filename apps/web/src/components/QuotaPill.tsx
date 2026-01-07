import { Clock } from 'lucide-react';
import type { ModelQuotaDisplay } from '../types';

interface QuotaPillProps {
  model: ModelQuotaDisplay;
  showResetTime?: boolean;
  compact?: boolean;
}

function getQuotaColor(percentage: number): 'green' | 'yellow' | 'red' {
  if (percentage >= 50) return 'green';
  if (percentage >= 20) return 'yellow';
  return 'red';
}

function formatResetTime(resetTime: number | null): string {
  if (!resetTime) return '';
  
  const now = Date.now();
  const diff = resetTime - now;
  
  if (diff <= 0) return 'Now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

export function QuotaPill({ model, showResetTime = true }: QuotaPillProps) {
  const color = getQuotaColor(model.percentage);
  
  return (
    <div className={`quota-pill ${color}`}>
      <span className="text-text-muted font-medium">{model.displayName}</span>
      {showResetTime && model.resetTime && (
        <span className="flex items-center gap-0.5 text-text-muted opacity-70">
          <Clock size={8} />
          {formatResetTime(model.resetTime)}
        </span>
      )}
      <span className="font-bold">{model.percentage}%</span>
    </div>
  );
}

interface QuotaBarProps {
  label: string;
  percentage: number | null;
  resetTime?: number | null;
  showResetTime?: boolean;
}

export function QuotaBar({ label, percentage, resetTime, showResetTime = true }: QuotaBarProps) {
  const displayPercent = percentage ?? 100;
  const color = percentage !== null ? getQuotaColor(percentage) : 'green';
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <div className="flex items-center gap-2">
          {showResetTime && resetTime && (
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock size={9} />
              {formatResetTime(resetTime)}
            </span>
          )}
          <span className={`text-xs font-bold ${
            color === 'green' ? 'text-emerald-500' :
            color === 'yellow' ? 'text-amber-500' : 'text-rose-500'
          }`}>
            {percentage !== null ? `${percentage}%` : 'N/A'}
          </span>
        </div>
      </div>
      <div className="progress-track">
        <div 
          className={`progress-fill ${color}`}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
    </div>
  );
}

interface QuotaGridProps {
  models: ModelQuotaDisplay[];
}

export function QuotaGrid({ models }: QuotaGridProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {models.map((model) => (
        <QuotaPill key={model.id} model={model} />
      ))}
    </div>
  );
}

// Compact quota badge for table rows
interface QuotaBadgeProps {
  label: string;
  percentage: number;
  size?: 'sm' | 'md';
}

export function QuotaBadge({ label, percentage, size = 'md' }: QuotaBadgeProps) {
  const color = getQuotaColor(percentage);
  const colorClasses = {
    green: 'bg-emerald-500/5 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.3)]',
    yellow: 'bg-amber-500/5 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(251,191,36,0.3)]',
    red: 'bg-rose-500/5 text-rose-400 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.3)]',
  };
  
  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5' 
    : 'text-xs px-2 py-0.5';
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-none border font-bold font-mono tracking-wide ${colorClasses[color]} ${sizeClasses}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-bold">{percentage}%</span>
    </span>
  );
}
