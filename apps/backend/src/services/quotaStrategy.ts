/**
 * Quota Strategy Manager
 * 
 * Logic for grouping models and determining display properties based on configuration.
 */

import strategyData from '../config/quotaStrategy.json';

export interface ModelDefinition {
  id: string;
  modelName: string;
  displayName: string;
}

export interface GroupDefinition {
  id: string;
  label: string;
  shortLabel: string;
  themeColor: string;
  prefixes: string[];
  models: ModelDefinition[];
}

export interface StrategyConfig {
  version: number;
  groups: GroupDefinition[];
}

export class QuotaStrategyManager {
  private config: StrategyConfig;

  constructor() {
    this.config = strategyData as StrategyConfig;
  }

  /**
   * Get all configured groups
   */
  getGroups(): GroupDefinition[] {
    return this.config.groups;
  }

  /**
   * Get a specific group by ID
   */
  getGroup(groupId: string): GroupDefinition | undefined {
    return this.config.groups.find(g => g.id === groupId);
  }

  /**
   * Find the group that a model belongs to based on model ID or label
   */
  getGroupForModel(modelId: string, modelLabel?: string): GroupDefinition {
    const lowerId = modelId.toLowerCase();
    const lowerLabel = modelLabel?.toLowerCase() || '';

    // 1. Exact match in configured models list
    for (const group of this.config.groups) {
      const exactMatch = group.models.find(m => 
        m.id === modelId || 
        m.modelName.toLowerCase() === lowerId
      );
      if (exactMatch) {
        return group;
      }
    }

    // 2. Prefix matching
    for (const group of this.config.groups) {
      if (group.prefixes && group.prefixes.length > 0) {
        for (const prefix of group.prefixes) {
          const p = prefix.toLowerCase();
          // Check if ID contains prefix
          if (lowerId.includes(p)) return group;
          // Check if label contains prefix
          if (modelLabel && lowerLabel.includes(p)) return group;
        }
      }
    }

    // 3. Fallback to "other" group
    const otherGroup = this.config.groups.find(g => g.id === 'other');
    return otherGroup || this.config.groups[0];
  }

  /**
   * Get model display name from configuration
   */
  getModelDisplayName(modelId: string, modelLabel?: string): string {
    const def = this.getModelDefinition(modelId, modelLabel);
    return def?.displayName || modelLabel || modelId;
  }

  /**
   * Get the full model definition
   */
  getModelDefinition(modelId: string, modelLabel?: string): ModelDefinition | undefined {
    const lowerId = modelId.toLowerCase();

    // 1. Exact ID match
    for (const group of this.config.groups) {
      const model = group.models.find(m => m.id === modelId || m.id === lowerId);
      if (model) return model;
    }

    // 2. Normalized ID match
    const normalized = lowerId.replace(/^model_/, '').replace(/_/g, '-');
    for (const group of this.config.groups) {
      const model = group.models.find(m => m.id === normalized);
      if (model) return model;
    }

    // 3. Model name match
    for (const group of this.config.groups) {
      const model = group.models.find(m => m.modelName.toLowerCase() === lowerId);
      if (model) return model;
    }

    // 4. Label-based match
    if (modelLabel) {
      const lowerLabel = modelLabel.toLowerCase();
      for (const group of this.config.groups) {
        const model = group.models.find(m => 
          m.displayName.toLowerCase() === lowerLabel ||
          lowerLabel.includes(m.displayName.toLowerCase())
        );
        if (model) return model;
      }
    }

    return undefined;
  }

  /**
   * Categorize models into groups
   */
  categorizeModels(models: Array<{ modelId: string; label?: string; [key: string]: any }>): Map<string, typeof models> {
    const grouped = new Map<string, typeof models>();

    // Initialize all groups
    for (const group of this.config.groups) {
      grouped.set(group.id, []);
    }

    // Categorize each model
    for (const model of models) {
      const group = this.getGroupForModel(model.modelId, model.label);
      const existing = grouped.get(group.id) || [];
      existing.push(model);
      grouped.set(group.id, existing);
    }

    return grouped;
  }

  /**
   * Get summary of groups with their quotas
   */
  getGroupSummary(models: Array<{ modelId: string; remainingPercentage: number; resetTime?: Date | string | null }>): Array<{
    group: GroupDefinition;
    minRemaining: number;
    avgRemaining: number;
    modelCount: number;
    earliestReset: Date | null;
  }> {
    const categorized = this.categorizeModels(models);
    const summaries: ReturnType<typeof this.getGroupSummary> = [];

    for (const [groupId, groupModels] of categorized.entries()) {
      const group = this.getGroup(groupId);
      if (!group || groupModels.length === 0) continue;

      const percentages = groupModels.map(m => m.remainingPercentage);
      const minRemaining = Math.min(...percentages);
      const avgRemaining = percentages.reduce((a, b) => a + b, 0) / percentages.length;

      const resetTimes = groupModels
        .map(m => m.resetTime)
        .filter((t): t is Date | string => t !== null && t !== undefined)
        .map(t => t instanceof Date ? t : new Date(t))
        .sort((a, b) => a.getTime() - b.getTime());

      summaries.push({
        group,
        minRemaining,
        avgRemaining,
        modelCount: groupModels.length,
        earliestReset: resetTimes.length > 0 ? resetTimes[0] : null,
      });
    }

    return summaries;
  }

  /**
   * Legacy compatibility: Get family name (claude/gemini) from model ID
   */
  getFamily(modelId: string): 'claude' | 'gemini' | 'gpt' | 'other' {
    const group = this.getGroupForModel(modelId);
    if (group.id === 'claude') return 'claude';
    if (group.id.startsWith('gemini')) return 'gemini';
    if (group.id === 'gpt') return 'gpt';
    return 'other';
  }
}

// Singleton instance
let strategyManagerInstance: QuotaStrategyManager | null = null;

export function getQuotaStrategyManager(): QuotaStrategyManager {
  if (!strategyManagerInstance) {
    strategyManagerInstance = new QuotaStrategyManager();
  }
  return strategyManagerInstance;
}
