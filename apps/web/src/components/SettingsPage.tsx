import { useDashboardStore } from '../stores/useDashboardStore';
import { Sun, Moon, Monitor, Bell, BellOff, Clock, Trash2, Download, RefreshCw, Server, Copy, Check, Key, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

type ThemeOption = 'dark' | 'light' | 'system';

interface SettingSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingSection({ title, description, children }: SettingSectionProps) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-text-muted mb-4">{description}</p>
      )}
      {children}
    </div>
  );
}

interface ThemeButtonProps {
  theme: ThemeOption;
  current: ThemeOption;
  icon: typeof Sun;
  label: string;
  onClick: () => void;
}

function ThemeButton({ theme, current, icon: Icon, label, onClick }: ThemeButtonProps) {
  const isActive = current === theme;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
        isActive 
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
          : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export function SettingsPage() {
  const { preferences, updatePreferences, clearNotifications, notifications } = useDashboardStore();
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [proxyConfig, setProxyConfig] = useState<{
    enabled: boolean;
    apiKey: string;
    defaultModel: string;
    rotationStrategy: string;
  } | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [proxyStats, setProxyStats] = useState<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
  } | null>(null);

  useEffect(() => {
    const fetchProxyConfig = async () => {
      try {
        const [statusRes, keyRes, statsRes] = await Promise.all([
          fetch('/api/proxy/status'),
          fetch('/api/proxy/api-key'),
          fetch('/api/proxy/stats')
        ]);
        const status = await statusRes.json();
        const keyData = await keyRes.json();
        const stats = await statsRes.json();
        
        setProxyConfig({
          enabled: status.enabled,
          apiKey: keyData.apiKey,
          defaultModel: status.defaultModel || 'claude-sonnet-4-5',
          rotationStrategy: status.rotationStrategy || 'round_robin'
        });
        setProxyStats(stats);
      } catch (error) {
        console.error('Failed to fetch proxy config:', error);
      }
    };
    fetchProxyConfig();
  }, []);

  const handleCopyApiKey = async () => {
    if (proxyConfig?.apiKey) {
      await navigator.clipboard.writeText(proxyConfig.apiKey);
      setCopiedApiKey(true);
      setTimeout(() => setCopiedApiKey(false), 2000);
    }
  };

  const handleRegenerateApiKey = async () => {
    setRegeneratingKey(true);
    try {
      const res = await fetch('/api/proxy/regenerate-api-key', { method: 'POST' });
      const data = await res.json();
      if (data.apiKey) {
        setProxyConfig(prev => prev ? { ...prev, apiKey: data.apiKey } : null);
      }
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
    } finally {
      setRegeneratingKey(false);
    }
  };

  const handleThemeChange = (theme: ThemeOption) => {
    updatePreferences({ theme });
    
    // Apply theme to document
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  };

  const handleCleanupData = async () => {
    setCleaning(true);
    setCleanResult(null);
    try {
      const res = await fetch('/api/cleanup?olderThanDays=30', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCleanResult(`Cleaned up ${data.deletedRows || 0} old records`);
      } else {
        setCleanResult('Cleanup failed');
      }
    } catch (error) {
      setCleanResult('Cleanup failed');
    } finally {
      setCleaning(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `antigravity-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const refreshIntervalOptions = [
    { value: 15000, label: '15 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 120000, label: '2 minutes' },
    { value: 300000, label: '5 minutes' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>

      {/* Theme */}
      <SettingSection 
        title="Appearance" 
        description="Choose your preferred color theme"
      >
        <div className="grid grid-cols-3 gap-3">
          <ThemeButton
            theme="dark"
            current={preferences.theme}
            icon={Moon}
            label="Dark"
            onClick={() => handleThemeChange('dark')}
          />
          <ThemeButton
            theme="light"
            current={preferences.theme}
            icon={Sun}
            label="Light"
            onClick={() => handleThemeChange('light')}
          />
          <ThemeButton
            theme="system"
            current={preferences.theme}
            icon={Monitor}
            label="System"
            onClick={() => handleThemeChange('system')}
          />
        </div>
      </SettingSection>

      {/* Notifications */}
      <SettingSection 
        title="Notifications" 
        description="Control notification preferences"
      >
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              {preferences.notificationsEnabled ? (
                <Bell className="w-4 h-4 text-blue-400" />
              ) : (
                <BellOff className="w-4 h-4 text-text-muted" />
              )}
              <span className="text-sm text-text-primary">Enable notifications</span>
            </div>
            <input
              type="checkbox"
              checked={preferences.notificationsEnabled}
              onChange={(e) => updatePreferences({ notificationsEnabled: e.target.checked })}
              className="w-4 h-4 accent-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <span className="text-sm text-text-primary">Notify on rate limit</span>
            <input
              type="checkbox"
              checked={preferences.notifyOnRateLimit}
              onChange={(e) => updatePreferences({ notifyOnRateLimit: e.target.checked })}
              className="w-4 h-4 accent-blue-500"
              disabled={!preferences.notificationsEnabled}
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <span className="text-sm text-text-primary">Notify when rate limit clears</span>
            <input
              type="checkbox"
              checked={preferences.notifyOnRateLimitClear}
              onChange={(e) => updatePreferences({ notifyOnRateLimitClear: e.target.checked })}
              className="w-4 h-4 accent-blue-500"
              disabled={!preferences.notificationsEnabled}
            />
          </label>

          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear {notifications.length} notification{notifications.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </SettingSection>

      {/* Refresh Interval */}
      <SettingSection 
        title="Data Refresh" 
        description="How often to refresh quota and usage data"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-text-muted" />
          <select
            value={preferences.refreshInterval}
            onChange={(e) => updatePreferences({ refreshInterval: Number(e.target.value) })}
            className="input-field flex-1"
          >
            {refreshIntervalOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </SettingSection>

      {/* Data Management */}
      <SettingSection 
        title="Data Management" 
        description="Export or clean up stored data"
      >
        <div className="space-y-3">
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting...' : 'Export All Data'}
          </button>

          <button
            onClick={handleCleanupData}
            disabled={cleaning}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cleaning ? 'animate-spin' : ''}`} />
            {cleaning ? 'Cleaning...' : 'Clean Up Old Data (30+ days)'}
          </button>

          {cleanResult && (
            <div className="text-xs text-text-muted text-center p-2 bg-white/5 rounded">
              {cleanResult}
            </div>
          )}
        </div>
      </SettingSection>

      {/* API Proxy Configuration */}
      <SettingSection 
        title="API Proxy" 
        description="Use this proxy with Claude Code CLI or other API clients"
      >
        {proxyConfig ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
              <Server className={`w-4 h-4 ${proxyConfig.enabled ? 'text-green-400' : 'text-text-muted'}`} />
              <span className="text-sm text-text-primary flex-1">
                Proxy Status: {proxyConfig.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${proxyConfig.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {proxyConfig.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">API Key</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                  >
                    {showApiKey ? (
                      <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-text-muted" />
                    )}
                  </button>
                  <button
                    onClick={handleCopyApiKey}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    title="Copy API Key"
                  >
                    {copiedApiKey ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-text-muted" />
                    )}
                  </button>
                  <button
                    onClick={handleRegenerateApiKey}
                    disabled={regeneratingKey}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    title="Regenerate API Key"
                  >
                    <Key className={`w-3.5 h-3.5 text-text-muted ${regeneratingKey ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
              <code className="block text-xs font-mono text-blue-400 bg-black/20 p-2 rounded break-all">
                {showApiKey ? proxyConfig.apiKey : proxyConfig.apiKey.slice(0, 12) + '••••••••••••••••'}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-white/5">
                <span className="text-text-muted">Model:</span>
                <span className="ml-2 text-text-primary">{proxyConfig.defaultModel}</span>
              </div>
              <div className="p-2 rounded bg-white/5">
                <span className="text-text-muted">Rotation:</span>
                <span className="ml-2 text-text-primary">{proxyConfig.rotationStrategy}</span>
              </div>
            </div>

            {proxyStats && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-white/5">
                  <div className="text-lg font-semibold text-text-primary">{proxyStats.totalRequests}</div>
                  <div className="text-xs text-text-muted">Total</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-lg font-semibold text-green-400">{proxyStats.successfulRequests}</div>
                  <div className="text-xs text-text-muted">Success</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-lg font-semibold text-red-400">{proxyStats.failedRequests}</div>
                  <div className="text-xs text-text-muted">Failed</div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400 font-medium mb-2">Usage with Claude Code CLI:</p>
              <code className="block text-xs font-mono text-text-secondary bg-black/20 p-2 rounded whitespace-pre-wrap">
{`export ANTHROPIC_BASE_URL=${window.location.origin}
export ANTHROPIC_API_KEY=${proxyConfig.apiKey}
claude "your prompt"`}
              </code>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-muted text-center p-4">
            Loading proxy configuration...
          </div>
        )}
      </SettingSection>

      {/* About */}
      <SettingSection title="About">
        <div className="space-y-2 text-sm text-text-secondary">
          <p><strong className="text-text-primary">Antigravity Dashboard</strong></p>
          <p>Real-time monitoring for opencode-antigravity-auth plugin.</p>
          <p className="text-xs text-text-muted mt-3">
            Displays quota and usage data for Google Cloud accounts authenticated via the antigravity OAuth flow.
          </p>
        </div>
      </SettingSection>
    </div>
  );
}
