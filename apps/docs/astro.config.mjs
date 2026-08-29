import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { readFileSync } from "node:fs";

const starter = JSON.parse(
  readFileSync(new URL("../../starter.config.json", import.meta.url), "utf8"),
);

export default defineConfig({
  outDir: "../../dist/docs-site",
  build: { assets: "_docs" },
  integrations: [
    starlight({
      title: starter.project.name,
      description: "Build, understand, verify, and release a Starter-based product.",
      disable404Route: true,
      favicon: "/docs/favicon.svg",
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        { label: "Start", items: [{ label: "Overview", slug: "docs" }, { label: "Create a project", slug: "docs/getting-started" }] },
        { label: "Build", items: [{ label: "Use the Starter", slug: "docs/guides/using-starter" }, { label: "Optional SaaS packs", slug: "docs/guides/optional-saas-packs" }] },
        { label: "Reference", items: [{ label: "Pages, Packs and Providers", slug: "docs/reference/capabilities" }] },
        { label: "Operate", items: [{ label: "Release lanes", slug: "docs/operations/releases" }] }
      ]
    })
  ]
});
