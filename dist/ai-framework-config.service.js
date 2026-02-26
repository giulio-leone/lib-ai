import { prisma } from '@giulio-leone/lib-core';
import '@prisma/client';
import { toPrismaJsonValue } from '@giulio-leone/lib-shared';

// src/ai-framework-config.service.ts

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

export { AIFrameworkConfigService };
//# sourceMappingURL=ai-framework-config.service.js.map
//# sourceMappingURL=ai-framework-config.service.js.map