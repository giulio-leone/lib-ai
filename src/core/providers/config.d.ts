import type { ModelConfig, ModelTier, ExtendedModelConfig } from './types';
/**
 * Model configurations with costs and settings
 */
export declare const MODEL_CONFIGS: Record<string, ModelConfig>;
/**
 * Get model configuration by tier
 *
 * IMPORTANT: Retrieves model AND provider from admin dashboard ai_chat_models table.
 * No hardcoded provider lookups - reads from DB.
 */
export declare function getModelByTier(tier?: ModelTier): Promise<ModelConfig>;
/**
 * Fallback chain for provider redundancy
 */
export declare function getFallbackChain(): ModelConfig[];
/**
 * Get models by tiers for consensus
 * Returns unique models from specified tiers, respecting min/max limits
 */
export declare function getModelsByTiers(
  tiers: Array<'fast' | 'balanced' | 'quality'>,
  minModels?: number,
  maxModels?: number
): ExtendedModelConfig[];
//# sourceMappingURL=config.d.ts.map
