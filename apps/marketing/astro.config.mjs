import { defineConfig } from "astro/config";

export default defineConfig({
  outDir: "../../dist/marketing-site",
  build: { assets: "_marketing" },
  site: "https://starter.logicm8.com",
  trailingSlash: "never",
});
