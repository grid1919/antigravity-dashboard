import { useState } from 'react';
import { Lock, AlertCircle, Zap } from 'lucide-react';

interface AuthPromptProps {
  onLogin: (token: string) => void;
  error?: string | null;
}

export function AuthPrompt({ onLogin, error }: AuthPromptProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setLocalError('Please enter your dashboard secret');
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${token.trim()}`
        }
      });

      if (response.ok) {
        onLogin(token.trim());
      } else {
        setLocalError('Invalid dashboard secret');
      }
    } catch {
      setLocalError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 flex items-center justify-center border border-cyan-500/50 bg-cyan-500/10">
              <Zap size={24} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-widest uppercase font-mono">
                Antigravity
              </h1>
              <p className="text-[10px] font-bold text-cyan-400 tracking-[0.2em] uppercase">
                Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 text-text-muted">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Authentication Required</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-xs text-text-muted mb-2">
                Dashboard Secret
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter DASHBOARD_SECRET"
                className="input-field w-full"
                autoFocus
                disabled={loading}
              />
            </div>

            {displayError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{displayError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>

          <p className="text-xs text-text-muted text-center mt-6">
            Set <code className="text-cyan-400">DASHBOARD_SECRET</code> in your .env file to enable network access with authentication.
          </p>
        </div>
      </div>
    </div>
  );
}
