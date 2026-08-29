import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";

const starter = JSON.parse(
  readFileSync(new URL("../../starter.config.json", import.meta.url), "utf8"),
);

export default defineConfig({
  outDir: "../../dist/marketing-site",
  build: { assets: "_marketing" },
  site: `https://${starter.production.domain}`,
  trailingSlash: "never",
});
