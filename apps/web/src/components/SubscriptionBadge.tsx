import { Diamond, Gem, Circle } from 'lucide-react';
import type { SubscriptionTier } from '../types';

interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
  size?: 'sm' | 'md';
}

export function SubscriptionBadge({ tier, size = 'sm' }: SubscriptionBadgeProps) {
  const iconSize = size === 'sm' ? 10 : 12;
  
  switch (tier) {
    case 'ULTRA':
      return (
        <span className="badge-ultra font-mono rounded-none">
          <Gem size={iconSize} className="fill-current" />
          ULTRA
        </span>
      );
    case 'PRO':
      return (
        <span className="badge-pro font-mono rounded-none">
          <Diamond size={iconSize} className="fill-current" />
          PRO
        </span>
      );
    case 'FREE':
    default:
      return (
        <span className="badge-free font-mono rounded-none">
          <Circle size={iconSize} />
          FREE
        </span>
      );
  }
}

interface CurrentBadgeProps {
  show?: boolean;
}

export function CurrentBadge({ show = true }: CurrentBadgeProps) {
  if (!show) return null;
  
  return (
    <span className="badge-current">
      CURRENT
    </span>
  );
}
