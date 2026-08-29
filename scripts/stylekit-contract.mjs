import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderStyleKitAdapterCSS,
  renderStyleKitCSS,
  renderStyleKitMobile,
} from "./lib/design-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalizeSvg = (content) =>
  `${content
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/gu, ""))
    .join("\n")
    .replace(/\n*$/gu, "")}\n`;
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../gu)
    ?.map((value) => Number.parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3 || channels.some(Number.isNaN))
    throw new Error(`Unsupported color ${hex}`);
  const linear = channels.map((value) =>
    value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4,
  );
  return (
    0.2126 * linear[0] +
    0.7152 * linear[1] +
    0.0722 * linear[2]
  );
}
function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const [sourceCatalog, sourceBundle, policy, blueprint, packageJson] =
  await Promise.all([
    readJson("design/stylekit/source-catalog.json"),
    readJson("design/stylekit/source-bundle.json"),
    readJson("design/stylekit/classification-policy.json"),
    readJson("starter.blueprint.json"),
    readJson("package.json"),
  ]);

if (sourceCatalog.schemaVersion !== "starter-stylekit-source-catalog/v1")
  failures.push("source catalog schema is invalid");
if (
  sourceCatalog.source.revision !== "29141b684d5abb967558eb8083fbae91dbbc51b8"
)
  failures.push("source catalog revision is not pinned");
if (sourceCatalog.count !== 146 || sourceCatalog.styles.length !== 146)
  failures.push("source catalog must contain exactly 146 entries");
if (new Set(sourceCatalog.styles.map(({ slug }) => slug)).size !== 146)
  failures.push("source catalog contains duplicate slugs");
if (
  sourceCatalog.styles.some(
    ({ classification, globalEligibility }) =>
      classification === "pending-review" || globalEligibility === "pending",
  )
)
  failures.push("source catalog must not retain pending classifications");
if (
  sourceCatalog.styles.filter(
    ({ classification }) => classification === "layout-pattern",
  ).length !== 18
)
  failures.push(
    "StyleKit must retain exactly 18 source-native layout patterns",
  );
if (
  sourceCatalog.styles.filter(
    ({ classification }) => classification === "density-pattern",
  ).length !== 1
)
  failures.push(
    "StyleKit must classify data density separately from layouts and global systems",
  );
if (
  sourceCatalog.styles.filter(
    ({ classification }) => classification === "style-variant",
  ).length !== policy.styleVariants.length
)
  failures.push(
    "StyleKit style variants must remain separate from whole-product global systems",
  );

const eligible = sourceCatalog.styles.filter(
  ({ classification, globalEligibility }) =>
    classification === "base-visual" && globalEligibility === "eligible",
);
if (eligible.length < policy.minimumEligibleGlobalSystems)
  failures.push(
    `StyleKit must expose at least ${policy.minimumEligibleGlobalSystems} eligible global systems`,
  );
if (eligible.length > policy.maximumEligibleGlobalSystems)
  failures.push(
    `StyleKit must expose no more than ${policy.maximumEligibleGlobalSystems} distinct global systems`,
  );
if (eligible.length !== Object.keys(policy.eligibleGlobalSystems).length)
  failures.push("eligible catalog count does not match classification policy");
for (const style of eligible)
  if (
    !style.adapterFamily ||
    policy.eligibleGlobalSystems[style.slug] !== style.adapterFamily
  )
    failures.push(`${style.slug} has no matching owned adapter family`);

if (
  sourceBundle.schemaVersion !== "starter-stylekit-source-bundle/v1" ||
  sourceBundle.count !== 146 ||
  sourceBundle.styles.length !== 146
)
  failures.push("offline source bundle must contain exactly 146 entries");
if (
  sourceBundle.source.revision !== sourceCatalog.source.revision ||
  sourceBundle.source.license !== "MIT"
)
  failures.push(
    "offline source bundle provenance does not match source catalog",
  );
for (const entry of sourceBundle.styles) {
  if (
    !entry.metadata?.slug ||
    !Array.isArray(entry.files) ||
    entry.files.length !== 3
  )
    failures.push(
      `${entry.metadata?.slug || "unknown"} offline bundle must include style, tokens, and recipes`,
    );
  for (const artifact of entry.files || [])
    if (sha256(artifact.content) !== artifact.sha256)
      failures.push(`offline bundle hash mismatch: ${artifact.path}`);
  for (const reference of entry.references || [])
    if (
      reference.content !== undefined &&
      sha256(reference.content) !== reference.sha256
    )
      failures.push(`offline reference hash mismatch: ${reference.path}`);
}

const snapshotIndex = {};
const contrastResults = [];
for (const style of eligible) {
  const relativePath = `design/stylekit/${style.slug}/snapshot.json`;
  let source;
  try {
    source = await readFile(path.join(root, relativePath), "utf8");
  } catch {
    failures.push(`missing owned snapshot: ${relativePath}`);
    continue;
  }
  const snapshot = JSON.parse(source);
  snapshotIndex[style.slug] = {
    snapshotVersion: snapshot.snapshotVersion,
    snapshotHash: sha256(source),
    adapterFamily: snapshot.style?.adapterFamily,
  };
  if (
    snapshot.schemaVersion !== "starter-stylekit-owned-snapshot/v1" ||
    snapshot.immutable !== true
  )
    failures.push(
      `${style.slug} snapshot is not immutable or has an invalid schema`,
    );
  if (
    snapshot.style?.slug !== style.slug ||
    snapshot.style?.classification !== "base-visual" ||
    snapshot.style?.globalEligibility !== "eligible"
  )
    failures.push(`${style.slug} snapshot metadata is inconsistent`);
  if (snapshot.style?.adapterFamily !== style.adapterFamily)
    failures.push(`${style.slug} snapshot adapter family is inconsistent`);
  if (snapshot.provenance?.revision !== sourceCatalog.source.revision)
    failures.push(`${style.slug} snapshot source revision is inconsistent`);
  if (
    !["button", "card", "input"].every((component) =>
      snapshot.recipes?.coreCoverage?.includes(component),
    )
  )
    failures.push(`${style.slug} snapshot lacks core recipe coverage`);
  if (
    !snapshot.adapterTokens?.web?.semanticColors?.light ||
    !snapshot.adapterTokens?.web?.semanticColors?.dark ||
    !snapshot.adapterTokens?.web?.elevation?.light ||
    !snapshot.adapterTokens?.web?.elevation?.dark
  )
    failures.push(`${style.slug} snapshot lacks complete Web adapter tokens`);
  if (
    !snapshot.adapterTokens?.mobile?.light ||
    !snapshot.adapterTokens?.mobile?.dark
  )
    failures.push(
      `${style.slug} snapshot lacks complete Mobile adapter tokens`,
    );
  for (const mode of ["light", "dark"]) {
    const colors = snapshot.adapterTokens?.web?.semanticColors?.[mode];
    const pairs = {
      foregroundBackground: [colors?.foreground, colors?.background],
      foregroundSurface: [colors?.foreground, colors?.surface],
      foregroundStrong: [colors?.foreground, colors?.surfaceStrong],
      mutedBackground: [colors?.muted, colors?.background],
      mutedSurface: [colors?.muted, colors?.surface],
      mutedStrong: [colors?.muted, colors?.surfaceStrong],
      accentBackground: [colors?.accent, colors?.background],
      accentSurface: [colors?.accent, colors?.surface],
      accentStrong: [colors?.accent, colors?.surfaceStrong],
      onAccentAccent: [colors?.onAccent, colors?.accent],
      dangerBackground: [colors?.danger, colors?.background],
      dangerSurface: [colors?.danger, colors?.surface],
      dangerStrong: [colors?.danger, colors?.surfaceStrong],
    };
    for (const [name, pair] of Object.entries(pairs)) {
      let ratio = 0;
      try {
        ratio = contrast(pair[0], pair[1]);
      } catch (error) {
        failures.push(`${style.slug} ${mode} ${name}: ${error.message}`);
      }
      const rounded = Number(ratio.toFixed(2));
      contrastResults.push({
        style: style.slug,
        mode,
        pair: name,
        ratio: rounded,
        minimum: 4.5,
        ok: ratio >= 4.5,
      });
      if (ratio < 4.5)
        failures.push(
          `${style.slug} ${mode} ${name} contrast ${rounded} is below 4.5`,
        );
    }
  }
  try {
    const adapterOutputs = ["web", "marketing", "docs"].map((target) =>
      renderStyleKitAdapterCSS(snapshot, target),
    );
    const generated = [
      renderStyleKitCSS(snapshot),
      renderStyleKitMobile(snapshot),
      ...adapterOutputs,
    ];
    if (generated.some((output) => !output.includes(style.slug)))
      failures.push(
        `${style.slug} generated adapter output lost its style identity`,
      );
    if (
      style.slug !== "neumorphism" &&
      adapterOutputs.some((output) => output.includes("soft depth is semantic"))
    )
      failures.push(`${style.slug} incorrectly inherits the Neumorphism target adapter`);
    if (
      style.slug !== "neumorphism" &&
      adapterOutputs.some(
        (output) => !output.includes(`Owned ${style.slug} signature layer.`),
      )
    )
      failures.push(`${style.slug} lacks an owned style-signature layer`);
  } catch (error) {
    failures.push(`${style.slug} adapter compilation failed: ${error.message}`);
  }
  for (const target of [
    "marketing",
    "auth",
    "app",
    "admin",
    "docs",
    "setup",
    "dp",
    "expo",
  ])
    if (snapshot.targets?.[target]?.status !== "implemented")
      failures.push(`${style.slug} ${target} adapter is not implemented`);
  for (const artifact of snapshot.provenance?.sourceFiles || [])
    if (sha256(artifact.content) !== artifact.sha256)
      failures.push(
        `${style.slug} snapshot artifact hash mismatch: ${artifact.path}`,
      );
  const bundled = sourceBundle.styles.find(
    ({ metadata }) => metadata.slug === style.slug,
  );
  const cover = bundled?.references.find(
    ({ path: sourcePath }) => sourcePath === `public/styles/${style.slug}.svg`,
  );
  if (!cover?.content)
    failures.push(`${style.slug} has no pinned source-cover preview`);
  else
    try {
      const preview = await readFile(
        path.join(root, "apps/web/public/stylekit-previews", `${style.slug}.svg`),
        "utf8",
      );
      if (preview !== normalizeSvg(cover.content))
        failures.push(`${style.slug} Setup preview drifted from its pinned source cover`);
    } catch {
      failures.push(`${style.slug} Setup preview asset is missing`);
    }
  for (const artifact of snapshot.provenance?.sourceFiles || [])
    if (
      !bundled?.files.some(
        ({ path: sourcePath, sha256: sourceHash }) =>
          sourcePath === artifact.path && sourceHash === artifact.sha256,
      )
    )
      failures.push(
        `${style.slug} snapshot artifact is not pinned by the offline bundle: ${artifact.path}`,
      );
}

const selected = snapshotIndex[blueprint.stylekit?.slug];
if (!selected)
  failures.push(
    `Blueprint selected StyleKit ${blueprint.stylekit?.slug || "<missing>"} has no owned snapshot`,
  );
else {
  if (blueprint.stylekit.sourceRevision !== sourceCatalog.source.revision)
    failures.push("Blueprint StyleKit source revision is stale");
  if (blueprint.stylekit.snapshotVersion !== selected.snapshotVersion)
    failures.push("Blueprint StyleKit snapshot version is stale");
  if (blueprint.stylekit.snapshotHash !== selected.snapshotHash)
    failures.push("Blueprint StyleKit snapshot hash is stale");
  if (
    blueprint.designProfile?.id !== `stylekit-${blueprint.stylekit.slug}` ||
    blueprint.designProfile?.version !== selected.snapshotVersion
  )
    failures.push("Blueprint design profile pointer is stale");
}

const dependencyNames = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
  ...packageJson.optionalDependencies,
});
const runtimeDeps = dependencyNames.filter((name) =>
  /(^|[/@-])(stylekit|powerai)([/@-]|$)/iu.test(name),
);
if (runtimeDeps.length)
  failures.push(`donor runtime dependency detected: ${runtimeDeps.join(", ")}`);

const externalSource = process.env.STYLEKIT_SOURCE;
let externalSourceVerified = false;
if (externalSource)
  try {
    const sourceMeta = await readFile(
      path.join(externalSource, sourceCatalog.source.metaRegistry.path),
    );
    if (sha256(sourceMeta) !== sourceCatalog.source.metaRegistry.sha256)
      failures.push("external StyleKit meta registry hash mismatch");
    externalSourceVerified = true;
  } catch (error) {
    failures.push(`cannot verify external StyleKit source: ${error.message}`);
  }

const classification = Object.fromEntries(
  [...new Set(sourceCatalog.styles.map(({ classification }) => classification))]
    .sort()
    .map((name) => [
      name,
      sourceCatalog.styles.filter(
        ({ classification }) => classification === name,
      ).length,
    ]),
);
console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      sourceRevision: sourceCatalog.source.revision,
      styleCount: sourceCatalog.count,
      eligibleGlobalSystems: eligible.length,
      adapterFamilies: [
        ...new Set(eligible.map(({ adapterFamily }) => adapterFamily)),
      ].sort(),
      classification,
      selected: blueprint.stylekit?.slug,
      contrast: {
        checkedPairs: contrastResults.length,
        minimumRatio: Math.min(...contrastResults.map(({ ratio }) => ratio)),
        failures: contrastResults.filter(({ ok }) => !ok).length,
      },
      externalSourceVerified,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
