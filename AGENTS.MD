# Lib-AI - Agent Guide

> **Meta**: Central AI/LLM abstraction layer. Decouples application logic from specific AI providers (OpenAI, Anthropic, Google).

## Quick Reference

| Attribute     | Value                                                |
| :------------ | :--------------------------------------------------- |
| **Package**   | `@onecoach/lib-ai`                                   |
| **Purpose**   | LLM integration, prompt management, intent detection |
| **Providers** | OpenAI, Anthropic, Google AI, OpenRouter             |

---

## Service Map

| Service                    | Responsibility           | File                                 |
| :------------------------- | :----------------------- | :----------------------------------- |
| `AiModelService`           | Core text generation     | `src/ai-model.service.ts`            |
| `ChatService`              | Conversational contexts  | `src/chat.service.ts`                |
| `IntentDetectionService`   | Input classification     | `src/intent-detection.service.ts`    |
| `PromptRegistry`           | Dynamic prompt templates | `src/prompt-registry.ts`             |
| `AiFrameworkConfigService` | AI configuration         | `src/ai-framework-config.service.ts` |
| `CodeGeneratorService`     | Code generation          | `src/code-generator.service.ts`      |
| `SystemPromptService`      | System instructions      | `src/system-prompt.service.ts`       |

---

## Directory Structure

```
submodules/lib-ai/
├── src/
│   ├── agents/        # Specific agent implementations
│   ├── prompts/       # Prompt definitions (JSON/TS)
│   ├── seeds/         # Database seeds for AI configs
│   ├── utils/         # Token counting, validators
│   └── *.service.ts   # Service implementations
```

---

## Core Concepts

### 1. Provider Abstraction

Never call OpenAI/Anthropic directly. Use `AiModelService`:

```typescript
import { AiModelService } from '@onecoach/lib-ai';

const response = await aiModelService.complete({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ],
});
```

### 2. Prompt Registry

> [!CAUTION]
> Hardcoding prompts is **banned**. Always use `PromptRegistry`.

```typescript
import { PromptRegistry } from '@onecoach/lib-ai';

const prompt = promptRegistry.get('NUTRITION_PLAN', {
  calories: 2000,
  goal: 'muscle_gain',
});
```

### 3. Intent Detection

For routing user actions:

```typescript
import { IntentDetectionService } from '@onecoach/lib-ai';

const intent = await intentService.detect(userMessage);
// Returns: { intent: 'CREATE_WORKOUT', confidence: 0.95 }
```

---

## Usage Example

```typescript
import { AiModelService, PromptRegistry } from '@onecoach/lib-ai';

class MyService {
  constructor(
    private ai: AiModelService,
    private prompts: PromptRegistry
  ) {}

  async generate(input: string) {
    const systemPrompt = this.prompts.get('SYSTEM_MAIN');
    return this.ai.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
    });
  }
}
```

---

## Navigation Guide

| Task             | Location                      |
| :--------------- | :---------------------------- |
| Add new prompt   | `src/prompts/`                |
| Add new agent    | `src/agents/`                 |
| Add AI provider  | Extend `AiProvider` interface |
| Configure models | `AiFrameworkConfigService`    |
| Token utilities  | `src/utils/`                  |

> [!NOTE]
> Prefer extending existing services over creating new ones unless scope is entirely distinct.
