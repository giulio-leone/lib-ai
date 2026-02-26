/**
 * Unified AI Provider
 *
 * Native adapter for AI SDK 6 with multi-provider support.
 * Uses a registry pattern for model-to-provider resolution
 * instead of brittle prefix matching.
 */

import { streamText, generateText, Output, type LanguageModel, type ModelMessage } from 'ai';
import { AIProviderFactory } from '@giulio-leone/lib-core';
import { buildProviderOptions } from '../provider-options-builder';
import type { z } from 'zod';
import {
  type IAIProvider,
  type AIProviderInitConfig,
  type AIProviderType,
  type OpenRouterMetadata,
  handleError,
} from './types';
import { resolveProviderFromModelId } from '@giulio-leone/types/ai';

/**
 * MiniMax supported models
 */
export const MINIMAX_MODELS = [
  'MiniMax-M2',
  'MiniMax-M2-Stable',
  'MiniMax-M2.1',
] as const;

export type MinimaxModel = (typeof MINIMAX_MODELS)[number];

/**
 * Provider callable type - each provider returns a function that creates a LanguageModel
 */
type ProviderCallable = (modelId: string) => LanguageModel;

function clampMinimaxTemperature(temp?: number): number | undefined {
  if (temp === undefined) return undefined;
  return Math.min(1, Math.max(0.01, temp));
}

function isMiniMaxDirectModel(modelString: string): boolean {
  const modelLower = modelString.toLowerCase();
  return MINIMAX_MODELS.some((m) => m.toLowerCase() === modelLower) ||
    modelLower.startsWith('minimax-m2');
}

/**
 * Resolve provider type from model string using the shared registry.
 */
function resolveProviderType(modelString: string): AIProviderType {
  return resolveProviderFromModelId(modelString) as AIProviderType;
}

export class AIProvider implements IAIProvider {
  private providers: Map<AIProviderType, ProviderCallable> = new Map();

  constructor(configs: AIProviderInitConfig[]) {
    for (const config of configs) {
      this.initProvider(config);
    }
  }

  private initProvider(config: AIProviderInitConfig): void {
    // AIProviderFactory returns provider callables that are compatible with ProviderCallable
    // The cast is at the boundary between AI SDK provider packages and our unified type
    switch (config.type) {
      case 'openrouter':
        this.providers.set('openrouter', AIProviderFactory.createOpenRouter({ apiKey: config.apiKey }) as ProviderCallable);
        break;
      case 'openai':
        this.providers.set('openai', AIProviderFactory.createOpenAI(config.apiKey) as ProviderCallable);
        break;
      case 'anthropic':
        this.providers.set('anthropic', AIProviderFactory.createAnthropic(config.apiKey) as ProviderCallable);
        break;
      case 'google':
        this.providers.set('google', AIProviderFactory.createGoogle(config.apiKey) as ProviderCallable);
        break;
      case 'xai':
        this.providers.set('xai', AIProviderFactory.createXAI(config.apiKey) as ProviderCallable);
        break;
      case 'minimax':
        this.providers.set('minimax', AIProviderFactory.createMiniMax(config.apiKey) as ProviderCallable);
        break;
    }
  }

  getProvider(modelString: string): ProviderCallable {
    const providerType = resolveProviderType(modelString);
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider '${providerType}' not initialized for model: ${modelString}`);
    }
    return provider;
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
    const modelName = params.model.trim().replace(/\s+/g, '');
    const isOpenRouter = params.model.includes('/');

    if (isOpenRouter && params.onLog) {
      params.onLog('[AIProvider] OpenRouter call', { model: modelName });
    }

    const model = provider(modelName);

    try {
      const messages: ModelMessage[] = [];
      if (params.systemPrompt) {
        messages.push({ role: 'system', content: params.systemPrompt });
      }
      messages.push({ role: 'user', content: params.prompt });

      const isMiniMaxDirect = isMiniMaxDirectModel(params.model);
      const temperature = isMiniMaxDirect
        ? clampMinimaxTemperature(params.temperature)
        : params.temperature;

      const result = await generateText({
        model,
        output: Output.object({ schema: params.schema }),
        messages,
        maxOutputTokens: params.maxTokens,
        ...(temperature !== undefined && { temperature }),
        ...(params.abortSignal && { abortSignal: params.abortSignal }),
        providerOptions: buildProviderOptions({ modelId: params.model }),
      });

      const usage = result.usage;
      const providerMetadata = result.providerMetadata;

      let costUSD: number | undefined;
      if (isOpenRouter && providerMetadata) {
        const openrouterMeta = providerMetadata as OpenRouterMetadata;
        if (openrouterMeta.openrouter?.usage?.cost !== undefined) {
          costUSD = openrouterMeta.openrouter.usage.cost;
        }
      }

      return {
        output: result.output as T,
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
    const provider = this.getProvider(params.model);
    const model = provider(params.model);
    const isOpenRouter = params.model.includes('/');

    const messages: ModelMessage[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const isMiniMaxDirect = isMiniMaxDirectModel(params.model);
    const temperature = isMiniMaxDirect
      ? clampMinimaxTemperature(params.temperature)
      : params.temperature;

    const result = streamText({
      model,
      messages,
      ...(temperature !== undefined && { temperature }),
      providerOptions: buildProviderOptions({ modelId: params.model }),
    });

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
        costUSD,
      },
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
    const model = provider(params.model);

    const messages: ModelMessage[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const result = streamText({
      model,
      messages,
      providerOptions: buildProviderOptions({ modelId: params.model }),
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
    const modelName = params.model.trim().replace(/\s+/g, '');
    const isOpenRouter = params.model.includes('/');
    const model = provider(modelName);

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

    const providerOptions = isOpenRouter
      ? buildProviderOptions({
          modelId: params.model,
          preferredProvider: params.model.toLowerCase().includes('minimax') ? 'minimax' : undefined,
        })
      : undefined;

    const messages: ModelMessage[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const result = streamText({
      model,
      output: Output.object({ schema: params.schema }),
      messages,
      abortSignal: params.abortSignal,
      ...(effectiveTemperature !== undefined && { temperature: effectiveTemperature }),
      ...(providerOptions ? { providerOptions } : {}),
      onError({ error }: { error: unknown }) {
        params.onError?.(error);
      },
    });

    void result.usage.then((usage: Record<string, unknown>) => {
      params.onLog?.('AIProvider structured stream usage', usage as Record<string, unknown>);
    });

    // AI SDK streamText with Output.object returns compatible types.
    // DeepPartial<T> satisfies Partial<T>, and output Promise<T|undefined> is narrowed.
    return {
      partialOutputStream: result.partialOutputStream as AsyncIterable<Partial<T>>,
      output: Promise.resolve(result.output).then((o) => {
        if (o === undefined) throw new Error('Structured output was undefined');
        return o as T;
      }),
      usage: Promise.resolve(result.usage).then((u) => ({
        totalTokens: u.totalTokens || 0,
      })),
    };
  }

  static createFromEnv(configs?: AIProviderInitConfig[]): AIProvider {
    const defaultConfigs: AIProviderInitConfig[] =
      configs ||
      [
        { type: 'openrouter' as const, apiKey: process.env.OPENROUTER_API_KEY || '' },
        { type: 'openai' as const, apiKey: process.env.OPENAI_API_KEY || '' },
        { type: 'anthropic' as const, apiKey: process.env.ANTHROPIC_API_KEY || '' },
        { type: 'google' as const, apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' },
        { type: 'xai' as const, apiKey: process.env.XAI_API_KEY || '' },
        { type: 'minimax' as const, apiKey: process.env.MINIMAX_API_KEY || '' },
      ].filter((config: AIProviderInitConfig) => config.apiKey);

    return new AIProvider(defaultConfigs);
  }
}

export function createAIProvider(configs?: AIProviderInitConfig[]): AIProvider {
  return AIProvider.createFromEnv(configs);
}
