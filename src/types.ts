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
export enum FrameworkFeature {
  CONSENSUS_SYSTEM = 'consensus_system',
  SKILLS_SYSTEM = 'skills_system',
  LEARNING_FEEDBACK_LOOP = 'learning_feedback_loop',
  INTELLIGENT_MODE_SELECTION = 'intelligent_mode_selection',
  AUTO_DECOMPOSITION = 'auto_decomposition',
  ADAPTIVE_RECOVERY = 'adaptive_recovery',
  COST_MONITORING = 'cost_monitoring',
  ORCHESTRATION_TRACING = 'orchestration_tracing',
  WORKOUT_GENERATION_RETRY = 'workout_generation_retry',
  IMPORT_MODELS = 'import_models',
  GENERATION_RECOVERY = 'generation_recovery',
}

/**
 * Consensus system configuration
 */
export interface ConsensusConfig {
  votingStrategy: 'majority' | 'weighted' | 'confidence' | 'unanimous';
  minModels: number; // Minimum models for consensus (2-5)
  maxModels: number; // Maximum models to query (2-5)
  confidenceThreshold: number; // 0-1, minimum confidence to accept result
  modelTiers: Array<'fast' | 'balanced' | 'quality'>; // Which model tiers to use
  timeoutMs: number; // Timeout for ensemble execution
}

/**
 * Skills system configuration
 */
export interface SkillsConfig {
  enableBuiltInSkills: boolean;
  enableDomainSkills: boolean; // Nutrition, workout specific skills
  enableCustomSkills: boolean; // User-defined skills
  autoDiscovery: boolean; // Auto-discover new skills
  skillTimeout: number; // Timeout for skill execution
}

/**
 * Learning feedback loop configuration
 */
export interface LearningConfig {
  enableAdaptiveThresholds: boolean;
  enableMetricsCollection: boolean;
  enableFeedbackLoop: boolean;
  thresholdAdjustmentRate: number; // 0-1, how fast thresholds adapt
  metricsRetentionDays: number; // How long to keep metrics
  minSamplesForAdjustment: number; // Minimum samples before adjusting thresholds
}

/**
 * Mode selection configuration
 */
export interface ModeSelectionConfig {
  useAISelection: boolean; // Use AI vs heuristic mode selection
  enableCaching: boolean;
  fallbackMode: 'planning' | 'analyze' | 'explain' | 'review';
  minConfidenceThreshold: number; // 0-1
}

/**
 * Auto-decomposition configuration
 */
export interface AutoDecompositionConfig {
  enableAutoDecomposition: boolean;
  maxDepth: number; // Max nesting depth (1-10)
  minConfidenceThreshold: number; // 0-1
  enableCaching: boolean;
}

/**
 * Adaptive recovery configuration
 */
export interface AdaptiveRecoveryConfig {
  enableAdaptiveRecovery: boolean;
  maxRetries: number; // Maximum retry attempts (1-5)
  strategies: Array<'regenerate' | 'patch' | 'escalate'>;
  confidenceThreshold: number; // 0-1
}

/**
 * Cost monitoring configuration
 */
export interface CostMonitoringConfig {
  enableMonitoring: boolean;
  budgetLimit: number; // Credits limit per operation
  enableAlerts: boolean;
  alertThreshold: number; // % of budget to trigger alert (0-100)
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
