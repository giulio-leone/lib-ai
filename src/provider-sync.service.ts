/**
 * ProviderSyncService
 *
 * Hexagonal Port + Adapter for syncing AI model catalogs from external providers.
 * Fetches available models from provider APIs (OpenAI, Anthropic, OpenRouter, etc.)
 * and tests model availability.
 */

import { ProviderFactory } from './core/providers/provider-factory';
import type { ProviderName } from './core/providers/types';

// --- Port (Interface) ---

export interface ProviderModelData {
  modelId: string;
  name: string;
  description?: string;
  contextLength?: number;
  maxOutputTokens?: number;
  promptPrice?: number;
  completionPrice?: number;
  supportsImages?: boolean;
  supportsReasoning?: boolean;
  supportsStructuredOutput?: boolean;
}

export interface ModelTestResult {
  success: boolean;
  latencyMs: number;
  response?: string;
  error?: string;
}

export interface IProviderSyncService {
  getModels(provider: string): Promise<ProviderModelData[]>;
  testModel(provider: string, modelId: string): Promise<ModelTestResult>;
}

// --- Provider API Endpoints ---

const PROVIDER_LIST_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/models',
  openrouter: 'https://openrouter.ai/api/v1/models',
  anthropic: 'https://api.anthropic.com/v1/models',
};

const PROVIDER_ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  xai: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  minimax: 'MINIMAX_API_KEY',
};

// --- Adapter (Implementation) ---

class ProviderSyncServiceImpl implements IProviderSyncService {
  /**
   * Fetch available models from a provider's API.
   */
  async getModels(provider: string): Promise<ProviderModelData[]> {
    const normalizedProvider = provider.toLowerCase();
    const apiKey = this.getApiKey(normalizedProvider);

    if (!apiKey) {
      throw new Error(
        `No API key configured for provider: ${provider}`,
      );
    }

    const endpoint = PROVIDER_LIST_ENDPOINTS[normalizedProvider];
    if (!endpoint) {
      // For providers without a list API (Google, xAI, MiniMax),
      // return empty — admin can manually add models
      return [];
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };

    // Anthropic uses a different auth header
    if (normalizedProvider === 'anthropic') {
      delete headers['Authorization'];
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }

    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      throw new Error(
        `Provider API error (${provider}): ${response.status} ${response.statusText}`,
      );
    }

    const body = await response.json();
    return this.normalizeModels(normalizedProvider, body);
  }

  /**
   * Test a model by sending a minimal prompt and measuring latency.
   */
  async testModel(
    provider: string,
    modelId: string,
  ): Promise<ModelTestResult> {
    const start = Date.now();

    try {
      const config = {
        model: modelId,
        provider: provider.toLowerCase() as ProviderName,
        temperature: 0,
      };

      const model = ProviderFactory.getModel(config);

      // Dynamically import to avoid bundling issues
      const { generateText } = await import('ai');
      const result = await generateText({
        model,
        prompt: 'Reply with exactly: "OK"',
      });

      return {
        success: true,
        latencyMs: Date.now() - start,
        response: result.text?.trim(),
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // --- Private Helpers ---

  private getApiKey(provider: string): string | undefined {
    const envKey = PROVIDER_ENV_KEYS[provider];
    return envKey ? process.env[envKey] : undefined;
  }

  private normalizeModels(
    provider: string,
    body: unknown,
  ): ProviderModelData[] {
    const data = body as Record<string, unknown>;

    switch (provider) {
      case 'openai':
        return this.normalizeOpenAIModels(data);
      case 'anthropic':
        return this.normalizeAnthropicModels(data);
      case 'openrouter':
        return this.normalizeOpenRouterModels(data);
      default:
        return [];
    }
  }

  private normalizeOpenAIModels(
    body: Record<string, unknown>,
  ): ProviderModelData[] {
    const models = (body.data as Array<Record<string, unknown>>) ?? [];
    return models
      .filter((m: any) =>
          typeof m.id === 'string' &&
          (m.id.startsWith('gpt-') || m.id.startsWith('o')),
      )
      .map((m: any) => ({
        modelId: m.id as string,
        name: m.id as string,
        description: (m.description as string) ?? undefined,
      }));
  }

  private normalizeAnthropicModels(
    body: Record<string, unknown>,
  ): ProviderModelData[] {
    const models = (body.data as Array<Record<string, unknown>>) ?? [];
    return models.map((m: any) => ({
      modelId: m.id as string,
      name: (m.display_name as string) ?? (m.id as string),
      description: (m.description as string) ?? undefined,
      contextLength: (m.context_window as number) ?? undefined,
      maxOutputTokens: (m.max_output as number) ?? undefined,
    }));
  }

  private normalizeOpenRouterModels(
    body: Record<string, unknown>,
  ): ProviderModelData[] {
    const models = (body.data as Array<Record<string, unknown>>) ?? [];
    return models.map((m: any) => {
      const pricing = m.pricing as Record<string, string> | undefined;
      return {
        modelId: m.id as string,
        name: (m.name as string) ?? (m.id as string),
        description: (m.description as string) ?? undefined,
        contextLength: (m.context_length as number) ?? undefined,
        maxOutputTokens:
          (m.top_provider as Record<string, unknown>)
            ?.max_completion_tokens as number | undefined,
        promptPrice: pricing?.prompt
          ? parseFloat(pricing.prompt)
          : undefined,
        completionPrice: pricing?.completion
          ? parseFloat(pricing.completion)
          : undefined,
      };
    });
  }
}

/** Singleton instance */
export const providerSyncService: IProviderSyncService =
  new ProviderSyncServiceImpl();
