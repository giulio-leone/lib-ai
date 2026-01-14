/**
 * Seed System Prompts - Standalone Version
 *
 * Popola la tabella ai_system_prompts con tutti i prompt di default dal registry.
 * Versione standalone che non dipende da @onecoach/lib-core per evitare problemi con server-only.
 */
import { PrismaClient } from '@prisma/client';
import { PROMPT_REGISTRY } from '../prompt-registry';
const prisma = new PrismaClient();
async function seedSystemPrompts() {
    console.warn('🌱 Seeding system prompts...');
    const entries = Object.values(PROMPT_REGISTRY);
    let created = 0;
    let updated = 0;
    for (const entry of entries) {
        const defaultPrompt = typeof entry.defaultTemplate === 'string'
            ? entry.defaultTemplate
            : JSON.stringify(entry.variables);
        try {
            const existing = await prisma.ai_system_prompts.findUnique({
                where: { agentId: entry.agentId },
            });
            await prisma.ai_system_prompts.upsert({
                where: { agentId: entry.agentId },
                update: {
                    // Aggiorna solo metadati, non sovrascrive promptTemplate se esiste già
                    agentName: entry.name,
                    description: entry.description,
                    defaultPrompt,
                    variables: entry.variables,
                },
                create: {
                    agentId: entry.agentId,
                    agentCategory: entry.category,
                    agentName: entry.name,
                    description: entry.description,
                    isActive: false, // Default: usa prompt hardcoded
                    promptTemplate: defaultPrompt, // Inizializza con default
                    defaultPrompt,
                    variables: entry.variables,
                },
            });
            if (!existing) {
                created++;
            }
            else {
                updated++;
            }
        }
        catch (error) {
            console.error(`❌ Failed to seed prompt ${entry.agentId}:`, error);
        }
    }
    console.warn(`✅ System prompts seeded: ${created} created, ${updated} updated`);
}
// Esegui se chiamato direttamente
if (require.main === module) {
    seedSystemPrompts()
        .then(() => {
        console.warn('✅ Seed completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
        .finally(() => {
        prisma.$disconnect();
    });
}
export { seedSystemPrompts };
