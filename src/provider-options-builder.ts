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
 * OpenRouter provider routing configuration
 * @see https://openrouter.ai/docs/features/provider-routing
 */
interface OpenRouterProviderConfig {
  /** Provider priority order (e.g., ['google-vertex', 'anthropic']) */
  order?: string[];
  /** Whether to allow fallback to other providers if preferred fails */
  allowFallbacks?: boolean;
}

/**
 * OpenRouter specific provider options structure
 * Extends Record for JSONObject compatibility with AI SDK
 */
interface OpenRouterOptions extends Record<string, unknown> {
  /** Usage tracking configuration */
  usage?: { include: boolean };
  /** Provider routing configuration */
  provider?: OpenRouterProviderConfig;
}

/**
 * Builds standardized provider options for AI SDK calls.
 *
 * @param params - Configuration parameters
 * @returns ProviderOptions compatible with AI SDK v6
 */
export function buildProviderOptions(params: {
  /** The model ID being used */
  modelId: string;
  /** Optional specific provider to force (slug like 'minimax', 'deepinfra') */
  preferredProvider?: string | null;
  /** Whether to include usage accounting for OpenRouter (default: true) */
  enableUsageAccounting?: boolean;
}): ProviderOptions {
  const { modelId, preferredProvider, enableUsageAccounting = true } = params;
  const isOpenRouter = modelId.includes('/');

  if (!isOpenRouter) {
    return {};
  }

  const openrouterOptions: OpenRouterOptions = {};

  // Enable Usage Accounting for OpenRouter cost tracking
  // https://openrouter.ai/docs/guides/routing/provider-selection#allowing-only-specific-providers
  if (enableUsageAccounting) {
    openrouterOptions.usage = { include: true };
  }

  // Handle provider routing
  // If a preferred provider is explicitly set, use it with strict routing (no fallbacks).
  // Otherwise, if the model is MiniMax, we force it to MiniMax provider via OpenRouter.
  // Per OpenRouter docs: https://openrouter.ai/docs/features/provider-routing
  // - Use `order` array to specify provider priority
  // - Use `allowFallbacks: false` to ensure ONLY the specified provider is used
  if (preferredProvider) {
    openrouterOptions.provider = {
      order: [preferredProvider],
      allowFallbacks: false,
    };
  } else if (modelId.toLowerCase().includes('minimax')) {
    openrouterOptions.provider = {
      order: ['minimax'],
      allowFallbacks: false,
    };
  }

  return {
    openrouter: openrouterOptions,
  } as ProviderOptions;
}
