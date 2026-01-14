/**
 * Unified AI Provider
 *
 * Native adapter for AI SDK 6 beta with OpenRouter support
 * implementation moved from one-agent to lib-ai for centralization.
 */
import type { z } from 'zod';
import { type IAIProvider, type AIProviderInitConfig, type AIProviderInstance } from './types';
/**
 * MiniMax supported models
 */
export declare const MINIMAX_MODELS: readonly ["MiniMax-M2", "MiniMax-M2-Stable", "MiniMax-M2.1"];
export type MinimaxModel = (typeof MINIMAX_MODELS)[number];
export declare class AIProvider implements IAIProvider {
    private providers;
    constructor(configs: AIProviderInitConfig[]);
    private initProvider;
    getProvider(modelString: string): AIProviderInstance | undefined;
    generateStructuredOutput<T>(params: {
        model: string;
        schema: z.ZodSchema<T>;
        prompt: string;
        systemPrompt?: string;
        temperature?: number;
        maxTokens: number;
        onLog?: (message: string, metadata?: unknown) => void;
        abortSignal?: AbortSignal;
    }): Promise<{
        output: T;
        usage: {
            totalTokens: number;
            costUSD?: number;
        };
    }>;
    generateText(params: {
        model: string;
        prompt: string;
        systemPrompt?: string;
        temperature?: number;
        maxTokens: number;
    }): Promise<{
        text: string;
        usage: {
            totalTokens: number;
            costUSD?: number;
        };
    }>;
    streamText(params: {
        model: string;
        prompt: string;
        systemPrompt?: string;
        temperature?: number;
        maxTokens: number;
    }): AsyncIterable<string>;
    streamStructuredOutput<T>(params: {
        model: string;
        schema: z.ZodSchema<T>;
        prompt: string;
        systemPrompt?: string;
        temperature?: number;
        maxTokens: number;
        onLog?: (message: string, metadata?: unknown) => void;
        abortSignal?: AbortSignal;
        onError?: (error: unknown) => void;
    }): {
        partialOutputStream: AsyncIterable<Partial<T>>;
        output: Promise<T>;
        usage: Promise<{
            totalTokens: number;
            costUSD?: number;
        }>;
    };
    /**
     * Factory method to create an AIProvider instance with default env vars
     */
    static createFromEnv(configs?: AIProviderInitConfig[]): AIProvider;
}
/**
 * Convenience function to create a provider
 */
export declare function createAIProvider(configs?: AIProviderInitConfig[]): AIProvider;
