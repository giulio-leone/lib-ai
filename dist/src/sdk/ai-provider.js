/**
 * Unified AI Provider
 *
 * Native adapter for AI SDK 6 with multi-provider support.
 * Uses a registry pattern for model-to-provider resolution
 * instead of brittle prefix matching.
 */
import { streamText, generateText, Output } from 'ai';
import { AIProviderFactory } from '@onecoach/lib-core';
import { buildProviderOptions } from '../provider-options-builder';
import { handleError, } from './types';
import { resolveProviderFromModelId } from '@onecoach/types-ai';
/**
 * MiniMax supported models
 */
export const MINIMAX_MODELS = [
    'MiniMax-M2',
    'MiniMax-M2-Stable',
    'MiniMax-M2.1',
];
function clampMinimaxTemperature(temp) {
    if (temp === undefined)
        return undefined;
    return Math.min(1, Math.max(0.01, temp));
}
function isMiniMaxDirectModel(modelString) {
    const modelLower = modelString.toLowerCase();
    return MINIMAX_MODELS.some((m) => m.toLowerCase() === modelLower) ||
        modelLower.startsWith('minimax-m2');
}
/**
 * Resolve provider type from model string using the shared registry.
 */
function resolveProviderType(modelString) {
    return resolveProviderFromModelId(modelString);
}
export class AIProvider {
    providers = new Map();
    constructor(configs) {
        for (const config of configs) {
            this.initProvider(config);
        }
    }
    initProvider(config) {
        // AIProviderFactory returns provider callables that are compatible with ProviderCallable
        // The cast is at the boundary between AI SDK provider packages and our unified type
        switch (config.type) {
            case 'openrouter':
                this.providers.set('openrouter', AIProviderFactory.createOpenRouter({ apiKey: config.apiKey }));
                break;
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
            case 'minimax':
                this.providers.set('minimax', AIProviderFactory.createMiniMax(config.apiKey));
                break;
        }
    }
    getProvider(modelString) {
        const providerType = resolveProviderType(modelString);
        const provider = this.providers.get(providerType);
        if (!provider) {
            throw new Error(`Provider '${providerType}' not initialized for model: ${modelString}`);
        }
        return provider;
    }
    async generateStructuredOutput(params) {
        const provider = this.getProvider(params.model);
        const modelName = params.model.trim().replace(/\s+/g, '');
        const isOpenRouter = params.model.includes('/');
        if (isOpenRouter && params.onLog) {
            params.onLog('[AIProvider] OpenRouter call', { model: modelName });
        }
        const model = provider(modelName);
        try {
            const messages = [];
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
            let costUSD;
            if (isOpenRouter && providerMetadata) {
                const openrouterMeta = providerMetadata;
                if (openrouterMeta.openrouter?.usage?.cost !== undefined) {
                    costUSD = openrouterMeta.openrouter.usage.cost;
                }
            }
            return {
                output: result.output,
                usage: {
                    totalTokens: usage.totalTokens || 0,
                    costUSD,
                },
            };
        }
        catch (error) {
            console.error('[AIProvider] Error generating object:', error);
            throw handleError(error);
        }
    }
    async generateText(params) {
        const provider = this.getProvider(params.model);
        const model = provider(params.model);
        const isOpenRouter = params.model.includes('/');
        const messages = [];
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
        let costUSD;
        if (isOpenRouter && providerMetadata) {
            const openrouterMeta = providerMetadata;
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
    async *streamText(params) {
        const provider = this.getProvider(params.model);
        const model = provider(params.model);
        const messages = [];
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
    streamStructuredOutput(params) {
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
        const messages = [];
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
            onError({ error }) {
                params.onError?.(error);
            },
        });
        void result.usage.then((usage) => {
            params.onLog?.('AIProvider structured stream usage', usage);
        });
        // AI SDK streamText with Output.object returns compatible types.
        // DeepPartial<T> satisfies Partial<T>, and output Promise<T|undefined> is narrowed.
        return {
            partialOutputStream: result.partialOutputStream,
            output: Promise.resolve(result.output).then((o) => {
                if (o === undefined)
                    throw new Error('Structured output was undefined');
                return o;
            }),
            usage: Promise.resolve(result.usage).then((u) => ({
                totalTokens: u.totalTokens || 0,
            })),
        };
    }
    static createFromEnv(configs) {
        const defaultConfigs = configs ||
            [
                { type: 'openrouter', apiKey: process.env.OPENROUTER_API_KEY || '' },
                { type: 'openai', apiKey: process.env.OPENAI_API_KEY || '' },
                { type: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY || '' },
                { type: 'google', apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' },
                { type: 'xai', apiKey: process.env.XAI_API_KEY || '' },
                { type: 'minimax', apiKey: process.env.MINIMAX_API_KEY || '' },
            ].filter((config) => config.apiKey);
        return new AIProvider(defaultConfigs);
    }
}
export function createAIProvider(configs) {
    return AIProvider.createFromEnv(configs);
}
