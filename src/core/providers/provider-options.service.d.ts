/**
 * Provider Options Service
 *
 * Handles provider-specific options for reasoning and other features.
 * Follows Single Responsibility Principle by focusing only on provider options.
 */
import { type ModelConfig } from './types';
/**
 * Builds provider-specific options for AI model execution
 */
export declare class ProviderOptionsService {
  /**
   * Build provider options for reasoning and provider routing
   */
  static buildProviderOptions(
    config: ModelConfig,
    reasoning?: boolean,
    reasoningEffort?: 'low' | 'medium' | 'high',
    defaultProvider?: string | null
  ): Record<string, unknown>;
  private static buildOpenRouterOptions;
  private static buildOpenAIOptions;
  private static buildAnthropicOptions;
  private static buildGoogleOptions;
  private static buildXAIOptions;
}
//# sourceMappingURL=provider-options.service.d.ts.map
