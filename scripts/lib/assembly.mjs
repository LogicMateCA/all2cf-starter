import { validateCfpgConnection } from "./cfpg.mjs";

export function validateAssemblyContracts(
  manifest,
  blueprint,
  catalog,
  designCatalog,
  pageCatalog,
  stylekit = null,
) {
  const failures = [];
  if (blueprint.schemaVersion !== "starter-blueprint/v1")
    failures.push("starter.blueprint.json must use starter-blueprint/v1");
  if (catalog.schemaVersion !== "starter-catalog/v1")
    failures.push("catalog/catalog.json must use starter-catalog/v1");
  if (designCatalog?.schemaVersion !== "starter-design-catalog/v1")
    failures.push("design/catalog.json must use starter-design-catalog/v1");
  if (pageCatalog?.schemaVersion !== "starter-page-catalog/v1")
    failures.push("pages/catalog.json must use starter-page-catalog/v1");
  if (
    blueprint.project?.name !== manifest.project?.name ||
    blueprint.project?.slug !== manifest.project?.slug
  )
    failures.push(
      "Blueprint project identity must match starter.manifest.json",
    );
  if (!blueprint.project?.locales?.includes(blueprint.project?.defaultLocale))
    failures.push("Blueprint defaultLocale must be included in locales");
  const productIntent = blueprint.productIntent || {};
  if (!String(productIntent.summary || "").trim())
    failures.push("Blueprint productIntent.summary is required");
  if (
    !Array.isArray(productIntent.audiences) ||
    productIntent.audiences.length === 0
  )
    failures.push(
      "Blueprint productIntent.audiences must identify at least one user group",
    );
  if (
    !Array.isArray(productIntent.coreObjects) ||
    productIntent.coreObjects.length === 0
  )
    failures.push(
      "Blueprint productIntent.coreObjects must identify at least one owned product object",
    );
  if (
    !new Set(["personal", "organization", "hybrid"]).has(
      productIntent.tenantModel,
    )
  )
    failures.push("Blueprint productIntent.tenantModel is invalid");
  if (
    !new Set([
      "free",
      "one-time",
      "subscription-user",
      "subscription-organization",
      "usage",
      "hybrid",
    ]).has(productIntent.chargingModel)
  )
    failures.push("Blueprint productIntent.chargingModel is invalid");
  const databasePolicy = blueprint.providers?.database || {};
  const expectedDatabasePolicy = {
    engine: "postgresql",
    access: "sql-first",
    initialState: "empty",
    schemaSource: "selected-pack-baseline",
    existingDataPolicy: "out-of-scope",
  };
  for (const [key, expected] of Object.entries(expectedDatabasePolicy)) {
    if (databasePolicy[key] !== expected)
      failures.push(`Blueprint database policy ${key} must be ${expected}`);
  }
  if (!new Set(["native-postgresql", "cfpg"]).has(databasePolicy.provider))
    failures.push("Blueprint database policy provider must be native-postgresql or cfpg");
  for (const environment of ["development", "production"])
    failures.push(
      ...validateCfpgConnection(
        databasePolicy.cfpg?.[environment],
        `Blueprint database policy cfpg.${environment}`,
      ),
    );
  const developmentCfpgId = databasePolicy.cfpg?.development?.databaseId;
  const productionCfpgId = databasePolicy.cfpg?.production?.databaseId;
  if (developmentCfpgId && developmentCfpgId === productionCfpgId)
    failures.push("Development and Production CFPG databases must be different");
  const storagePolicy = blueprint.providers?.storage || {};
  if (!new Set(["none", "cloudflare-r2", "s3-compatible"]).has(storagePolicy.provider))
    failures.push("Blueprint storage provider must be none, cloudflare-r2, or s3-compatible");
  if (!new Set(["private", "public"]).has(storagePolicy.access))
    failures.push("Blueprint storage access must be private or public");
  if (storagePolicy.uploadMode !== "worker")
    failures.push("Blueprint storage uploadMode must remain worker until presigned upload is implemented");
  if (!Number.isInteger(storagePolicy.maxUploadBytes) || storagePolicy.maxUploadBytes < 1 || storagePolicy.maxUploadBytes > 10_485_760)
    failures.push("Blueprint storage maxUploadBytes must be between 1 and 10485760");
  const storageBuckets = [storagePolicy.development?.bucket, storagePolicy.production?.bucket];
  if (storageBuckets.some((bucket) => !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u.test(bucket || "")))
    failures.push("Blueprint storage buckets must use safe S3-compatible names");
  if (storageBuckets[0] === storageBuckets[1])
    failures.push("Development and Production storage buckets must be different");
  if (storagePolicy.provider === "s3-compatible")
    for (const environment of ["development", "production"])
      try {
        const endpoint = new URL(storagePolicy[environment]?.s3Endpoint || "");
        if (endpoint.protocol !== "https:") throw new Error("not https");
      } catch {
        failures.push(`Blueprint ${environment} S3 endpoint must use HTTPS`);
      }
  const storageSelection = Object.values(blueprint.selections || {})
    .flat()
    .find(({ id }) => id === "capability.object-storage");
  if (!storageSelection)
    failures.push("Blueprint is missing capability.object-storage selection state");
  else if (storageSelection.lifecycle.selected !== (storagePolicy.provider !== "none"))
    failures.push("Object Storage Pack selection must match the storage Provider");
  const antiAbuse = blueprint.providers?.antiAbuse || {};
  if (!new Set(["none", "turnstile"]).has(antiAbuse.provider))
    failures.push("Blueprint anti-abuse provider must be none or turnstile");
  if (antiAbuse.provider === "turnstile") {
    const developmentSiteKey = String(antiAbuse.development?.siteKey || "").trim();
    const productionSiteKey = String(antiAbuse.production?.siteKey || "").trim();
    if (!developmentSiteKey || !productionSiteKey)
      failures.push("Turnstile requires Development and Production site keys");
    if (developmentSiteKey && developmentSiteKey === productionSiteKey)
      failures.push("Development and Production Turnstile site keys must be different");
  }
  const turnstileSelection = Object.values(blueprint.selections || {})
    .flat()
    .find(({ id }) => id === "capability.turnstile");
  if (!turnstileSelection)
    failures.push("Blueprint is missing capability.turnstile selection state");
  else if (turnstileSelection.lifecycle.selected !== (antiAbuse.provider === "turnstile"))
    failures.push("Turnstile Pack selection must match the anti-abuse Provider");
  const aiPolicy = blueprint.providers?.ai || {};
  if (!new Set(["none", "workers-ai"]).has(aiPolicy.provider))
    failures.push("Blueprint AI provider must be none or workers-ai");
  for (const environment of ["development", "production"]) {
    const model = String(aiPolicy[environment]?.model || "");
    const gatewayId = String(aiPolicy[environment]?.gatewayId || "");
    if (!/^@cf\/[a-z0-9._-]+\/[a-z0-9._-]+$/u.test(model))
      failures.push(`Blueprint ${environment} Workers AI model is invalid`);
    if (!/^(?:|[a-z0-9][a-z0-9_-]{0,63})$/u.test(gatewayId))
      failures.push(`Blueprint ${environment} AI Gateway ID is invalid`);
  }
  const workersAiSelection = Object.values(blueprint.selections || {})
    .flat()
    .find(({ id }) => id === "capability.workers-ai");
  if (!workersAiSelection)
    failures.push("Blueprint is missing capability.workers-ai selection state");
  else if (workersAiSelection.lifecycle.selected !== (aiPolicy.provider === "workers-ai"))
    failures.push("Workers AI Pack selection must match the AI Provider");
  const searchPolicy = blueprint.providers?.search || {};
  if (!new Set(["none", "postgresql", "vectorize"]).has(searchPolicy.provider))
    failures.push("Blueprint search provider must be none, postgresql, or vectorize");
  const vectorizeNames = [];
  for (const environment of ["development", "production"]) {
    const value = searchPolicy[environment] || {};
    vectorizeNames.push(value.indexName);
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u.test(value.indexName || ""))
      failures.push(`Blueprint ${environment} Vectorize index name is invalid`);
    if (!Number.isInteger(value.dimensions) || value.dimensions < 32 || value.dimensions > 1536)
      failures.push(`Blueprint ${environment} Vectorize dimensions must be 32-1536`);
    if (!new Set(["cosine", "euclidean", "dot-product"]).has(value.metric))
      failures.push(`Blueprint ${environment} Vectorize metric is invalid`);
  }
  if (vectorizeNames[0] === vectorizeNames[1])
    failures.push("Development and Production Vectorize indexes must be different");
  const vectorizeSelection = Object.values(blueprint.selections || {})
    .flat()
    .find(({ id }) => id === "capability.vectorize");
  if (!vectorizeSelection)
    failures.push("Blueprint is missing capability.vectorize selection state");
  else if (vectorizeSelection.lifecycle.selected !== (searchPolicy.provider === "vectorize"))
    failures.push("Vectorize Pack selection must match the search Provider");
  const pushPolicy = blueprint.providers?.push || {};
  if (!new Set(["none", "expo-push"]).has(pushPolicy.provider))
    failures.push("Blueprint push provider must be none or expo-push");
  const pushProjectIds = [
    String(pushPolicy.development?.projectId || ""),
    String(pushPolicy.production?.projectId || ""),
  ];
  if (pushPolicy.provider === "expo-push") {
    if (pushProjectIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)))
      failures.push("Expo Push requires valid Development and Production EAS project IDs");
    if (pushProjectIds[0] === pushProjectIds[1])
      failures.push("Development and Production Expo Push project IDs must be different");
  }
  const expoPushSelection = Object.values(blueprint.selections || {})
    .flat()
    .find(({ id }) => id === "capability.expo-push");
  if (!expoPushSelection)
    failures.push("Blueprint is missing capability.expo-push selection state");
  else if (expoPushSelection.lifecycle.selected !== (pushPolicy.provider === "expo-push"))
    failures.push("Expo Push Pack selection must match the push Provider");
  const smsPolicy = blueprint.providers?.sms || {};
  if (!new Set(["none", "twilio"]).has(smsPolicy.provider))
    failures.push("Blueprint SMS provider must be none or twilio");
  for (const environment of ["development", "production"])
    try {
      const url = new URL(smsPolicy[environment]?.apiBaseUrl || "");
      if (url.protocol !== "https:") throw new Error("not https");
    } catch {
      failures.push(`Blueprint ${environment} Twilio API base URL must use HTTPS`);
    }
  const twilioSmsSelection = Object.values(blueprint.selections || {})
    .flat()
    .find(({ id }) => id === "capability.twilio-sms");
  if (!twilioSmsSelection)
    failures.push("Blueprint is missing capability.twilio-sms selection state");
  else if (twilioSmsSelection.lifecycle.selected !== (smsPolicy.provider === "twilio"))
    failures.push("Twilio SMS Pack selection must match the SMS Provider");
  const imagesPolicy = blueprint.providers?.media?.images || {};
  if (!new Set(["none", "cloudflare-images"]).has(imagesPolicy.provider))
    failures.push("Blueprint image Provider must be none or cloudflare-images");
  if (!Number.isInteger(imagesPolicy.maxInputBytes) || imagesPolicy.maxInputBytes < 1 || imagesPolicy.maxInputBytes > 20_971_520)
    failures.push("Blueprint Images max input must be between 1 and 20971520 bytes");
  if (!new Set(["image/webp", "image/avif", "image/jpeg", "image/png"]).has(imagesPolicy.defaultFormat))
    failures.push("Blueprint Images default format is invalid");
  const imagesSelection = Object.values(blueprint.selections || {})
    .flat()
    .find(({ id }) => id === "capability.cloudflare-images");
  if (!imagesSelection)
    failures.push("Blueprint is missing capability.cloudflare-images selection state");
  else if (imagesSelection.lifecycle.selected !== (imagesPolicy.provider === "cloudflare-images"))
    failures.push("Cloudflare Images Pack selection must match the image Provider");
  const streamPolicy = blueprint.providers?.media?.stream || {};
  if (!new Set(["none", "cloudflare-stream"]).has(streamPolicy.provider))
    failures.push("Blueprint video Provider must be none or cloudflare-stream");
  if (!Number.isInteger(streamPolicy.maxDurationSeconds) || streamPolicy.maxDurationSeconds < 1 || streamPolicy.maxDurationSeconds > 21_600)
    failures.push("Blueprint Stream duration must be between 1 and 21600 seconds");
  for (const environment of ["development", "production"]) {
    const value = streamPolicy[environment] || {};
    if (!/^[a-f0-9]{32}$/u.test(value.accountId || "")) failures.push(`Blueprint ${environment} Stream account ID is invalid`);
    try { const url = new URL(value.apiBaseUrl || ""); if (url.protocol !== "https:") throw new Error(); } catch { failures.push(`Blueprint ${environment} Stream API URL must use HTTPS`); }
    if (!Array.isArray(value.allowedOrigins) || !value.allowedOrigins.length || value.allowedOrigins.some((origin) => !/^[A-Za-z0-9.-]+$/u.test(origin)))
      failures.push(`Blueprint ${environment} Stream allowed origins are invalid`);
  }
  const streamSelection = Object.values(blueprint.selections || {}).flat().find(({ id }) => id === "capability.cloudflare-stream");
  if (!streamSelection) failures.push("Blueprint is missing capability.cloudflare-stream selection state");
  else if (streamSelection.lifecycle.selected !== (streamPolicy.provider === "cloudflare-stream")) failures.push("Cloudflare Stream Pack selection must match the video Provider");
  const cronPolicy = blueprint.providers?.background?.cron || {};
  for (const environment of ["development", "production"])
    if (!/^(\S+\s+){4}\S+$/u.test(cronPolicy[environment]?.expression || ""))
      failures.push(`Blueprint ${environment} Cron expression must contain five fields`);
  const cronSelection = Object.values(blueprint.selections || {}).flat().find(({ id }) => id === "capability.cron");
  if (!cronSelection) failures.push("Blueprint is missing capability.cron selection state");
  else if (cronSelection.lifecycle.selected !== Boolean(cronPolicy.enabled)) failures.push("Cron Pack selection must match the background Cron setting");

  const packIds = new Set();
  const packs = new Map();
  for (const pack of catalog.packs || []) {
    if (packIds.has(pack.id))
      failures.push(`Duplicate Catalog pack id ${pack.id}`);
    packIds.add(pack.id);
    packs.set(pack.id, pack);
    if (!String(pack.id || "").startsWith(`${pack.kind}.`))
      failures.push(`Catalog pack ${pack.id} does not match kind ${pack.kind}`);
    if (!new Set(["baseline", "materializer", "planned"]).has(pack.delivery))
      failures.push(
        `Catalog pack ${pack.id} has invalid delivery ${pack.delivery || "<missing>"}`,
      );
    if (pack.delivery === "planned" && pack.status !== "planned")
      failures.push(
        `Catalog pack ${pack.id} uses planned delivery but status is ${pack.status}`,
      );
    if (pack.status === "planned" && pack.delivery !== "planned")
      failures.push(
        `Catalog pack ${pack.id} is planned but delivery is ${pack.delivery}`,
      );
  }

  const presetIds = new Set();
  for (const preset of catalog.presets || []) {
    if (presetIds.has(preset.id))
      failures.push(`Duplicate Catalog preset id ${preset.id}`);
    presetIds.add(preset.id);
    for (const selectionId of preset.selections || []) {
      if (!packIds.has(selectionId))
        failures.push(
          `Catalog preset ${preset.id} references missing pack ${selectionId}`,
        );
      else if (packs.get(selectionId)?.delivery === "planned")
        failures.push(
          `Catalog preset ${preset.id} references unavailable planned pack ${selectionId}`,
        );
    }
  }
  if (!presetIds.has(blueprint.preset))
    failures.push(
      `Blueprint preset ${blueprint.preset} is missing from Catalog`,
    );
  if (!presetIds.has("saas-foundation"))
    failures.push("Catalog must define the saas-foundation preset");

  const selectionKinds = {
    design: "design",
    pages: "page",
    saas: "saas",
    capabilities: "capability",
  };
  for (const [group, kind] of Object.entries(selectionKinds)) {
    const ids = new Set();
    for (const selection of blueprint.selections?.[group] || []) {
      if (ids.has(selection.id))
        failures.push(`Duplicate Blueprint selection ${selection.id}`);
      ids.add(selection.id);
      if (!packIds.has(selection.id))
        failures.push(
          `Blueprint selection ${selection.id} is missing from Catalog`,
        );
      if (!selection.id.startsWith(`${kind}.`))
        failures.push(
          `Blueprint selection ${selection.id} is in the wrong group ${group}`,
        );
      const lifecycle = selection.lifecycle || {};
      if (lifecycle.selected && packs.get(selection.id)?.delivery === "planned")
        failures.push(
          `Blueprint cannot select unavailable planned pack ${selection.id}`,
        );
      if (
        !lifecycle.selected &&
        (lifecycle.localVerified ||
          lifecycle.developmentVerified ||
          lifecycle.productionReleased)
      )
        failures.push(
          `Blueprint lifecycle for ${selection.id} retains verification after deselection`,
        );
      const sequence = [
        "materialized",
        "localVerified",
        "developmentVerified",
        "productionReleased",
      ];
      for (let index = 1; index < sequence.length; index += 1) {
        if (lifecycle[sequence[index]] && !lifecycle[sequence[index - 1]])
          failures.push(
            `Blueprint lifecycle for ${selection.id} skips ${sequence[index - 1]}`,
          );
      }
    }
  }

  const selectedIds = new Set(
    Object.values(blueprint.selections || {})
      .flat()
      .filter(({ lifecycle }) => lifecycle?.selected)
      .map(({ id }) => id),
  );
  for (const requiredId of [
    "page.core-product-site",
    "saas.identity-core",
    "saas.product-shell",
    "saas.notifications-core",
    "saas.product-operations-lite",
  ]) {
    if (!selectedIds.has(requiredId))
      failures.push(
        `Blueprint required pack ${requiredId} must remain selected`,
      );
  }

  if (
    !blueprint.stylekit?.slug ||
    !blueprint.stylekit.sourceRevision ||
    !blueprint.stylekit.snapshotVersion ||
    !/^[a-f0-9]{64}$/u.test(blueprint.stylekit.snapshotHash || "")
  )
    failures.push(
      "Blueprint StyleKit selection must pin slug, source revision, snapshot version, and SHA-256 hash",
    );
  if (!selectedIds.has("design.stylekit-adapted"))
    failures.push(
      "Blueprint StyleKit selection requires design.stylekit-adapted",
    );
  const sourceStyle = stylekit?.catalog?.styles?.find(
    ({ slug }) => slug === blueprint.stylekit?.slug,
  );
  if (stylekit?.catalog && !sourceStyle)
    failures.push(
      `Blueprint StyleKit style ${blueprint.stylekit?.slug || "<missing>"} is missing from source catalog`,
    );
  if (
    sourceStyle &&
    (sourceStyle.classification !== "base-visual" ||
      sourceStyle.globalEligibility !== "eligible")
  )
    failures.push(
      `Blueprint StyleKit style ${sourceStyle.slug} is not an eligible global visual system`,
    );
  if (
    sourceStyle &&
    stylekit?.catalog?.source?.revision !== blueprint.stylekit.sourceRevision
  )
    failures.push(
      `Blueprint StyleKit source revision must pin ${stylekit.catalog.source.revision}`,
    );
  if (
    stylekit?.snapshot &&
    stylekit.snapshot.style?.slug === blueprint.stylekit?.slug
  ) {
    if (
      stylekit.snapshot.snapshotVersion !== blueprint.stylekit.snapshotVersion
    )
      failures.push(
        "Blueprint StyleKit snapshot version does not match the selected immutable snapshot",
      );
    if (
      stylekit.snapshotHash &&
      stylekit.snapshotHash !== blueprint.stylekit.snapshotHash
    )
      failures.push(
        "Blueprint StyleKit snapshot hash does not match the selected immutable snapshot",
      );
    if (stylekit.snapshot.immutable !== true)
      failures.push("Selected StyleKit snapshot must be immutable");
    if (
      stylekit.snapshot.style?.classification !== "base-visual" ||
      stylekit.snapshot.style?.globalEligibility !== "eligible"
    )
      failures.push(
        "Selected StyleKit snapshot is not approved as a global visual system",
      );
  }

  const profileIds = new Set();
  const profiles = new Map();
  for (const profile of designCatalog?.profiles || []) {
    if (profileIds.has(profile.id))
      failures.push(`Duplicate Design Profile id ${profile.id}`);
    profileIds.add(profile.id);
    profiles.set(profile.id, profile);
    if (!packIds.has(profile.packId))
      failures.push(
        `Design Profile ${profile.id} references missing pack ${profile.packId}`,
      );
    for (const mode of ["light", "dark"])
      if (!profile.semanticColors?.[mode])
        failures.push(
          `Design Profile ${profile.id} is missing ${mode} semantic colors`,
        );
    for (const target of profile.targets || [])
      if (!(target in (profile.adapters || {})))
        failures.push(
          `Design Profile ${profile.id} is missing adapter state for ${target}`,
        );
    for (const source of profile.source || []) {
      if (
        source.relationship === "adapted-donor" &&
        (!source.revision || !source.license || !source.url)
      )
        failures.push(
          `Design Profile ${profile.id} donor source must pin URL, revision, and license`,
        );
    }
  }
  const selectedProfile = profiles.get(blueprint.designProfile?.id);
  if (blueprint.stylekit?.slug) {
    const expectedProfile = `stylekit-${blueprint.stylekit.slug}`;
    if (
      blueprint.designProfile?.id !== expectedProfile ||
      blueprint.designProfile?.version !== blueprint.stylekit.snapshotVersion
    )
      failures.push(
        "Blueprint designProfile must be the derived StyleKit compatibility pointer",
      );
  } else if (!selectedProfile)
    failures.push(
      `Blueprint Design Profile ${blueprint.designProfile?.id || "<missing>"} is missing from Design Catalog`,
    );
  else {
    if (selectedProfile.version !== blueprint.designProfile?.version)
      failures.push(
        `Blueprint Design Profile ${selectedProfile.id} must pin version ${selectedProfile.version}`,
      );
    if (!selectedIds.has(selectedProfile.packId))
      failures.push(
        `Blueprint Design Profile ${selectedProfile.id} requires selected pack ${selectedProfile.packId}`,
      );
  }

  const pages = new Map();
  for (const page of pageCatalog?.pages || []) {
    if (pages.has(page.id))
      failures.push(`Duplicate Page Catalog id ${page.id}`);
    pages.set(page.id, page);
    if (!packIds.has(page.packId))
      failures.push(`Page ${page.id} references missing pack ${page.packId}`);
    if (!page.route?.startsWith("/"))
      failures.push(`Page ${page.id} must use an absolute route`);
    if (page.required && !page.defaultSelected)
      failures.push(`Required Page ${page.id} must be selected by default`);
  }
  const selectedPages = new Set(blueprint.pageSet?.selected || []);
  for (const pageId of selectedPages) {
    const page = pages.get(pageId);
    if (!page)
      failures.push(`Blueprint Page ${pageId} is missing from Page Catalog`);
    else if (!selectedIds.has(page.packId))
      failures.push(
        `Blueprint Page ${pageId} requires selected pack ${page.packId}`,
      );
  }
  for (const page of pages.values())
    if (page.required && !selectedPages.has(page.id))
      failures.push(`Blueprint required Page ${page.id} must remain selected`);

  const manifestEnvironments = (manifest.environments || [])
    .map(({ id }) => id)
    .sort();
  const blueprintEnvironments = [...(blueprint.environments || [])].sort();
  if (
    JSON.stringify(manifestEnvironments) !==
    JSON.stringify(blueprintEnvironments)
  )
    failures.push("Blueprint environments must match starter.manifest.json");
  return failures;
}

export function validateMaterializerDeliveryContracts(catalog, manifests) {
  const failures = [];
  const manifestIds = new Set(
    manifests.map((entry) => entry.manifest?.id || entry.id),
  );
  for (const pack of catalog.packs || []) {
    if (pack.delivery === "materializer" && !manifestIds.has(pack.id))
      failures.push(
        `Catalog materializer pack ${pack.id} is missing packs/**/pack.json`,
      );
    if (pack.delivery !== "materializer" && manifestIds.has(pack.id))
      failures.push(
        `Catalog pack ${pack.id} has ${pack.delivery} delivery but also declares a materializer manifest`,
      );
  }
  return failures;
}
