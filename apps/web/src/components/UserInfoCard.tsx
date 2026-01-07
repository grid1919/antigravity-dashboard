import { User, Crown, ExternalLink } from 'lucide-react';
import { useLanguageServer } from '../hooks/useLanguageServer';

export function UserInfoCard() {
  const { userInfo, isConnected } = useLanguageServer(90000);

  // Don't render if no user info
  if (!userInfo || (!userInfo.email && !userInfo.tier)) {
    return null;
  }

  const getTierColor = (tier?: string): string => {
    if (!tier) return 'text-text-muted';
    const lowerTier = tier.toLowerCase();
    if (lowerTier.includes('enterprise')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (lowerTier.includes('pro')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (lowerTier.includes('team')) return 'text-green-400 bg-green-500/10 border-green-500/20';
    return 'text-text-secondary bg-white/5 border-white/10';
  };

  return (
    <div className="flex items-center justify-between mb-4 px-1">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-white/5 border border-white/10">
          <User size={16} className="text-text-secondary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {userInfo.name || userInfo.email || 'User'}
            </span>
            {userInfo.tier && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTierColor(userInfo.tier)}`}>
                <Crown size={10} className="inline mr-1" />
                {userInfo.tier}
              </span>
            )}
          </div>
          {userInfo.email && userInfo.name && (
            <span className="text-xs text-text-muted">{userInfo.email}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection status indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isConnected 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
          {isConnected ? 'LS Connected' : 'Cached'}
        </div>

        {/* Upgrade link if available */}
        {userInfo.upgradeUri && userInfo.canBuyMoreCredits && (
          <a
            href={userInfo.upgradeUri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors border border-blue-500/20"
            title={userInfo.upgradeText || 'Upgrade subscription'}
          >
            {userInfo.upgradeText || 'Upgrade'}
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
