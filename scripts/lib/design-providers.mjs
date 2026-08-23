export function validateDesignProviders(catalog, blueprint) {
  const failures = [];
  if (catalog?.schemaVersion !== "starter-design-provider-catalog/v1")
    return ["design/providers.json must use starter-design-provider-catalog/v1"];
  const providers = new Map();
  const items = new Map();
  for (const provider of catalog.providers || []) {
    if (providers.has(provider.id)) failures.push(`Duplicate Design Provider id ${provider.id}`);
    providers.set(provider.id, provider);
    if (!provider.source?.url || !provider.source?.revision || !provider.source?.license)
      failures.push(`Design Provider ${provider.id} must pin source URL, revision, and license`);
    for (const item of provider.items || []) {
      if (items.has(item.id)) failures.push(`Duplicate Design Provider item id ${item.id}`);
      items.set(item.id, { ...item, provider });
      if (!item.id.startsWith(`${provider.id}.`))
        failures.push(`Design Provider item ${item.id} must use the ${provider.id}. namespace`);
      if (item.performance === "heavy" && !item.requires?.includes("lazy-load"))
        failures.push(`Heavy Design Provider item ${item.id} must require lazy-load`);
      if (provider.kind === "dynamic-component" && !item.requires?.includes("reduced-motion"))
        failures.push(`Dynamic component ${item.id} must require reduced-motion`);
    }
  }
  const selection = blueprint.designExtensions;
  if (!selection || selection.catalogVersion !== catalog.catalogVersion)
    failures.push(`Blueprint designExtensions must pin catalog ${catalog.catalogVersion}`);
  for (const id of selection?.selected || []) {
    const entry = items.get(id);
    if (!entry) failures.push(`Blueprint Design Provider item ${id} is missing from the catalog`);
    else if (!new Set(["catalog-ready", "reference-ready", "local-verified"]).has(entry.provider.status))
      failures.push(`Blueprint Design Provider item ${id} is not selectable`);
  }
  if (new Set(selection?.selected || []).size !== (selection?.selected || []).length)
    failures.push("Blueprint Design Provider selections must be unique");
  return failures;
}
