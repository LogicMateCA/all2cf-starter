import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot =
  process.env.STYLEKIT_SOURCE || "/tmp/starter-stylekit-audit.1dqNya/stylekit";
const revision = "29141b684d5abb967558eb8083fbae91dbbc51b8";
const outputRoot = path.join(root, "design/stylekit");
const policy = JSON.parse(
  await readFile(path.join(outputRoot, "classification-policy.json"), "utf8"),
);
const eligibleSystems = new Map(Object.entries(policy.eligibleGlobalSystems));
const layoutPatterns = new Set(policy.layoutPatterns);
const densityPatterns = new Set(policy.densityPatterns);
const styleVariants = new Set(policy.styleVariants);
const enhancements = new Set(policy.enhancements);
const referenceOnly = new Set(policy.referenceOnly);

function classificationFor(slug) {
  if (eligibleSystems.has(slug))
    return {
      classification: "base-visual",
      globalEligibility: "eligible",
      adapterFamily: eligibleSystems.get(slug),
      classificationReason:
        "Approved as an owned whole-product visual system with pinned source inputs and generated Web, Marketing, Docs, and Mobile adapter contracts.",
    };
  if (layoutPatterns.has(slug))
    return {
      classification: "layout-pattern",
      globalEligibility: "ineligible",
      classificationReason:
        "Reusable composition pattern; it can be combined with a global visual system but cannot replace one.",
    };
  if (densityPatterns.has(slug))
    return {
      classification: "density-pattern",
      globalEligibility: "ineligible",
      classificationReason:
        "Admin and data-surface density option; it modifies information density without replacing the selected global visual system.",
    };
  if (styleVariants.has(slug))
    return {
      classification: "style-variant",
      globalEligibility: "ineligible",
      classificationReason:
        "Retained as a composable palette, tone, mode, or close family variant; it does not consume a whole-product base-style slot.",
    };
  if (enhancements.has(slug))
    return {
      classification: "enhancement",
      globalEligibility: "ineligible",
      classificationReason:
        "Optional visual or motion enhancement with separate performance and accessibility constraints; not a whole-product theme.",
    };
  if (referenceOnly.has(slug))
    return {
      classification: "content-domain",
      globalEligibility: "ineligible",
      classificationReason:
        "Reference-only source because it is brand-derived, content-specific, or too page-specific to become a neutral Starter-wide system.",
    };
  return {
    classification: "content-domain",
    globalEligibility: "ineligible",
    classificationReason:
      "Complete source reference retained for future owned adaptation, but not approved for whole-product selection in the current curated set.",
  };
}

async function sha256(filePath) {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function exists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

const metaPath = path.join(sourceRoot, "lib/styles/meta-registry.ts");
const meta = await readFile(metaPath, "utf8");
const slugMatches = [...meta.matchAll(/\n\s*slug:\s*"([a-z0-9-]+)"/g)];
const slugs = slugMatches.map(([, slug]) => slug);
if (slugs.length !== 146)
  throw new Error(`Expected 146 StyleKit styles, found ${slugs.length}`);

function stringField(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*"((?:\\\\.|[^"])*)"`));
  return match ? JSON.parse(`"${match[1]}"`) : undefined;
}
function arrayField(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`));
  return match
    ? [...match[1].matchAll(/"((?:\\.|[^"])*)"/g)].map(([, value]) =>
        JSON.parse(`"${value}"`),
      )
    : [];
}
function objectField(block, name) {
  const match = block.match(
    new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`),
  );
  return match
    ? {
        primary: stringField(match[1], "primary"),
        secondary: stringField(match[1], "secondary"),
        accent: arrayField(match[1], "accent"),
      }
    : undefined;
}

const styles = [];
for (const slug of slugs) {
  const index = slugs.indexOf(slug);
  const start = slugMatches[index].index;
  const end = slugMatches[index + 1]?.index || meta.length;
  const block = meta.slice(start, end);
  const candidates = [
    `lib/styles/${slug}.ts`,
    `lib/styles/${slug}-tokens.ts`,
    `lib/recipes/${slug}.ts`,
    `app/styles/${slug}/showcase/_content.tsx`,
    `app/styles/${slug}/showcase/page.tsx`,
    `public/styles/${slug}.svg`,
  ];
  const files = [];
  for (const relativePath of candidates) {
    const absolutePath = path.join(sourceRoot, relativePath);
    if (await exists(absolutePath))
      files.push({ path: relativePath, sha256: await sha256(absolutePath) });
  }
  styles.push({
    slug,
    name: stringField(block, "name"),
    nameEn: stringField(block, "nameEn"),
    description: stringField(block, "description"),
    descriptionEn: stringField(block, "descriptionEn"),
    cover: stringField(block, "cover"),
    styleType: stringField(block, "styleType"),
    category: stringField(block, "category"),
    tags: arrayField(block, "tags"),
    colors: objectField(block, "colors"),
    keywords: arrayField(block, "keywords"),
    keywordsEn: arrayField(block, "keywordsEn"),
    compatibleWith: arrayField(block, "compatibleWith"),
    ...classificationFor(slug),
    files,
  });
}

const output = {
  schemaVersion: "starter-stylekit-source-catalog/v1",
  catalogVersion: "2.0.0",
  source: {
    name: "StyleKit",
    repository: "https://github.com/AnxForever/stylekit",
    revision,
    license: "MIT",
    sourceRoot: "external-audit-source",
    metaRegistry: {
      path: "lib/styles/meta-registry.ts",
      sha256: await sha256(metaPath),
    },
  },
  count: styles.length,
  styles,
};
await mkdir(outputRoot, { recursive: true });
await writeFile(
  path.join(outputRoot, "source-catalog.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      ok: true,
      output: "design/stylekit/source-catalog.json",
      revision,
      count: styles.length,
    },
    null,
    2,
  ),
);
