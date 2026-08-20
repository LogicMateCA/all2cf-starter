import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  outDir: "../../dist/docs-site",
  build: { assets: "_docs" },
  integrations: [
    starlight({
      title: "Cloudflare AI Starter",
      description: "Build, understand, verify, and release a Starter-based product.",
      disable404Route: true,
      favicon: "/docs/favicon.svg",
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        { label: "Start", items: [{ label: "Overview", slug: "docs" }, { label: "Create a project", slug: "docs/getting-started" }] },
        { label: "Build", items: [{ label: "Use the Starter", slug: "docs/guides/using-starter" }] },
        { label: "Operate", items: [{ label: "Release lanes", slug: "docs/operations/releases" }] }
      ]
    })
  ]
});
