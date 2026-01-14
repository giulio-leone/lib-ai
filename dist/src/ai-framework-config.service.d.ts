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
import { FrameworkFeature, type ConsensusConfig, type SkillsConfig, type LearningConfig, type ModeSelectionConfig, type AutoDecompositionConfig, type AdaptiveRecoveryConfig, type CostMonitoringConfig, type TracingConfig, type WorkoutGenerationRetryConfig, type ImportModelsConfig, type GenerationRecoveryConfig } from './types';
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
