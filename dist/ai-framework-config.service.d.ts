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
import type { ai_framework_configs, ai_framework_config_history } from '@prisma/client';
/**
 * Framework features disponibili
 */
export declare enum FrameworkFeature {
    CONSENSUS_SYSTEM = "consensus_system",
    SKILLS_SYSTEM = "skills_system",
    LEARNING_FEEDBACK_LOOP = "learning_feedback_loop",
    INTELLIGENT_MODE_SELECTION = "intelligent_mode_selection",
    AUTO_DECOMPOSITION = "auto_decomposition",
    ADAPTIVE_RECOVERY = "adaptive_recovery",
    COST_MONITORING = "cost_monitoring",
    ORCHESTRATION_TRACING = "orchestration_tracing",
    WORKOUT_GENERATION_RETRY = "workout_generation_retry",
    IMPORT_MODELS = "import_models",
    WORKOUT_IMPORT = "workout_import",// deprecated alias
    GENERATION_RECOVERY = "generation_recovery"
}
/**
 * Consensus system configuration
 */
export interface ConsensusConfig {
    votingStrategy: 'majority' | 'weighted' | 'confidence' | 'unanimous';
    minModels: number;
    maxModels: number;
    confidenceThreshold: number;
    modelTiers: Array<'fast' | 'balanced' | 'quality'>;
    timeoutMs: number;
}
/**
 * Skills system configuration
 */
export interface SkillsConfig {
    enableBuiltInSkills: boolean;
    enableDomainSkills: boolean;
    enableCustomSkills: boolean;
    autoDiscovery: boolean;
    skillTimeout: number;
}
/**
 * Learning feedback loop configuration
 */
export interface LearningConfig {
    enableAdaptiveThresholds: boolean;
    enableMetricsCollection: boolean;
    enableFeedbackLoop: boolean;
    thresholdAdjustmentRate: number;
    metricsRetentionDays: number;
    minSamplesForAdjustment: number;
}
/**
 * Mode selection configuration
 */
export interface ModeSelectionConfig {
    useAISelection: boolean;
    enableCaching: boolean;
    fallbackMode: 'planning' | 'analyze' | 'explain' | 'review';
    minConfidenceThreshold: number;
}
/**
 * Auto-decomposition configuration
 */
export interface AutoDecompositionConfig {
    enableAutoDecomposition: boolean;
    maxDepth: number;
    minConfidenceThreshold: number;
    enableCaching: boolean;
}
/**
 * Adaptive recovery configuration
 */
export interface AdaptiveRecoveryConfig {
    enableAdaptiveRecovery: boolean;
    maxRetries: number;
    strategies: Array<'regenerate' | 'patch' | 'escalate'>;
    confidenceThreshold: number;
}
/**
 * Cost monitoring configuration
 */
export interface CostMonitoringConfig {
    enableMonitoring: boolean;
    budgetLimit: number;
    enableAlerts: boolean;
    alertThreshold: number;
}
/**
 * Orchestration tracing configuration
 */
export interface TracingConfig {
    enableTracing: boolean;
    enablePerformanceMetrics: boolean;
    enableDecisionLogging: boolean;
    retentionDays: number;
}
/**
 * Workout generation retry configuration
 */
export interface WorkoutGenerationRetryConfig {
    count: number;
}
/**
 * Import models configuration (vision/text multi-formato)
 * Configura quali modelli usare per parsing/import multi-formato
 */
export interface ImportModelsConfig {
    /** Model for spreadsheet/CSV parsing */
    spreadsheetModel: string;
    /** Model for image parsing */
    imageModel: string;
    /** Model for PDF parsing */
    pdfModel: string;
    /** Model for document (Word) parsing */
    documentModel: string;
    /** Fallback model if primary fails */
    fallbackModel: string;
    /** Credit costs per file type (fully configurable from admin) */
    creditCosts: {
        image: number;
        pdf: number;
        document: number;
        spreadsheet: number;
    };
    /** Max retry attempts for AI calls */
    maxRetries: number;
    /** Base delay (ms) used in exponential backoff */
    retryDelayBaseMs: number;
}
/**
 * Generation recovery configuration
 * State persistence for resuming from failure points
 */
export interface GenerationRecoveryConfig {
    /** Enable state persistence for recovery */
    enabled: boolean;
    /** Maximum retry attempts before abandoning (1-5) */
    maxRetries: number;
    /** Hours to retain recovery state (1-168) */
    stateRetentionHours: number;
    /** Level of error detail to inject into AI prompts */
    errorFeedbackLevel: 'minimal' | 'detailed';
}
/**
 * Type guard per config types
 */
type FeatureConfigMap = {
    [FrameworkFeature.CONSENSUS_SYSTEM]: ConsensusConfig;
    [FrameworkFeature.SKILLS_SYSTEM]: SkillsConfig;
    [FrameworkFeature.LEARNING_FEEDBACK_LOOP]: LearningConfig;
    [FrameworkFeature.INTELLIGENT_MODE_SELECTION]: ModeSelectionConfig;
    [FrameworkFeature.AUTO_DECOMPOSITION]: AutoDecompositionConfig;
    [FrameworkFeature.ADAPTIVE_RECOVERY]: AdaptiveRecoveryConfig;
    [FrameworkFeature.COST_MONITORING]: CostMonitoringConfig;
    [FrameworkFeature.ORCHESTRATION_TRACING]: TracingConfig;
    [FrameworkFeature.WORKOUT_GENERATION_RETRY]: WorkoutGenerationRetryConfig;
    [FrameworkFeature.IMPORT_MODELS]: ImportModelsConfig;
    [FrameworkFeature.WORKOUT_IMPORT]: ImportModelsConfig;
    [FrameworkFeature.GENERATION_RECOVERY]: GenerationRecoveryConfig;
};
/**
 * AI Framework Config Service
 */
export declare class AIFrameworkConfigService {
    /**
     * Get configuration for a specific feature
     */
    static getConfig<F extends FrameworkFeature>(feature: F): Promise<{
        isEnabled: boolean;
        config: FeatureConfigMap[F];
    }>;
    /**
     * Get all feature configurations
     */
    static getAllConfigs(): Promise<ai_framework_configs[]>;
    /**
     * Update configuration for a feature
     */
    static updateConfig<F extends FrameworkFeature>(params: {
        feature: F;
        isEnabled?: boolean;
        config?: Partial<FeatureConfigMap[F]>;
        updatedBy: string;
        changeReason?: string;
    }): Promise<ai_framework_configs>;
    /**
     * Check if a feature is enabled
     */
    static isFeatureEnabled(feature: FrameworkFeature): Promise<boolean>;
    /**
     * Enable a feature
     */
    static enableFeature(feature: FrameworkFeature, updatedBy: string, changeReason?: string): Promise<ai_framework_configs>;
    /**
     * Disable a feature
     */
    static disableFeature(feature: FrameworkFeature, updatedBy: string, changeReason?: string): Promise<ai_framework_configs>;
    /**
     * Initialize default configurations
     */
    static initializeDefaults(updatedBy?: string): Promise<void>;
    /**
     * Create history record
     */
    private static createHistory;
    /**
     * Get configuration history for a feature
     */
    static getHistory(feature: FrameworkFeature): Promise<ai_framework_config_history[]>;
    /**
     * Get feature descriptions
     */
    static getFeatureDescription(feature: FrameworkFeature): string;
    /**
     * Get all feature descriptions
     */
    static getAllFeatureDescriptions(): Record<FrameworkFeature, string>;
    /**
     * Validate configuration
     */
    static validateConfig<F extends FrameworkFeature>(feature: F, config: unknown): {
        valid: boolean;
        errors: string[];
    };
}
export {};
