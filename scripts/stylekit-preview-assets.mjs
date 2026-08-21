import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = JSON.parse(
  await readFile(path.join(root, "design/stylekit/source-bundle.json"), "utf8"),
);
const outputRoot = path.join(root, "apps/web/public/stylekit-previews");
const eligible = bundle.styles.filter(
  ({ metadata }) =>
    metadata.classification === "base-visual" &&
    metadata.globalEligibility === "eligible",
);
const normalizeSvg = (content) =>
  `${content
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/gu, ""))
    .join("\n")
    .replace(/\n*$/gu, "")}\n`;

await mkdir(outputRoot, { recursive: true });
const expected = new Set(eligible.map(({ metadata }) => `${metadata.slug}.svg`));
for (const entry of await readdir(outputRoot, { withFileTypes: true }))
  if (entry.isFile() && entry.name.endsWith(".svg") && !expected.has(entry.name))
    await unlink(path.join(outputRoot, entry.name));

for (const entry of eligible) {
  const cover = entry.references.find(
    ({ path: sourcePath }) =>
      sourcePath === `public/styles/${entry.metadata.slug}.svg`,
  );
  if (!cover?.content)
    throw new Error(
      `StyleKit ${entry.metadata.slug} has no pinned source cover content`,
    );
  if (
    !cover.content.trimStart().startsWith("<svg") ||
    /<script\b|javascript:/iu.test(cover.content)
  )
    throw new Error(`StyleKit ${entry.metadata.slug} cover is not a safe SVG`);
  await writeFile(
    path.join(outputRoot, `${entry.metadata.slug}.svg`),
    normalizeSvg(cover.content),
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      sourceRevision: bundle.source.revision,
      assets: eligible.length,
      output: "apps/web/public/stylekit-previews",
    },
    null,
    2,
  ),
);
