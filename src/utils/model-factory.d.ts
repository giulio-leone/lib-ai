/**
 * Model Factory Utility
 *
 * Centralizes AI model creation logic.
 */
import type { ModelConfig } from '../core/providers/types';
/**
 * Creates an AI model instance with the given configuration
 */
export declare function createModel(
  modelConfig: ModelConfig,
  apiKey?: string,
  temperatureOverride?: number
): import('ai').LanguageModel;
/**
 * Creates a model instance with reasoning capabilities
 */
export declare function createReasoningModel(
  modelConfig: ModelConfig,
  apiKey?: string,
  enableReasoning?: boolean
): import('ai').LanguageModel;
/**
 * Creates a model instance optimized for intent detection
 */
export declare function createIntentDetectionModel(
  modelConfig: ModelConfig,
  apiKey?: string
): import('ai').LanguageModel;
/**
 * Creates a model instance with custom configuration
 */
export declare function createCustomModel(
  modelConfig: ModelConfig,
  overrides: {
    temperature?: number;
    maxTokens?: number;
    provider?: string;
    model?: string;
  },
  apiKey?: string
): import('ai').LanguageModel;
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
export declare function createModelWithOptions(
  modelConfig: ModelConfig,
  options?: ModelCreationOptions
): import('ai').LanguageModel;
//# sourceMappingURL=model-factory.d.ts.map
