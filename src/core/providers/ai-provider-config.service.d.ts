/**
 * AI Provider Config Service
 *
 * Gestisce le credenziali API per i provider supportati
 * API keys principali sono gestite su Vercel Environment Variables (secrets)
 * Database contiene solo metadata (isEnabled, defaultModel, etc.)
 */
import { AIProvider, type Prisma } from '@prisma/client';
import type { ProviderName } from './types';
type VercelEnvironment = 'production' | 'preview' | 'development';
interface ProviderMapEntry {
  enum: AIProvider;
  env: string;
  label: string;
}
export declare const PROVIDER_MAP: Record<ProviderName, ProviderMapEntry>;
export interface UpsertProviderConfigParams {
  provider: ProviderName;
  apiKey?: string;
  isEnabled?: boolean;
  defaultModel?: string | null;
  defaultProvider?: string | null;
  updatedBy: string;
  changeReason?: string;
}
export interface ProviderConfigDTO {
  provider: ProviderName;
  label: string;
  isEnabled: boolean;
  hasKey: boolean;
  maskedKey: string;
  updatedAt: Date | null;
  updatedBy?: string | null;
  defaultModel?: string | null;
  defaultProvider?: string | null;
  metadata?: Record<string, unknown> | null;
}
export declare class AIProviderConfigService {
  private static normalizeEnvValue;
  private static getEnvKeyStatus;
  /**
   * Restituisce la configurazione per un provider
   */
  static getConfig(provider: ProviderName): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    metadata: Prisma.JsonValue | null;
    provider: import('@prisma/client').$Enums.AIProvider;
    isEnabled: boolean;
    defaultModel: string | null;
    updatedBy: string | null;
    vercelEnvVarId: string | null;
  } | null>;
  /**
   * Restituisce tutte le configurazioni (non include la chiave in chiaro)
   * Verifica se API key esiste su Vercel per determinare hasKey
   */
  static listConfigs(): Promise<ProviderConfigDTO[]>;
  /**
   * Aggiorna runtime environment e cache dopo sincronizzazione Vercel
   */
  private static updateRuntimeEnv;
  /**
   * Sincronizza API key con Vercel Environment Variables
   * Crea o aggiorna la env var su Vercel e aggiorna runtime
   */
  static syncToVercel(
    provider: ProviderName,
    apiKey: string,
    environments?: VercelEnvironment[]
  ): Promise<{
    success: boolean;
    envVarId?: string;
    error?: string;
  }>;
  /**
   * Aggiorna o crea configurazione per provider
   * NON salva più apiKey nel DB - solo su Vercel
   */
  static upsertConfig(params: UpsertProviderConfigParams): Promise<ProviderConfigDTO>;
  /**
   * Restituisce la chiave API per un provider.
   * Legge da Edge Config con fallback a process.env.
   */
  static getApiKey(provider: ProviderName): Promise<string | null>;
  static getDefaultModel(provider: ProviderName): Promise<string | null>;
  /**
   * Gets the default model WITH its provider from ai_chat_models table.
   * Used by getModelByTier to respect admin-configured provider.
   */
  static getDefaultModelWithProvider(): Promise<{
    modelId: string;
    provider: ProviderName;
  } | null>;
  /**
   * Estrae defaultProvider dal metadata
   */
  private static extractDefaultProvider;
  /**
   * Restituisce il provider predefinito per OpenRouter dal metadata
   */
  static getDefaultProvider(provider: ProviderName): Promise<string | null>;
  /**
   * Conversione a DTO (senza rivelare la chiave)
   */
  static toDTO(
    provider: AIProvider,
    data: {
      isEnabled: boolean;
      apiKey: string | null;
      updatedAt: Date | null;
      updatedBy?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    defaultModel?: string | null
  ): ProviderConfigDTO;
  static enumToProviderName(provider: AIProvider): ProviderName;
  static buildMetadata(
    current: Prisma.JsonValue | null,
    params: {
      changeReason?: string;
      updatedBy?: string;
    }
  ): Prisma.JsonObject | undefined;
  static getProviderMeta(provider: ProviderName): {
    label: string;
    env: string;
  };
  static listProviderMeta(): {
    provider: ProviderName;
    label: string;
    env: string;
    defaultModel: string | null;
  }[];
}
export {};
//# sourceMappingURL=ai-provider-config.service.d.ts.map
