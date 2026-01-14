/**
 * Seed System Prompts - Standalone Version
 *
 * Popola la tabella ai_system_prompts con tutti i prompt di default dal registry.
 * Versione standalone che non dipende da @onecoach/lib-core per evitare problemi con server-only.
 */
declare function seedSystemPrompts(): Promise<void>;
export { seedSystemPrompts };
