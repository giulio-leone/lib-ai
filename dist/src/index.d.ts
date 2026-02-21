/**
 * @onecoach/lib-ai
 *
 * Core AI capabilities, model management, and provider abstractions.
 */
export { ToolLoopAgent, tool, stepCountIs, convertToModelMessages, generateText, streamText, Output, type UIMessage, type LanguageModel, } from 'ai';
export * from './ai-model.service';
export * from './ai-provider';
export * from './ai-framework-config.service';
export * from './chat.service';
export * from './openrouter-subkey.service';
export * from './provider-options-builder';
export { AIProvider, createAIProvider, MINIMAX_MODELS } from './sdk/ai-provider';
export { type IAIProvider, type AIProviderInitConfig, type AIProviderType, type AIProviderInstance, handleError, } from './sdk/types';
export * from './core/providers';
export * from './core/providers/ai-provider-config.service';
export * from './core/providers/provider-factory';
export * from './core/providers/provider-options.service';
export { getModelByTier } from './core/providers/config';
export * from './utils/model-factory';
export * from './prompts/exercise';
export * from './constants';
export * from './types';
export type { ModelTier, ProviderName, ModelConfig, GeminiThinkingLevel, } from './core/providers/types';
export { resolveProviderFromModelId, MODEL_PREFIX_REGISTRY } from '@onecoach/types-ai';
