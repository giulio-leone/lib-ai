import { AIProviderFactory, getAIProviderKey } from '@giulio-leone/lib-core';

// src/core/providers/provider-factory.ts
var ProviderFactory = class {
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

// src/constants.ts
var MODEL_CONSTANTS = {
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

export { createCustomModel, createIntentDetectionModel, createModel, createModelAsync, createModelWithOptions, createReasoningModel };
//# sourceMappingURL=model-factory.js.map
//# sourceMappingURL=model-factory.js.map