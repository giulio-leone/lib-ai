import { prisma } from '@onecoach/lib-core';
import type { LanguageModel } from 'ai';

import { ProviderFactory } from './core/providers/provider-factory';
import type { ProviderName } from './core/providers/types';
import type { StandardizedModelConfig } from './types';
import { normalizeProviderName, resolveProviderFromModelId } from '@onecoach/types-ai';

import { TOKEN_LIMITS } from '@onecoach/constants';
import { buildProviderOptions } from './provider-options-builder';
import { OperationType } from '@onecoach/types-database';

export class AIModelService {
  private static _configCache = new Map<string, StandardizedModelConfig & { __cachedAt: number }>();
  private static CACHE_TTL_MS = 60_000; // 60 seconds

  /**
   * Get feature-specific model configuration
   */
  static async getFeatureModelConfig(
    feature: 'chat' | 'nutrition' | 'workout' | 'oneagenda',
    requestedModel?: string,
    logger?: {
      info: (cat: string, message: string, data?: unknown) => void;
      warn: (cat: string, message: string, data?: unknown) => void;
    }
  ): Promise<StandardizedModelConfig> {
    const operationType = this.mapFeatureToOperationType(feature);
    return this.getStandardizedModelConfig(operationType, requestedModel, logger);
  }

  /**
   * Maps a feature name to a database OperationType
   */
  private static mapFeatureToOperationType(
    feature: 'chat' | 'nutrition' | 'workout' | 'oneagenda'
  ): OperationType {
    const mapping: Record<string, OperationType> = {
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
  static async getStandardizedModelConfig(
    operationType?: OperationType | string,
    requestedModel?: string,
    logger?: {
      info: (cat: string, message: string, data?: unknown) => void;
      warn: (cat: string, message: string, data?: unknown) => void;
    }
  ): Promise<StandardizedModelConfig> {
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
    let maxTokens: number | undefined;
    let supportsReasoning = false;
    let preferredProvider: string | null = null;
    let selectionSource = 'requested';
    // Store the full DB model record if found, to source provider info reliably
    let dbModel: {
      provider: string;
      modelId: string;
      maxTokens: number | null;
      supportsReasoning: boolean;
      preferredProvider: string | null;
    } | null = null;

    // 1. If no specific model requested, try Operation Type Config
    if (!modelId && operationType) {
      try {
        const opConfig = await prisma.ai_operation_configs.findFirst({
          where: {
            operationType: operationType as OperationType,
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
    let providerName: ProviderName = this.determineProvider(modelId);

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

    // 7. Initialize Model Instance
    let model: LanguageModel;
    if (providerName === 'gemini-cli') {
      model = await ProviderFactory.getModelAsync({
        provider: providerName,
        model: modelId,
        apiKey,
        preferredProvider,
      });
    } else {
      const createProvider = ProviderFactory.createProviderInstance(
        providerName,
        apiKey,
        preferredProvider
      );
      model = createProvider(modelId);
    }

    // Calculate effective max output tokens
    const effectiveMaxTokens = Math.min(
      maxTokens ?? TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
      TOKEN_LIMITS.MAX_OUTPUT
    );

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

  private static determineProvider(modelId: string): ProviderName {
    return resolveProviderFromModelId(modelId);
  }

  private static async getApiKeyForProvider(provider: ProviderName): Promise<string> {
    try {
      // Import dynamically to avoid circular dependencies if any
      const { AIProviderConfigService } =
        await import('./core/providers/ai-provider-config.service');
      const key = await AIProviderConfigService.getApiKey(provider);
      return key || '';
    } catch (error) {
      // Fallback to env vars if service fails or not found
      const keyMap: Record<string, string | undefined> = {
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

  /**
   * Get all active AI models from the database
   */
  static async getAvailableModels() {
    return prisma.ai_chat_models.findMany({
      where: { isActive: true },
      orderBy: { modelId: 'asc' },
    });
  }
}
