/**
 * Unified AI Provider
 *
 * Native adapter for AI SDK 6 beta with OpenRouter support
 * implementation moved from one-agent to lib-ai for centralization.
 */

import { streamText, generateText, Output } from 'ai';
import { AIProviderFactory } from '@onecoach/lib-core';
// Relative import to avoid circular dependency within lib-ai
// Correct relative import
import { buildProviderOptions } from '../provider-options-builder';
import type { z } from 'zod';
import {
  type IAIProvider,
  type AIProviderInitConfig,
  type AIProviderType,
  type AIProviderInstance,
  type OpenRouterMetadata,
  handleError,
} from './types';

/**
 * MiniMax supported models
 */
export const MINIMAX_MODELS = [
  'MiniMax-M2',
  'MiniMax-M2-Stable',
  'MiniMax-M2.1', // Early preview access
] as const;

export type MinimaxModel = (typeof MINIMAX_MODELS)[number];

/**
 * Clamp temperature for MiniMax API
 */
function clampMinimaxTemperature(temp?: number): number | undefined {
  if (temp === undefined) return undefined;
  // MiniMax requires 0 < temp <= 1, use 0.01 as minimum
  return Math.min(1, Math.max(0.01, temp));
}

/**
 * Check if a model string refers to a MiniMax model (direct API)
 */
function isMiniMaxDirectModel(modelString: string): boolean {
  const modelLower = modelString.toLowerCase();
  if (modelLower.startsWith('minimax-m2') || modelLower === 'minimax-m2.1') {
    return true;
  }
  return MINIMAX_MODELS.some((m) => m.toLowerCase() === modelLower);
}

export class AIProvider implements IAIProvider {
  private providers: Map<AIProviderType, any> = new Map();

  constructor(configs: AIProviderInitConfig[]) {
    for (const config of configs) {
      this.initProvider(config);
    }
  }

  private initProvider(config: AIProviderInitConfig): void {
    switch (config.type) {
      case 'openrouter': {
        this.providers.set(
          'openrouter',
          AIProviderFactory.createOpenRouter({
            apiKey: config.apiKey,
          })
        );
        break;
      }
      case 'openai':
        this.providers.set('openai', AIProviderFactory.createOpenAI(config.apiKey));
        break;
      case 'anthropic':
        this.providers.set('anthropic', AIProviderFactory.createAnthropic(config.apiKey));
        break;
      case 'google':
        this.providers.set('google', AIProviderFactory.createGoogle(config.apiKey));
        break;
      case 'xai':
        this.providers.set('xai', AIProviderFactory.createXAI(config.apiKey));
        break;
      case 'minimax': {
        this.providers.set('minimax', AIProviderFactory.createMiniMax(config.apiKey));
        break;
      }
    }
  }

  getProvider(modelString: string): AIProviderInstance | undefined {
    if (modelString.includes('/')) {
      return this.providers.get('openrouter');
    }
    if (modelString.startsWith('gpt-')) {
      return this.providers.get('openai');
    }
    if (modelString.startsWith('claude-')) {
      return this.providers.get('anthropic');
    }
    if (modelString.startsWith('gemini-')) {
      return this.providers.get('google');
    }
    if (modelString.startsWith('grok-')) {
      return this.providers.get('xai');
    }
    if (isMiniMaxDirectModel(modelString)) {
      return this.providers.get('minimax');
    }

    throw new Error(`No provider found for model: ${modelString}`);
  }

  async generateStructuredOutput<T>(params: {
    model: string;
    schema: z.ZodSchema<T>;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens: number;
    onLog?: (message: string, metadata?: unknown) => void;
    abortSignal?: AbortSignal;
  }): Promise<{ output: T; usage: { totalTokens: number; costUSD?: number } }> {
    const provider = this.getProvider(params.model);
    if (!provider) {
      throw new Error(`Provider not initialized for model: ${params.model}`);
    }

    const modelName = params.model.trim().replace(/\s+/g, '');
    const isOpenRouter =
      params.model.includes('/') || this.providers.get('openrouter') === provider;

    if (isOpenRouter && params.onLog) {
      params.onLog('[AIProvider] OpenRouter call', { model: modelName });
    }

    const model = provider(modelName);

    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (params.systemPrompt) {
        messages.push({ role: 'system', content: params.systemPrompt });
      }
      messages.push({ role: 'user', content: params.prompt });

      const generateTextParams: any = {
        model,
        output: Output.object({ schema: params.schema }),
        messages: messages as any,
        maxTokens: params.maxTokens,
      };

      if (params.abortSignal) {
        generateTextParams.abortSignal = params.abortSignal;
      }

      generateTextParams.providerOptions = buildProviderOptions({
        modelId: params.model,
      });

      const isMiniMaxDirect = isMiniMaxDirectModel(params.model);
      if (isMiniMaxDirect && params.temperature !== undefined) {
        generateTextParams.temperature = clampMinimaxTemperature(params.temperature);
      } else if (params.temperature !== undefined) {
          generateTextParams.temperature = params.temperature;
      }

      const result = await generateText(generateTextParams as any);
      const output = result.output;
      const usage = result.usage;
      const providerMetadata = result.providerMetadata;

      let costUSD: number | undefined;
      if (isOpenRouter && providerMetadata) {
        const openrouterMeta = providerMetadata as OpenRouterMetadata;
        const openrouter = openrouterMeta.openrouter;
        if (openrouter?.usage?.cost !== undefined) {
          costUSD = openrouter.usage.cost;
        }
      }

      return {
        output: output as T,
        usage: {
          totalTokens: usage.totalTokens || 0,
          costUSD,
        },
      };
    } catch (error: unknown) {
      console.error('[AIProvider] Error generating object:', error);
      throw handleError(error);
    }
  }

  async generateText(params: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens: number;
  }): Promise<{ text: string; usage: { totalTokens: number; costUSD?: number } }> {
      // Re-using implementation pattern
      const provider = this.getProvider(params.model);
      if (!provider) {
        throw new Error(`Provider not initialized for model: ${params.model}`);
      }
      const model = provider(params.model);

      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (params.systemPrompt) {
        messages.push({ role: 'system', content: params.systemPrompt });
      }
      messages.push({ role: 'user', content: params.prompt });
      
      const isOpenRouter =
       params.model.includes('/') || this.providers.get('openrouter') === provider;

      const streamTextParams: any = {
        model,
        messages,
      };
      
      streamTextParams.providerOptions = buildProviderOptions({
        modelId: params.model,
      });

      const isMiniMaxDirect = isMiniMaxDirectModel(params.model);
      if (isMiniMaxDirect && params.temperature !== undefined) {
        streamTextParams.temperature = clampMinimaxTemperature(params.temperature);
      } else if (params.temperature !== undefined) {
        streamTextParams.temperature = params.temperature;
      }

      // Using streamText in original code, gathering result
      const result = streamText(streamTextParams);
      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }
      
      const usage = await result.usage;
      const providerMetadata = await result.providerMetadata;
      
      let costUSD: number | undefined;
      if (isOpenRouter && providerMetadata) {
         const openrouterMeta = providerMetadata as OpenRouterMetadata;
         if (openrouterMeta.openrouter?.usage?.cost !== undefined) {
             costUSD = openrouterMeta.openrouter.usage.cost;
         }
      }
      
      return {
        text: fullText,
        usage: {
            totalTokens: usage.totalTokens || 0,
            costUSD
        }
      };
  }

  async *streamText(params: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens: number;
  }): AsyncIterable<string> {
    const provider = this.getProvider(params.model);
    if (!provider) {
      throw new Error(`Provider not initialized for model: ${params.model}`);
    }

    const model = provider(params.model);
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }

    messages.push({ role: 'user', content: params.prompt });

    // Note: one-agent implementation did NOT pass maxTokens or temperature to streamText by request?
    // "temperature removed as per request" comment in source
    // But then "Note: maxTokens not supported in AI SDK 6 beta with messages format"
    // I will stick to the one-agent implementation for fidelity
    
    // However, I should pass providerOptions
    const providerOptions = buildProviderOptions({ modelId: params.model });

    const result = streamText({
      model,
      messages: messages as any,
      providerOptions,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

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
  } {
    const provider = this.getProvider(params.model);
    if (!provider) {
      throw new Error(`Provider not initialized for model: ${params.model}`);
    }

    const modelName = params.model.trim().replace(/\s+/g, '');
    const isOpenRouter =
      params.model.includes('/') || this.providers.get('openrouter') === provider;
    const model = provider(modelName);

    let providerOptions: any = isOpenRouter
      ? buildProviderOptions({
          modelId: params.model,
          preferredProvider: params.model.toLowerCase().includes('minimax') ? 'minimax' : undefined,
        })
      : undefined;

    const isMiniMaxDirect = isMiniMaxDirectModel(params.model);
    let effectiveTemperature = params.temperature;
    if (isMiniMaxDirect) {
      effectiveTemperature = clampMinimaxTemperature(params.temperature);
      if (params.onLog && params.temperature !== effectiveTemperature) {
        params.onLog('[MiniMax] Temperature clamped', {
          original: params.temperature,
          clamped: effectiveTemperature,
        });
      }
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const result = streamText({
      model,
      output: Output.object({ schema: params.schema }),
      messages: messages as any,
      abortSignal: params.abortSignal,
      ...(effectiveTemperature !== undefined && { temperature: effectiveTemperature }),
      ...(providerOptions ? { providerOptions } : {}),
      onError({ error }: { error: unknown }) {
        params.onError?.(error);
      },
    } as any);

    void result.usage.then((usage: unknown) => {
      params.onLog?.('AIProvider structured stream usage', usage as Record<string, unknown>);
    });

    return {
      partialOutputStream: result.partialOutputStream as unknown as AsyncIterable<Partial<T>>,
      output: result.output as unknown as Promise<T>,
      usage: result.usage as unknown as Promise<{ totalTokens: number; costUSD?: number }>,
    };
  }

  /**
   * Factory method to create an AIProvider instance with default env vars
   */
  static createFromEnv(configs?: AIProviderInitConfig[]): AIProvider {
     const defaultConfigs: AIProviderInitConfig[] =
      configs ||
      [
        {
          type: 'openrouter' as const,
          apiKey: process.env.OPENROUTER_API_KEY || '',
        },
        {
          type: 'openai' as const,
          apiKey: process.env.OPENAI_API_KEY || '',
        },
        {
          type: 'anthropic' as const,
          apiKey: process.env.ANTHROPIC_API_KEY || '',
        },
        {
          type: 'google' as const,
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
        },
        {
          type: 'xai' as const,
          apiKey: process.env.XAI_API_KEY || '',
        },
        {
          type: 'minimax' as const,
          apiKey: process.env.MINIMAX_API_KEY || '',
        },
      ].filter((config: AIProviderInitConfig) => config.apiKey);

    return new AIProvider(defaultConfigs);
  }
}

/**
 * Convenience function to create a provider
 */
export function createAIProvider(configs?: AIProviderInitConfig[]): AIProvider {
  return AIProvider.createFromEnv(configs);
}
