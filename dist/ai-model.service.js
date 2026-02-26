import { AIProviderFactory, getAIProviderKey, prisma } from '@giulio-leone/lib-core';
import { AIProvider } from '@prisma/client';
import { envVarExists, getEnvVarByKey, updateEnvVar, createEnvVar } from '@giulio-leone/lib-vercel-admin';
import { logError, logger } from '@giulio-leone/lib-shared';
import { normalizeProviderName, resolveProviderFromModelId } from '@giulio-leone/types/ai';
import { TOKEN_LIMITS } from '@giulio-leone/constants';
import { OperationType } from '@giulio-leone/types/database';

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
                logger.debug(`[AIProviderConfig] ${mapping.env} non trovata in process.env`, {
                  provider: providerName,
                  envKey: mapping.env,
                  envKeys: Object.keys(process.env).filter((k) => k.includes("API_KEY"))
                });
              } else {
                logger.debug(`[AIProviderConfig] ${mapping.env} trovata`, {
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
          logger.debug(`[AIProviderConfig] getApiKey: ${mapping.env} non trovata o vuota`, {
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
  static async getFeatureModelConfig(feature, requestedModel, logger2) {
    const operationType = this.mapFeatureToOperationType(feature);
    return this.getStandardizedModelConfig(operationType, requestedModel, logger2);
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
  static async getStandardizedModelConfig(operationType, requestedModel, logger2) {
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
        logger2?.warn("AI_MODEL", "Failed to fetch operation config", { operationType, error: err });
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
        logger2?.warn("AI_MODEL", "Failed to fetch global default model", { error: err });
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
        logger2?.warn("AI_MODEL", "Failed to fetch model details", { modelId, error: err });
      }
    }
    let providerName = this.determineProvider(modelId);
    if (dbModel?.provider) {
      providerName = normalizeProviderName(dbModel.provider);
    }
    logger2?.info("AI_MODEL", "Model selected", {
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

export { AIModelService };
//# sourceMappingURL=ai-model.service.js.map
//# sourceMappingURL=ai-model.service.js.map