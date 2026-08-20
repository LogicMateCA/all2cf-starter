export function validateAssemblyContracts(manifest, blueprint, catalog, designCatalog) {
  const failures = [];
  if (blueprint.schemaVersion !== "starter-blueprint/v1") failures.push("starter.blueprint.json must use starter-blueprint/v1");
  if (catalog.schemaVersion !== "starter-catalog/v1") failures.push("catalog/catalog.json must use starter-catalog/v1");
  if (designCatalog?.schemaVersion !== "starter-design-catalog/v1") failures.push("design/catalog.json must use starter-design-catalog/v1");
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

  const profileIds = new Set();
  const profiles = new Map();
  for (const profile of designCatalog?.profiles || []) {
    if (profileIds.has(profile.id)) failures.push(`Duplicate Design Profile id ${profile.id}`);
    profileIds.add(profile.id);
    profiles.set(profile.id, profile);
    if (!packIds.has(profile.packId)) failures.push(`Design Profile ${profile.id} references missing pack ${profile.packId}`);
    for (const mode of ["light", "dark"]) if (!profile.semanticColors?.[mode]) failures.push(`Design Profile ${profile.id} is missing ${mode} semantic colors`);
    for (const target of profile.targets || []) if (!(target in (profile.adapters || {}))) failures.push(`Design Profile ${profile.id} is missing adapter state for ${target}`);
    for (const source of profile.source || []) {
      if (source.relationship === "adapted-donor" && (!source.revision || !source.license || !source.url)) failures.push(`Design Profile ${profile.id} donor source must pin URL, revision, and license`);
    }
  }
  const selectedProfile = profiles.get(blueprint.designProfile?.id);
  if (!selectedProfile) failures.push(`Blueprint Design Profile ${blueprint.designProfile?.id || "<missing>"} is missing from Design Catalog`);
  else {
    if (selectedProfile.version !== blueprint.designProfile?.version) failures.push(`Blueprint Design Profile ${selectedProfile.id} must pin version ${selectedProfile.version}`);
    if (!selectedIds.has(selectedProfile.packId)) failures.push(`Blueprint Design Profile ${selectedProfile.id} requires selected pack ${selectedProfile.packId}`);
  }

  const manifestEnvironments = (manifest.environments || []).map(({ id }) => id).sort();
  const blueprintEnvironments = [...(blueprint.environments || [])].sort();
  if (JSON.stringify(manifestEnvironments) !== JSON.stringify(blueprintEnvironments)) failures.push("Blueprint environments must match starter.manifest.json");
  return failures;
}
