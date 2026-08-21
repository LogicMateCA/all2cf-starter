import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const slug = arg("--slug", "neumorphism");
const snapshotVersion = arg("--version", "2.2.0");
const outputFile = arg("--output", `design/stylekit/${slug}/snapshot.json`);
const bundle = JSON.parse(
  await readFile(path.join(root, "design/stylekit/source-bundle.json"), "utf8"),
);
const entry = bundle.styles.find(({ metadata }) => metadata.slug === slug);
if (!entry) throw new Error(`Unknown StyleKit style: ${slug}`);
if (
  entry.metadata.globalEligibility !== "eligible" ||
  entry.metadata.classification !== "base-visual"
)
  throw new Error(
    `StyleKit style ${slug} is not an eligible global visual system.`,
  );
if (!entry.metadata.adapterFamily)
  throw new Error(`StyleKit style ${slug} has no owned adapter family.`);

const [style, tokensSource, recipesSource] = entry.files;
const metadata = entry.metadata;

function parseHex(value) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/iu.exec(value || "");
  if (!match) return null;
  const source =
    match[1].length === 3
      ? [...match[1]].map((part) => part + part).join("")
      : match[1];
  return {
    r: Number.parseInt(source.slice(0, 2), 16),
    g: Number.parseInt(source.slice(2, 4), 16),
    b: Number.parseInt(source.slice(4, 6), 16),
  };
}

function hex({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mix(first, second, amount) {
  return {
    r: first.r + (second.r - first.r) * amount,
    g: first.g + (second.g - first.g) * amount,
    b: first.b + (second.b - first.b) * amount,
  };
}

function luminance(color) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function ensureContrast(
  color,
  backgrounds,
  target,
  minimum = 4.65,
  requireReadableText = false,
) {
  for (let step = 0; step <= 100; step += 1) {
    const candidate = mix(color, target, step / 100);
    if (
      backgrounds.every(
        (background) => contrast(candidate, background) >= minimum,
      ) &&
      (!requireReadableText ||
        Math.max(contrast(black, candidate), contrast(white, candidate)) >=
          minimum)
    )
      return candidate;
  }
  throw new Error(`Unable to derive a ${minimum}:1 accessible semantic color`);
}

function ensureSurfaceContrast(surface, foreground, target, minimum = 4.65) {
  for (let step = 0; step <= 100; step += 1) {
    const candidate = mix(surface, target, step / 100);
    if (contrast(foreground, candidate) >= minimum) return candidate;
  }
  throw new Error(`Unable to derive a ${minimum}:1 accessible surface color`);
}

function readableText(background) {
  return contrast(black, background) >= contrast(white, background)
    ? black
    : white;
}

function saturation(color) {
  const values = [color.r, color.g, color.b].map((value) => value / 255);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return max === min ? 0 : (max - min) / (1 - Math.abs(max + min - 1));
}

const black = { r: 12, g: 15, b: 20 };
const white = { r: 250, g: 250, b: 248 };
const baseCandidates = [metadata.colors.primary, metadata.colors.secondary]
  .map(parseHex)
  .filter(Boolean);
const accentCandidates = (metadata.colors.accent || [])
  .map(parseHex)
  .filter(Boolean);
const candidates = [...baseCandidates, ...accentCandidates];
if (candidates.length < 2)
  throw new Error(
    `StyleKit ${slug} does not expose enough parseable palette colors.`,
  );
const surfaceCandidates =
  baseCandidates.length >= 2 ? baseCandidates : candidates;
const sortedBase = [...surfaceCandidates].sort(
  (a, b) => luminance(a) - luminance(b),
);
const darkestBase = sortedBase[0];
const lightestBase = sortedBase.at(-1);
const primary = parseHex(metadata.colors.primary);
const accentCandidate =
  accentCandidates.find(
    (color) =>
      saturation(color) > 0.32 &&
      luminance(color) > 0.04 &&
      luminance(color) < 0.86,
  ) ||
  (primary &&
  saturation(primary) > 0.28 &&
  luminance(primary) > 0.035 &&
  luminance(primary) < 0.82
    ? primary
    : candidates.find(
        (color) =>
          saturation(color) > 0.32 &&
          luminance(color) > 0.04 &&
          luminance(color) < 0.86,
      ) || candidates[0]);
const lightBackground =
  luminance(lightestBase) > 0.72
    ? lightestBase
    : mix(lightestBase, white, 0.82);
const darkBackground =
  luminance(darkestBase) < 0.16
    ? darkestBase
    : mix(darkestBase, black, 0.72);
const lightSurface = ensureSurfaceContrast(
  mix(
    lightBackground,
    white,
    metadata.adapterFamily === "soft-depth" ? 0.04 : 0.16,
  ),
  parseHex("#17191c"),
  white,
);
const darkSurface = ensureSurfaceContrast(
  mix(
    darkBackground,
    white,
    metadata.adapterFamily === "glass" ? 0.12 : 0.055,
  ),
  parseHex("#f4f5f7"),
  black,
);
const lightStrong = ensureSurfaceContrast(
  mix(lightBackground, darkestBase, 0.09),
  parseHex("#17191c"),
  white,
);
const darkStrong = ensureSurfaceContrast(
  mix(darkBackground, white, 0.11),
  parseHex("#f4f5f7"),
  black,
);
const lightAccent = ensureContrast(
  accentCandidate,
  [lightBackground, lightSurface, lightStrong],
  black,
  4.65,
  true,
);
const darkAccent = ensureContrast(
  accentCandidate,
  [darkBackground, darkSurface, darkStrong],
  white,
  4.65,
  true,
);

const familyContracts = {
  flat: {
    radius: [6, 9, 12],
    motion: [120, 180],
    borderWidth: 1,
    typography: "neutral",
    elevation: "flat",
    texture: "none",
  },
  editorial: {
    radius: [2, 5, 8],
    motion: [120, 200],
    borderWidth: 1,
    typography: "editorial",
    elevation: "line",
    texture: "none",
  },
  "soft-depth": {
    radius: [12, 18, 26],
    motion: [160, 280],
    borderWidth: 0,
    typography: "friendly",
    elevation: "soft",
    texture: "none",
  },
  "hard-shadow": {
    radius: [0, 4, 8],
    motion: [90, 150],
    borderWidth: 2,
    typography: "bold",
    elevation: "hard",
    texture: "grid",
  },
  glass: {
    radius: [12, 18, 26],
    motion: [160, 260],
    borderWidth: 1,
    typography: "neutral",
    elevation: "glass",
    texture: "aurora",
  },
  gradient: {
    radius: [10, 16, 24],
    motion: [160, 260],
    borderWidth: 1,
    typography: "bold",
    elevation: "glow",
    texture: "aurora",
  },
  "dark-neon": {
    radius: [4, 8, 14],
    motion: [100, 180],
    borderWidth: 1,
    typography: "technical",
    elevation: "neon",
    texture: "grid",
  },
  organic: {
    radius: [10, 18, 30],
    motion: [180, 320],
    borderWidth: 1,
    typography: "editorial",
    elevation: "natural",
    texture: "paper",
  },
  ornamental: {
    radius: [3, 8, 14],
    motion: [150, 260],
    borderWidth: 1,
    typography: "display",
    elevation: "ornamental",
    texture: "pattern",
  },
  dense: {
    radius: [3, 6, 10],
    motion: [90, 150],
    borderWidth: 1,
    typography: "technical",
    elevation: "line",
    texture: "grid",
  },
};
const family = familyContracts[metadata.adapterFamily];
if (!family)
  throw new Error(
    `Unsupported owned adapter family: ${metadata.adapterFamily}`,
  );

function elevation(colors) {
  const { shadow, highlight } = colors;
  if (family.elevation === "hard")
    return {
      raised: `4px 4px 0 ${shadow}`,
      raisedLarge: `7px 7px 0 ${shadow}`,
      recessed: `inset 0 0 0 2px ${shadow}`,
      pressed: `1px 1px 0 ${shadow}`,
    };
  if (family.elevation === "soft")
    return {
      raised: `6px 6px 14px ${shadow}, -6px -6px 14px ${highlight}`,
      raisedLarge: `10px 10px 24px ${shadow}, -10px -10px 24px ${highlight}`,
      recessed: `inset 4px 4px 10px ${shadow}, inset -4px -4px 10px ${highlight}`,
      pressed: `inset 5px 5px 12px ${shadow}, inset -5px -5px 12px ${highlight}`,
    };
  if (family.elevation === "glass")
    return {
      raised: `0 16px 42px color-mix(in srgb, ${shadow} 34%, transparent)`,
      raisedLarge: `0 28px 70px color-mix(in srgb, ${shadow} 42%, transparent)`,
      recessed: `inset 0 0 0 1px color-mix(in srgb, ${highlight} 55%, transparent)`,
      pressed: `inset 0 2px 10px color-mix(in srgb, ${shadow} 32%, transparent)`,
    };
  if (family.elevation === "neon")
    return {
      raised: `0 0 0 1px color-mix(in srgb, ${colors.accent} 55%, transparent), 0 0 18px color-mix(in srgb, ${colors.accent} 25%, transparent)`,
      raisedLarge: `0 0 0 1px color-mix(in srgb, ${colors.accent} 70%, transparent), 0 0 36px color-mix(in srgb, ${colors.accent} 30%, transparent)`,
      recessed: `inset 0 0 14px color-mix(in srgb, ${colors.accent} 18%, transparent)`,
      pressed: `inset 0 0 20px color-mix(in srgb, ${colors.accent} 28%, transparent)`,
    };
  if (family.elevation === "glow")
    return {
      raised: `0 12px 30px color-mix(in srgb, ${colors.accent} 20%, transparent)`,
      raisedLarge: `0 22px 54px color-mix(in srgb, ${colors.accent} 26%, transparent)`,
      recessed: `inset 0 0 0 1px color-mix(in srgb, ${colors.accent} 22%, transparent)`,
      pressed: `inset 0 3px 14px color-mix(in srgb, ${shadow} 25%, transparent)`,
    };
  if (family.elevation === "natural")
    return {
      raised: `0 8px 24px color-mix(in srgb, ${shadow} 22%, transparent)`,
      raisedLarge: `0 18px 44px color-mix(in srgb, ${shadow} 26%, transparent)`,
      recessed: `inset 0 2px 8px color-mix(in srgb, ${shadow} 18%, transparent)`,
      pressed: `inset 0 3px 12px color-mix(in srgb, ${shadow} 24%, transparent)`,
    };
  if (family.elevation === "ornamental")
    return {
      raised: `0 8px 0 -5px ${colors.accent}, 0 12px 28px color-mix(in srgb, ${shadow} 24%, transparent)`,
      raisedLarge: `0 12px 0 -7px ${colors.accent}, 0 22px 48px color-mix(in srgb, ${shadow} 30%, transparent)`,
      recessed: `inset 0 0 0 1px color-mix(in srgb, ${colors.accent} 35%, transparent)`,
      pressed: `inset 0 3px 12px color-mix(in srgb, ${shadow} 25%, transparent)`,
    };
  if (family.elevation === "line")
    return {
      raised: `0 1px 0 ${shadow}`,
      raisedLarge: `0 2px 0 ${shadow}`,
      recessed: `inset 0 0 0 1px ${shadow}`,
      pressed: `inset 0 2px 4px color-mix(in srgb, ${shadow} 22%, transparent)`,
    };
  return {
    raised: "none",
    raisedLarge: "none",
    recessed: `inset 0 0 0 1px ${shadow}`,
    pressed: `inset 0 0 0 2px ${shadow}`,
  };
}

const lightColors = {
  background: hex(lightBackground),
  surface: hex(lightSurface),
  surfaceStrong: hex(lightStrong),
  foreground: "#17191c",
  muted: hex(
    ensureContrast(
      mix(black, lightBackground, 0.34),
      [lightBackground, lightSurface, lightStrong],
      black,
    ),
  ),
  accent: hex(lightAccent),
  onAccent: hex(readableText(lightAccent)),
  border: hex(mix(lightBackground, black, 0.2)),
  danger: hex(
    ensureContrast(
      parseHex("#bd3346"),
      [lightBackground, lightSurface, lightStrong],
      black,
    ),
  ),
  highlight: hex(mix(lightSurface, white, 0.7)),
  shadow: hex(
    mix(lightBackground, black, family.elevation === "hard" ? 0.92 : 0.28),
  ),
};
const darkColors = {
  background: hex(darkBackground),
  surface: hex(darkSurface),
  surfaceStrong: hex(darkStrong),
  foreground: "#f4f5f7",
  muted: hex(
    ensureContrast(
      mix(white, darkBackground, 0.5),
      [darkBackground, darkSurface, darkStrong],
      white,
    ),
  ),
  accent: hex(darkAccent),
  onAccent: hex(readableText(darkAccent)),
  border: hex(mix(darkBackground, white, 0.2)),
  danger: hex(
    ensureContrast(
      parseHex("#ff7285"),
      [darkBackground, darkSurface, darkStrong],
      white,
    ),
  ),
  highlight: hex(mix(darkSurface, white, 0.14)),
  shadow: hex(mix(darkBackground, black, 0.62)),
};
const recipeText = recipesSource.content.toLowerCase();
const coreRecipes = ["button", "card", "input"].filter((component) =>
  recipeText.includes(component),
);
if (coreRecipes.length !== 3)
  throw new Error(`StyleKit ${slug} lacks required button/card/input recipes.`);

const snapshot = {
  schemaVersion: "starter-stylekit-owned-snapshot/v1",
  snapshotVersion,
  immutable: true,
  style: {
    slug,
    name: metadata.name,
    nameEn: metadata.nameEn,
    description: metadata.description,
    descriptionEn: metadata.descriptionEn,
    cover: metadata.cover,
    styleType: metadata.styleType,
    category: metadata.category,
    tags: metadata.tags,
    colors: metadata.colors,
    keywords: metadata.keywords,
    keywordsEn: metadata.keywordsEn,
    compatibleWith: metadata.compatibleWith,
    classification: metadata.classification,
    globalEligibility: metadata.globalEligibility,
    classificationReason: metadata.classificationReason,
    adapterFamily: metadata.adapterFamily,
  },
  provenance: {
    name: "StyleKit",
    repository: bundle.source.repository,
    revision: bundle.source.revision,
    license: bundle.source.license,
    sourceFiles: [style, tokensSource, recipesSource],
    referenceFiles: entry.references || [],
  },
  targets: Object.fromEntries(
    ["marketing", "auth", "app", "admin", "docs", "setup", "dp", "expo"].map(
      (target) => [target, { status: "implemented" }],
    ),
  ),
  tokens: {
    sourcePalette: metadata.colors,
    family: metadata.adapterFamily,
    surface: {
      background: lightColors.background,
      backgroundSecondary: lightColors.surfaceStrong,
      primary: lightColors.surface,
      secondary: lightColors.surfaceStrong,
    },
    accent: [
      lightColors.accent,
      ...(metadata.colors.accent || []).filter(
        (color) => color.toLowerCase() !== lightColors.accent.toLowerCase(),
      ),
    ],
    radius: {
      sm: family.radius[0],
      md: family.radius[1],
      lg: family.radius[2],
    },
    typography: family.typography,
    motion: { durationMs: family.motion[1], reducedMotion: true },
    texture: family.texture,
  },
  adapterTokens: {
    web: {
      semanticColors: { light: lightColors, dark: darkColors },
      elevation: { light: elevation(lightColors), dark: elevation(darkColors) },
      typography: {
        ui:
          family.typography === "technical"
            ? '"JetBrains Mono", "SFMono-Regular", monospace'
            : '"Geist", "Segoe UI", sans-serif',
        display:
          family.typography === "editorial" || family.typography === "display"
            ? '"Georgia", "Times New Roman", serif'
            : '"Geist", "Segoe UI", sans-serif',
        mono: '"JetBrains Mono", "SFMono-Regular", monospace',
      },
      radius: {
        sm: family.radius[0],
        md: family.radius[1],
        lg: family.radius[2],
      },
      motion: {
        fastMs: family.motion[0],
        standardMs: family.motion[1],
        reducedMotion: true,
      },
      family: {
        id: metadata.adapterFamily,
        borderWidth: family.borderWidth,
        texture: family.texture,
        typography: family.typography,
      },
    },
    mobile: {
      status: "implemented",
      light: {
        background: lightColors.background,
        surface: lightColors.surface,
        foreground: lightColors.foreground,
        muted: lightColors.muted,
        accent: lightColors.accent,
      },
      dark: {
        background: darkColors.background,
        surface: darkColors.surface,
        foreground: darkColors.foreground,
        muted: darkColors.muted,
        accent: darkColors.accent,
      },
      radius: {
        sm: family.radius[0],
        md: family.radius[1],
        lg: family.radius[2],
      },
      motion: { fastMs: family.motion[0], standardMs: family.motion[1] },
    },
  },
  recipes: {
    sourcePath: recipesSource.path,
    sourceSha256: recipesSource.sha256,
    coreCoverage: coreRecipes,
    components: {
      button: {
        semantic: "family-interactive",
        states: ["hover", "active", "focus-visible", "disabled"],
      },
      card: { semantic: "family-surface", states: ["default", "hover"] },
      input: {
        semantic: "family-input",
        states: ["default", "focus", "error", "disabled"],
      },
      nav: { semantic: "family-navigation" },
      hero: { semantic: "family-marketing" },
    },
  },
  aiRules: {
    do: [
      "Apply the selected StyleKit snapshot to every Web, Marketing, Docs, Auth, Admin, Setup, and DP surface.",
      `Use the ${metadata.adapterFamily} adapter family and the pinned ${slug} source palette and recipes.`,
      "Keep layout patterns and visual enhancements independent from the global visual-system choice.",
      "Preserve visible keyboard focus, semantic state colors, reduced motion, and readable content density.",
    ],
    dont: [
      "Do not combine multiple global StyleKit systems in one product.",
      "Do not substitute page-local colors, radii, shadows, or typography for snapshot tokens.",
      "Do not copy donor framework runtime code or brand trade dress into the generated product.",
      "Do not communicate error, selected, disabled, or unread state through decoration alone.",
    ],
  },
  required: {
    button: [
      "source-backed recipe",
      "hover",
      "active",
      "focus-visible",
      "disabled",
    ],
    card: ["source-backed surface", "global family treatment"],
    input: ["source-backed recipe", "focus", "error", "disabled"],
    page: ["global style lock", "target adapter", "reduced motion"],
  },
  forbidden: {
    classes: [
      "page-local-theme",
      "unregistered-color",
      "unregistered-shadow",
      "mixed-global-style",
    ],
    properties: [
      "page-local palette",
      "page-local radius scale",
      "page-local typography system",
      "brand-derived runtime dependency",
    ],
  },
};

const outputPath = path.join(root, outputFile);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ok: true,
      output: outputFile,
      slug,
      version: snapshotVersion,
      family: metadata.adapterFamily,
      sourceFiles: snapshot.provenance.sourceFiles.length,
    },
    null,
    2,
  ),
);
