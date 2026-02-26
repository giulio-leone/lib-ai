/**
 * Provider Options Service
 *
 * Handles provider-specific options for reasoning and other features.
 * Follows Single Responsibility Principle by focusing only on provider options.
 */

import { type ModelConfig } from './types';
import { AI_REASONING_CONFIG } from '@giulio-leone/constants';

/**
 * Builds provider-specific options for AI model execution
 */
export class ProviderOptionsService {
  /**
   * Build provider options for reasoning and provider routing
   */
  static buildProviderOptions(
    config: ModelConfig,
    reasoning?: boolean,
    reasoningEffort?: 'low' | 'medium' | 'high',
    defaultProvider?: string | null
  ): Record<string, unknown> {
    switch (config.provider) {
      case 'openrouter':
        return this.buildOpenRouterOptions(
          config.model,
          reasoning ?? false,
          reasoningEffort,
          defaultProvider
        );
      case 'openai':
        return reasoning ? this.buildOpenAIOptions(reasoningEffort) : {};
      case 'anthropic':
        return reasoning ? this.buildAnthropicOptions(reasoningEffort) : {};
      case 'google':
        return reasoning ? this.buildGoogleOptions(reasoningEffort) : {};
      case 'xai':
        return reasoning ? this.buildXAIOptions(reasoningEffort) : {};
      default:
        return {};
    }
  }

  private static buildOpenRouterOptions(
    model: string,
    reasoning: boolean,
    reasoningEffort?: 'low' | 'medium' | 'high',
    defaultProvider?: string | null
  ): Record<string, unknown> {
    const options: Record<string, unknown> = {};

    // Aggiungi provider se specificato (sempre, anche senza reasoning)
    if (defaultProvider?.trim()) {
      options.provider = defaultProvider.trim();
    }

    // Aggiungi reasoning options solo se abilitato
    if (reasoning) {
      if (model.includes('grok-4-fast')) {
        options.reasoning = { enabled: true };
      } else if (model.includes('claude')) {
        options.reasoning = { max_tokens: 16000 };
      } else {
        options.reasoning = {
          effort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT,
        };
      }
    }

    // Restituisci solo se ci sono opzioni da passare
    return Object.keys(options).length > 0 ? { openrouter: options } : {};
  }

  private static buildOpenAIOptions(
    reasoningEffort?: 'low' | 'medium' | 'high'
  ): Record<string, unknown> {
    return {
      openai: {
        reasoning: true,
        reasoningEffort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT,
      },
    };
  }

  private static buildAnthropicOptions(
    reasoningEffort?: 'low' | 'medium' | 'high'
  ): Record<string, unknown> {
    return {
      anthropic: {
        reasoning: true,
        reasoningEffort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT,
      },
    };
  }

  private static buildGoogleOptions(
    reasoningEffort?: 'low' | 'medium' | 'high'
  ): Record<string, unknown> {
    return {
      google: {
        reasoning: true,
        reasoningEffort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT,
      },
    };
  }

  private static buildXAIOptions(
    reasoningEffort?: 'low' | 'medium' | 'high'
  ): Record<string, unknown> {
    return {
      xai: {
        reasoning: true,
        reasoningEffort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT,
      },
    };
  }
}
