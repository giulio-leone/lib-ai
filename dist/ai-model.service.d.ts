import type { LanguageModel } from 'ai';
import { OperationType } from '@onecoach/types';
export interface StandardizedModelConfig {
    modelId: string;
    model: LanguageModel;
    maxTokens: number;
    providerOptions: Record<string, unknown>;
    supportsReasoning: boolean;
}
export declare class AIModelService {
    private static _configCache;
    private static CACHE_TTL_MS;
    /**
     * Get feature-specific model configuration
     */
    static getFeatureModelConfig(feature: 'chat' | 'nutrition' | 'workout' | 'oneagenda', requestedModel?: string, logger?: {
        info: (cat: string, message: string, data?: unknown) => void;
        warn: (cat: string, message: string, data?: unknown) => void;
    }): Promise<StandardizedModelConfig>;
    /**
     * Maps a feature name to a database OperationType
     */
    private static mapFeatureToOperationType;
    /**
     * Get standardized model configuration with the following priority:
     * 1. Requested Model (if provided and valid)
     * 2. Operation Type Config (if provided and exists in ai_operation_configs)
     * 3. Global Default (from ai_chat_models where isDefault: true)
     */
    static getStandardizedModelConfig(operationType?: OperationType | string, requestedModel?: string, logger?: {
        info: (cat: string, message: string, data?: unknown) => void;
        warn: (cat: string, message: string, data?: unknown) => void;
    }): Promise<StandardizedModelConfig>;
    private static determineProvider;
    private static getApiKeyForProvider;
}
