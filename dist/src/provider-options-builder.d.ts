/**
 * Provider Options Builder Utility
 *
 * Centralizes the logic for building AI SDK provider options.
 * Handles OpenRouter specific features such as usage accounting and provider routing.
 *
 * Fulfills DRY principle by eliminating duplicate logic across multiple agents.
 */
import type { ProviderOptions } from '@ai-sdk/provider-utils';
/**
 * Builds standardized provider options for AI SDK calls.
 *
 * @param params - Configuration parameters
 * @returns ProviderOptions compatible with AI SDK v6
 */
export declare function buildProviderOptions(params: {
    /** The model ID being used */
    modelId: string;
    /** Optional specific provider to force (slug like 'minimax', 'deepinfra') */
    preferredProvider?: string | null;
    /** Whether to include usage accounting for OpenRouter (default: true) */
    enableUsageAccounting?: boolean;
}): ProviderOptions;
