import type { LanguageModel } from 'ai';
import type { ProviderConfig, ProviderName } from './types';
type ProviderModelOptions = {
    maxTokens?: number;
    temperature?: number;
    reasoningEffort?: ProviderConfig['reasoningEffort'];
    thinkingConfig?: {
        thinkingLevel: ProviderConfig['thinkingLevel'];
    };
};
type ProviderInstance = (model: string, options?: ProviderModelOptions) => LanguageModel;
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
    static createProviderInstance(providerName: ProviderName, apiKey: string, preferredProvider?: string | null): ProviderInstance;
    private static getEnvKey;
    /**
     * Get language model with caching (sync version)
     * NOTE: For gemini-cli, use getModelAsync() instead as it requires async initialization
     */
    static getModel(config: ProviderConfig): LanguageModel;
    /**
     * Get language model with caching (async version)
     * Required for gemini-cli which uses dynamic imports for native modules
     */
    static getModelAsync(config: ProviderConfig): Promise<LanguageModel>;
    /**
     * Clear all caches (useful for testing)
     */
    static clearCache(): void;
}
export {};
