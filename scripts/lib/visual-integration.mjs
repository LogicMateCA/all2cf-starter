export function validateVisualIntegration(contract, blueprint) {
  const failures = [];
  if (contract?.schemaVersion !== "starter-visual-integration/v1")
    return ["integrations/visual.json must use starter-visual-integration/v1"];
  if (contract.integrationVersion !== "1.0.1" || contract.source?.contractVersion !== "1.0.1")
    failures.push("Visual integration must pin starter-integration@1.0.1");
  if (contract.plugin?.bundled !== false || contract.plugin?.installation !== "external-recommended")
    failures.push("Visual plugin must remain external and optional");
  if (contract.fallback?.required !== false || contract.fallback?.behavior !== "structural-css-only" || contract.fallback?.blocksFactory !== false)
    failures.push("Visual integration must leave Starter with structural CSS only and no visual fallback profile");
  const selection = blueprint.visualIntegration;
  if (!selection) return [...failures, "Blueprint visualIntegration is required"];
  if (selection.contractVersion !== contract.source.contractVersion)
    failures.push(`Blueprint Visual contract must pin ${contract.source.contractVersion}`);
  if (selection.plugin?.id !== contract.plugin.id || selection.plugin?.version !== contract.plugin.version)
    failures.push(`Blueprint Visual plugin must pin ${contract.plugin.id}@${contract.plugin.version}`);
  if (selection.plugin?.installation !== contract.plugin.installation)
    failures.push("Blueprint Visual plugin installation policy is invalid");
  if (contract.source?.contractStatus === "draft" && selection.status === "resolved")
    failures.push("A draft Visual contract cannot produce a resolved Blueprint state");
  if (!new Set(["development", "production"]).has(selection.environment))
    failures.push("Blueprint Visual environment is invalid");
  if (!new Set(["disabled", "unavailable", "configured", "resolved"]).has(selection.status))
    failures.push("Blueprint Visual status is invalid");
  if (!selection.enabled && selection.status !== "disabled")
    failures.push("Disabled Visual integration must use status disabled");
  if (selection.enabled && selection.status === "disabled")
    failures.push("Enabled Visual integration cannot use status disabled");
  if (selection.profileReceipt !== contract.projectArchive.receipt)
    failures.push(`Blueprint Visual receipt must use ${contract.projectArchive.receipt}`);
  return failures;
}

export function buildVisualFactoryRequest(contract, blueprint, requestId = `starter-${blueprint.project.slug}-preview`) {
  const origin = selectionOrigin(contract, blueprint.visualIntegration.environment);
  const frameworks = ["react", "astro", "starlight"];
  if (blueprint.project.platforms.some((target) => target === "ios" || target === "android")) frameworks.push("expo");
  const targets = new Set(["web", "marketing", "docs"]);
  for (const target of blueprint.project.platforms)
    if (target === "ios" || target === "android") targets.add(target);
  return {
    contractVersion: contract.source.contractVersion,
    requestId,
    project: { localId: blueprint.project.slug, frameworks: frameworks.sort() },
    intent: blueprint.productIntent,
    targets: [...targets],
    constraints: { offlineAllowed: true, licensesAllowed: ["MIT", "Apache-2.0", "MIT + Commons Clause"], accessibilityTarget: "WCAG AA", performanceBudget: "Starter PERFORMANCE.md" },
    requestedCapabilities: ["protocols.list", "knowledge.search", "recommendations.preview", "profiles.validate", "compatibility.inspect", "authorization.inspect"],
    discoveryUrl: `${origin}${contract.service.discoveryPath}`,
    mcpUrl: `${origin}${contract.service.mcpPath}`,
  };
}

export function validateVisualDiscovery(contract, request, discovery) {
  const failures = [];
  for (const field of contract.service.requiredDiscoveryFields || [])
    if (!(field in (discovery || {}))) failures.push(`Discovery is missing ${field}`);
  if (discovery?.service !== "visual") failures.push("Discovery service identity is incompatible");
  if (!Array.isArray(discovery?.contractVersions) || !discovery.contractVersions.includes(contract.source.contractVersion))
    failures.push(`Discovery does not support contract ${contract.source.contractVersion}`);
  const capabilities = Array.isArray(discovery?.capabilities) ? discovery.capabilities : [];
  for (const capability of request.requestedCapabilities || [])
    if (!capabilities.includes(capability)) failures.push(`Discovery is missing requested capability ${capability}`);
  return failures;
}

function selectionOrigin(contract, environment) {
  return environment === "production" ? contract.service.productionOrigin : contract.service.developmentOrigin;
}
