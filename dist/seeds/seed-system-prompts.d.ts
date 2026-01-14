/**
 * Seed System Prompts
 *
 * Popola la tabella ai_system_prompts con tutti i prompt di default dal registry.
 * I prompt vengono creati con isActive=false di default (usa prompt hardcoded).
 */
import { PrismaClient } from '@prisma/client';
declare function seedSystemPrompts(prismaClient?: PrismaClient): Promise<void>;
export { seedSystemPrompts };
