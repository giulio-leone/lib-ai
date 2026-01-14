/**
 * Provider types and interfaces for AI SDK
 */
export type ProviderName = 'google' | 'anthropic' | 'openai' | 'xai' | 'openrouter' | 'minimax';
export type ModelTier = 'fast' | 'balanced' | 'quality';
export interface ProviderConfig {
    provider: ProviderName;
    model: string;
    maxTokens?: number;
    temperature?: number;
    apiKey?: string;
    reasoning?: boolean;
    reasoningEffort?: 'low' | 'medium' | 'high';
    /** OpenRouter specific: slug of the preferred provider (e.g. 'deepinfra') */
    preferredProvider?: string | null;
}
export interface ModelConfig {
    provider: ProviderName;
    model: string;
    reasoningEnabled?: boolean;
    maxTokens: number;
    temperature?: number;
    creditsPerRequest: number;
    reasoningEffort?: 'low' | 'medium' | 'high';
    preferredProviders?: string[];
    preferredProvider?: string | null;
}
/**
 * Extended model configuration with multi-model features
 * Extends the existing ModelConfig with additional metadata
 */
export interface ExtendedModelConfig extends ModelConfig {
    id: string;
    tier?: ModelTier;
    avgLatencyMs?: number;
    tokensPerSecond?: number;
    qualityScore?: number;
    reliabilityScore?: number;
    fallbackTo?: string;
}
