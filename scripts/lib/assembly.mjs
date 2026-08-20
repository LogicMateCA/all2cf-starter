export function validateAssemblyContracts(manifest, blueprint, catalog) {
  const failures = [];
  if (blueprint.schemaVersion !== "starter-blueprint/v1") failures.push("starter.blueprint.json must use starter-blueprint/v1");
  if (catalog.schemaVersion !== "starter-catalog/v1") failures.push("catalog/catalog.json must use starter-catalog/v1");
  if (blueprint.project?.name !== manifest.project?.name || blueprint.project?.slug !== manifest.project?.slug) failures.push("Blueprint project identity must match starter.manifest.json");
  if (!blueprint.project?.locales?.includes(blueprint.project?.defaultLocale)) failures.push("Blueprint defaultLocale must be included in locales");

  const packIds = new Set();
  for (const pack of catalog.packs || []) {
    if (packIds.has(pack.id)) failures.push(`Duplicate Catalog pack id ${pack.id}`);
    packIds.add(pack.id);
    if (!String(pack.id || "").startsWith(`${pack.kind}.`)) failures.push(`Catalog pack ${pack.id} does not match kind ${pack.kind}`);
  }

  const presetIds = new Set();
  for (const preset of catalog.presets || []) {
    if (presetIds.has(preset.id)) failures.push(`Duplicate Catalog preset id ${preset.id}`);
    presetIds.add(preset.id);
    for (const selectionId of preset.selections || []) if (!packIds.has(selectionId)) failures.push(`Catalog preset ${preset.id} references missing pack ${selectionId}`);
  }
  if (!presetIds.has(blueprint.preset)) failures.push(`Blueprint preset ${blueprint.preset} is missing from Catalog`);

  const selectionKinds = { design: "design", pages: "page", saas: "saas", capabilities: "capability" };
  for (const [group, kind] of Object.entries(selectionKinds)) {
    const ids = new Set();
    for (const selection of blueprint.selections?.[group] || []) {
      if (ids.has(selection.id)) failures.push(`Duplicate Blueprint selection ${selection.id}`);
      ids.add(selection.id);
      if (!packIds.has(selection.id)) failures.push(`Blueprint selection ${selection.id} is missing from Catalog`);
      if (!selection.id.startsWith(`${kind}.`)) failures.push(`Blueprint selection ${selection.id} is in the wrong group ${group}`);
      const lifecycle = selection.lifecycle || {};
      const sequence = ["selected", "materialized", "localVerified", "developmentVerified", "productionReleased"];
      for (let index = 1; index < sequence.length; index += 1) {
        if (lifecycle[sequence[index]] && !lifecycle[sequence[index - 1]]) failures.push(`Blueprint lifecycle for ${selection.id} skips ${sequence[index - 1]}`);
      }
    }
  }

  const selectedIds = new Set(Object.values(blueprint.selections || {}).flat().filter(({ lifecycle }) => lifecycle?.selected).map(({ id }) => id));
  for (const requiredId of ["page.core-product-site", "saas.identity-core", "saas.product-operations-lite"]) {
    if (!selectedIds.has(requiredId)) failures.push(`Blueprint required pack ${requiredId} must remain selected`);
  }

  const manifestEnvironments = (manifest.environments || []).map(({ id }) => id).sort();
  const blueprintEnvironments = [...(blueprint.environments || [])].sort();
  if (JSON.stringify(manifestEnvironments) !== JSON.stringify(blueprintEnvironments)) failures.push("Blueprint environments must match starter.manifest.json");
  return failures;
}
