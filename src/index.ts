/**
 * @giulio-leone/lib-ai
 *
 * Core AI capabilities, model management, and provider abstractions.
 */

// Re-export core Vercel AI SDK components for unified access
export {
  ToolLoopAgent,
  tool,
  stepCountIs,
  convertToModelMessages,
  generateText,
  streamText,
  Output,
  type UIMessage,
  type LanguageModel,
} from 'ai';

// Services
export * from './ai-model.service';
export * from './ai-provider';
export * from './ai-framework-config.service';
export * from './chat.service';
export * from './openrouter-subkey.service';
export * from './provider-options-builder';
// export * from './intent-detection.service'; // Ensure this exists and is exported if needed

// SDK
export { AIProvider, createAIProvider, MINIMAX_MODELS } from './sdk/ai-provider';
export {
  type IAIProvider,
  type AIProviderInitConfig,
  type AIProviderType,
  type AIProviderInstance,
  handleError,
} from './sdk/types';

// Core Providers
export * from './core/providers';
export * from './core/providers/ai-provider-config.service';
export * from './core/providers/provider-factory';
export * from './core/providers/provider-options.service';
export { getModelByTier } from './core/providers/config';

// Utils
export * from './utils/model-factory';
// export { parseJsonResponse } from './utils/json-parser'; // Check if exists

// Prompts
export * from './prompts/exercise';

// Constants & Types
export * from './constants';
export * from './types';
export type {
  ModelTier,
  ProviderName,
  ModelConfig,
  GeminiThinkingLevel,
} from './core/providers/types';

// Re-export provider resolution from types-ai SSOT
export { resolveProviderFromModelId, MODEL_PREFIX_REGISTRY } from '@giulio-leone/types/ai';
