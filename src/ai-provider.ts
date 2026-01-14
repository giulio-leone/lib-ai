import { generateText } from 'ai';
import { createModel } from './utils/model-factory';
import { getModelByTier } from './core/providers/config';
import type { ModelTier } from './core/providers/types';

export class AIProvider {
  /**
   * Generates text using the default or specified model tier.
   */
  static async generateText(prompt: string, tier: ModelTier = 'balanced'): Promise<string> {
    const modelConfig = await getModelByTier(tier);
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const model = createModel(modelConfig, apiKey);

    const { text } = await generateText({
      model,
      prompt,
    });

    return text;
  }
}
