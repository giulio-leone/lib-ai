/**
 * Provider Options Builder Utility
 *
 * Centralizes the logic for building AI SDK provider options.
 * Handles OpenRouter specific features such as usage accounting and provider routing.
 *
 * Fulfills DRY principle by eliminating duplicate logic across multiple agents.
 */
/**
 * Builds standardized provider options for AI SDK calls.
 *
 * @param params - Configuration parameters
 * @returns Record of provider-specific options
 */
export function buildProviderOptions(params) {
    const { modelId, preferredProvider, enableUsageAccounting = true } = params;
    const isOpenRouter = modelId.includes('/');
    if (!isOpenRouter) {
        return {};
    }
    const options = {
        openrouter: {},
    };
    // Enable Usage Accounting for OpenRouter cost tracking
    // https://openrouter.ai/docs/guides/routing/provider-selection#allowing-only-specific-providers
    if (enableUsageAccounting) {
        options.openrouter.usage = { include: true };
    }
    // Handle provider routing
    // If a preferred provider is explicitly set, use it with strict routing (no fallbacks).
    // Otherwise, if the model is MiniMax, we force it to MiniMax provider via OpenRouter.
    // Per OpenRouter docs: https://openrouter.ai/docs/features/provider-routing
    // - Use `order` array to specify provider priority
    // - Use `allow_fallbacks: false` to ensure ONLY the specified provider is used
    if (preferredProvider) {
        options.openrouter.provider = { 
            order: [preferredProvider],
            allow_fallbacks: false 
        };
    }
    else if (modelId.toLowerCase().includes('minimax')) {
        options.openrouter.provider = { 
            order: ['minimax'],
            allow_fallbacks: false 
        };
    }
    return options;
}
