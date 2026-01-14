/**
 * OpenRouter Subkey Service
 *
 * Gestione subkey OpenRouter per utenti
 * Crea, revoca e salva subkey nel database
 */
import { prisma } from '@onecoach/lib-core';
import type { Prisma } from '@prisma/client';
export interface CreateSubkeyParams {
  userId: string;
  credits: number;
  paymentIntentId: string;
}
export interface SubkeyResult {
  keyLabel: string;
  keyHash: string;
  limit: number;
}
export interface SaveSubkeyParams {
  userId: string;
  provider: string;
  keyLabel: string;
  keyHash: string;
  limit: number;
  stripePaymentIntentId: string;
}
/**
 * OpenRouter Subkey Service
 */
export declare class OpenRouterSubkeyService {
  /**
   * Crea una subkey OpenRouter per l'utente
   * @param params Parametri per la creazione della subkey
   * @returns Informazioni sulla subkey creata
   */
  static createSubkey(params: CreateSubkeyParams): Promise<SubkeyResult>;
  /**
   * Revoca una subkey OpenRouter
   * @param keyLabel Label della subkey da revocare
   */
  static revokeSubkey(keyLabel: string): Promise<void>;
  /**
   * Salva una subkey nel database
   * @param params Parametri per il salvataggio
   * @param tx Client Prisma opzionale per transazioni
   * @returns Record della subkey salvata
   */
  static saveSubkeyToDb(
    params: SaveSubkeyParams,
    tx?: Prisma.TransactionClient | typeof prisma
  ): Promise<void>;
  /**
   * Verifica se esiste già una subkey attiva per un payment intent
   * @param stripePaymentIntentId ID del payment intent
   * @returns true se esiste, false altrimenti
   */
  static hasSubkeyForPaymentIntent(stripePaymentIntentId: string): Promise<boolean>;
}
//# sourceMappingURL=openrouter-subkey.service.d.ts.map
