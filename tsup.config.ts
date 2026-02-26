import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'ai-model.service': 'src/ai-model.service.ts',
    'ai-provider-config': 'src/core/providers/ai-provider-config.service.ts',
    'ai-framework-config.service': 'src/ai-framework-config.service.ts',
    'ai-provider-config.service': 'src/core/providers/ai-provider-config.service.ts',
    'chat.service': 'src/chat.service.ts',
    'openrouter-subkey.service': 'src/openrouter-subkey.service.ts',
    'utils/model-factory': 'src/utils/model-factory.ts',

    'provider-options-builder': 'src/provider-options-builder.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    /^@onecoach\/.*/,
    /^@giulio-leone\/.*/,
    '@prisma/client',
    'ai',
    /^@ai-sdk\/.*/,
    'zod',
  ],
});
