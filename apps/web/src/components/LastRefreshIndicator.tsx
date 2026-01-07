import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

interface LastRefreshIndicatorProps {
  timestamp: number;
  label?: string;
}

export function LastRefreshIndicator({ timestamp, label = 'Last Update' }: LastRefreshIndicatorProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  
  let timeAgo = '';
  if (diffSec < 60) {
    timeAgo = `${diffSec}s ago`;
  } else {
    timeAgo = `${Math.floor(diffSec / 60)}m ago`;
  }

  let colorClass = 'text-green-400';
  if (diffSec > 300) colorClass = 'text-yellow-400';
  if (diffSec > 900) colorClass = 'text-red-400';

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-text-secondary">
      <Clock size={12} className="opacity-50" />
      <span>{label}:</span>
      <span className="text-text-primary">{format(timestamp, 'HH:mm:ss')}</span>
      <span className={colorClass}>({timeAgo})</span>
    </div>
  );
}
