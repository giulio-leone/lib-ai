import type { LanguageModel } from 'ai';
import type { ProviderConfig, ProviderName } from './types';
import { AIProviderFactory, getAIProviderKey } from '@giulio-leone/lib-core';

type ProviderModelOptions = {
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: ProviderConfig['reasoningEffort'];
  thinkingConfig?: { thinkingLevel: ProviderConfig['thinkingLevel'] };
};

type ProviderInstance = (model: string, options?: ProviderModelOptions) => LanguageModel;

/**
 * Provider Factory - Lazy initialization with caching
 * Implements the Factory Pattern for provider management
 */
export class ProviderFactory {
  private static providerInstances = new Map<
    string,
    {
      instance: ProviderInstance;
      apiKey: string;
    }
  >();
  private static modelCache = new Map<string, LanguageModel>();

  /**
   * Get or create provider instance
   */
  private static getProviderInstance(
    providerName: ProviderName,
    apiKey: string,
    preferredProvider?: string | null
  ): ProviderInstance {
    // Composite cache key for OpenRouter logic
    const cacheKey = preferredProvider ? `${providerName}:${preferredProvider}` : providerName;
    const cached = this.providerInstances.get(cacheKey);

    if (cached && cached.apiKey === apiKey) {
      return cached.instance;
    }

    const instance = this.createProviderInstance(providerName, apiKey, preferredProvider);
    this.providerInstances.set(cacheKey, {
      instance,
      apiKey,
    });
    return instance;
  }

  public static createProviderInstance(
    providerName: ProviderName,
    apiKey: string,
    preferredProvider?: string | null
  ): ProviderInstance {
    switch (providerName) {
      case 'openrouter':
        return AIProviderFactory.createOpenRouter({ apiKey, preferredProvider }) as ProviderInstance;
      case 'openai':
        return AIProviderFactory.createOpenAI(apiKey) as ProviderInstance;
      case 'anthropic':
        return AIProviderFactory.createAnthropic(apiKey) as ProviderInstance;
      case 'google':
        return AIProviderFactory.createGoogle(apiKey) as ProviderInstance;
      case 'xai':
        return AIProviderFactory.createXAI(apiKey) as ProviderInstance;
      case 'minimax':
        return AIProviderFactory.createMiniMax(apiKey) as ProviderInstance;
      // Note: gemini-cli is async-only, handled in getModelAsync()
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  private static getEnvKey(providerName: ProviderName) {
    return getAIProviderKey(providerName);
  }

  /**
   * Get language model with caching (sync version)
   * NOTE: For gemini-cli, use getModelAsync() instead as it requires async initialization
   */
  static getModel(config: ProviderConfig): LanguageModel {
    // Gemini CLI requires async initialization - redirect to async method
    if (config.provider === 'gemini-cli') {
      throw new Error(
        'gemini-cli requires async initialization. Use ProviderFactory.getModelAsync() instead.'
      );
    }

    const apiKey = config.apiKey ?? this.getEnvKey(config.provider) ?? '';

    if (!apiKey) {
      throw new Error(`API key non configurata per il provider ${config.provider}.`);
    }

    const cacheKey = `${config.provider}-${config.model}-${apiKey}-${config.preferredProvider || ''}`;

    if (!this.modelCache.has(cacheKey)) {
      const provider = this.getProviderInstance(config.provider, apiKey, config.preferredProvider);

      const modelOptions = {
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        reasoningEffort: config.reasoningEffort,
      };

      const model = provider(config.model, modelOptions);
      this.modelCache.set(cacheKey, model);
    }

    return this.modelCache.get(cacheKey)!;
  }

  /**
   * Get language model with caching (async version)
   * Required for gemini-cli which uses dynamic imports for native modules
   */
  static async getModelAsync(config: ProviderConfig): Promise<LanguageModel> {
    // For non-gemini-cli providers, use sync method
    if (config.provider !== 'gemini-cli') {
      return this.getModel(config);
    }

    // Gemini CLI: async initialization
    const apiKey = config.apiKey ?? '';
    const thinkingLevel = config.thinkingLevel ?? 'high';
    const cacheKey = `${config.provider}-${config.model}-${apiKey}-${thinkingLevel}`;

    if (!this.modelCache.has(cacheKey)) {
      const provider = await AIProviderFactory.createGeminiCli({
        apiKey: apiKey || undefined,
        thinkingLevel,
      });

      const model = provider(config.model, {
        thinkingConfig: { thinkingLevel },
      });

      this.modelCache.set(cacheKey, model);
    }

    return this.modelCache.get(cacheKey)!;
  }

  /**
   * Clear all caches (useful for testing)
   */
  static clearCache() {
    this.providerInstances.clear();
    this.modelCache.clear();
  }
}
