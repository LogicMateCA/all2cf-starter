import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["apps/web/src", "apps/marketing/src", "apps/docs/src"];
const extensions = new Set([".css", ".tsx", ".ts", ".astro"]);
const failures = [];

async function filesUnder(directory) {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

function isGenerated(relative) {
  return (
    relative.includes("/generated/") || /\/generated(?:-|\.)/u.test(relative)
  );
}

function allowedLiteral(relative, line) {
  if (relative.endsWith("apps/web/src/components/ui/chart.tsx")) return true;
  if (
    line.includes("--success:") ||
    line.includes("--warning:") ||
    line.includes("#4285f4")
  )
    return true;
  return false;
}

for (const sourceRoot of sourceRoots) {
  for (const file of await filesUnder(path.join(root, sourceRoot))) {
    const relative = path.relative(root, file).replaceAll(path.sep, "/");
    if (!extensions.has(path.extname(file)) || isGenerated(relative)) continue;
    const source = await readFile(file, "utf8");
    const auditedSource = source.replace(
      /\/\* STYLEKIT_PREVIEW_START:[\s\S]*?\/\* STYLEKIT_PREVIEW_END \*\//gu,
      "",
    );
    const lines = auditedSource.split("\n");
    lines.forEach((line, index) => {
      const location = `${relative}:${index + 1}`;
      if (
        /background(?:-image)?\s*:[^;]*(?:linear|radial|conic)-gradient/iu.test(
          line,
        )
      )
        failures.push(
          `${location} bypasses the selected StyleKit with a local gradient`,
        );
      if (/#[0-9a-f]{3,8}\b/iu.test(line) && !allowedLiteral(relative, line))
        failures.push(`${location} contains an unregistered literal color`);
      const shadow = line.match(/box-shadow\s*:\s*([^;}]+)/iu)?.[1];
      if (shadow && !shadow.includes("var(--") && shadow.trim() !== "none")
        failures.push(`${location} contains a non-semantic box shadow`);
    });
  }
}

const imports = [
  ["apps/web/src/main.tsx", "./generated/stylekit-adapter.css"],
  [
    "apps/marketing/src/layouts/Base.astro",
    "../styles/generated-stylekit-adapter.css",
  ],
  ["apps/docs/src/styles/custom.css", "./generated-stylekit-adapter.css"],
];
for (const [relative, expected] of imports) {
  const source = await readFile(path.join(root, relative), "utf8");
  if (!source.includes(expected))
    failures.push(
      `${relative} does not load the generated StyleKit component adapter`,
    );
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        ok: true,
        scanned: sourceRoots,
        rule: "no local gradients, literal colors, or non-semantic shadows outside reviewed functional/brand exceptions",
      },
      null,
      2,
    ),
  );
}
