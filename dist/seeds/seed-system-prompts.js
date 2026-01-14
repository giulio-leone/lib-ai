/**
 * Seed System Prompts
 *
 * Popola la tabella ai_system_prompts con tutti i prompt di default dal registry.
 * I prompt vengono creati con isActive=false di default (usa prompt hardcoded).
 */
import { PrismaClient } from '@prisma/client';
import { PROMPT_REGISTRY } from '../prompt-registry';
async function seedSystemPrompts(prismaClient) {
    console.warn('🌱 Seeding system prompts...');
    const client = prismaClient ?? new PrismaClient();
    const shouldDisconnect = !prismaClient;
    const entries = Object.values(PROMPT_REGISTRY);
    let created = 0;
    let updated = 0;
    for (const entry of entries) {
        const defaultPrompt = typeof entry.defaultTemplate === 'string'
            ? entry.defaultTemplate
            : JSON.stringify(entry.variables);
        try {
            const result = await client.ai_system_prompts.upsert({
                where: { agentId: entry.agentId },
                update: {
                    // Aggiorna solo se non esiste già un prompt custom
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
            if (result.createdAt.getTime() === result.updatedAt.getTime()) {
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
    if (shouldDisconnect) {
        await client.$disconnect();
    }
}
// Esegui se chiamato direttamente
if (require.main === module) {
    const prisma = new PrismaClient();
    seedSystemPrompts(prisma)
        .then(() => {
        console.warn('✅ Seed completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
        .finally(() => prisma.$disconnect());
}
export { seedSystemPrompts };
