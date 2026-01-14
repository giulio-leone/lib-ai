/**
 * AI Framework Configuration Service
 *
 * Gestisce le configurazioni avanzate del framework agentico:
 * - Consensus system (multi-model voting)
 * - Skills system (universal skills registry)
 * - Learning feedback loop (adaptive thresholds)
 * - Mode selection intelligence
 * - Decomposition strategies
 */
import { prisma } from '@onecoach/lib-core/prisma';
import { Prisma } from '@prisma/client';
/**
 * Framework features disponibili
 */
export var FrameworkFeature;
(function (FrameworkFeature) {
    FrameworkFeature["CONSENSUS_SYSTEM"] = "consensus_system";
    FrameworkFeature["SKILLS_SYSTEM"] = "skills_system";
    FrameworkFeature["LEARNING_FEEDBACK_LOOP"] = "learning_feedback_loop";
    FrameworkFeature["INTELLIGENT_MODE_SELECTION"] = "intelligent_mode_selection";
    FrameworkFeature["AUTO_DECOMPOSITION"] = "auto_decomposition";
    FrameworkFeature["ADAPTIVE_RECOVERY"] = "adaptive_recovery";
    FrameworkFeature["COST_MONITORING"] = "cost_monitoring";
    FrameworkFeature["ORCHESTRATION_TRACING"] = "orchestration_tracing";
    FrameworkFeature["WORKOUT_GENERATION_RETRY"] = "workout_generation_retry";
    FrameworkFeature["IMPORT_MODELS"] = "import_models";
    FrameworkFeature["WORKOUT_IMPORT"] = "workout_import";
    FrameworkFeature["GENERATION_RECOVERY"] = "generation_recovery";
})(FrameworkFeature || (FrameworkFeature = {}));
const FEATURE_ALIASES = {
    [FrameworkFeature.WORKOUT_IMPORT]: FrameworkFeature.IMPORT_MODELS,
};
function normalizeFeature(feature) {
    return FEATURE_ALIASES[feature] ?? feature;
}
const IMPORT_MODELS_DEFAULT = {
    spreadsheetModel: '',
    imageModel: '',
    pdfModel: '',
    documentModel: '',
    fallbackModel: '',
    creditCosts: {
        image: 8,
        pdf: 10,
        document: 8,
        spreadsheet: 6,
    },
    maxRetries: 2,
    retryDelayBaseMs: 1000,
};
/**
 * Default configurations per feature
 */
const DEFAULT_CONFIGS = {
    [FrameworkFeature.CONSENSUS_SYSTEM]: {
        votingStrategy: 'weighted',
        minModels: 2,
        maxModels: 3,
        confidenceThreshold: 0.7,
        modelTiers: ['fast', 'balanced'],
        timeoutMs: 30000,
    },
    [FrameworkFeature.SKILLS_SYSTEM]: {
        enableBuiltInSkills: true,
        enableDomainSkills: true,
        enableCustomSkills: false,
        autoDiscovery: false,
        skillTimeout: 10000,
    },
    [FrameworkFeature.LEARNING_FEEDBACK_LOOP]: {
        enableAdaptiveThresholds: true,
        enableMetricsCollection: true,
        enableFeedbackLoop: false, // Disabled by default until fully tested
        thresholdAdjustmentRate: 0.1,
        metricsRetentionDays: 30,
        minSamplesForAdjustment: 100,
    },
    [FrameworkFeature.INTELLIGENT_MODE_SELECTION]: {
        useAISelection: true,
        enableCaching: true,
        fallbackMode: 'planning',
        minConfidenceThreshold: 0.6,
    },
    [FrameworkFeature.AUTO_DECOMPOSITION]: {
        enableAutoDecomposition: true,
        maxDepth: 5,
        minConfidenceThreshold: 0.6,
        enableCaching: true,
    },
    [FrameworkFeature.ADAPTIVE_RECOVERY]: {
        enableAdaptiveRecovery: true,
        maxRetries: 3,
        strategies: ['regenerate', 'patch', 'escalate'],
        confidenceThreshold: 0.7,
    },
    [FrameworkFeature.COST_MONITORING]: {
        enableMonitoring: true,
        budgetLimit: 1000, // 1000 credits
        enableAlerts: true,
        alertThreshold: 80, // 80%
    },
    [FrameworkFeature.ORCHESTRATION_TRACING]: {
        enableTracing: true,
        enablePerformanceMetrics: true,
        enableDecisionLogging: true,
        retentionDays: 7,
    },
    [FrameworkFeature.WORKOUT_GENERATION_RETRY]: {
        count: 3,
    },
    [FrameworkFeature.IMPORT_MODELS]: IMPORT_MODELS_DEFAULT,
    [FrameworkFeature.WORKOUT_IMPORT]: IMPORT_MODELS_DEFAULT,
    [FrameworkFeature.GENERATION_RECOVERY]: {
        enabled: true,
        maxRetries: 3,
        stateRetentionHours: 24,
        errorFeedbackLevel: 'detailed',
    },
};
/**
 * Feature descriptions
 */
const FEATURE_DESCRIPTIONS = {
    [FrameworkFeature.CONSENSUS_SYSTEM]: 'Multi-model voting system for improved accuracy and reliability',
    [FrameworkFeature.SKILLS_SYSTEM]: 'Universal skills registry for extensible agent capabilities',
    [FrameworkFeature.LEARNING_FEEDBACK_LOOP]: 'Adaptive learning system that improves over time based on performance metrics',
    [FrameworkFeature.INTELLIGENT_MODE_SELECTION]: 'AI-powered semantic mode selection for optimal task execution',
    [FrameworkFeature.AUTO_DECOMPOSITION]: 'Automatic task decomposition for complex operations',
    [FrameworkFeature.ADAPTIVE_RECOVERY]: 'Smart error recovery with multiple fallback strategies',
    [FrameworkFeature.COST_MONITORING]: 'Real-time cost tracking and budget management',
    [FrameworkFeature.ORCHESTRATION_TRACING]: 'Distributed tracing for orchestration debugging and analytics',
    [FrameworkFeature.WORKOUT_GENERATION_RETRY]: 'Configuration for workout generation retry attempts',
    [FrameworkFeature.IMPORT_MODELS]: 'AI model configuration for import/parsing (CSV, XLSX, images, PDF, documents)',
    [FrameworkFeature.WORKOUT_IMPORT]: 'Deprecated alias for import models (CSV, XLSX, images, PDF, documents)',
    [FrameworkFeature.GENERATION_RECOVERY]: 'AI generation state persistence for recovery. Resume from failure point with error feedback.',
};
/**
 * AI Framework Config Service
 */
export class AIFrameworkConfigService {
    /**
     * Get configuration for a specific feature
     */
    static async getConfig(feature) {
        const normalizedFeature = normalizeFeature(feature);
        let record = await prisma.ai_framework_configs.findUnique({
            where: { feature: normalizedFeature },
        });
        // Fallback: se feature alias esiste ancora, usa quella config per compatibilità
        if (!record && normalizedFeature !== feature) {
            record = await prisma.ai_framework_configs.findUnique({
                where: { feature },
            });
        }
        // Migrazione soft: se non troviamo la config nuova ma esiste quella legacy, clona e rimuovi legacy
        if (!record && normalizedFeature === FrameworkFeature.IMPORT_MODELS) {
            const legacy = await prisma.ai_framework_configs.findUnique({
                where: { feature: FrameworkFeature.WORKOUT_IMPORT },
            });
            if (legacy) {
                record = await prisma.ai_framework_configs.upsert({
                    where: { feature: normalizedFeature },
                    create: {
                        feature: normalizedFeature,
                        isEnabled: legacy.isEnabled,
                        config: legacy.config ?? Prisma.JsonNull,
                        description: FEATURE_DESCRIPTIONS[normalizedFeature],
                        updatedBy: legacy.updatedBy ?? 'system',
                    },
                    update: {
                        isEnabled: legacy.isEnabled,
                        config: legacy.config ?? Prisma.JsonNull,
                        description: FEATURE_DESCRIPTIONS[normalizedFeature],
                        updatedAt: new Date(),
                    },
                });
                await prisma.ai_framework_configs
                    .delete({ where: { feature: FrameworkFeature.WORKOUT_IMPORT } })
                    .catch(() => null);
            }
        }
        if (!record) {
            // Return default configuration if not found
            return {
                isEnabled: false, // All features disabled by default
                config: DEFAULT_CONFIGS[normalizedFeature],
            };
        }
        return {
            isEnabled: record.isEnabled,
            config: record.config ||
                DEFAULT_CONFIGS[normalizedFeature],
        };
    }
    /**
     * Get all feature configurations
     */
    static async getAllConfigs() {
        return await prisma.ai_framework_configs.findMany({
            orderBy: { feature: 'asc' },
        });
    }
    /**
     * Update configuration for a feature
     */
    static async updateConfig(params) {
        const { feature, isEnabled, config, updatedBy, changeReason } = params;
        const normalizedFeature = normalizeFeature(feature);
        // Get current config
        const current = await this.getConfig(normalizedFeature);
        // Merge with new config
        let mergedConfig = config ? { ...current.config, ...config } : current.config;
        // Deep-merge nested creditCosts per import models to avoid overwriting missing keys
        if (normalizedFeature === FrameworkFeature.IMPORT_MODELS && config && 'creditCosts' in config) {
            const currentConfig = current.config;
            const incomingCosts = config.creditCosts;
            if (incomingCosts) {
                mergedConfig = {
                    ...mergedConfig,
                    creditCosts: {
                        ...(currentConfig?.creditCosts ||
                            DEFAULT_CONFIGS[FrameworkFeature.IMPORT_MODELS].creditCosts),
                        ...incomingCosts,
                    },
                };
            }
        }
        // Upsert configuration
        const updated = await prisma.ai_framework_configs.upsert({
            where: { feature: normalizedFeature },
            create: {
                feature: normalizedFeature,
                isEnabled: isEnabled ?? false,
                config: mergedConfig,
                description: FEATURE_DESCRIPTIONS[normalizedFeature],
                updatedBy,
            },
            update: {
                isEnabled: isEnabled ?? current.isEnabled,
                config: mergedConfig,
                updatedBy,
                updatedAt: new Date(),
            },
        });
        // Se stiamo migrando da alias legacy, rimuovi il record vecchio per evitare duplicati
        if (normalizedFeature !== feature) {
            await prisma.ai_framework_configs.delete({ where: { feature } }).catch(() => null);
        }
        // Create history record
        await this.createHistory({
            feature: normalizedFeature,
            isEnabled: updated.isEnabled,
            config: updated.config,
            changedBy: updatedBy,
            changeReason,
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
            changeReason,
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
            changeReason,
        });
    }
    /**
     * Initialize default configurations
     */
    static async initializeDefaults(updatedBy = 'system') {
        const handled = new Set();
        for (const feature of Object.values(FrameworkFeature)) {
            const normalizedFeature = normalizeFeature(feature);
            if (handled.has(normalizedFeature))
                continue;
            handled.add(normalizedFeature);
            const existing = await prisma.ai_framework_configs.findUnique({
                where: { feature: normalizedFeature },
            });
            if (!existing) {
                await prisma.ai_framework_configs.create({
                    data: {
                        feature: normalizedFeature,
                        isEnabled: false, // All features disabled by default
                        config: DEFAULT_CONFIGS[normalizedFeature],
                        description: FEATURE_DESCRIPTIONS[normalizedFeature],
                        updatedBy,
                    },
                });
            }
        }
    }
    /**
     * Create history record
     */
    static async createHistory(params) {
        return await prisma.ai_framework_config_history.create({
            data: params,
        });
    }
    /**
     * Get configuration history for a feature
     */
    static async getHistory(feature) {
        const normalizedFeature = normalizeFeature(feature);
        const history = await prisma.ai_framework_config_history.findMany({
            where: { feature: normalizedFeature },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        if (history.length > 0 || normalizedFeature === feature) {
            return history;
        }
        // Legacy alias fallback
        return await prisma.ai_framework_config_history.findMany({
            where: { feature },
            orderBy: { createdAt: 'desc' },
            take: 50,
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
            case FrameworkFeature.CONSENSUS_SYSTEM: {
                const c = config;
                if (c.minModels < 2 || c.minModels > 5) {
                    errors.push('minModels must be between 2 and 5');
                }
                if (c.maxModels < c.minModels || c.maxModels > 5) {
                    errors.push('maxModels must be >= minModels and <= 5');
                }
                if (c.confidenceThreshold < 0 || c.confidenceThreshold > 1) {
                    errors.push('confidenceThreshold must be between 0 and 1');
                }
                break;
            }
            case FrameworkFeature.LEARNING_FEEDBACK_LOOP: {
                const c = config;
                if (c.thresholdAdjustmentRate < 0 || c.thresholdAdjustmentRate > 1) {
                    errors.push('thresholdAdjustmentRate must be between 0 and 1');
                }
                if (c.metricsRetentionDays < 1 || c.metricsRetentionDays > 365) {
                    errors.push('metricsRetentionDays must be between 1 and 365');
                }
                break;
            }
            case FrameworkFeature.AUTO_DECOMPOSITION: {
                const c = config;
                if (c.maxDepth < 1 || c.maxDepth > 10) {
                    errors.push('maxDepth must be between 1 and 10');
                }
                break;
            }
            case FrameworkFeature.ADAPTIVE_RECOVERY: {
                const c = config;
                if (c.maxRetries < 1 || c.maxRetries > 5) {
                    errors.push('maxRetries must be between 1 and 5');
                }
                break;
            }
            case FrameworkFeature.COST_MONITORING: {
                const c = config;
                if (c.budgetLimit < 0) {
                    errors.push('budgetLimit must be >= 0');
                }
                if (c.alertThreshold < 0 || c.alertThreshold > 100) {
                    errors.push('alertThreshold must be between 0 and 100');
                }
                break;
            }
            case FrameworkFeature.IMPORT_MODELS:
            case FrameworkFeature.WORKOUT_IMPORT: {
                const c = config;
                if (c.maxRetries < 0 || c.maxRetries > 5) {
                    errors.push('maxRetries must be between 0 and 5');
                }
                if (c.retryDelayBaseMs < 0) {
                    errors.push('retryDelayBaseMs must be >= 0');
                }
                if (!c.creditCosts) {
                    errors.push('creditCosts configuration is required');
                    break;
                }
                ['image', 'pdf', 'document', 'spreadsheet'].forEach((key) => {
                    const value = c.creditCosts?.[key];
                    if (value === undefined || Number.isNaN(Number(value)) || value < 0) {
                        errors.push(`creditCosts.${key} must be >= 0`);
                    }
                });
                break;
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
