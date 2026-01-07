import { useEffect, useState } from 'react';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useLanguageServer } from '../hooks/useLanguageServer';
import { Users, Sparkles, Bot, ImageIcon, AlertTriangle, ArrowRight, Download, RefreshCw, CheckCircle, TrendingUp, Mail, Radio, Zap, User } from 'lucide-react';
import { SubscriptionBadge } from './SubscriptionBadge';
import { QuotaBar } from './QuotaPill';
import { TimeWindowCard, useQuotaWindows } from './TimeWindowCard';
import { QuotaWindowCard } from './QuotaWindowCard';
import { useQuotaWindow } from '../hooks/useQuotaWindow';
import type { LocalAccount, BestAccountRecommendation, DashboardSummary } from '../types';

interface StatsCardProps {
  icon: typeof Users;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
  status?: { text: string; good: boolean };
}

function StatsCard({ icon: Icon, iconColor, iconBg, value, label, status }: StatsCardProps) {
  return (
    <div className="glass-card p-4 relative group overflow-hidden">
      <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-40 transition-opacity">
        <Icon className={`w-12 h-12 ${iconColor}`} />
      </div>
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className={`p-1.5 ${iconBg} border border-current opacity-80`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div 
        className="text-3xl font-bold text-white mb-1 tracking-tighter relative z-10 transition-all duration-300 group-hover:scale-105 origin-left" 
      >
        {value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary relative z-10">{label}</div>
      {status && (
        <div className={`text-[10px] mt-2 font-mono border-l-2 pl-2 ${status.good ? 'text-emerald-400 border-emerald-500/50' : 'text-amber-400 border-amber-500/50'}`}>
          {status.text}
        </div>
      )}
    </div>
  );
}

interface CurrentAccountCardProps {
  account: LocalAccount | null;
  onSwitchClick: () => void;
}

function CurrentAccountCard({ account, onSwitchClick }: CurrentAccountCardProps) {
  if (!account) {
    return (
      <div className="glass-card p-4 h-full">
        <h2 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          Current Account
        </h2>
        <div className="text-center py-8 text-text-muted text-sm">
          No active account selected
        </div>
      </div>
    );
  }

  const modelQuotas = account.modelQuotas || [];
  const geminiPro = modelQuotas.find(m => m.id === 'gemini-3-pro');
  const geminiFlash = modelQuotas.find(m => m.id === 'gemini-3-flash');
  const claude = modelQuotas.find(m => m.id === 'claude');

  return (
    <div className="glass-card p-4 h-full flex flex-col">
      <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        Current Account
      </h2>

      <div className="space-y-4 flex-1">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-sm font-medium text-text-primary truncate">{account.email}</span>
          </div>
          {account.subscriptionTier && (
            <SubscriptionBadge tier={account.subscriptionTier} />
          )}
        </div>

        {geminiPro && (
          <QuotaBar 
            label="Gemini 3 Pro" 
            percentage={geminiPro.percentage} 
            resetTime={geminiPro.resetTime}
          />
        )}

        {geminiFlash && (
          <QuotaBar 
            label="Gemini 3 Flash" 
            percentage={geminiFlash.percentage} 
            resetTime={geminiFlash.resetTime}
          />
        )}

        {claude && (
          <QuotaBar 
            label="Claude 4.5" 
            percentage={claude.percentage} 
            resetTime={claude.resetTime}
          />
        )}
      </div>

      <div className="mt-auto pt-3">
        <button
          className="w-full px-3 py-1.5 text-xs text-text-secondary border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          onClick={onSwitchClick}
        >
          Switch Account
        </button>
      </div>
    </div>
  );
}

interface BestAccountsCardProps {
  best: BestAccountRecommendation | null;
  onSwitchToBest: (email: string) => void;
  loading?: boolean;
}

function BestAccountsCard({ best, onSwitchToBest, loading }: BestAccountsCardProps) {
  return (
    <div className="glass-card p-4 h-full flex flex-col">
      <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-500" />
        Best Accounts
      </h2>

      <div className="space-y-4 flex-1">
        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">For Gemini</div>
          {best?.forGemini ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary truncate">
                {best.forGemini.email}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {best.forGemini.percentage}%
              </span>
            </div>
          ) : (
            <div className="text-sm text-text-muted">No data available</div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[10px] uppercase font-bold text-purple-400 mb-1">For Claude</div>
          {best?.forClaude ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary truncate">
                {best.forClaude.email}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {best.forClaude.percentage}%
              </span>
            </div>
          ) : (
            <div className="text-sm text-text-muted">No data available</div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-3">
        <button
          className="btn-success w-full"
          onClick={() => {
            // Switch to the account with highest overall quota
            const bestEmail = best?.forGemini?.email || best?.forClaude?.email;
            if (bestEmail) onSwitchToBest(bestEmail);
          }}
          disabled={loading || (!best?.forGemini && !best?.forClaude)}
        >
          {loading ? 'Switching...' : 'Switch to Best'}
        </button>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { localAccounts, setCurrentPage } = useDashboardStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [best, setBest] = useState<BestAccountRecommendation | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [switching, setSwitching] = useState(false);

  const { isConnected, lsClaudeQuota, lsGeminiQuota, userInfo, forceRefresh: refreshLS } = useLanguageServer(30000);

  // Quota windows hook with live countdown
  const { data: quotaWindows, loading: quotaWindowsLoading, refresh: refreshQuotaWindows } = useQuotaWindows(30000);
  
  // 5-Hour quota window status hook
  const { data: quotaWindowStatus, loading: quotaWindowStatusLoading, refresh: refreshQuotaWindowStatus } = useQuotaWindow(30000);

  // Find current active account (enriched)
  const [enrichedAccounts, setEnrichedAccounts] = useState<LocalAccount[]>([]);
  const activeAccount = enrichedAccounts.find(a => a.isActive) || null;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch summary stats
      const summaryRes = await fetch('/api/accounts/summary');
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // Fetch best accounts
      const bestRes = await fetch('/api/accounts/best');
      const bestData = await bestRes.json();
      if (bestData.success) {
        setBest(bestData.data);
      }

      // Fetch enriched accounts with tier and quotas
      const enrichedRes = await fetch('/api/accounts/enriched');
      const enrichedData = await enrichedRes.json();
      if (enrichedData.success) {
        setEnrichedAccounts(enrichedData.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/accounts/quota/refresh', { method: 'POST' });
      await Promise.all([fetchDashboardData(), refreshQuotaWindows(), refreshQuotaWindowStatus(), refreshLS()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSwitchToBest = async (email: string) => {
    setSwitching(true);
    try {
      await fetch(`/api/accounts/switch/${encodeURIComponent(email)}`, { method: 'POST' });
      await fetchDashboardData();
    } finally {
      setSwitching(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/accounts/export');
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `antigravity-accounts-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">
            Hello, {activeAccount?.email.split('@')[0] || 'User'}
          </h1>
          {isConnected && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3 h-3 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Quota'}
          </button>
        </div>
      </div>

      {/* Stats Grid - Always Fleet Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <StatsCard
          icon={Users}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
          value={summary?.totalAccounts ?? localAccounts.length}
          label="Total Accounts"
        />
        <StatsCard
          icon={Sparkles}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          value={summary?.avgGeminiQuota != null ? `${summary.avgGeminiQuota}%` : '-'}
          label="Avg. Gemini"
          status={(() => {
            const quota = summary?.avgGeminiQuota;
            if (quota == null) return undefined;
            return {
              text: quota >= 50 ? 'FLEET OK' : quota > 0 ? 'LOW RESERVE' : 'EXHAUSTED',
              good: quota >= 50
            };
          })()}
        />
        <StatsCard
          icon={ImageIcon}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
          value={summary?.avgGeminiImageQuota != null ? `${summary.avgGeminiImageQuota}%` : '-'}
          label="Avg. Imaging"
          status={summary?.avgGeminiImageQuota != null ? {
            text: summary.avgGeminiImageQuota >= 50 ? 'FLEET OK' : 'LOW RESERVE',
            good: summary.avgGeminiImageQuota >= 50
          } : undefined}
        />
        <StatsCard
          icon={Bot}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/10"
          value={summary?.avgClaudeQuota != null ? `${summary.avgClaudeQuota}%` : '-'}
          label="Avg. Claude"
          status={(() => {
            const quota = summary?.avgClaudeQuota;
            if (quota == null) return undefined;
            return {
              text: quota >= 50 ? 'FLEET OK' : quota > 0 ? 'LOW RESERVE' : 'EXHAUSTED',
              good: quota >= 50
            };
          })()}
        />
        <StatsCard
          icon={AlertTriangle}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          value={(() => {
            const rl = summary?.rateLimitedCount ?? 0;
            const ex = summary?.exhaustedCount ?? 0;
            const low = summary?.lowQuotaCount ?? 0;
            if (rl === 0 && ex === 0 && low === 0) return '0';
            const parts = [];
            if (rl > 0) parts.push(`${rl} RL`);
            if (ex > 0) parts.push(`${ex} EX`);
            if (low > 0 && low !== rl + ex) parts.push(`${low} LOW`);
            return parts.length > 0 ? parts.join(' / ') : '0';
          })()}
          label="Alerts (RL/EX/LOW)"
          status={(() => {
            const rl = summary?.rateLimitedCount ?? 0;
            const ex = summary?.exhaustedCount ?? 0;
            const low = summary?.lowQuotaCount ?? 0;
            const hasIssues = rl > 0 || ex > 0 || low > 0;
            return {
              text: hasIssues ? (rl > 0 ? 'RATE-LIMITED' : ex > 0 ? 'EXHAUSTED' : 'LOW QUOTA') : 'ALL CLEAR',
              good: !hasIssues
            };
          })()}
        />
      </div>

      {/* Language Server Account (shown separately when connected) */}
      {isConnected && (
        <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              IDE Account (VS Code Extension)
            </h3>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-text-secondary">{userInfo?.email || 'Unknown'}</span>
              {userInfo?.tier && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {userInfo.tier}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-text-muted">Gemini:</span>
                <span className={`font-bold ${lsGeminiQuota !== null && lsGeminiQuota >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {lsGeminiQuota !== null ? `${lsGeminiQuota}%` : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-text-muted">Claude:</span>
                <span className={`font-bold ${lsClaudeQuota !== null && lsClaudeQuota >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {lsClaudeQuota !== null ? `${lsClaudeQuota}%` : '-'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-2">
            This shows quota for the account logged into your VS Code Antigravity extension, which may differ from fleet accounts.
          </p>
        </div>
      )}

      {/* Quota Time Windows */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <TimeWindowCard data={quotaWindows} loading={quotaWindowsLoading} />
      </div>
      
      {/* 5-Hour Quota Window Visualization */}
      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <QuotaWindowCard data={quotaWindowStatus} loading={quotaWindowStatusLoading} />
      </div>

      {/* Current Account & Best Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <CurrentAccountCard 
          account={activeAccount} 
          onSwitchClick={() => setCurrentPage('accounts')}
        />
        <BestAccountsCard 
          best={best} 
          onSwitchToBest={handleSwitchToBest}
          loading={switching}
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <button
          className="glass-card p-3 hover:border-blue-500/50 flex items-center justify-between group"
          onClick={() => setCurrentPage('accounts')}
        >
          <span className="text-blue-400 font-bold text-sm tracking-wider uppercase font-mono">View All Accounts</span>
          <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          className="glass-card p-3 hover:border-purple-500/50 flex items-center justify-between group"
          onClick={handleExport}
        >
          <span className="text-purple-400 font-bold text-sm tracking-wider uppercase font-mono">Export System Data</span>
          <Download className="w-4 h-4 text-purple-400" />
        </button>
      </div>
    </div>
  );
}
