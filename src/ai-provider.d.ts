import type { ModelTier } from './core/providers/types';
export declare class AIProvider {
  /**
   * Generates text using the default or specified model tier.
   */
  static generateText(prompt: string, tier?: ModelTier): Promise<string>;
}
//# sourceMappingURL=ai-provider.d.ts.map
