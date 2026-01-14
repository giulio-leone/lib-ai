import { prisma } from '@onecoach/lib-core';
import { ProviderFactory } from './core/providers/provider-factory';
import { TOKEN_LIMITS } from '@onecoach/constants/models';
import { OperationType } from '@onecoach/types';
import { buildProviderOptions } from './provider-options-builder';
import { normalizeProviderName } from '@onecoach/types-ai';
export class AIModelService {
  static _configCache = new Map();
  static CACHE_TTL_MS = 60_000; // 60 seconds
  /**
   * Get feature-specific model configuration
   */
  static async getFeatureModelConfig(feature, requestedModel, logger) {
    const operationType = this.mapFeatureToOperationType(feature);
    return this.getStandardizedModelConfig(operationType, requestedModel, logger);
  }
  /**
   * Maps a feature name to a database OperationType
   */
  static mapFeatureToOperationType(feature) {
    const mapping = {
      chat: OperationType.CHAT_GENERATION,
      nutrition: OperationType.NUTRITION_GENERATION,
      workout: OperationType.WORKOUT_GENERATION,
      oneagenda: OperationType.ONEAGENDA_GENERATION,
    };
    return mapping[feature] || OperationType.GENERAL_CHAT;
  }
  /**
   * Get standardized model configuration with the following priority:
   * 1. Requested Model (if provided and valid)
   * 2. Operation Type Config (if provided and exists in ai_operation_configs)
   * 3. Global Default (from ai_chat_models where isDefault: true)
   */
  static async getStandardizedModelConfig(operationType, requestedModel, logger) {
    // Check Cache
    const cacheKey = `${operationType}_${requestedModel || 'default'}`;
    const cached = this._configCache.get(cacheKey);
    if (cached && Date.now() - cached.__cachedAt < this.CACHE_TTL_MS) {
      return {
        modelId: cached.modelId,
        model: cached.model,
        maxTokens: cached.maxTokens,
        providerOptions: cached.providerOptions,
        supportsReasoning: cached.supportsReasoning,
      };
    }
    let modelId = requestedModel;
    let maxTokens;
    let supportsReasoning = false;
    let preferredProvider = null;
    let selectionSource = 'requested';
    // Store the full DB model record if found, to source provider info reliably
    let dbModel = null;
    // 1. If no specific model requested, try Operation Type Config
    if (!modelId && operationType) {
      try {
        const opConfig = await prisma.ai_operation_configs.findFirst({
          where: {
            operationType: operationType,
            isActive: true,
          },
        });
        if (opConfig) {
          modelId = opConfig.model;
          maxTokens = opConfig.maxTokens;
          selectionSource = `operation_config:${operationType}`;
          // Try to enrich with chat model config
          const foundModel = await prisma.ai_chat_models.findFirst({
            where: {
              OR: [{ id: modelId }, { modelId: modelId }],
            },
          });
          if (foundModel) {
            dbModel = foundModel;
            modelId = foundModel.modelId; // Ensure we use the provider's model ID
            supportsReasoning = foundModel.supportsReasoning;
            preferredProvider = foundModel.preferredProvider;
          }
        }
      } catch (err) {
        logger?.warn('AI_MODEL', 'Failed to fetch operation config', { operationType, error: err });
      }
    }
    // 2. If still no model, fall back to Global Default
    if (!modelId) {
      try {
        const globalDefault = await prisma.ai_chat_models.findFirst({
          where: {
            isDefault: true,
            isActive: true,
          },
        });
        if (globalDefault) {
          dbModel = globalDefault;
          modelId = globalDefault.modelId;
          maxTokens = globalDefault.maxTokens;
          supportsReasoning = globalDefault.supportsReasoning;
          preferredProvider = globalDefault.preferredProvider;
          selectionSource = 'global_default';
        }
      } catch (err) {
        logger?.warn('AI_MODEL', 'Failed to fetch global default model', { error: err });
      }
    }
    if (!modelId) {
      throw new Error(
        "Nessun modello AI configurato! Contatta l'amministratore per impostare un modello predefinito."
      );
    }
    // 3. Fetch model details if we got ID but missing config (e.g. from requestedModel)
    if (!dbModel && (!maxTokens || !selectionSource.startsWith('operation'))) {
      try {
        const foundModel = await prisma.ai_chat_models.findFirst({
          where: {
            OR: [{ id: modelId }, { modelId: modelId }],
          },
        });
        if (foundModel) {
          dbModel = foundModel;
          // Only override if not already set by higher priority
          if (!maxTokens) maxTokens = foundModel.maxTokens;
          supportsReasoning = foundModel.supportsReasoning;
          preferredProvider = foundModel.preferredProvider;
        }
      } catch (err) {
        logger?.warn('AI_MODEL', 'Failed to fetch model details', { modelId, error: err });
      }
    }
    // 4. Determine Provider
    // Prefer provider from DB if available (mapped to ProviderName enum), otherwise guess from ID
    let providerName = this.determineProvider(modelId, preferredProvider);
    // If we have a DB record and it specifies a provider, use it
    // Uses normalizeProviderName from @onecoach/types-ai (SSOT for provider normalization)
    if (dbModel?.provider) {
      providerName = normalizeProviderName(dbModel.provider);
    }
    logger?.info('AI_MODEL', 'Model selected', {
      modelId,
      source: selectionSource,
      provider: providerName,
      supportsReasoning,
    });
    // 5. Get API Key
    // NOTE: This relies on ProviderFactory handling keys, usually via Env or DB lookup internally
    // But ProviderFactory needs an apiKey passed in usually.
    // We should fetch the key here to be safe and explicit.
    const apiKey = await this.getApiKeyForProvider(providerName);
    // 6. Instantiate Model
    const createProvider = ProviderFactory.createProviderInstance(
      providerName,
      apiKey,
      preferredProvider
    );
    // Calculate effective max output tokens
    const effectiveMaxTokens = Math.min(
      maxTokens ?? TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
      TOKEN_LIMITS.MAX_OUTPUT
    );
    // 7. Initialize Model Instance
    const model = createProvider(modelId);
    // 8. Build Provider Options using centralized utility
    const providerOptions = buildProviderOptions({
      modelId,
      preferredProvider,
      enableUsageAccounting: true,
    });
    const result = {
      modelId,
      model,
      maxTokens: effectiveMaxTokens,
      providerOptions,
      supportsReasoning,
    };
    // Cache result
    this._configCache.set(cacheKey, { ...result, __cachedAt: Date.now() });
    return result;
  }
  static determineProvider(modelId, preferredProvider) {
    if (preferredProvider) {
      return preferredProvider.toLowerCase();
    }
    const lowerId = modelId.toLowerCase();
    // Explicit provider mapping based on known IDs
    if (lowerId.includes('minimax')) return 'minimax';
    if (lowerId.includes('claude')) return 'anthropic';
    if (lowerId.includes('gpt')) return 'openai';
    if (lowerId.includes('gemini')) return 'google';
    if (lowerId.includes('grok')) return 'xai';
    // Fallback to OpenRouter or configured preferred
    return 'openrouter';
  }
  static async getApiKeyForProvider(provider) {
    try {
      // Import dynamically to avoid circular dependencies if any
      const { AIProviderConfigService } =
        await import('./core/providers/ai-provider-config.service');
      const key = await AIProviderConfigService.getApiKey(provider);
      return key || '';
    } catch (error) {
      // Fallback to env vars if service fails or not found
      const keyMap = {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        xai: process.env.XAI_API_KEY,
        minimax: process.env.MINIMAX_API_KEY,
        openrouter: process.env.OPENROUTER_API_KEY,
      };
      return keyMap[provider] || '';
    }
  }
}
