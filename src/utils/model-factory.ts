/**
 * Model Factory Utility
 * @deprecated Use AIProvider from @onecoach/lib-ai instead for unified AI SDK v6 support.
 *
 * Centralizes AI model creation logic.
 */

import { ProviderFactory } from '../core/providers/provider-factory';
import type { ModelConfig, ProviderName } from '../core/providers/types';
import { MODEL_CONSTANTS } from '../constants';

/**
 * Creates an AI model instance with the given configuration
 * NOTE: For gemini-cli, use createModelAsync() instead
 */
export function createModel(
  modelConfig: ModelConfig,
  apiKey?: string,
  temperatureOverride?: number
) {
  return ProviderFactory.getModel({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens: modelConfig.maxTokens,
    temperature: temperatureOverride ?? modelConfig.temperature,
    apiKey,
  });
}

/**
 * Creates an AI model instance asynchronously
 * Required for providers like gemini-cli that use dynamic imports
 */
export async function createModelAsync(
  modelConfig: ModelConfig,
  apiKey?: string,
  temperatureOverride?: number
) {
  return ProviderFactory.getModelAsync({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens: modelConfig.maxTokens,
    temperature: temperatureOverride ?? modelConfig.temperature,
    apiKey,
    thinkingLevel: modelConfig.thinkingLevel,
  });
}

/**
 * Creates a model instance with reasoning capabilities
 */
export function createReasoningModel(
  modelConfig: ModelConfig,
  apiKey?: string,
  enableReasoning: boolean = true
) {
  const maxTokens = enableReasoning ? MODEL_CONSTANTS.REASONING_MAX_TOKENS : modelConfig.maxTokens;
  const reasoningEffort = enableReasoning
    ? (modelConfig.reasoningEffort ?? MODEL_CONSTANTS.REASONING_EFFORT)
    : undefined;

  return ProviderFactory.getModel({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens,
    temperature: modelConfig.temperature,
    reasoningEffort,
    apiKey,
  });
}

/**
 * Creates a model instance optimized for intent detection
 */
export function createIntentDetectionModel(modelConfig: ModelConfig, apiKey?: string) {
  return ProviderFactory.getModel({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens: MODEL_CONSTANTS.INTENT_DETECTION_MAX_TOKENS,
    temperature: MODEL_CONSTANTS.INTENT_DETECTION_TEMPERATURE,
    apiKey,
  });
}

/**
 * Creates a model instance with custom configuration
 */
export function createCustomModel(
  modelConfig: ModelConfig,
  overrides: {
    temperature?: number;
    maxTokens?: number;
    provider?: string;
    model?: string;
  },
  apiKey?: string
) {
  return ProviderFactory.getModel({
    provider: (overrides.provider as ProviderName | undefined) ?? modelConfig.provider,
    model: overrides.model ?? modelConfig.model,
    maxTokens: overrides.maxTokens ?? modelConfig.maxTokens,
    temperature: overrides.temperature ?? modelConfig.temperature,
    apiKey,
  });
}

/**
 * Model creation options
 */
export interface ModelCreationOptions {
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  enableReasoning?: boolean;
}

/**
 * Creates a model with options object (more flexible API)
 */
export function createModelWithOptions(
  modelConfig: ModelConfig,
  options: ModelCreationOptions = {}
) {
  const { apiKey, temperature, maxTokens, enableReasoning } = options;

  const finalMaxTokens = enableReasoning
    ? MODEL_CONSTANTS.REASONING_MAX_TOKENS
    : (maxTokens ?? modelConfig.maxTokens);

  return ProviderFactory.getModel({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens: finalMaxTokens,
    temperature: temperature ?? modelConfig.temperature,
    apiKey,
  });
}
