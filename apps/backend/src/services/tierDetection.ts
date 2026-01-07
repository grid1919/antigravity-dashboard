/**
 * Subscription Tier Detection Service
 * 
 * Detects account tier (FREE, PRO, ULTRA) based on quota patterns:
 * - Reset frequency (hourly = PRO/ULTRA, daily = FREE)
 * - Model availability
 * - Quota percentages and limits
 * 
 * Tier characteristics:
 * - FREE: Daily reset (24 hours), limited models
 * - PRO: Hourly reset (1-6 hours), standard premium models
 * - ULTRA: Very high limits, access to premium models like Opus
 */

import type { SubscriptionTier, ModelQuotaDisplay } from '../types';

interface QuotaData {
  claudeQuotaPercent: number | null;
  geminiQuotaPercent: number | null;
  claudeResetTime: number | null;
  geminiResetTime: number | null;
  models?: Array<{
    modelName: string;
    remainingPercent: number;
    resetTimeMs: number | null;
  }>;
}

/**
 * Detect subscription tier based on quota patterns
 */
export function detectSubscriptionTier(quotaData: QuotaData): SubscriptionTier {
  const now = Date.now();
  
  // Check reset time patterns
  const claudeResetTime = quotaData.claudeResetTime;
  const geminiResetTime = quotaData.geminiResetTime;
  
  // Calculate hours until reset
  const claudeHoursUntilReset = claudeResetTime ? (claudeResetTime - now) / (1000 * 60 * 60) : null;
  const geminiHoursUntilReset = geminiResetTime ? (geminiResetTime - now) / (1000 * 60 * 60) : null;
  
  // PRO/ULTRA both have hourly resets (typically 1-6 hours)
  // We can't easily distinguish between them based on reset time alone
  // Default to PRO for hourly resets since ULTRA is rare
  const hasHourlyReset = 
    (claudeHoursUntilReset !== null && claudeHoursUntilReset <= 6 && claudeHoursUntilReset > 0) ||
    (geminiHoursUntilReset !== null && geminiHoursUntilReset <= 6 && geminiHoursUntilReset > 0);
  
  if (hasHourlyReset) {
    return 'PRO';
  }
  
  // FREE detection:
  // - Daily reset (24 hours)
  // - Lower quotas
  // Default to FREE if we can't determine tier
  return 'FREE';
}

/**
 * Enhanced tier detection using full model quota data
 * 
 * Detection logic:
 * - PRO/ULTRA: Hourly reset (1-6 hours)
 * - FREE: Daily reset (>12 hours) or no data
 * 
 * Note: Model availability (e.g., Opus) does NOT indicate tier.
 * PRO users can access Opus too.
 */
export function detectSubscriptionTierFromModels(
  models: Array<{
    modelName: string;
    displayName?: string;
    remainingPercent: number;
    resetTimeMs: number | null;
  }>
): SubscriptionTier {
  if (!models || models.length === 0) {
    return 'FREE';
  }
  
  const now = Date.now();
  let hasHourlyReset = false;
  
  for (const model of models) {
    // Check reset patterns
    if (model.resetTimeMs) {
      const hoursUntilReset = (model.resetTimeMs - now) / (1000 * 60 * 60);
      
      // Hourly reset pattern (1-6 hours) = PRO tier
      // Both PRO and ULTRA have hourly resets, but we can't distinguish between them
      // without explicit tier info from the API
      if (hoursUntilReset <= 6 && hoursUntilReset > 0) {
        hasHourlyReset = true;
        break; // No need to check more models
      }
    }
  }
  
  // Hourly reset = PRO (we default to PRO since ULTRA is rare and indistinguishable)
  if (hasHourlyReset) {
    return 'PRO';
  }
  
  return 'FREE';
}

/**
 * Create model quota displays from raw quota data
 */
export function createModelQuotaDisplays(
  models: Array<{
    modelName: string;
    displayName?: string;
    remainingPercent: number;
    resetTimeMs: number | null;
  }>
): ModelQuotaDisplay[] {
  // Model name mapping
  const modelMappings: Record<string, { id: string; displayName: string }> = {
    'gemini-3-pro-high': { id: 'gemini-3-pro', displayName: 'G3 Pro' },
    'gemini-3-pro': { id: 'gemini-3-pro', displayName: 'G3 Pro' },
    'gemini-3-pro-low': { id: 'gemini-3-pro', displayName: 'G3 Pro' },
    'gemini-3-flash': { id: 'gemini-3-flash', displayName: 'G3 Flash' },
    'gemini-3-pro-image': { id: 'gemini-3-image', displayName: 'G3 Image' },
    'claude-sonnet-4-5': { id: 'claude', displayName: 'Claude' },
    'claude-sonnet-4-5-thinking': { id: 'claude', displayName: 'Claude' },
    'claude-opus-4-5-thinking': { id: 'claude', displayName: 'Claude' },
  };
  
  const groupedModels = new Map<string, {
    id: string;
    displayName: string;
    percentage: number;
    resetTime: number | null;
  }>();
  
  for (const model of models) {
    const modelLower = model.modelName.toLowerCase();
    
    // Find matching mapping
    let mapping = modelMappings[modelLower];
    
    // Try partial matching if exact match not found
    if (!mapping) {
      if (modelLower.startsWith('gemini-3') && modelLower.includes('pro') && modelLower.includes('image')) {
        mapping = { id: 'gemini-3-image', displayName: 'G3 Image' };
      } else if (modelLower.startsWith('gemini-3') && modelLower.includes('flash')) {
        mapping = { id: 'gemini-3-flash', displayName: 'G3 Flash' };
      } else if (modelLower.startsWith('gemini-3') && modelLower.includes('pro')) {
        mapping = { id: 'gemini-3-pro', displayName: 'G3 Pro' };
      } else if (modelLower.includes('claude')) {
        mapping = { id: 'claude', displayName: 'Claude' };
      }
    }
    
    if (mapping) {
      const existing = groupedModels.get(mapping.id);
      const currentPercent = Math.round(model.remainingPercent);
      
      if (!existing) {
        groupedModels.set(mapping.id, {
          id: mapping.id,
          displayName: mapping.displayName,
          percentage: currentPercent,
          resetTime: model.resetTimeMs,
        });
      } else if (currentPercent < existing.percentage) {
        groupedModels.set(mapping.id, {
          id: mapping.id,
          displayName: mapping.displayName,
          percentage: currentPercent,
          resetTime: model.resetTimeMs,
        });
      }
    }
  }
  
  const displays: ModelQuotaDisplay[] = Array.from(groupedModels.values()).map(m => ({
    id: m.id,
    displayName: m.displayName,
    percentage: m.percentage,
    resetTime: m.resetTime,
    resetTimeFormatted: m.resetTime ? formatResetTime(m.resetTime) : undefined,
  }));
  
  // Sort: G3 Pro, G3 Flash, G3 Image, Claude
  const order = ['gemini-3-pro', 'gemini-3-flash', 'gemini-3-image', 'claude'];
  displays.sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  
  return displays;
}

/**
 * Format reset time as relative string
 */
function formatResetTime(resetTimeMs: number): string {
  const now = Date.now();
  const diff = resetTimeMs - now;
  
  if (diff <= 0) {
    return 'Now';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}
