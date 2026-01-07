import { useState } from 'react';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useQuota, getQuotaForAccount, getQuotaColor, formatResetTime } from '../hooks/useQuota';
import { useBurnRate } from '../hooks/useBurnRate';
import { useLanguageServer } from '../hooks/useLanguageServer';
import type { LocalAccount, AccountQuota, AccountBurnRate } from '../types';
import { Mail, ShieldCheck, Activity, Zap, Clock, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { TimelineVisualization } from './TimelineVisualization';
import { CreditsCard } from './CreditsCard';
import { UserInfoCard } from './UserInfoCard';

// Helper for burn rate
function formatBurnRate(tokens: number | undefined, percentPerHour?: number) {
  if (!tokens) return '0 T/h';
  
  let tokenStr = '';
  if (tokens >= 1000000) tokenStr = `${(tokens / 1000000).toFixed(1)}M T/h`;
  else if (tokens >= 1000) tokenStr = `${(tokens / 1000).toFixed(1)}K T/h`;
  else tokenStr = `${tokens} T/h`;

  if (percentPerHour !== undefined && percentPerHour > 0) {
    return (
      <div className="flex flex-col items-end">
        <div className="text-sm font-mono text-text-primary">{tokenStr}</div>
        <div className={`text-[10px] font-bold ${percentPerHour > 20 ? 'text-red-400' : percentPerHour > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
          {percentPerHour.toFixed(1)}%/hr
        </div>
      </div>
    );
  }

  return <div className="text-sm font-mono text-text-primary">{tokenStr}</div>;
}

function QuotaBar({ percent, label }: { percent: number | null; label: string }) {
  const color = getQuotaColor(percent);
  const displayPercent = percent ?? 100;
  
  return (
    <div className="flex-1">
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-1.5">
        <span className="text-text-secondary">{label}</span>
        <span className={`${percent !== null ? 'text-text-primary' : 'text-text-muted'}`}>
          {percent !== null ? `${percent}%` : 'N/A'}
        </span>
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

function AccountRow({ 
  account, 
  quota,
  burnRate
}: { 
  account: LocalAccount; 
  quota: AccountQuota | null;
  burnRate: AccountBurnRate | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = account.isActive;
  
  let statusClass = 'ok';
  let statusText = 'Active';
  
  if (account.status === 'rate_limited_all') {
    statusClass = 'error';
    statusText = 'Limited';
  } else if (account.status.startsWith('rate_limited')) {
    statusClass = 'warn';
    statusText = 'Partial';
  }

  // Calculate % per hour
  // We'll estimate max quota as 1M if not sure, but better to use remainingFraction
  const claudeTokens = burnRate?.claudeTokens1h || 0;
  const geminiTokens = burnRate?.geminiTokens1h || 0;
  const totalTokens = claudeTokens + geminiTokens;

  const calculateTimeToExhaustion = (tokens1h: number, percent: number | null) => {
    if (!tokens1h || percent === null || percent === 0) return 'N/A';
    
    // If we used tokens1h in 1 hour, and we have percent remaining
    // Total estimated quota = (tokens_used_so_far) / (1 - percent/100)
    // But we don't know tokens_used_so_far. 
    // Let's assume burn rate is constant: tokens_per_hour = tokens1h
    // percent_per_hour = (tokens1h / total_quota) * 100
    // We can't know total_quota easily, but we know percent/100 * total_quota = remaining_tokens
    // time_to_exhaustion = remaining_tokens / tokens_per_hour
    // time_to_exhaustion = (percent/100 * total_quota) / tokens_per_hour
    
    // Alternatively, if we know we are at X% and we used Y tokens in 1h, 
    // we can't solve it without one more variable.
    
    // Let's use a simpler heuristic: if 100% is 1M tokens (typical for some tiers)
    const estimatedMax = 1000000;
    const remainingTokens = (percent / 100) * estimatedMax;
    const hours = remainingTokens / tokens1h;
    
    if (hours > 24) return '> 24h';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${hours.toFixed(1)}h`;
  };

  const claudeTimeToExhaust = calculateTimeToExhaustion(claudeTokens, quota?.claudeQuotaPercent ?? null);
  const geminiTimeToExhaust = calculateTimeToExhaustion(geminiTokens, quota?.geminiQuotaPercent ?? null);

  return (
    <div className="glass-card mb-3 last:mb-0 group overflow-hidden">
      <div className="account-grid-row cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Account Info */}
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className={`p-2 rounded-full ${isActive ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-text-muted'}`}>
            <Mail size={16} />
          </div>
          <div className="overflow-hidden">
            <div className="text-text-primary text-sm font-semibold flex items-center gap-2 truncate" title={account.email}>
              {account.email}
              {isActive && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider flex-shrink-0">
                  Current
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Burn Rate */}
        <div className="text-right pr-6">
           {formatBurnRate(totalTokens)}
        </div>

        {/* Status */}
        <div>
          <span className={`status-pill ${statusClass}`}>
            {statusText}
          </span>
        </div>
        
        {/* Quotas */}
        <div className="pr-4">
          <QuotaBar percent={quota?.claudeQuotaPercent ?? null} label="Claude" />
        </div>
        <div className="pr-4">
          <QuotaBar percent={quota?.geminiQuotaPercent ?? null} label="Gemini" />
        </div>
        
        {/* Reset / Actions */}
        <div className="flex items-center justify-end gap-3">
          <div className="text-right">
            <div className="font-mono text-xs text-text-secondary group-hover:text-white transition-colors">
              {formatResetTime(quota?.claudeResetTime || quota?.geminiResetTime || null)}
            </div>
          </div>
          <div className="text-text-muted group-hover:text-text-primary transition-colors">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-black/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
                <Activity size={12} /> Usage Timeline
              </h4>
              <TimelineVisualization 
                email={account.email} 
                claudeResetTime={quota?.claudeResetTime ?? null}
                geminiResetTime={quota?.geminiResetTime ?? null}
              />
            </div>
            <div className="space-y-4">
               <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
                    <Zap size={12} /> Account Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Claude Tokens (1h)</div>
                      <div className="text-lg font-mono font-bold text-purple-400">
                        {claudeTokens > 1000 ? `${(claudeTokens/1000).toFixed(1)}k` : claudeTokens}
                      </div>
                      <div className="text-[9px] text-text-muted mt-1 uppercase">Exhausts in: <span className="text-text-secondary">{claudeTimeToExhaust}</span></div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Gemini Tokens (1h)</div>
                      <div className="text-lg font-mono font-bold text-blue-400">
                        {geminiTokens > 1000 ? `${(geminiTokens/1000).toFixed(1)}k` : geminiTokens}
                      </div>
                      <div className="text-[9px] text-text-muted mt-1 uppercase">Exhausts in: <span className="text-text-secondary">{geminiTimeToExhaust}</span></div>
                    </div>
                  </div>
               </div>
               <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-blue-300/80 leading-relaxed">
                  <p>Status: <span className="text-blue-400 font-bold">{account.status === 'available' ? 'Nominal' : 'Limited'}</span></p>
                  <p className="mt-1 opacity-70">Based on rolling 1-hour average burn rate and current remaining quota.</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ 
  label, 
  value, 
  subtext,
  icon: Icon
}: { 
  label: string; 
  value: string | number; 
  subtext?: string;
  icon: any;
}) {
  return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-5">
        <Icon size={48} />
      </div>
      <div className="flex items-start justify-between mb-4">
        <div className="text-label flex items-center gap-2">
          <Icon size={14} className="opacity-70" />
          {label}
        </div>
      </div>
      <div className="text-value mb-1">{value}</div>
      {subtext && <div className="text-xs text-text-muted font-medium">{subtext}</div>}
    </div>
  );
}

export function OverviewTab() {
  const { 
    localAccounts,
  } = useDashboardStore();

  const { quotas } = useQuota(120000);
  const { burnRates } = useBurnRate(60000);
  const { isConnected, lsClaudeQuota, lsGeminiQuota } = useLanguageServer(30000);
  
  const [sortBy, setSortBy] = useState<'claudeQuota' | 'geminiQuota' | 'burnRate' | 'email' | 'resetTime'>('burnRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedAccounts = [...localAccounts].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;
    
    if (sortBy === 'email') {
       valA = a.email; valB = b.email;
    } else if (sortBy === 'burnRate') {
       const brA = burnRates.find(r => r.email === a.email);
       const brB = burnRates.find(r => r.email === b.email);
       valA = (brA?.claudeTokens1h || 0) + (brA?.geminiTokens1h || 0);
       valB = (brB?.claudeTokens1h || 0) + (brB?.geminiTokens1h || 0);
    } else if (sortBy === 'resetTime') {
       const quotaA = getQuotaForAccount(quotas, a.email);
       const quotaB = getQuotaForAccount(quotas, b.email);
       valA = quotaA?.claudeResetTime || quotaA?.geminiResetTime || Infinity;
       valB = quotaB?.claudeResetTime || quotaB?.geminiResetTime || Infinity;
    } else {
       const quotaA = getQuotaForAccount(quotas, a.email);
       const quotaB = getQuotaForAccount(quotas, b.email);
       if (sortBy === 'claudeQuota') {
         valA = quotaA?.claudeQuotaPercent ?? -1;
         valB = quotaB?.claudeQuotaPercent ?? -1;
       } else {
         valA = quotaA?.geminiQuotaPercent ?? -1;
         valB = quotaB?.geminiQuotaPercent ?? -1;
       }
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const availableCount = localAccounts.filter(a => a.status === 'available').length;
  const limitedCount = localAccounts.filter(a => a.status !== 'available').length;

  const avgClaudeQuota = quotas.length > 0 
    ? Math.round(quotas.reduce((sum, q) => sum + (q.claudeQuotaPercent ?? 100), 0) / quotas.length)
    : null;
  const avgGeminiQuota = quotas.length > 0
    ? Math.round(quotas.reduce((sum, q) => sum + (q.geminiQuotaPercent ?? 100), 0) / quotas.length)
    : null;

  return (
    <div className="space-y-10">
      {/* User Info */}
      <UserInfoCard />

      {/* AI Credits Card - Above stats */}
      <CreditsCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          label="Total Accounts" 
          value={localAccounts.length}
          subtext={`${availableCount} operational`}
          icon={ShieldCheck}
        />
        <StatsCard 
          label="Rate Limited" 
          value={limitedCount}
          subtext={limitedCount > 0 ? 'Action required' : 'Systems nominal'}
          icon={Activity}
        />
        <StatsCard 
          label={isConnected && lsClaudeQuota !== null ? "Claude (Live)" : "Avg Claude Quota"} 
          value={isConnected && lsClaudeQuota !== null ? `${lsClaudeQuota}%` : (avgClaudeQuota !== null ? `${avgClaudeQuota}%` : '-')}
          subtext={isConnected && lsClaudeQuota !== null ? (lsClaudeQuota > 0 ? "From Language Server" : "Exhausted") : "Global average"}
          icon={isConnected ? Radio : Zap}
        />
        <StatsCard 
          label={isConnected && lsGeminiQuota !== null ? "Gemini (Live)" : "Avg Gemini Quota"} 
          value={isConnected && lsGeminiQuota !== null ? `${lsGeminiQuota}%` : (avgGeminiQuota !== null ? `${avgGeminiQuota}%` : '-')}
          subtext={isConnected && lsGeminiQuota !== null ? "From Language Server" : "Global average"}
          icon={isConnected ? Radio : Zap}
        />
      </div>

      {/* Account List */}
      <div>
        <div className="account-grid-header text-label select-none">
          <div onClick={() => handleSort('email')} className="cursor-pointer hover:text-white flex items-center gap-1">
            Account Details {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div onClick={() => handleSort('burnRate')} className="cursor-pointer hover:text-white flex items-center justify-end gap-1 pr-6 text-right">
            Burn Rate {sortBy === 'burnRate' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div>Status</div>
          <div onClick={() => handleSort('claudeQuota')} className="cursor-pointer hover:text-white flex items-center gap-1">
            Claude Load {sortBy === 'claudeQuota' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div onClick={() => handleSort('geminiQuota')} className="cursor-pointer hover:text-white flex items-center gap-1">
            Gemini Load {sortBy === 'geminiQuota' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div onClick={() => handleSort('resetTime')} className="text-right flex items-center justify-end gap-1 cursor-pointer hover:text-white">
            <Clock size={12} />
            Reset {sortBy === 'resetTime' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
        </div>

        <div className="space-y-1">
          {sortedAccounts.map((account) => (
            <AccountRow 
              key={account.email}
              account={account}
              quota={getQuotaForAccount(quotas, account.email)}
              burnRate={burnRates.find(r => r.email === account.email)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
