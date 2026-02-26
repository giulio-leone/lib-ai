import { logger, prisma } from '@giulio-leone/lib-core';
import { createId } from '@giulio-leone/lib-shared/id-generator';
import crypto from 'crypto';

// src/openrouter-subkey.service.ts
var log = logger.child("OpenRouterSubkeyService");
var OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
var OPENROUTER_PROVISIONING_KEY = process.env.OPENROUTER_PROVISIONING_KEY;
var OpenRouterSubkeyService = class {
  /**
   * Crea una subkey OpenRouter per l'utente
   * @param params Parametri per la creazione della subkey
   * @returns Informazioni sulla subkey creata
   */
  static async createSubkey(params) {
    const { userId, credits } = params;
    if (!OPENROUTER_PROVISIONING_KEY) {
      throw new Error("OPENROUTER_PROVISIONING_KEY non configurata");
    }
    const timestamp = Date.now();
    const keyLabel = `user-${userId}-${timestamp}`;
    const response = await fetch(`${OPENROUTER_BASE_URL}/keys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_PROVISIONING_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME || "onecoach"
      },
      body: JSON.stringify({
        label: keyLabel,
        limit: credits
        // Limite crediti uguale ai crediti acquistati
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Errore creazione subkey OpenRouter: ${response.status} ${errorData.error || response.statusText}`
      );
    }
    const data = await response.json();
    const apiKey = data.key || data.id;
    if (!apiKey) {
      throw new Error("Subkey creata ma chiave non restituita da OpenRouter");
    }
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    return {
      keyLabel,
      keyHash,
      limit: credits
    };
  }
  /**
   * Revoca una subkey OpenRouter
   * @param keyLabel Label della subkey da revocare
   */
  static async revokeSubkey(keyLabel) {
    if (!OPENROUTER_PROVISIONING_KEY) {
      throw new Error("OPENROUTER_PROVISIONING_KEY non configurata");
    }
    const apiKeyRecord = await prisma.user_api_keys.findFirst({
      where: {
        keyLabel,
        status: "ACTIVE"
      }
    });
    if (!apiKeyRecord) {
      log.warn(`Subkey ${keyLabel} non trovata nel database, tentativo revoca diretto`);
    }
    const response = await fetch(`${OPENROUTER_BASE_URL}/keys/${keyLabel}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${OPENROUTER_PROVISIONING_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Errore revoca subkey OpenRouter: ${response.status} ${errorData.error || response.statusText}`
      );
    }
    if (apiKeyRecord) {
      await prisma.user_api_keys.update({
        where: { id: apiKeyRecord.id },
        data: { status: "REVOKED", updatedAt: /* @__PURE__ */ new Date() }
      });
    }
  }
  /**
   * Salva una subkey nel database
   * @param params Parametri per il salvataggio
   * @param tx Client Prisma opzionale per transazioni
   * @returns Record della subkey salvata
   */
  static async saveSubkeyToDb(params, tx) {
    const { userId, provider, keyLabel, keyHash, limit, stripePaymentIntentId } = params;
    const client = tx ?? prisma;
    await client.user_api_keys.create({
      data: {
        id: createId(),
        userId,
        provider,
        keyLabel,
        keyHash,
        limit,
        status: "ACTIVE",
        stripePaymentIntentId,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Verifica se esiste già una subkey attiva per un payment intent
   * @param stripePaymentIntentId ID del payment intent
   * @returns true se esiste, false altrimenti
   */
  static async hasSubkeyForPaymentIntent(stripePaymentIntentId) {
    const existing = await prisma.user_api_keys.findFirst({
      where: {
        stripePaymentIntentId,
        status: "ACTIVE"
      }
    });
    return !!existing;
  }
};

export { OpenRouterSubkeyService };
//# sourceMappingURL=openrouter-subkey.service.js.map
//# sourceMappingURL=openrouter-subkey.service.js.map