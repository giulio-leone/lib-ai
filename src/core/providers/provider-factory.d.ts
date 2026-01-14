import type { LanguageModel } from 'ai';
import type { ProviderConfig, ProviderName } from './types';
/**
 * Provider Factory - Lazy initialization with caching
 * Implements the Factory Pattern for provider management
 */
export declare class ProviderFactory {
  private static providerInstances;
  private static modelCache;
  /**
   * Get or create provider instance
   */
  private static getProviderInstance;
  static createProviderInstance(
    providerName: ProviderName,
    apiKey: string,
    preferredProvider?: string | null
  ): (
    model: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      reasoningEffort?: 'low' | 'medium' | 'high';
    }
  ) => LanguageModel;
  private static getEnvKey;
  /**
   * Get language model with caching
   * Reasoning deve essere passato tramite providerOptions in streamText, non nella configurazione del modello
   */
  static getModel(config: ProviderConfig): LanguageModel;
  /**
   * Clear all caches (useful for testing)
   */
  static clearCache(): void;
}
//# sourceMappingURL=provider-factory.d.ts.map
