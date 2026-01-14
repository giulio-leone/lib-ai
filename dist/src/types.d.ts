import type { LanguageModel } from 'ai';
export interface StandardizedModelConfig {
    modelId: string;
    model: LanguageModel;
    maxTokens: number;
    providerOptions: Record<string, unknown>;
    supportsReasoning: boolean;
}
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
 */
export interface ImportModelsConfig {
    spreadsheetModel: string;
    imageModel: string;
    pdfModel: string;
    documentModel: string;
    fallbackModel: string;
    creditCosts: {
        image: number;
        pdf: number;
        document: number;
        spreadsheet: number;
    };
    maxRetries: number;
    retryDelayBaseMs: number;
}
/**
 * Generation recovery configuration
 */
export interface GenerationRecoveryConfig {
    enabled: boolean;
    maxRetries: number;
    stateRetentionHours: number;
    errorFeedbackLevel: 'minimal' | 'detailed';
}
