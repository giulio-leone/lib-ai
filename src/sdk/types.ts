/**
 * AI SDK Wrapper Types
 * 
 * Defines the unified interface for AI providers in the OneCoach AI stack.
 */

import type { z } from 'zod';

/**
 * AI Provider enum
 */
export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter' | 'minimax';

/**
 * Provider initialization configuration
 */
export interface AIProviderInitConfig {
  type: AIProviderType;
  apiKey: string;
  baseURL?: string;
}

/**
 * AI Provider Interface
 * Standard interface for text and structured output generation
 */
export interface IAIProvider {
  /**
   * Generate structured output matching a Zod schema
   */
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
    usage: { totalTokens: number; costUSD?: number };
  }>;

  /**
   * Generate plain text output
   */
  generateText(params: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens: number;
  }): Promise<{
    text: string;
    usage: { totalTokens: number; costUSD?: number };
  }>;

  /**
   * Stream plain text output
   */
  streamText(params: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens: number;
  }): AsyncIterable<string>;

  /**
   * Stream structured output with partial results
   */
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
    usage: Promise<{ totalTokens: number; costUSD?: number }>;
  };
}

/**
 * OpenRouter Usage Accounting metadata structure
 */
export interface OpenRouterUsage {
  cost?: number;
  totalTokens?: number;
  cachedTokens?: number;
}

export interface OpenRouterMetadata {
  openrouter?: {
    usage?: OpenRouterUsage;
  };
}

/**
 * AI Provider instance type - Union of all possible provider types
 * Used when provider type cannot be determined at compile time
 * Note: Uses dynamic imports to avoid hard dependencies if not needed
 */
export type AIProviderInstance =
  | ReturnType<typeof import('@ai-sdk/openai').createOpenAI>
  | typeof import('@ai-sdk/openai').openai
  | typeof import('@ai-sdk/anthropic').anthropic
  | typeof import('@ai-sdk/google').google
  | typeof import('@ai-sdk/xai').xai;

/**
 * Error handling helper
 */
export function handleError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error(String(error));
}
