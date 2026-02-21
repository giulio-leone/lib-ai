import type { StandardizedModelConfig } from './types';
import { OperationType } from '@onecoach/types-database';
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
    /**
     * Get all active AI models from the database
     */
    static getAvailableModels(): Promise<{
        id: string;
        createdAt: Date;
        metadata: import(".prisma/client/runtime/client").JsonValue | null;
        preferredProvider: string | null;
        provider: import("@prisma/client").$Enums.AIProvider;
        updatedAt: Date;
        modelId: string;
        displayName: string;
        description: string | null;
        isActive: boolean;
        isDefault: boolean;
        maxTokens: number;
        contextWindow: number;
        inputPricePerMillion: import("@prisma/client-runtime-utils").Decimal | null;
        outputPricePerMillion: import("@prisma/client-runtime-utils").Decimal | null;
        supportsVision: boolean;
        supportsTools: boolean;
        supportsStreaming: boolean;
        supportsReasoning: boolean;
        endpoint: string | null;
        apiKeyRef: string | null;
        sortOrder: number;
    }[]>;
}
