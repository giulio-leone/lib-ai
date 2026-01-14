/**
 * AI Provider Config Service
 *
 * Gestisce le credenziali API per i provider supportati
 * API keys principali sono gestite su Vercel Environment Variables (secrets)
 * Database contiene solo metadata (isEnabled, defaultModel, etc.)
 */
import { prisma } from '@onecoach/lib-core/prisma';
import { AIProvider } from '@prisma/client';
import {
  createEnvVar,
  getEnvVarByKey,
  updateEnvVar,
  envVarExists,
} from '@onecoach/lib-vercel-admin/vercel-env-vars-api.service';
import { logError } from '@onecoach/lib-shared/utils/error';
import { logger } from '@onecoach/lib-shared/utils/logger';
export const PROVIDER_MAP = {
  google: {
    enum: AIProvider.GOOGLE,
    env: 'GOOGLE_GENERATIVE_AI_API_KEY',
    label: 'Google AI Studio',
  },
  anthropic: {
    enum: AIProvider.ANTHROPIC,
    env: 'ANTHROPIC_API_KEY',
    label: 'Anthropic Claude',
  },
  openai: {
    enum: AIProvider.OPENAI,
    env: 'OPENAI_API_KEY',
    label: 'OpenAI',
  },
  xai: {
    enum: AIProvider.XAI,
    env: 'XAI_API_KEY',
    label: 'xAI Grok',
  },
  openrouter: {
    enum: AIProvider.OPENROUTER,
    env: 'OPENROUTER_API_KEY',
    label: 'OpenRouter',
  },
  minimax: {
    enum: AIProvider.MINIMAX,
    env: 'MINIMAX_API_KEY',
    label: 'MiniMax',
  },
};
export class AIProviderConfigService {
  static normalizeEnvValue(value) {
    if (!value) {
      return null;
    }
    let trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      trimmed = trimmed.slice(1, -1);
    }
    return trimmed.length > 0 ? trimmed : null;
  }
  static async getEnvKeyStatus(provider) {
    const mapping = PROVIDER_MAP[provider];
    const envValue = this.normalizeEnvValue(process.env[mapping.env]);
    const hasKeyInEnv = Boolean(envValue);
    let hasKey = hasKeyInEnv;
    if (!hasKeyInEnv) {
      try {
        hasKey = await envVarExists(mapping.env);
      } catch (error) {
        logError(`Errore verifica env var ${mapping.env}`, error);
        hasKey = false;
      }
    }
    return {
      envValue,
      hasKeyInEnv,
      hasKey,
    };
  }
  /**
   * Restituisce la configurazione per un provider
   */
  static async getConfig(provider) {
    return prisma.ai_provider_configs.findUnique({
      where: { provider: PROVIDER_MAP[provider].enum },
    });
  }
  /**
   * Restituisce tutte le configurazioni (non include la chiave in chiaro)
   * Verifica se API key esiste su Vercel per determinare hasKey
   */
  static async listConfigs() {
    const configs = await prisma.ai_provider_configs.findMany({
      select: {
        provider: true,
        isEnabled: true,
        defaultModel: true,
        metadata: true,
        updatedAt: true,
        updatedBy: true,
      },
      orderBy: { provider: 'asc' },
    });
    const configMap = new Map();
    for (const config of configs) {
      const providerName = this.enumToProviderName(config.provider);
      configMap.set(providerName, config);
    }
    const providerEntries = Object.entries(PROVIDER_MAP);
    return Promise.all(
      providerEntries.map(async ([providerName, mapping]) => {
        const storedConfig = configMap.get(providerName);
        const envStatus = await this.getEnvKeyStatus(providerName);
        if (process.env.NODE_ENV === 'development') {
          if (!envStatus.hasKeyInEnv) {
            logger.debug(`[AIProviderConfig] ${mapping.env} non trovata in process.env`, {
              provider: providerName,
              envKey: mapping.env,
              envKeys: Object.keys(process.env).filter((k) => k.includes('API_KEY')),
            });
          } else {
            logger.debug(`[AIProviderConfig] ${mapping.env} trovata`, {
              provider: providerName,
              envKey: mapping.env,
              length: envStatus.envValue?.length ?? 0,
              startsWith: envStatus.envValue?.substring(0, 10) ?? '',
            });
          }
        }
        return this.toDTO(
          storedConfig?.provider ?? mapping.enum,
          {
            isEnabled: storedConfig?.isEnabled ?? false,
            apiKey: envStatus.hasKey ? '***' : null, // Placeholder - non leggiamo la chiave
            updatedAt: storedConfig?.updatedAt ?? null,
            updatedBy: storedConfig?.updatedBy ?? null,
            metadata: storedConfig?.metadata ?? null,
          },
          storedConfig?.defaultModel ?? null
        );
      })
    );
  }
  /**
   * Aggiorna runtime environment e cache dopo sincronizzazione Vercel
   */
  static async updateRuntimeEnv(envKey, apiKey) {
    process.env[envKey] = apiKey;
    // Import dinamico per evitare dipendenze circolari
    const { ProviderFactory } = await import('./provider-factory');
    ProviderFactory.clearCache();
  }
  /**
   * Sincronizza API key con Vercel Environment Variables
   * Crea o aggiorna la env var su Vercel e aggiorna runtime
   */
  static async syncToVercel(provider, apiKey, environments = ['production', 'preview']) {
    const mapping = PROVIDER_MAP[provider];
    const envKey = mapping.env;
    try {
      const existingResult = await getEnvVarByKey(envKey);
      // Aggiorna esistente o crea nuova
      const result =
        existingResult.success && existingResult.data
          ? await updateEnvVar({
              envId: existingResult.data.id,
              value: apiKey,
              environments,
              sensitive: true,
            })
          : await createEnvVar({
              key: envKey,
              value: apiKey,
              environments,
              sensitive: true,
            });
      if (result.success && result.data) {
        this.updateRuntimeEnv(envKey, apiKey);
        return {
          success: true,
          envVarId: result.data.id || existingResult.data?.id,
        };
      }
      return {
        success: false,
        error: result.error || 'Errore nella sincronizzazione con Vercel',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  /**
   * Aggiorna o crea configurazione per provider
   * NON salva più apiKey nel DB - solo su Vercel
   */
  static async upsertConfig(params) {
    const mapping = PROVIDER_MAP[params.provider];
    const existing = await prisma.ai_provider_configs.findUnique({
      where: { provider: mapping.enum },
    });
    // Prepara e aggiorna metadata
    const existingMetadata =
      existing?.metadata &&
      typeof existing.metadata === 'object' &&
      !Array.isArray(existing.metadata)
        ? existing.metadata
        : {};
    // Aggiorna defaultProvider se specificato
    if (params.defaultProvider !== undefined) {
      if (params.defaultProvider?.trim()) {
        existingMetadata.defaultProvider = params.defaultProvider.trim();
      } else {
        delete existingMetadata.defaultProvider;
      }
    }
    // buildMetadata preserva tutti i campi esistenti e gestisce solo history
    const metadataToSave = this.buildMetadata(
      Object.keys(existingMetadata).length > 0 ? existingMetadata : null,
      {
        changeReason: params.changeReason,
        updatedBy: params.updatedBy,
      }
    );
    // Sincronizza API key con Vercel se fornita
    let vercelEnvVarId = existing?.vercelEnvVarId || undefined;
    let vercelSyncError = undefined;
    if (params.apiKey) {
      const syncResult = await this.syncToVercel(params.provider, params.apiKey);
      if (syncResult.success && syncResult.envVarId) {
        vercelEnvVarId = syncResult.envVarId;
      } else {
        // Salva l'errore per poterlo restituire
        vercelSyncError =
          syncResult.error || 'Errore sconosciuto nella sincronizzazione con Vercel';
        // Log dell'errore per debugging
        logError(`Errore sincronizzazione Vercel per ${params.provider}`, {
          error: vercelSyncError,
        });
      }
      // Nota: anche se sync fallisce, continuiamo con l'aggiornamento metadata
    }
    // Aggiorna solo metadata nel DB (NON apiKey)
    const updated = await prisma.ai_provider_configs.upsert({
      where: { provider: mapping.enum },
      update: {
        // NON aggiornare apiKey - è su Vercel
        ...(params.isEnabled !== undefined ? { isEnabled: params.isEnabled } : {}),
        ...(params.defaultModel !== undefined
          ? { defaultModel: params.defaultModel?.trim() || null }
          : {}),
        ...(metadataToSave !== undefined ? { metadata: metadataToSave } : {}),
        ...(vercelEnvVarId ? { vercelEnvVarId } : {}),
        updatedBy: params.updatedBy,
      },
      create: {
        provider: mapping.enum,
        // NON salvare apiKey - è su Vercel
        isEnabled: params.isEnabled ?? true,
        defaultModel: params.defaultModel?.trim() || null,
        ...(metadataToSave !== undefined ? { metadata: metadataToSave } : {}),
        ...(vercelEnvVarId ? { vercelEnvVarId } : {}),
        updatedBy: params.updatedBy,
        updatedAt: new Date(),
      },
    });
    const sanitizedValue = this.normalizeEnvValue(process.env[mapping.env]);
    const hasKeyInEnv = Boolean(sanitizedValue);
    let hasKeyOnVercel = hasKeyInEnv;
    if (!hasKeyInEnv) {
      try {
        hasKeyOnVercel = await envVarExists(mapping.env);
      } catch (error) {
        // Se fallisce, assume che la key non esista
        hasKeyOnVercel = false;
      }
    }
    return this.toDTO(
      updated.provider,
      {
        isEnabled: updated.isEnabled,
        apiKey: hasKeyOnVercel ? '***' : null, // Placeholder - non leggiamo la chiave
        updatedAt: updated.updatedAt,
        updatedBy: updated.updatedBy,
        metadata: updated.metadata ?? null,
      },
      updated.defaultModel
    );
  }
  /**
   * Restituisce la chiave API per un provider.
   * Legge da Edge Config con fallback a process.env.
   */
  static async getApiKey(provider) {
    // Importa dinamicamente per evitare cicli o problemi di inizializzazione
    const { getDynamicAIProviderKey } = await import('@onecoach/lib-config/env.server');
    const apiKey = await getDynamicAIProviderKey(provider);
    // Verifica che la chiave esista e non sia vuota
    if (apiKey) {
      return this.normalizeEnvValue(apiKey);
    }
    const mapping = PROVIDER_MAP[provider];
    // Log di debug solo in sviluppo
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[AIProviderConfig] getApiKey: ${mapping.env} non trovata o vuota`, {
        provider,
        envKey: mapping.env,
        rawValue: process.env[mapping.env] ? 'presente ma vuoto o con virgolette' : 'non presente',
      });
    }
    return null;
  }
  static async getDefaultModel(provider) {
    // Single Source of Truth: ai_chat_models (Admin Dashboard > Models)
    // We look for the globally active default model
    const defaultModel = await prisma.ai_chat_models.findFirst({
      where: {
        isDefault: true,
        isActive: true,
        // Ensure we only return a model if it matches the requested provider
        provider: PROVIDER_MAP[provider].enum,
      },
      select: {
        modelId: true,
      },
    });
    return defaultModel?.modelId ?? null;
  }
  /**
   * Gets the default model WITH its provider from ai_chat_models table.
   * Used by getModelByTier to respect admin-configured provider.
   */
  static async getDefaultModelWithProvider() {
    // Single Source of Truth: ai_chat_models (Admin Dashboard > Models)
    // Get the globally active default model regardless of provider
    const defaultModel = await prisma.ai_chat_models.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
      select: {
        modelId: true,
        provider: true,
      },
    });
    if (!defaultModel) {
      return null;
    }
    // Convert AIProvider enum to ProviderName
    const providerName = this.enumToProviderName(defaultModel.provider);
    return {
      modelId: defaultModel.modelId,
      provider: providerName,
    };
  }
  /**
   * Estrae defaultProvider dal metadata
   */
  static extractDefaultProvider(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    const defaultProvider = metadata.defaultProvider;
    return typeof defaultProvider === 'string' && defaultProvider.trim()
      ? defaultProvider.trim()
      : null;
  }
  /**
   * Restituisce il provider predefinito per OpenRouter dal metadata
   */
  static async getDefaultProvider(provider) {
    if (provider !== 'openrouter') {
      return null;
    }
    const config = await prisma.ai_provider_configs.findUnique({
      where: { provider: PROVIDER_MAP[provider].enum },
      select: {
        metadata: true,
      },
    });
    return this.extractDefaultProvider(config?.metadata ?? null);
  }
  /**
   * Conversione a DTO (senza rivelare la chiave)
   */
  static toDTO(provider, data, defaultModel) {
    const providerName = this.enumToProviderName(provider);
    const defaultProvider =
      providerName === 'openrouter' ? this.extractDefaultProvider(data.metadata) : null;
    // hasKey è true se apiKey è presente (anche se è placeholder '***')
    const hasKey = Boolean(data.apiKey);
    return {
      provider: providerName,
      label: PROVIDER_MAP[providerName].label,
      isEnabled: data.isEnabled,
      hasKey,
      maskedKey: hasKey ? 'sk-***' : '', // Maschera generica - non leggiamo la chiave da Vercel
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
      defaultModel: defaultModel ?? null,
      defaultProvider,
      metadata: data.metadata ?? null,
    };
  }
  static enumToProviderName(provider) {
    const entry = Object.entries(PROVIDER_MAP).find(([, value]) => value.enum === provider);
    if (!entry) {
      throw new Error(`Provider non gestito: ${provider}`);
    }
    return entry[0];
  }
  static buildMetadata(current, params) {
    if (!params.changeReason) {
      return current && typeof current === 'object' && !Array.isArray(current)
        ? current
        : undefined;
    }
    const historyEntry = {
      reason: params.changeReason,
      updatedBy: params.updatedBy,
      updatedAt: new Date().toISOString(),
    };
    const currentObject =
      current && typeof current === 'object' && !Array.isArray(current) ? current : {};
    const historyValue = currentObject.history;
    const existingHistory = Array.isArray(historyValue) ? historyValue : [];
    const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);
    return {
      ...currentObject,
      history: updatedHistory,
    };
  }
  static getProviderMeta(provider) {
    const entry = PROVIDER_MAP[provider];
    return {
      label: entry.label,
      env: entry.env,
    };
  }
  static listProviderMeta() {
    return Object.entries(PROVIDER_MAP).map(([name, entry]) => ({
      provider: name,
      label: entry.label,
      env: entry.env,
      defaultModel: null,
    }));
  }
}
