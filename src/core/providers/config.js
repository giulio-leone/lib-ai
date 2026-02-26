import { TOKEN_LIMITS } from '@giulio-leone/constants';
/**
 * Model configurations with costs and settings
 */
export const MODEL_CONFIGS = {
  // Google AI Studio
  'gemini-2.5-flash': {
    provider: 'google',
    model: 'gemini-2.5-flash',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 5,
  },
  'gemini-2.5-pro': {
    provider: 'google',
    model: 'gemini-2.5-pro',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 15,
  },
  // Anthropic
  'claude-4-5-haiku': {
    provider: 'anthropic',
    model: 'claude-4-5-haiku',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 8,
  },
  'claude-4-5-sonnet': {
    provider: 'anthropic',
    model: 'claude-4-5-sonnet',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 20,
  },
  // OpenAI
  'gpt-5-medium': {
    provider: 'openai',
    model: 'gpt-5-medium',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 12,
  },
  'gpt-5-high': {
    provider: 'openai',
    model: 'gpt-5-high',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 25,
  },
  // xAI
  'grok-4-fast': {
    provider: 'xai',
    model: 'grok-4-fast',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 6,
  },
  'grok-4': {
    provider: 'xai',
    model: 'grok-4',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 18,
  },
  // OpenRouter
  'openrouter-claude-4-5-sonnet': {
    provider: 'openrouter',
    model: 'anthropic/claude-4-5-sonnet',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 22,
  },
  'openrouter-gemini-2.5-flash': {
    provider: 'openrouter',
    model: 'google/gemini-2.5-flash',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 6,
  },
  'openrouter-grok-4-fast': {
    provider: 'openrouter',
    model: 'x-ai/grok-4-fast',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 8,
  },
  'openrouter-gpt-oss-120b': {
    provider: 'openrouter',
    model: 'openai/gpt-oss-120b',
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 15,
    preferredProviders: ['Baseten', 'Fireworks', 'Groq', 'Cerebras', 'SambaNova'],
  },
};
/**
 * Get model configuration by tier
 *
 * IMPORTANT: Retrieves model AND provider from admin dashboard ai_chat_models table.
 * No hardcoded provider lookups - reads from DB.
 */
export async function getModelByTier(tier = 'balanced') {
  // Import service dynamically to avoid circular dependencies
  const { AIProviderConfigService } = await import('./ai-provider-config.service');
  // Get admin-configured model WITH its provider
  const adminConfig = await AIProviderConfigService.getDefaultModelWithProvider();
  if (!adminConfig) {
    throw new Error(
      `[ModelConfig] No default model configured in admin dashboard. Please configure a default model in /admin/ai-settings.`
    );
  }
  console.warn(
    `[ModelConfig] Using admin-configured model for ${tier}: ${adminConfig.provider}/${adminConfig.modelId}`
  );
  // Create ModelConfig dynamically from DB values
  const modelConfig = {
    provider: adminConfig.provider, // From DB - not hardcoded!
    model: adminConfig.modelId, // From DB
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: undefined, // Reasoning models don't support temperature
    reasoningEnabled: true,
    creditsPerRequest: 10, // Default, can be made configurable later
  };
  return modelConfig;
}
/**
 * Fallback chain for provider redundancy
 */
export function getFallbackChain() {
  return [
    MODEL_CONFIGS['openrouter-grok-4-fast'], // Primary: OpenRouter with x-ai/grok-4-fast
    MODEL_CONFIGS['claude-4-5-sonnet'], // Secondary: Anthropic direct
    MODEL_CONFIGS['openrouter-claude-4-5-sonnet'], // Tertiary: OpenRouter backup
    MODEL_CONFIGS['gemini-2.5-flash'], // Fast alternative
    MODEL_CONFIGS['grok-4-fast'],
  ];
}
/**
 * Get models by tiers for consensus
 * Returns unique models from specified tiers, respecting min/max limits
 */
export function getModelsByTiers(tiers, minModels = 2, maxModels = 3) {
  const tierModels = {
    fast: ['openrouter-grok-4-fast', 'gemini-2.5-flash', 'grok-4-fast', 'claude-4-5-haiku'],
    balanced: [
      'openrouter-grok-4-fast',
      'claude-4-5-sonnet',
      'openrouter-claude-4-5-sonnet',
      'gpt-5-medium',
    ],
    quality: [
      'claude-4-5-sonnet',
      'gpt-5-high',
      'grok-4',
      'gemini-2.5-pro',
      'openrouter-gpt-oss-120b',
    ],
  };
  const selectedModels = [];
  const usedModelIds = new Set();
  // Collect models from each tier
  for (const tier of tiers) {
    const tierModelIds = tierModels[tier] || [];
    for (const modelId of tierModelIds) {
      // Skip if already added
      if (usedModelIds.has(modelId)) continue;
      // Add model
      const modelConfig = MODEL_CONFIGS[modelId];
      if (modelConfig) {
        selectedModels.push({
          id: modelId,
          provider: modelConfig.provider,
          model: modelConfig.model,
          tier: tier,
          creditsPerRequest: modelConfig.creditsPerRequest,
          maxTokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
          reasoningEnabled: modelConfig.reasoningEnabled,
        });
        usedModelIds.add(modelId);
      }
      // Stop if we've reached maxModels
      if (selectedModels.length >= maxModels) {
        return selectedModels;
      }
    }
  }
  // Ensure we have at least minModels
  if (selectedModels.length < minModels) {
    // Add more models from fallback chain
    const fallback = getFallbackChain();
    for (const config of fallback) {
      const modelId = Object.keys(MODEL_CONFIGS).find(
        (id) => MODEL_CONFIGS[id]?.model === config.model
      );
      if (modelId && !usedModelIds.has(modelId)) {
        selectedModels.push({
          id: modelId,
          provider: config.provider,
          model: config.model,
          tier: 'balanced',
          creditsPerRequest: config.creditsPerRequest,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          reasoningEnabled: config.reasoningEnabled,
        });
        usedModelIds.add(modelId);
        if (selectedModels.length >= minModels) break;
      }
    }
  }
  return selectedModels.slice(0, maxModels);
}
