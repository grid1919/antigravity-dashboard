import { useTimeline } from '../hooks/useTimeline';
import { Zap } from 'lucide-react';
import { format } from 'date-fns';

interface TimelineVisualizationProps {
  email: string;
  claudeResetTime: number | null;
  geminiResetTime: number | null;
}

export function TimelineVisualization({ 
  email, 
  claudeResetTime, 
  geminiResetTime,
}: TimelineVisualizationProps) {
  const { slices, loading } = useTimeline(email);

  if (loading) {
    return <div className="h-24 flex items-center justify-center text-xs text-text-muted">Loading timeline...</div>;
  }

  const renderTimeline = (type: 'claude' | 'gemini', resetTime: number | null) => {
    return (
      <div className="mb-4 last:mb-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Zap size={12} className={type === 'claude' ? 'text-purple-400' : 'text-blue-400'} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{type} Timeline</span>
          </div>
          <div className="text-[10px] text-text-muted">
            {resetTime ? `Resets at ${format(resetTime, 'HH:mm:ss')}` : 'No reset info'}
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-1.5 h-8">
          {slices.map((slice, i) => {
            // Rough estimation of usage in the slice if we don't have exact % per slice from backend yet
            // For now let's just show a bar indicating usage volume relative to other slices
            const maxTokens = Math.max(...slices.map(s => type === 'claude' ? s.claudeTokens : s.geminiTokens), 1);
            const tokens = type === 'claude' ? slice.claudeTokens : slice.geminiTokens;
            const volumePercent = (tokens / maxTokens) * 100;

            return (
              <div key={i} className={`relative rounded-sm overflow-hidden bg-white/5 border border-white/5 group`}>
                <div 
                  className={`absolute bottom-0 left-0 right-0 ${type === 'claude' ? 'bg-purple-500/30' : 'bg-blue-500/30'} transition-all duration-500`}
                  style={{ height: `${volumePercent}%` }}
                />
                {slice.currentSlice && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent-blue animate-pulse" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <span className="text-[8px] font-mono text-white">{tokens > 1000 ? `${(tokens/1000).toFixed(1)}k` : tokens}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[8px] text-text-muted uppercase font-bold tracking-tighter">
          <span>{format(slices[0]?.startTime || Date.now(), 'HH:mm')}</span>
          <span>{format(slices[4]?.endTime || Date.now(), 'HH:mm')}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-black/20 rounded-lg border border-white/5">
      {renderTimeline('claude', claudeResetTime)}
      <div className="h-4" />
      {renderTimeline('gemini', geminiResetTime)}
    </div>
  );
}
