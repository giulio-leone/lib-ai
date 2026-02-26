// src/provider-options-builder.ts
function buildProviderOptions(params) {
  const { modelId, preferredProvider, enableUsageAccounting = true } = params;
  const isOpenRouter = modelId.includes("/");
  if (!isOpenRouter) {
    return {};
  }
  const openrouterOptions = {};
  if (enableUsageAccounting) {
    openrouterOptions.usage = { include: true };
  }
  if (preferredProvider) {
    openrouterOptions.provider = {
      order: [preferredProvider],
      allowFallbacks: false
    };
  } else if (modelId.toLowerCase().includes("minimax")) {
    openrouterOptions.provider = {
      order: ["minimax"],
      allowFallbacks: false
    };
  }
  return {
    openrouter: openrouterOptions
  };
}

export { buildProviderOptions };
//# sourceMappingURL=provider-options-builder.js.map
//# sourceMappingURL=provider-options-builder.js.map