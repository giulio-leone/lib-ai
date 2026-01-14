/**
 * OpenRouter Subkey Service
 *
 * Gestione subkey OpenRouter per utenti
 * Crea, revoca e salva subkey nel database
 */
import { prisma } from '@onecoach/lib-core';
import { logger } from '@onecoach/lib-core';
import { createId } from '@onecoach/lib-shared/id-generator';
const log = logger.child('OpenRouterSubkeyService');
import crypto from 'crypto';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_PROVISIONING_KEY = process.env.OPENROUTER_PROVISIONING_KEY;
/**
 * OpenRouter Subkey Service
 */
export class OpenRouterSubkeyService {
    /**
     * Crea una subkey OpenRouter per l'utente
     * @param params Parametri per la creazione della subkey
     * @returns Informazioni sulla subkey creata
     */
    static async createSubkey(params) {
        const { userId, credits } = params;
        if (!OPENROUTER_PROVISIONING_KEY) {
            throw new Error('OPENROUTER_PROVISIONING_KEY non configurata');
        }
        // Genera label univoca per la subkey
        const timestamp = Date.now();
        const keyLabel = `user-${userId}-${timestamp}`;
        // Crea la subkey via OpenRouter API
        const response = await fetch(`${OPENROUTER_BASE_URL}/keys`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENROUTER_PROVISIONING_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                'X-Title': process.env.OPENROUTER_APP_NAME || 'onecoach',
            },
            body: JSON.stringify({
                label: keyLabel,
                limit: credits, // Limite crediti uguale ai crediti acquistati
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Errore creazione subkey OpenRouter: ${response.status} ${errorData.error || response.statusText}`);
        }
        const data = await response.json();
        const apiKey = data.key || data.id;
        if (!apiKey) {
            throw new Error('Subkey creata ma chiave non restituita da OpenRouter');
        }
        // Genera hash della chiave per sicurezza (non salviamo la chiave in chiaro)
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        return {
            keyLabel,
            keyHash,
            limit: credits,
        };
    }
    /**
     * Revoca una subkey OpenRouter
     * @param keyLabel Label della subkey da revocare
     */
    static async revokeSubkey(keyLabel) {
        if (!OPENROUTER_PROVISIONING_KEY) {
            throw new Error('OPENROUTER_PROVISIONING_KEY non configurata');
        }
        // Recupera la subkey dal database per ottenere l'ID
        const apiKeyRecord = await prisma.user_api_keys.findFirst({
            where: {
                keyLabel,
                status: 'ACTIVE',
            },
        });
        if (!apiKeyRecord) {
            // Se non trovata nel DB, prova comunque a revocare via label
            log.warn(`Subkey ${keyLabel} non trovata nel database, tentativo revoca diretto`);
        }
        // OpenRouter API per revocare: DELETE /api/v1/keys/{keyId}
        // Usiamo la label come identificatore
        const response = await fetch(`${OPENROUTER_BASE_URL}/keys/${keyLabel}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${OPENROUTER_PROVISIONING_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok && response.status !== 404) {
            // 404 significa che la chiave non esiste più, non è un errore
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Errore revoca subkey OpenRouter: ${response.status} ${errorData.error || response.statusText}`);
        }
        // Aggiorna lo status nel database se esiste
        if (apiKeyRecord) {
            await prisma.user_api_keys.update({
                where: { id: apiKeyRecord.id },
                data: { status: 'REVOKED', updatedAt: new Date() },
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
                status: 'ACTIVE',
                stripePaymentIntentId,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
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
                status: 'ACTIVE',
            },
        });
        return !!existing;
    }
}
