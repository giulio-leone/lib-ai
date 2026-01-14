/**
 * Model Factory Utility
 * @deprecated Use AIProvider from @onecoach/lib-ai instead for unified AI SDK v6 support.
 *
 * Centralizes AI model creation logic.
 */
import { ProviderFactory } from '../core/providers/provider-factory';
import { MODEL_CONSTANTS } from '../constants';
/**
 * Creates an AI model instance with the given configuration
 * NOTE: For gemini-cli, use createModelAsync() instead
 */
export function createModel(modelConfig, apiKey, temperatureOverride) {
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
export async function createModelAsync(modelConfig, apiKey, temperatureOverride) {
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
export function createReasoningModel(modelConfig, apiKey, enableReasoning = true) {
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
export function createIntentDetectionModel(modelConfig, apiKey) {
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
export function createCustomModel(modelConfig, overrides, apiKey) {
    return ProviderFactory.getModel({
        provider: overrides.provider ?? modelConfig.provider,
        model: overrides.model ?? modelConfig.model,
        maxTokens: overrides.maxTokens ?? modelConfig.maxTokens,
        temperature: overrides.temperature ?? modelConfig.temperature,
        apiKey,
    });
}
/**
 * Creates a model with options object (more flexible API)
 */
export function createModelWithOptions(modelConfig, options = {}) {
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
