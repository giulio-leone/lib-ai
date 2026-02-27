import { logger, AIProviderFactory, getAIProviderKey, prisma } from '@giulio-leone/lib-core';
import { AIProvider } from '@prisma/client';
import { envVarExists, getEnvVarByKey, updateEnvVar, createEnvVar } from '@giulio-leone/lib-vercel-admin';
import { logError, logger as logger$1, toPrismaJsonValue, getCurrentTimestamp, createId, storageService } from '@giulio-leone/lib-shared';
import { generateText, Output, streamText } from 'ai';
export { Output, ToolLoopAgent, convertToModelMessages, generateText, stepCountIs, streamText, tool } from 'ai';
import { normalizeProviderName, resolveProviderFromModelId } from '@giulio-leone/types/ai';
export { MODEL_PREFIX_REGISTRY, resolveProviderFromModelId } from '@giulio-leone/types/ai';
import { TOKEN_LIMITS, AI_REASONING_CONFIG } from '@giulio-leone/constants';
import { OperationType } from '@giulio-leone/types/database';
import { createId as createId$1 } from '@giulio-leone/lib-shared/id-generator';
import crypto from 'crypto';

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/core/providers/provider-factory.ts
var provider_factory_exports = {};
__export(provider_factory_exports, {
  ProviderFactory: () => ProviderFactory
});
var ProviderFactory;
var init_provider_factory = __esm({
  "src/core/providers/provider-factory.ts"() {
    ProviderFactory = class {
      static providerInstances = /* @__PURE__ */ new Map();
      static modelCache = /* @__PURE__ */ new Map();
      /**
       * Get or create provider instance
       */
      static getProviderInstance(providerName, apiKey, preferredProvider) {
        const cacheKey = preferredProvider ? `${providerName}:${preferredProvider}` : providerName;
        const cached = this.providerInstances.get(cacheKey);
        if (cached && cached.apiKey === apiKey) {
          return cached.instance;
        }
        const instance = this.createProviderInstance(providerName, apiKey, preferredProvider);
        this.providerInstances.set(cacheKey, {
          instance,
          apiKey
        });
        return instance;
      }
      static createProviderInstance(providerName, apiKey, preferredProvider) {
        switch (providerName) {
          case "openrouter":
            return AIProviderFactory.createOpenRouter({ apiKey, preferredProvider });
          case "openai":
            return AIProviderFactory.createOpenAI(apiKey);
          case "anthropic":
            return AIProviderFactory.createAnthropic(apiKey);
          case "google":
            return AIProviderFactory.createGoogle(apiKey);
          case "xai":
            return AIProviderFactory.createXAI(apiKey);
          case "minimax":
            return AIProviderFactory.createMiniMax(apiKey);
          // Note: gemini-cli is async-only, handled in getModelAsync()
          default:
            throw new Error(`Unknown provider: ${providerName}`);
        }
      }
      static getEnvKey(providerName) {
        return getAIProviderKey(providerName);
      }
      /**
       * Get language model with caching (sync version)
       * NOTE: For gemini-cli, use getModelAsync() instead as it requires async initialization
       */
      static getModel(config) {
        if (config.provider === "gemini-cli") {
          throw new Error(
            "gemini-cli requires async initialization. Use ProviderFactory.getModelAsync() instead."
          );
        }
        const apiKey = config.apiKey ?? this.getEnvKey(config.provider) ?? "";
        if (!apiKey) {
          throw new Error(`API key non configurata per il provider ${config.provider}.`);
        }
        const cacheKey = `${config.provider}-${config.model}-${apiKey}-${config.preferredProvider || ""}`;
        if (!this.modelCache.has(cacheKey)) {
          const provider = this.getProviderInstance(config.provider, apiKey, config.preferredProvider);
          const modelOptions = {
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            reasoningEffort: config.reasoningEffort
          };
          const model = provider(config.model, modelOptions);
          this.modelCache.set(cacheKey, model);
        }
        return this.modelCache.get(cacheKey);
      }
      /**
       * Get language model with caching (async version)
       * Required for gemini-cli which uses dynamic imports for native modules
       */
      static async getModelAsync(config) {
        if (config.provider !== "gemini-cli") {
          return this.getModel(config);
        }
        const apiKey = config.apiKey ?? "";
        const thinkingLevel = config.thinkingLevel ?? "high";
        const cacheKey = `${config.provider}-${config.model}-${apiKey}-${thinkingLevel}`;
        if (!this.modelCache.has(cacheKey)) {
          const provider = await AIProviderFactory.createGeminiCli({
            apiKey: apiKey || void 0,
            thinkingLevel
          });
          const model = provider(config.model, {
            thinkingConfig: { thinkingLevel }
          });
          this.modelCache.set(cacheKey, model);
        }
        return this.modelCache.get(cacheKey);
      }
      /**
       * Clear all caches (useful for testing)
       */
      static clearCache() {
        this.providerInstances.clear();
        this.modelCache.clear();
      }
    };
  }
});

// src/core/providers/ai-provider-config.service.ts
var ai_provider_config_service_exports = {};
__export(ai_provider_config_service_exports, {
  AIProviderConfigService: () => AIProviderConfigService,
  PROVIDER_MAP: () => PROVIDER_MAP
});
var PROVIDER_MAP, AIProviderConfigService;
var init_ai_provider_config_service = __esm({
  "src/core/providers/ai-provider-config.service.ts"() {
    PROVIDER_MAP = {
      google: {
        enum: AIProvider.GOOGLE,
        env: "GOOGLE_GENERATIVE_AI_API_KEY",
        label: "Google AI Studio"
      },
      anthropic: {
        enum: AIProvider.ANTHROPIC,
        env: "ANTHROPIC_API_KEY",
        label: "Anthropic Claude"
      },
      openai: {
        enum: AIProvider.OPENAI,
        env: "OPENAI_API_KEY",
        label: "OpenAI"
      },
      xai: {
        enum: AIProvider.XAI,
        env: "XAI_API_KEY",
        label: "xAI Grok"
      },
      openrouter: {
        enum: AIProvider.OPENROUTER,
        env: "OPENROUTER_API_KEY",
        label: "OpenRouter"
      },
      minimax: {
        enum: AIProvider.MINIMAX,
        env: "MINIMAX_API_KEY",
        label: "MiniMax"
      },
      "gemini-cli": {
        enum: AIProvider.GEMINI_CLI,
        env: "GEMINI_CLI_AUTH",
        // OAuth uses ~/.gemini/oauth_creds.json, env var optional
        label: "Gemini CLI (OAuth)"
      }
    };
    AIProviderConfigService = class {
      static normalizeEnvValue(value) {
        if (!value) {
          return null;
        }
        let trimmed = value.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
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
          hasKey
        };
      }
      /**
       * Restituisce la configurazione per un provider
       */
      static async getConfig(provider) {
        return prisma.ai_provider_configs.findUnique({
          where: { provider: PROVIDER_MAP[provider].enum }
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
            updatedBy: true
          },
          orderBy: { provider: "asc" }
        });
        const configMap = /* @__PURE__ */ new Map();
        for (const config of configs) {
          const providerName = this.enumToProviderName(config.provider);
          configMap.set(providerName, config);
        }
        const providerEntries = Object.entries(PROVIDER_MAP);
        return Promise.all(
          providerEntries.map(async ([providerName, mapping]) => {
            const storedConfig = configMap.get(providerName);
            const envStatus = await this.getEnvKeyStatus(providerName);
            if (process.env.NODE_ENV === "development") {
              if (!envStatus.hasKeyInEnv) {
                logger$1.debug(`[AIProviderConfig] ${mapping.env} non trovata in process.env`, {
                  provider: providerName,
                  envKey: mapping.env,
                  envKeys: Object.keys(process.env).filter((k) => k.includes("API_KEY"))
                });
              } else {
                logger$1.debug(`[AIProviderConfig] ${mapping.env} trovata`, {
                  provider: providerName,
                  envKey: mapping.env,
                  length: envStatus.envValue?.length ?? 0,
                  startsWith: envStatus.envValue?.substring(0, 10) ?? ""
                });
              }
            }
            return this.toDTO(
              storedConfig?.provider ?? mapping.enum,
              {
                isEnabled: storedConfig?.isEnabled ?? false,
                apiKey: envStatus.hasKey ? "***" : null,
                // Placeholder - non leggiamo la chiave
                updatedAt: storedConfig?.updatedAt ?? null,
                updatedBy: storedConfig?.updatedBy ?? null,
                metadata: storedConfig?.metadata ?? null
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
        const { ProviderFactory: ProviderFactory2 } = await Promise.resolve().then(() => (init_provider_factory(), provider_factory_exports));
        ProviderFactory2.clearCache();
      }
      /**
       * Sincronizza API key con Vercel Environment Variables
       * Crea o aggiorna la env var su Vercel e aggiorna runtime
       */
      static async syncToVercel(provider, apiKey, environments = ["production", "preview"]) {
        const mapping = PROVIDER_MAP[provider];
        const envKey = mapping.env;
        try {
          const existingResult = await getEnvVarByKey(envKey);
          const result = existingResult.success && existingResult.data ? await updateEnvVar({
            envId: existingResult.data.id,
            value: apiKey,
            environments,
            sensitive: true
          }) : await createEnvVar({
            key: envKey,
            value: apiKey,
            environments,
            sensitive: true
          });
          if (result.success && result.data) {
            this.updateRuntimeEnv(envKey, apiKey);
            return {
              success: true,
              envVarId: result.data.id || existingResult.data?.id
            };
          }
          return {
            success: false,
            error: result.error || "Errore nella sincronizzazione con Vercel"
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
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
          where: { provider: mapping.enum }
        });
        const existingMetadata = existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata) ? existing.metadata : {};
        if (params.defaultProvider !== void 0) {
          if (params.defaultProvider?.trim()) {
            existingMetadata.defaultProvider = params.defaultProvider.trim();
          } else {
            delete existingMetadata.defaultProvider;
          }
        }
        const metadataToSave = this.buildMetadata(
          Object.keys(existingMetadata).length > 0 ? existingMetadata : null,
          {
            changeReason: params.changeReason,
            updatedBy: params.updatedBy
          }
        );
        let vercelEnvVarId = existing?.vercelEnvVarId || void 0;
        let vercelSyncError = void 0;
        if (params.apiKey) {
          const syncResult = await this.syncToVercel(params.provider, params.apiKey);
          if (syncResult.success && syncResult.envVarId) {
            vercelEnvVarId = syncResult.envVarId;
          } else {
            vercelSyncError = syncResult.error || "Errore sconosciuto nella sincronizzazione con Vercel";
            logError(`Errore sincronizzazione Vercel per ${params.provider}`, {
              error: vercelSyncError
            });
          }
        }
        const updated = await prisma.ai_provider_configs.upsert({
          where: { provider: mapping.enum },
          update: {
            // NON aggiornare apiKey - è su Vercel
            ...params.isEnabled !== void 0 ? { isEnabled: params.isEnabled } : {},
            ...params.defaultModel !== void 0 ? { defaultModel: params.defaultModel?.trim() || null } : {},
            ...metadataToSave !== void 0 ? { metadata: metadataToSave } : {},
            ...vercelEnvVarId ? { vercelEnvVarId } : {},
            updatedBy: params.updatedBy
          },
          create: {
            provider: mapping.enum,
            // NON salvare apiKey - è su Vercel
            isEnabled: params.isEnabled ?? true,
            defaultModel: params.defaultModel?.trim() || null,
            ...metadataToSave !== void 0 ? { metadata: metadataToSave } : {},
            ...vercelEnvVarId ? { vercelEnvVarId } : {},
            updatedBy: params.updatedBy,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        const sanitizedValue = this.normalizeEnvValue(process.env[mapping.env]);
        const hasKeyInEnv = Boolean(sanitizedValue);
        let hasKeyOnVercel = hasKeyInEnv;
        if (!hasKeyInEnv) {
          try {
            hasKeyOnVercel = await envVarExists(mapping.env);
          } catch (error) {
            hasKeyOnVercel = false;
          }
        }
        return this.toDTO(
          updated.provider,
          {
            isEnabled: updated.isEnabled,
            apiKey: hasKeyOnVercel ? "***" : null,
            // Placeholder - non leggiamo la chiave
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy,
            metadata: updated.metadata ?? null
          },
          updated.defaultModel
        );
      }
      /**
       * Restituisce la chiave API per un provider.
       * Legge da Edge Config con fallback a process.env.
       */
      static async getApiKey(provider) {
        const { getDynamicAIProviderKey } = await import('@giulio-leone/lib-config/env.server');
        const apiKey = await getDynamicAIProviderKey(provider);
        if (apiKey) {
          return this.normalizeEnvValue(apiKey);
        }
        const mapping = PROVIDER_MAP[provider];
        if (process.env.NODE_ENV === "development") {
          logger$1.debug(`[AIProviderConfig] getApiKey: ${mapping.env} non trovata o vuota`, {
            provider,
            envKey: mapping.env,
            rawValue: process.env[mapping.env] ? "presente ma vuoto o con virgolette" : "non presente"
          });
        }
        return null;
      }
      static async getDefaultModel(provider) {
        const defaultModel = await prisma.ai_chat_models.findFirst({
          where: {
            isDefault: true,
            isActive: true,
            // Ensure we only return a model if it matches the requested provider
            provider: PROVIDER_MAP[provider].enum
          },
          select: {
            modelId: true
          }
        });
        return defaultModel?.modelId ?? null;
      }
      /**
       * Gets the default model WITH its provider from ai_chat_models table.
       * Used by getModelByTier to respect admin-configured provider.
       */
      static async getDefaultModelWithProvider() {
        const defaultModel = await prisma.ai_chat_models.findFirst({
          where: {
            isDefault: true,
            isActive: true
          },
          select: {
            modelId: true,
            provider: true
          }
        });
        if (!defaultModel) {
          return null;
        }
        const providerName = this.enumToProviderName(defaultModel.provider);
        return {
          modelId: defaultModel.modelId,
          provider: providerName
        };
      }
      /**
       * Estrae defaultProvider dal metadata
       */
      static extractDefaultProvider(metadata) {
        if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
          return null;
        }
        const defaultProvider = metadata.defaultProvider;
        return typeof defaultProvider === "string" && defaultProvider.trim() ? defaultProvider.trim() : null;
      }
      /**
       * Restituisce il provider predefinito per OpenRouter dal metadata
       */
      static async getDefaultProvider(provider) {
        if (provider !== "openrouter") {
          return null;
        }
        const config = await prisma.ai_provider_configs.findUnique({
          where: { provider: PROVIDER_MAP[provider].enum },
          select: {
            metadata: true
          }
        });
        return this.extractDefaultProvider(config?.metadata ?? null);
      }
      /**
       * Conversione a DTO (senza rivelare la chiave)
       */
      static toDTO(provider, data, defaultModel) {
        const providerName = this.enumToProviderName(provider);
        const defaultProvider = providerName === "openrouter" ? this.extractDefaultProvider(data.metadata) : null;
        const hasKey = Boolean(data.apiKey);
        return {
          provider: providerName,
          label: PROVIDER_MAP[providerName].label,
          isEnabled: data.isEnabled,
          hasKey,
          maskedKey: hasKey ? "sk-***" : "",
          // Maschera generica - non leggiamo la chiave da Vercel
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
          defaultModel: defaultModel ?? null,
          defaultProvider,
          metadata: data.metadata ?? null
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
          return current && typeof current === "object" && !Array.isArray(current) ? current : void 0;
        }
        const historyEntry = {
          reason: params.changeReason,
          updatedBy: params.updatedBy,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        const currentObject = current && typeof current === "object" && !Array.isArray(current) ? current : {};
        const historyValue = currentObject.history;
        const existingHistory = Array.isArray(historyValue) ? historyValue : [];
        const updatedHistory = [historyEntry, ...existingHistory].slice(
          0,
          20
        );
        return {
          ...currentObject,
          history: updatedHistory
        };
      }
      static getProviderMeta(provider) {
        const entry = PROVIDER_MAP[provider];
        return {
          label: entry.label,
          env: entry.env
        };
      }
      static listProviderMeta() {
        return Object.entries(PROVIDER_MAP).map(([name, entry]) => ({
          provider: name,
          label: entry.label,
          env: entry.env,
          defaultModel: null
        }));
      }
    };
  }
});

// src/ai-model.service.ts
init_provider_factory();

// src/provider-options-builder.ts
function buildProviderOptions(params) {
  const { modelId, preferredProvider, enableUsageAccounting = true } = params;
  const isOpenRouter = modelId.includes("/");
  if (!isOpenRouter) {
    return {};
  }
  const openrouterOptions = {};
  if (enableUsageAccounting) {
    openrouterOptions.usage = { include: true };
  }
  if (preferredProvider) {
    openrouterOptions.provider = {
      order: [preferredProvider],
      allowFallbacks: false
    };
  } else if (modelId.toLowerCase().includes("minimax")) {
    openrouterOptions.provider = {
      order: ["minimax"],
      allowFallbacks: false
    };
  }
  return {
    openrouter: openrouterOptions
  };
}
var AIModelService = class {
  static _configCache = /* @__PURE__ */ new Map();
  static CACHE_TTL_MS = 6e4;
  // 60 seconds
  /**
   * Get feature-specific model configuration
   */
  static async getFeatureModelConfig(feature, requestedModel, logger3) {
    const operationType = this.mapFeatureToOperationType(feature);
    return this.getStandardizedModelConfig(operationType, requestedModel, logger3);
  }
  /**
   * Maps a feature name to a database OperationType
   */
  static mapFeatureToOperationType(feature) {
    const mapping = {
      chat: OperationType.CHAT_GENERATION,
      nutrition: OperationType.NUTRITION_GENERATION,
      workout: OperationType.WORKOUT_GENERATION,
      oneagenda: OperationType.ONEAGENDA_GENERATION
    };
    return mapping[feature] || OperationType.GENERAL_CHAT;
  }
  /**
   * Get standardized model configuration with the following priority:
   * 1. Requested Model (if provided and valid)
   * 2. Operation Type Config (if provided and exists in ai_operation_configs)
   * 3. Global Default (from ai_chat_models where isDefault: true)
   */
  static async getStandardizedModelConfig(operationType, requestedModel, logger3) {
    const cacheKey = `${operationType}_${requestedModel || "default"}`;
    const cached = this._configCache.get(cacheKey);
    if (cached && Date.now() - cached.__cachedAt < this.CACHE_TTL_MS) {
      return {
        modelId: cached.modelId,
        model: cached.model,
        maxTokens: cached.maxTokens,
        providerOptions: cached.providerOptions,
        supportsReasoning: cached.supportsReasoning
      };
    }
    let modelId = requestedModel;
    let maxTokens;
    let supportsReasoning = false;
    let preferredProvider = null;
    let selectionSource = "requested";
    let dbModel = null;
    if (!modelId && operationType) {
      try {
        const opConfig = await prisma.ai_operation_configs.findFirst({
          where: {
            operationType,
            isActive: true
          }
        });
        if (opConfig) {
          modelId = opConfig.model;
          maxTokens = opConfig.maxTokens;
          selectionSource = `operation_config:${operationType}`;
          const foundModel = await prisma.ai_chat_models.findFirst({
            where: {
              OR: [{ id: modelId }, { modelId }]
            }
          });
          if (foundModel) {
            dbModel = foundModel;
            modelId = foundModel.modelId;
            supportsReasoning = foundModel.supportsReasoning;
            preferredProvider = foundModel.preferredProvider;
          }
        }
      } catch (err) {
        logger3?.warn("AI_MODEL", "Failed to fetch operation config", { operationType, error: err });
      }
    }
    if (!modelId) {
      try {
        const globalDefault = await prisma.ai_chat_models.findFirst({
          where: {
            isDefault: true,
            isActive: true
          }
        });
        if (globalDefault) {
          dbModel = globalDefault;
          modelId = globalDefault.modelId;
          maxTokens = globalDefault.maxTokens;
          supportsReasoning = globalDefault.supportsReasoning;
          preferredProvider = globalDefault.preferredProvider;
          selectionSource = "global_default";
        }
      } catch (err) {
        logger3?.warn("AI_MODEL", "Failed to fetch global default model", { error: err });
      }
    }
    if (!modelId) {
      throw new Error(
        "Nessun modello AI configurato! Contatta l'amministratore per impostare un modello predefinito."
      );
    }
    if (!dbModel && (!maxTokens || !selectionSource.startsWith("operation"))) {
      try {
        const foundModel = await prisma.ai_chat_models.findFirst({
          where: {
            OR: [{ id: modelId }, { modelId }]
          }
        });
        if (foundModel) {
          dbModel = foundModel;
          if (!maxTokens) maxTokens = foundModel.maxTokens;
          supportsReasoning = foundModel.supportsReasoning;
          preferredProvider = foundModel.preferredProvider;
        }
      } catch (err) {
        logger3?.warn("AI_MODEL", "Failed to fetch model details", { modelId, error: err });
      }
    }
    let providerName = this.determineProvider(modelId);
    if (dbModel?.provider) {
      providerName = normalizeProviderName(dbModel.provider);
    }
    logger3?.info("AI_MODEL", "Model selected", {
      modelId,
      source: selectionSource,
      provider: providerName,
      supportsReasoning
    });
    const apiKey = await this.getApiKeyForProvider(providerName);
    let model;
    if (providerName === "gemini-cli") {
      model = await ProviderFactory.getModelAsync({
        provider: providerName,
        model: modelId,
        apiKey,
        preferredProvider
      });
    } else {
      const createProvider = ProviderFactory.createProviderInstance(
        providerName,
        apiKey,
        preferredProvider
      );
      model = createProvider(modelId);
    }
    const effectiveMaxTokens = Math.min(
      maxTokens ?? TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
      TOKEN_LIMITS.MAX_OUTPUT
    );
    const providerOptions = buildProviderOptions({
      modelId,
      preferredProvider,
      enableUsageAccounting: true
    });
    const result = {
      modelId,
      model,
      maxTokens: effectiveMaxTokens,
      providerOptions,
      supportsReasoning
    };
    this._configCache.set(cacheKey, { ...result, __cachedAt: Date.now() });
    return result;
  }
  static determineProvider(modelId) {
    return resolveProviderFromModelId(modelId);
  }
  static async getApiKeyForProvider(provider) {
    try {
      const { AIProviderConfigService: AIProviderConfigService2 } = await Promise.resolve().then(() => (init_ai_provider_config_service(), ai_provider_config_service_exports));
      const key = await AIProviderConfigService2.getApiKey(provider);
      return key || "";
    } catch (error) {
      const keyMap = {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        xai: process.env.XAI_API_KEY,
        minimax: process.env.MINIMAX_API_KEY,
        openrouter: process.env.OPENROUTER_API_KEY
      };
      return keyMap[provider] || "";
    }
  }
  /**
   * Get all active AI models from the database
   */
  static async getAvailableModels() {
    return prisma.ai_chat_models.findMany({
      where: { isActive: true },
      orderBy: { modelId: "asc" }
    });
  }
};

// src/utils/model-factory.ts
init_provider_factory();

// src/constants.ts
var MODEL_CONSTANTS = {
  /** Default temperature for general chat and generation */
  DEFAULT_TEMPERATURE: 1,
  /** Temperature for intent detection (lower = more deterministic) */
  INTENT_DETECTION_TEMPERATURE: 0.3,
  /** Max tokens for reasoning mode with extended thinking */
  REASONING_MAX_TOKENS: 32768,
  /** Reasoning effort level for supported models */
  REASONING_EFFORT: "high",
  /** Max tokens for intent detection */
  INTENT_DETECTION_MAX_TOKENS: 2048
};

// src/utils/model-factory.ts
function createModel(modelConfig, apiKey, temperatureOverride) {
  return ProviderFactory.getModel({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens: modelConfig.maxTokens,
    temperature: temperatureOverride ?? modelConfig.temperature,
    apiKey
  });
}
async function createModelAsync(modelConfig, apiKey, temperatureOverride) {
  return ProviderFactory.getModelAsync({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens: modelConfig.maxTokens,
    temperature: temperatureOverride ?? modelConfig.temperature,
    apiKey,
    thinkingLevel: modelConfig.thinkingLevel
  });
}
function createReasoningModel(modelConfig, apiKey, enableReasoning = true) {
  const maxTokens = enableReasoning ? MODEL_CONSTANTS.REASONING_MAX_TOKENS : modelConfig.maxTokens;
  const reasoningEffort = enableReasoning ? modelConfig.reasoningEffort ?? MODEL_CONSTANTS.REASONING_EFFORT : void 0;
  return ProviderFactory.getModel({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens,
    temperature: modelConfig.temperature,
    reasoningEffort,
    apiKey
  });
}
function createIntentDetectionModel(modelConfig, apiKey) {
  return ProviderFactory.getModel({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens: MODEL_CONSTANTS.INTENT_DETECTION_MAX_TOKENS,
    temperature: MODEL_CONSTANTS.INTENT_DETECTION_TEMPERATURE,
    apiKey
  });
}
function createCustomModel(modelConfig, overrides, apiKey) {
  return ProviderFactory.getModel({
    provider: overrides.provider ?? modelConfig.provider,
    model: overrides.model ?? modelConfig.model,
    maxTokens: overrides.maxTokens ?? modelConfig.maxTokens,
    temperature: overrides.temperature ?? modelConfig.temperature,
    apiKey
  });
}
function createModelWithOptions(modelConfig, options = {}) {
  const { apiKey, temperature, maxTokens, enableReasoning } = options;
  const finalMaxTokens = enableReasoning ? MODEL_CONSTANTS.REASONING_MAX_TOKENS : maxTokens ?? modelConfig.maxTokens;
  return ProviderFactory.getModel({
    provider: modelConfig.provider,
    model: modelConfig.model,
    maxTokens: finalMaxTokens,
    temperature: temperature ?? modelConfig.temperature,
    apiKey
  });
}
var MODEL_CONFIGS = {
  // Google AI Studio
  "gemini-2.5-flash": {
    provider: "google",
    model: "gemini-2.5-flash",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 5
  },
  "gemini-2.5-pro": {
    provider: "google",
    model: "gemini-2.5-pro",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 15
  },
  // Anthropic
  "claude-4-5-haiku": {
    provider: "anthropic",
    model: "claude-4-5-haiku",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 8
  },
  "claude-4-5-sonnet": {
    provider: "anthropic",
    model: "claude-4-5-sonnet",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 20
  },
  // OpenAI
  "gpt-5-medium": {
    provider: "openai",
    model: "gpt-5-medium",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 12
  },
  "gpt-5-high": {
    provider: "openai",
    model: "gpt-5-high",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 25
  },
  // xAI
  "grok-4-fast": {
    provider: "xai",
    model: "grok-4-fast",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 6
  },
  "grok-4": {
    provider: "xai",
    model: "grok-4",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 18
  },
  // OpenRouter
  "openrouter-claude-4-5-sonnet": {
    provider: "openrouter",
    model: "anthropic/claude-4-5-sonnet",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 22
  },
  "openrouter-gemini-2.5-flash": {
    provider: "openrouter",
    model: "google/gemini-2.5-flash",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 6
  },
  "openrouter-grok-4-fast": {
    provider: "openrouter",
    model: "x-ai/grok-4-fast",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 8
  },
  "openrouter-gpt-oss-120b": {
    provider: "openrouter",
    model: "openai/gpt-oss-120b",
    reasoningEnabled: true,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: 1,
    creditsPerRequest: 15,
    preferredProviders: ["Baseten", "Fireworks", "Groq", "Cerebras", "SambaNova"]
  }
};
async function getModelByTier(tier = "balanced") {
  const { AIProviderConfigService: AIProviderConfigService2 } = await Promise.resolve().then(() => (init_ai_provider_config_service(), ai_provider_config_service_exports));
  const adminConfig = await AIProviderConfigService2.getDefaultModelWithProvider();
  if (!adminConfig) {
    throw new Error(
      `[ModelConfig] No default model configured in admin dashboard. Please configure a default model in /admin/ai-settings.`
    );
  }
  console.warn(
    `[ModelConfig] Using admin-configured model for ${tier}: ${adminConfig.provider}/${adminConfig.modelId}`
  );
  const modelConfig = {
    provider: adminConfig.provider,
    // From DB - not hardcoded!
    model: adminConfig.modelId,
    // From DB
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: void 0,
    // Reasoning models don't support temperature
    reasoningEnabled: true,
    creditsPerRequest: 10
    // Default, can be made configurable later
  };
  return modelConfig;
}
function getFallbackChain() {
  return [
    MODEL_CONFIGS["openrouter-grok-4-fast"],
    // Primary: OpenRouter with x-ai/grok-4-fast
    MODEL_CONFIGS["claude-4-5-sonnet"],
    // Secondary: Anthropic direct
    MODEL_CONFIGS["openrouter-claude-4-5-sonnet"],
    // Tertiary: OpenRouter backup
    MODEL_CONFIGS["gemini-2.5-flash"],
    // Fast alternative
    MODEL_CONFIGS["grok-4-fast"]
    // Last resort: xAI direct
  ];
}

// src/types.ts
var FrameworkFeature = /* @__PURE__ */ ((FrameworkFeature2) => {
  FrameworkFeature2["CONSENSUS_SYSTEM"] = "consensus_system";
  FrameworkFeature2["SKILLS_SYSTEM"] = "skills_system";
  FrameworkFeature2["LEARNING_FEEDBACK_LOOP"] = "learning_feedback_loop";
  FrameworkFeature2["INTELLIGENT_MODE_SELECTION"] = "intelligent_mode_selection";
  FrameworkFeature2["AUTO_DECOMPOSITION"] = "auto_decomposition";
  FrameworkFeature2["ADAPTIVE_RECOVERY"] = "adaptive_recovery";
  FrameworkFeature2["COST_MONITORING"] = "cost_monitoring";
  FrameworkFeature2["ORCHESTRATION_TRACING"] = "orchestration_tracing";
  FrameworkFeature2["WORKOUT_GENERATION_RETRY"] = "workout_generation_retry";
  FrameworkFeature2["IMPORT_MODELS"] = "import_models";
  FrameworkFeature2["GENERATION_RECOVERY"] = "generation_recovery";
  return FrameworkFeature2;
})(FrameworkFeature || {});

// src/ai-framework-config.service.ts
var FEATURE_ALIASES = {
  workout_import: "import_models" /* IMPORT_MODELS */
};
function normalizeFeature(feature) {
  return FEATURE_ALIASES[feature] ?? feature;
}
var IMPORT_MODELS_DEFAULT = {
  spreadsheetModel: "",
  imageModel: "",
  pdfModel: "",
  documentModel: "",
  fallbackModel: "",
  creditCosts: {
    image: 8,
    pdf: 10,
    document: 8,
    spreadsheet: 6
  },
  maxRetries: 2,
  retryDelayBaseMs: 1e3
};
var DEFAULT_CONFIGS = {
  ["consensus_system" /* CONSENSUS_SYSTEM */]: {
    votingStrategy: "weighted",
    minModels: 2,
    maxModels: 3,
    confidenceThreshold: 0.7,
    modelTiers: ["fast", "balanced"],
    timeoutMs: 3e4
  },
  ["skills_system" /* SKILLS_SYSTEM */]: {
    enableBuiltInSkills: true,
    enableDomainSkills: true,
    enableCustomSkills: false,
    autoDiscovery: false,
    skillTimeout: 1e4
  },
  ["learning_feedback_loop" /* LEARNING_FEEDBACK_LOOP */]: {
    enableAdaptiveThresholds: true,
    enableMetricsCollection: true,
    enableFeedbackLoop: false,
    // Disabled by default until fully tested
    thresholdAdjustmentRate: 0.1,
    metricsRetentionDays: 30,
    minSamplesForAdjustment: 100
  },
  ["intelligent_mode_selection" /* INTELLIGENT_MODE_SELECTION */]: {
    useAISelection: true,
    enableCaching: true,
    fallbackMode: "planning",
    minConfidenceThreshold: 0.6
  },
  ["auto_decomposition" /* AUTO_DECOMPOSITION */]: {
    enableAutoDecomposition: true,
    maxDepth: 5,
    minConfidenceThreshold: 0.6,
    enableCaching: true
  },
  ["adaptive_recovery" /* ADAPTIVE_RECOVERY */]: {
    enableAdaptiveRecovery: true,
    maxRetries: 3,
    strategies: ["regenerate", "patch", "escalate"],
    confidenceThreshold: 0.7
  },
  ["cost_monitoring" /* COST_MONITORING */]: {
    enableMonitoring: true,
    budgetLimit: 1e3,
    // 1000 credits
    enableAlerts: true,
    alertThreshold: 80
    // 80%
  },
  ["orchestration_tracing" /* ORCHESTRATION_TRACING */]: {
    enableTracing: true,
    enablePerformanceMetrics: true,
    enableDecisionLogging: true,
    retentionDays: 7
  },
  ["workout_generation_retry" /* WORKOUT_GENERATION_RETRY */]: {
    count: 3
  },
  ["import_models" /* IMPORT_MODELS */]: IMPORT_MODELS_DEFAULT,
  ["generation_recovery" /* GENERATION_RECOVERY */]: {
    enabled: true,
    maxRetries: 3,
    stateRetentionHours: 24,
    errorFeedbackLevel: "detailed"
  }
};
var FEATURE_DESCRIPTIONS = {
  ["consensus_system" /* CONSENSUS_SYSTEM */]: "Multi-model voting system for improved accuracy and reliability",
  ["skills_system" /* SKILLS_SYSTEM */]: "Universal skills registry for extensible agent capabilities",
  ["learning_feedback_loop" /* LEARNING_FEEDBACK_LOOP */]: "Adaptive learning system that improves over time based on performance metrics",
  ["intelligent_mode_selection" /* INTELLIGENT_MODE_SELECTION */]: "AI-powered semantic mode selection for optimal task execution",
  ["auto_decomposition" /* AUTO_DECOMPOSITION */]: "Automatic task decomposition for complex operations",
  ["adaptive_recovery" /* ADAPTIVE_RECOVERY */]: "Smart error recovery with multiple fallback strategies",
  ["cost_monitoring" /* COST_MONITORING */]: "Real-time cost tracking and budget management",
  ["orchestration_tracing" /* ORCHESTRATION_TRACING */]: "Distributed tracing for orchestration debugging and analytics",
  ["workout_generation_retry" /* WORKOUT_GENERATION_RETRY */]: "Configuration for workout generation retry attempts",
  ["import_models" /* IMPORT_MODELS */]: "AI model configuration for import/parsing (CSV, XLSX, images, PDF, documents)",
  ["generation_recovery" /* GENERATION_RECOVERY */]: "AI generation state persistence for recovery. Resume from failure point with error feedback."
};
var AIFrameworkConfigService = class {
  /**
   * Get configuration for a specific feature
   */
  static async getConfig(feature) {
    const normalizedFeature = normalizeFeature(feature);
    let record = await prisma.ai_framework_configs.findUnique({
      where: { feature: normalizedFeature }
    });
    if (!record) {
      return {
        isEnabled: false,
        // All features disabled by default
        config: DEFAULT_CONFIGS[normalizedFeature]
      };
    }
    return {
      isEnabled: record.isEnabled,
      config: record.config || DEFAULT_CONFIGS[normalizedFeature]
    };
  }
  /**
   * Get all feature configurations
   */
  static async getAllConfigs() {
    return await prisma.ai_framework_configs.findMany({
      orderBy: { feature: "asc" }
    });
  }
  /**
   * Update configuration for a feature
   */
  static async updateConfig(params) {
    const { feature, isEnabled, config, updatedBy, changeReason } = params;
    const normalizedFeature = normalizeFeature(feature);
    const current = await this.getConfig(normalizedFeature);
    let mergedConfig = config ? { ...current.config, ...config } : current.config;
    if (normalizedFeature === "import_models" /* IMPORT_MODELS */ && config && "creditCosts" in config) {
      const currentConfig = current.config;
      const incomingCosts = config.creditCosts;
      if (incomingCosts) {
        mergedConfig = {
          ...mergedConfig,
          creditCosts: {
            ...currentConfig?.creditCosts || DEFAULT_CONFIGS["import_models" /* IMPORT_MODELS */].creditCosts,
            ...incomingCosts
          }
        };
      }
    }
    const updated = await prisma.ai_framework_configs.upsert({
      where: { feature: normalizedFeature },
      create: {
        feature: normalizedFeature,
        isEnabled: isEnabled ?? false,
        config: toPrismaJsonValue(mergedConfig),
        description: FEATURE_DESCRIPTIONS[normalizedFeature],
        updatedBy
      },
      update: {
        isEnabled: isEnabled ?? current.isEnabled,
        config: toPrismaJsonValue(mergedConfig),
        updatedBy,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    await this.createHistory({
      feature: normalizedFeature,
      isEnabled: updated.isEnabled,
      config: updated.config,
      changedBy: updatedBy,
      changeReason
    });
    return updated;
  }
  /**
   * Check if a feature is enabled
   */
  static async isFeatureEnabled(feature) {
    const { isEnabled } = await this.getConfig(feature);
    return isEnabled;
  }
  /**
   * Enable a feature
   */
  static async enableFeature(feature, updatedBy, changeReason) {
    return await this.updateConfig({
      feature,
      isEnabled: true,
      updatedBy,
      changeReason
    });
  }
  /**
   * Disable a feature
   */
  static async disableFeature(feature, updatedBy, changeReason) {
    return await this.updateConfig({
      feature,
      isEnabled: false,
      updatedBy,
      changeReason
    });
  }
  /**
   * Initialize default configurations
   */
  static async initializeDefaults(updatedBy = "system") {
    const handled = /* @__PURE__ */ new Set();
    for (const feature of Object.values(FrameworkFeature)) {
      const normalizedFeature = normalizeFeature(feature);
      if (handled.has(normalizedFeature)) continue;
      handled.add(normalizedFeature);
      const existing = await prisma.ai_framework_configs.findUnique({
        where: { feature: normalizedFeature }
      });
      if (!existing) {
        await prisma.ai_framework_configs.create({
          data: {
            feature: normalizedFeature,
            isEnabled: false,
            // All features disabled by default
            config: toPrismaJsonValue(DEFAULT_CONFIGS[normalizedFeature]),
            description: FEATURE_DESCRIPTIONS[normalizedFeature],
            updatedBy
          }
        });
      }
    }
  }
  /**
   * Create history record
   */
  static async createHistory(params) {
    return await prisma.ai_framework_config_history.create({
      data: params
    });
  }
  /**
   * Get configuration history for a feature
   */
  static async getHistory(feature) {
    const normalizedFeature = normalizeFeature(feature);
    return await prisma.ai_framework_config_history.findMany({
      where: { feature: normalizedFeature },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }
  /**
   * Get feature descriptions
   */
  static getFeatureDescription(feature) {
    return FEATURE_DESCRIPTIONS[normalizeFeature(feature)];
  }
  /**
   * Get all feature descriptions
   */
  static getAllFeatureDescriptions() {
    return FEATURE_DESCRIPTIONS;
  }
  /**
   * Validate configuration
   */
  static validateConfig(feature, config) {
    const errors = [];
    switch (feature) {
      case "consensus_system" /* CONSENSUS_SYSTEM */: {
        const c = config;
        if (c.minModels < 2 || c.minModels > 5) {
          errors.push("minModels must be between 2 and 5");
        }
        if (c.maxModels < c.minModels || c.maxModels > 5) {
          errors.push("maxModels must be >= minModels and <= 5");
        }
        if (c.confidenceThreshold < 0 || c.confidenceThreshold > 1) {
          errors.push("confidenceThreshold must be between 0 and 1");
        }
        break;
      }
      case "learning_feedback_loop" /* LEARNING_FEEDBACK_LOOP */: {
        const c = config;
        if (c.thresholdAdjustmentRate < 0 || c.thresholdAdjustmentRate > 1) {
          errors.push("thresholdAdjustmentRate must be between 0 and 1");
        }
        if (c.metricsRetentionDays < 1 || c.metricsRetentionDays > 365) {
          errors.push("metricsRetentionDays must be between 1 and 365");
        }
        break;
      }
      case "auto_decomposition" /* AUTO_DECOMPOSITION */: {
        const c = config;
        if (c.maxDepth < 1 || c.maxDepth > 10) {
          errors.push("maxDepth must be between 1 and 10");
        }
        break;
      }
      case "adaptive_recovery" /* ADAPTIVE_RECOVERY */: {
        const c = config;
        if (c.maxRetries < 1 || c.maxRetries > 5) {
          errors.push("maxRetries must be between 1 and 5");
        }
        break;
      }
      case "cost_monitoring" /* COST_MONITORING */: {
        const c = config;
        if (c.budgetLimit < 0) {
          errors.push("budgetLimit must be >= 0");
        }
        if (c.alertThreshold < 0 || c.alertThreshold > 100) {
          errors.push("alertThreshold must be between 0 and 100");
        }
        break;
      }
      case "import_models" /* IMPORT_MODELS */: {
        const c = config;
        if (c.maxRetries < 0 || c.maxRetries > 5) {
          errors.push("maxRetries must be between 0 and 5");
        }
        if (c.retryDelayBaseMs < 0) {
          errors.push("retryDelayBaseMs must be >= 0");
        }
        if (!c.creditCosts) {
          errors.push("creditCosts configuration is required");
          break;
        }
        ["image", "pdf", "document", "spreadsheet"].forEach((key) => {
          const value = c.creditCosts?.[key];
          if (value === void 0 || Number.isNaN(Number(value)) || value < 0) {
            errors.push(`creditCosts.${key} must be >= 0`);
          }
        });
        break;
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
};
var CONVERSATIONS_KEY = "conversations";
var ChatService = class {
  constructor(storage) {
    this.storage = storage;
  }
  /**
   * Crea una nuova conversazione
   */
  createConversation(title) {
    const now = getCurrentTimestamp();
    const conversation = {
      id: createId(),
      messages: [],
      createdAt: now,
      updatedAt: now,
      title
    };
    const conversations = this.getAllConversations();
    conversations.push(conversation);
    this.storage.set(CONVERSATIONS_KEY, conversations);
    return conversation;
  }
  /**
   * Ottiene una conversazione
   */
  getConversation(id) {
    const conversations = this.getAllConversations();
    return conversations.find((c) => c.id === id) || null;
  }
  /**
   * Ottiene tutte le conversazioni
   */
  getAllConversations() {
    return this.storage.get(CONVERSATIONS_KEY) || [];
  }
  /**
   * Aggiunge un messaggio a una conversazione
   */
  addMessage(conversationId, message) {
    const conversations = this.getAllConversations();
    const index = conversations.findIndex((c) => c.id === conversationId);
    if (index === -1) {
      return null;
    }
    const conversation = conversations[index];
    if (!conversation) {
      return null;
    }
    const newMessage = {
      ...message,
      id: createId(),
      timestamp: getCurrentTimestamp()
    };
    conversation.messages.push(newMessage);
    conversation.updatedAt = getCurrentTimestamp();
    this.storage.set(CONVERSATIONS_KEY, conversations);
    return newMessage;
  }
  /**
   * Elimina una conversazione
   */
  deleteConversation(id) {
    const conversations = this.getAllConversations();
    const filtered = conversations.filter((c) => c.id !== id);
    if (conversations.length === filtered.length) {
      return false;
    }
    this.storage.set(CONVERSATIONS_KEY, filtered);
    return true;
  }
  /**
   * Parsing semplice della risposta AI
   * Può essere esteso con regex o logica più complessa
   */
  parseAiResponse(response, type) {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const data = JSON.parse(jsonMatch[1]);
        return {
          type,
          data,
          rawMessage: response,
          success: true
        };
      }
      return {
        type,
        data: response,
        rawMessage: response,
        success: true
      };
    } catch (error) {
      return {
        type,
        data: null,
        rawMessage: response,
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse AI response"
      };
    }
  }
};
var chatService = new ChatService(storageService);
var log = logger.child("OpenRouterSubkeyService");
var OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
var OPENROUTER_PROVISIONING_KEY = process.env.OPENROUTER_PROVISIONING_KEY;
var OpenRouterSubkeyService = class {
  /**
   * Crea una subkey OpenRouter per l'utente
   * @param params Parametri per la creazione della subkey
   * @returns Informazioni sulla subkey creata
   */
  static async createSubkey(params) {
    const { userId, credits } = params;
    if (!OPENROUTER_PROVISIONING_KEY) {
      throw new Error("OPENROUTER_PROVISIONING_KEY non configurata");
    }
    const timestamp = Date.now();
    const keyLabel = `user-${userId}-${timestamp}`;
    const response = await fetch(`${OPENROUTER_BASE_URL}/keys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_PROVISIONING_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME || "onecoach"
      },
      body: JSON.stringify({
        label: keyLabel,
        limit: credits
        // Limite crediti uguale ai crediti acquistati
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Errore creazione subkey OpenRouter: ${response.status} ${errorData.error || response.statusText}`
      );
    }
    const data = await response.json();
    const apiKey = data.key || data.id;
    if (!apiKey) {
      throw new Error("Subkey creata ma chiave non restituita da OpenRouter");
    }
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    return {
      keyLabel,
      keyHash,
      limit: credits
    };
  }
  /**
   * Revoca una subkey OpenRouter
   * @param keyLabel Label della subkey da revocare
   */
  static async revokeSubkey(keyLabel) {
    if (!OPENROUTER_PROVISIONING_KEY) {
      throw new Error("OPENROUTER_PROVISIONING_KEY non configurata");
    }
    const apiKeyRecord = await prisma.user_api_keys.findFirst({
      where: {
        keyLabel,
        status: "ACTIVE"
      }
    });
    if (!apiKeyRecord) {
      log.warn(`Subkey ${keyLabel} non trovata nel database, tentativo revoca diretto`);
    }
    const response = await fetch(`${OPENROUTER_BASE_URL}/keys/${keyLabel}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${OPENROUTER_PROVISIONING_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Errore revoca subkey OpenRouter: ${response.status} ${errorData.error || response.statusText}`
      );
    }
    if (apiKeyRecord) {
      await prisma.user_api_keys.update({
        where: { id: apiKeyRecord.id },
        data: { status: "REVOKED", updatedAt: /* @__PURE__ */ new Date() }
      });
    }
  }
  /**
   * Salva una subkey nel database
   * @param params Parametri per il salvataggio
   * @param tx Client Prisma opzionale per transazioni
   * @returns Record della subkey salvata
   */
  static async saveSubkeyToDb(params, tx) {
    const { userId, provider, keyLabel, keyHash, limit, stripePaymentIntentId } = params;
    const client = tx ?? prisma;
    await client.user_api_keys.create({
      data: {
        id: createId$1(),
        userId,
        provider,
        keyLabel,
        keyHash,
        limit,
        status: "ACTIVE",
        stripePaymentIntentId,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Verifica se esiste già una subkey attiva per un payment intent
   * @param stripePaymentIntentId ID del payment intent
   * @returns true se esiste, false altrimenti
   */
  static async hasSubkeyForPaymentIntent(stripePaymentIntentId) {
    const existing = await prisma.user_api_keys.findFirst({
      where: {
        stripePaymentIntentId,
        status: "ACTIVE"
      }
    });
    return !!existing;
  }
};

// src/provider-sync.service.ts
init_provider_factory();
var PROVIDER_LIST_ENDPOINTS = {
  openai: "https://api.openai.com/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  anthropic: "https://api.anthropic.com/v1/models"
};
var PROVIDER_ENV_KEYS = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  minimax: "MINIMAX_API_KEY"
};
var ProviderSyncServiceImpl = class {
  /**
   * Fetch available models from a provider's API.
   */
  async getModels(provider) {
    const normalizedProvider = provider.toLowerCase();
    const apiKey = this.getApiKey(normalizedProvider);
    if (!apiKey) {
      throw new Error(
        `No API key configured for provider: ${provider}`
      );
    }
    const endpoint = PROVIDER_LIST_ENDPOINTS[normalizedProvider];
    if (!endpoint) {
      return [];
    }
    const headers = {
      Authorization: `Bearer ${apiKey}`
    };
    if (normalizedProvider === "anthropic") {
      delete headers["Authorization"];
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    }
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      throw new Error(
        `Provider API error (${provider}): ${response.status} ${response.statusText}`
      );
    }
    const body = await response.json();
    return this.normalizeModels(normalizedProvider, body);
  }
  /**
   * Test a model by sending a minimal prompt and measuring latency.
   */
  async testModel(provider, modelId) {
    const start = Date.now();
    try {
      const config = {
        modelId,
        provider: provider.toLowerCase(),
        temperature: 0
      };
      const model = ProviderFactory.getModel(config);
      const { generateText: generateText3 } = await import('ai');
      const result = await generateText3({
        model,
        prompt: 'Reply with exactly: "OK"',
        maxTokens: 10
      });
      return {
        success: true,
        latencyMs: Date.now() - start,
        response: result.text?.trim()
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  // --- Private Helpers ---
  getApiKey(provider) {
    const envKey = PROVIDER_ENV_KEYS[provider];
    return envKey ? process.env[envKey] : void 0;
  }
  normalizeModels(provider, body) {
    const data = body;
    switch (provider) {
      case "openai":
        return this.normalizeOpenAIModels(data);
      case "anthropic":
        return this.normalizeAnthropicModels(data);
      case "openrouter":
        return this.normalizeOpenRouterModels(data);
      default:
        return [];
    }
  }
  normalizeOpenAIModels(body) {
    const models = body.data ?? [];
    return models.filter(
      (m) => typeof m.id === "string" && (m.id.startsWith("gpt-") || m.id.startsWith("o"))
    ).map((m) => ({
      modelId: m.id,
      name: m.id,
      description: m.description ?? void 0
    }));
  }
  normalizeAnthropicModels(body) {
    const models = body.data ?? [];
    return models.map((m) => ({
      modelId: m.id,
      name: m.display_name ?? m.id,
      description: m.description ?? void 0,
      contextLength: m.context_window ?? void 0,
      maxOutputTokens: m.max_output ?? void 0
    }));
  }
  normalizeOpenRouterModels(body) {
    const models = body.data ?? [];
    return models.map((m) => {
      const pricing = m.pricing;
      return {
        modelId: m.id,
        name: m.name ?? m.id,
        description: m.description ?? void 0,
        contextLength: m.context_length ?? void 0,
        maxOutputTokens: m.top_provider?.max_completion_tokens,
        promptPrice: pricing?.prompt ? parseFloat(pricing.prompt) : void 0,
        completionPrice: pricing?.completion ? parseFloat(pricing.completion) : void 0
      };
    });
  }
};
var providerSyncService = new ProviderSyncServiceImpl();
var GenerationStateServiceImpl = class {
  /**
   * Retrieve all recoverable generation states for a user,
   * optionally filtered by generation type.
   */
  async getRecoverableStates(userId, type) {
    const where = { userId };
    if (type) where.type = type;
    const states = await prisma.generation_states.findMany({
      where,
      orderBy: { updatedAt: "desc" }
    });
    return states.map((s) => this.toGenerationState(s));
  }
  /**
   * Delete a generation state by ID.
   */
  async deleteState(stateId) {
    await prisma.generation_states.delete({
      where: { id: stateId }
    });
  }
  /**
   * Create a new generation state checkpoint.
   */
  async saveState(state) {
    const created = await prisma.generation_states.create({
      data: {
        userId: state.userId,
        type: state.type,
        currentPhase: state.currentPhase,
        completedPhases: state.completedPhases,
        context: state.context,
        checkpoints: state.checkpoints,
        lastError: state.lastError
      }
    });
    return this.toGenerationState(created);
  }
  /**
   * Update the current phase and optionally merge new context.
   */
  async updatePhase(stateId, phase, context) {
    const existing = await prisma.generation_states.findUniqueOrThrow({
      where: { id: stateId }
    });
    const completedPhases = [
      ...existing.completedPhases ?? [],
      existing.currentPhase
    ];
    await prisma.generation_states.update({
      where: { id: stateId },
      data: {
        currentPhase: phase,
        completedPhases,
        ...context !== void 0 ? { context } : {}
      }
    });
  }
  // --- Private Helpers ---
  toGenerationState(row) {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      currentPhase: row.currentPhase,
      completedPhases: row.completedPhases ?? [],
      context: row.context,
      checkpoints: row.checkpoints,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
};
var GenerationStateService = new GenerationStateServiceImpl();
var WorkflowProgressServiceImpl = class {
  /**
   * Create a new workflow run metadata record.
   */
  async createRun(input) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO workflow.workflow_run_metadata 
       (run_id, user_id, workflow_type, agent_id, input_data, estimated_duration_ms, total_steps, progress)
       VALUES ($1, $2, $3::text::"WorkflowType", $4, $5::jsonb, $6, $7, 0)`,
      input.runId,
      input.userId,
      input.workflowType,
      input.agentId,
      input.inputData ? JSON.stringify(input.inputData) : null,
      input.estimatedDurationMs ?? null,
      input.totalSteps ?? null
    );
  }
  /**
   * Update the progress of a running workflow.
   */
  async updateProgress(input) {
    await prisma.$executeRawUnsafe(
      `UPDATE workflow.workflow_run_metadata 
       SET progress = $2, current_step = $3
       WHERE run_id = $1`,
      input.runId,
      Math.min(Math.max(input.progress, 0), 100),
      input.currentStep ?? null
    );
  }
  /**
   * Mark a workflow as successfully completed.
   */
  async completeWorkflow(input) {
    await prisma.$executeRawUnsafe(
      `UPDATE workflow.workflow_run_metadata 
       SET progress = 100, 
           completed_at = NOW(),
           output_data = $2::jsonb,
           result_entity_type = $3,
           result_entity_id = $4
       WHERE run_id = $1`,
      input.runId,
      input.outputData ? JSON.stringify(input.outputData) : null,
      input.resultEntityType ?? null,
      input.resultEntityId ?? null
    );
  }
  /**
   * Mark a workflow as failed with an error message.
   */
  async failWorkflow(input) {
    await prisma.$executeRawUnsafe(
      `UPDATE workflow.workflow_run_metadata 
       SET error_message = $2, completed_at = NOW()
       WHERE run_id = $1`,
      input.runId,
      input.errorMessage
    );
  }
};
var workflowProgressService = new WorkflowProgressServiceImpl();

// src/sdk/types.ts
function handleError(error) {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error(String(error));
}
var MINIMAX_MODELS = [
  "MiniMax-M2",
  "MiniMax-M2-Stable",
  "MiniMax-M2.1"
];
function clampMinimaxTemperature(temp) {
  if (temp === void 0) return void 0;
  return Math.min(1, Math.max(0.01, temp));
}
function isMiniMaxDirectModel(modelString) {
  const modelLower = modelString.toLowerCase();
  return MINIMAX_MODELS.some((m) => m.toLowerCase() === modelLower) || modelLower.startsWith("minimax-m2");
}
function resolveProviderType(modelString) {
  return resolveProviderFromModelId(modelString);
}
var AIProvider2 = class _AIProvider {
  providers = /* @__PURE__ */ new Map();
  constructor(configs) {
    for (const config of configs) {
      this.initProvider(config);
    }
  }
  initProvider(config) {
    switch (config.type) {
      case "openrouter":
        this.providers.set("openrouter", AIProviderFactory.createOpenRouter({ apiKey: config.apiKey }));
        break;
      case "openai":
        this.providers.set("openai", AIProviderFactory.createOpenAI(config.apiKey));
        break;
      case "anthropic":
        this.providers.set("anthropic", AIProviderFactory.createAnthropic(config.apiKey));
        break;
      case "google":
        this.providers.set("google", AIProviderFactory.createGoogle(config.apiKey));
        break;
      case "xai":
        this.providers.set("xai", AIProviderFactory.createXAI(config.apiKey));
        break;
      case "minimax":
        this.providers.set("minimax", AIProviderFactory.createMiniMax(config.apiKey));
        break;
    }
  }
  getProvider(modelString) {
    const providerType = resolveProviderType(modelString);
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider '${providerType}' not initialized for model: ${modelString}`);
    }
    return provider;
  }
  async generateStructuredOutput(params) {
    const provider = this.getProvider(params.model);
    const modelName = params.model.trim().replace(/\s+/g, "");
    const isOpenRouter = params.model.includes("/");
    if (isOpenRouter && params.onLog) {
      params.onLog("[AIProvider] OpenRouter call", { model: modelName });
    }
    const model = provider(modelName);
    try {
      const messages = [];
      if (params.systemPrompt) {
        messages.push({ role: "system", content: params.systemPrompt });
      }
      messages.push({ role: "user", content: params.prompt });
      const isMiniMaxDirect = isMiniMaxDirectModel(params.model);
      const temperature = isMiniMaxDirect ? clampMinimaxTemperature(params.temperature) : params.temperature;
      const result = await generateText({
        model,
        output: Output.object({ schema: params.schema }),
        messages,
        maxOutputTokens: params.maxTokens,
        ...temperature !== void 0 && { temperature },
        ...params.abortSignal && { abortSignal: params.abortSignal },
        providerOptions: buildProviderOptions({ modelId: params.model })
      });
      const usage = result.usage;
      const providerMetadata = result.providerMetadata;
      let costUSD;
      if (isOpenRouter && providerMetadata) {
        const openrouterMeta = providerMetadata;
        if (openrouterMeta.openrouter?.usage?.cost !== void 0) {
          costUSD = openrouterMeta.openrouter.usage.cost;
        }
      }
      return {
        output: result.output,
        usage: {
          totalTokens: usage.totalTokens || 0,
          costUSD
        }
      };
    } catch (error) {
      console.error("[AIProvider] Error generating object:", error);
      throw handleError(error);
    }
  }
  async generateText(params) {
    const provider = this.getProvider(params.model);
    const model = provider(params.model);
    const isOpenRouter = params.model.includes("/");
    const messages = [];
    if (params.systemPrompt) {
      messages.push({ role: "system", content: params.systemPrompt });
    }
    messages.push({ role: "user", content: params.prompt });
    const isMiniMaxDirect = isMiniMaxDirectModel(params.model);
    const temperature = isMiniMaxDirect ? clampMinimaxTemperature(params.temperature) : params.temperature;
    const result = streamText({
      model,
      messages,
      ...temperature !== void 0 && { temperature },
      providerOptions: buildProviderOptions({ modelId: params.model })
    });
    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }
    const usage = await result.usage;
    const providerMetadata = await result.providerMetadata;
    let costUSD;
    if (isOpenRouter && providerMetadata) {
      const openrouterMeta = providerMetadata;
      if (openrouterMeta.openrouter?.usage?.cost !== void 0) {
        costUSD = openrouterMeta.openrouter.usage.cost;
      }
    }
    return {
      text: fullText,
      usage: {
        totalTokens: usage.totalTokens || 0,
        costUSD
      }
    };
  }
  async *streamText(params) {
    const provider = this.getProvider(params.model);
    const model = provider(params.model);
    const messages = [];
    if (params.systemPrompt) {
      messages.push({ role: "system", content: params.systemPrompt });
    }
    messages.push({ role: "user", content: params.prompt });
    const result = streamText({
      model,
      messages,
      providerOptions: buildProviderOptions({ modelId: params.model })
    });
    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }
  streamStructuredOutput(params) {
    const provider = this.getProvider(params.model);
    const modelName = params.model.trim().replace(/\s+/g, "");
    const isOpenRouter = params.model.includes("/");
    const model = provider(modelName);
    const isMiniMaxDirect = isMiniMaxDirectModel(params.model);
    let effectiveTemperature = params.temperature;
    if (isMiniMaxDirect) {
      effectiveTemperature = clampMinimaxTemperature(params.temperature);
      if (params.onLog && params.temperature !== effectiveTemperature) {
        params.onLog("[MiniMax] Temperature clamped", {
          original: params.temperature,
          clamped: effectiveTemperature
        });
      }
    }
    const providerOptions = isOpenRouter ? buildProviderOptions({
      modelId: params.model,
      preferredProvider: params.model.toLowerCase().includes("minimax") ? "minimax" : void 0
    }) : void 0;
    const messages = [];
    if (params.systemPrompt) {
      messages.push({ role: "system", content: params.systemPrompt });
    }
    messages.push({ role: "user", content: params.prompt });
    const result = streamText({
      model,
      output: Output.object({ schema: params.schema }),
      messages,
      abortSignal: params.abortSignal,
      ...effectiveTemperature !== void 0 && { temperature: effectiveTemperature },
      ...providerOptions ? { providerOptions } : {},
      onError({ error }) {
        params.onError?.(error);
      }
    });
    void result.usage.then((usage) => {
      params.onLog?.("AIProvider structured stream usage", usage);
    });
    return {
      partialOutputStream: result.partialOutputStream,
      output: Promise.resolve(result.output).then((o) => {
        if (o === void 0) throw new Error("Structured output was undefined");
        return o;
      }),
      usage: Promise.resolve(result.usage).then((u) => ({
        totalTokens: u.totalTokens || 0
      }))
    };
  }
  static createFromEnv(configs) {
    const defaultConfigs = configs || [
      { type: "openrouter", apiKey: process.env.OPENROUTER_API_KEY || "" },
      { type: "openai", apiKey: process.env.OPENAI_API_KEY || "" },
      { type: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY || "" },
      { type: "google", apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" },
      { type: "xai", apiKey: process.env.XAI_API_KEY || "" },
      { type: "minimax", apiKey: process.env.MINIMAX_API_KEY || "" }
    ].filter((config) => config.apiKey);
    return new _AIProvider(defaultConfigs);
  }
};
function createAIProvider(configs) {
  return AIProvider2.createFromEnv(configs);
}

// src/core/providers/index.ts
init_provider_factory();
var ProviderOptionsService = class {
  /**
   * Build provider options for reasoning and provider routing
   */
  static buildProviderOptions(config, reasoning, reasoningEffort, defaultProvider) {
    switch (config.provider) {
      case "openrouter":
        return this.buildOpenRouterOptions(
          config.model,
          reasoning ?? false,
          reasoningEffort,
          defaultProvider
        );
      case "openai":
        return reasoning ? this.buildOpenAIOptions(reasoningEffort) : {};
      case "anthropic":
        return reasoning ? this.buildAnthropicOptions(reasoningEffort) : {};
      case "google":
        return reasoning ? this.buildGoogleOptions(reasoningEffort) : {};
      case "xai":
        return reasoning ? this.buildXAIOptions(reasoningEffort) : {};
      default:
        return {};
    }
  }
  static buildOpenRouterOptions(model, reasoning, reasoningEffort, defaultProvider) {
    const options = {};
    if (defaultProvider?.trim()) {
      options.provider = defaultProvider.trim();
    }
    if (reasoning) {
      if (model.includes("grok-4-fast")) {
        options.reasoning = { enabled: true };
      } else if (model.includes("claude")) {
        options.reasoning = { max_tokens: 16e3 };
      } else {
        options.reasoning = {
          effort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT
        };
      }
    }
    return Object.keys(options).length > 0 ? { openrouter: options } : {};
  }
  static buildOpenAIOptions(reasoningEffort) {
    return {
      openai: {
        reasoning: true,
        reasoningEffort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT
      }
    };
  }
  static buildAnthropicOptions(reasoningEffort) {
    return {
      anthropic: {
        reasoning: true,
        reasoningEffort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT
      }
    };
  }
  static buildGoogleOptions(reasoningEffort) {
    return {
      google: {
        reasoning: true,
        reasoningEffort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT
      }
    };
  }
  static buildXAIOptions(reasoningEffort) {
    return {
      xai: {
        reasoning: true,
        reasoningEffort: reasoningEffort || AI_REASONING_CONFIG.DEFAULT_REASONING_EFFORT
      }
    };
  }
};

// src/core/providers/index.ts
init_ai_provider_config_service();

// src/index.ts
init_ai_provider_config_service();
init_provider_factory();

// src/prompts/exercise.ts
var EXERCISE_SYSTEM_PROMPT = `You are a certified strength coach and exercise database expert. Provide biomechanically sound movements, correct muscle targeting, and clear safety cues. Always respect provided schemas and return structured JSON when requested.`;
var EXERCISE_TOOL_USAGE_PROMPT = `Tools available: generate_exercises, create_exercise_variants, search_exercises. Choose the smallest set of tools to satisfy the user; avoid unnecessary calls.`;

export { AIFrameworkConfigService, AIModelService, AIProvider2 as AIProvider, AIProviderConfigService, EXERCISE_SYSTEM_PROMPT, EXERCISE_TOOL_USAGE_PROMPT, FrameworkFeature, GenerationStateService, MINIMAX_MODELS, MODEL_CONFIGS, MODEL_CONSTANTS, OpenRouterSubkeyService, PROVIDER_MAP, ProviderFactory, ProviderOptionsService, buildProviderOptions, chatService, createAIProvider, createCustomModel, createIntentDetectionModel, createModel, createModelAsync, createModelWithOptions, createReasoningModel, getFallbackChain, getModelByTier, handleError, providerSyncService, workflowProgressService };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map