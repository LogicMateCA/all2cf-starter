import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { validateAssemblyContracts } from "../../scripts/lib/assembly.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

async function loadStylekitSnapshots(stylekitCatalog: {
  styles: Array<{
    slug: string;
    classification: string;
    globalEligibility: string;
  }>;
}) {
  const summaries = await Promise.all(
    stylekitCatalog.styles
      .filter(
        ({ classification, globalEligibility }) =>
          classification === "base-visual" && globalEligibility === "eligible",
      )
      .map(async ({ slug }) => {
        const source = await readFile(
          path.join(repositoryRoot, "design/stylekit", slug, "snapshot.json"),
          "utf8",
        );
        const snapshot = JSON.parse(source);
        return [
          slug,
          {
            snapshotVersion: snapshot.snapshotVersion,
            snapshotHash: sha256(source),
            immutable: snapshot.immutable,
            targets: snapshot.targets,
            style: snapshot.style,
          },
        ] as const;
      }),
  );
  return Object.fromEntries(summaries);
}

function isLoopbackHost(value: string | undefined) {
  if (!value) return false;
  try {
    return new Set(["localhost", "127.0.0.1", "[::1]"]).has(
      new URL(`http://${value}`).hostname,
    );
  } catch {
    return false;
  }
}

function isLoopbackOrigin(value: string | undefined) {
  if (!value) return false;
  try {
    return new Set(["localhost", "127.0.0.1", "[::1]"]).has(
      new URL(value).hostname,
    );
  } catch {
    return false;
  }
}

function localSetupApi(): Plugin {
  return {
    name: "starter-local-setup-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        async (
          request: IncomingMessage,
          response: ServerResponse,
          next: () => void,
        ) => {
          const url = new URL(request.url || "/", "http://starter.local");
          if (url.pathname !== "/__starter/setup") return next();
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          if (
            !isLoopbackHost(request.headers.host) ||
            (request.method === "PUT" &&
              !isLoopbackOrigin(request.headers.origin))
          ) {
            response.statusCode = 403;
            response.end(
              json({ error: "Setup requests must originate from localhost." }),
            );
            return;
          }

          try {
            const [
              manifestSource,
              blueprintSource,
              catalogSource,
              designCatalogSource,
              pageCatalogSource,
              configSource,
              stylekitCatalogSource,
              saasSourcesSource,
              saasCapabilitiesSource,
            ] = await Promise.all([
              readFile(
                path.join(repositoryRoot, "starter.manifest.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "starter.blueprint.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "catalog/catalog.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "design/catalog.json"),
                "utf8",
              ),
              readFile(path.join(repositoryRoot, "pages/catalog.json"), "utf8"),
              readFile(
                path.join(repositoryRoot, "starter.config.json"),
                "utf8",
              ),
              readFile(
                path.join(
                  repositoryRoot,
                  "design/stylekit/source-catalog.json",
                ),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "catalog/saas-sources.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "catalog/saas-capabilities.json"),
                "utf8",
              ),
            ]);
            const manifest = JSON.parse(manifestSource);
            const catalog = JSON.parse(catalogSource);
            const designCatalog = JSON.parse(designCatalogSource);
            const pageCatalog = JSON.parse(pageCatalogSource);
            const config = JSON.parse(configSource);
            const stylekitCatalog = JSON.parse(stylekitCatalogSource);
            const saasSources = JSON.parse(saasSourcesSource);
            const saasCapabilities = JSON.parse(saasCapabilitiesSource);
            const stylekitSnapshots =
              await loadStylekitSnapshots(stylekitCatalog);
            const initialBlueprint = JSON.parse(blueprintSource);
            const initialSnapshotPath = path.join(
              repositoryRoot,
              "design/stylekit",
              initialBlueprint.stylekit?.slug || "",
              "snapshot.json",
            );
            const initialSnapshotSource = await readFile(
              initialSnapshotPath,
              "utf8",
            );

            if (request.method === "GET") {
              response.statusCode = 200;
              response.end(
                json({
                  blueprint: initialBlueprint,
                  catalog,
                  designCatalog,
                  pageCatalog,
                  stylekitCatalog,
                  stylekitSnapshots,
                  stylekitSnapshot: {
                    ...JSON.parse(initialSnapshotSource),
                    snapshotHash: sha256(initialSnapshotSource),
                  },
                  saasSources,
                  saasCapabilities,
                  config,
                }),
              );
              return;
            }
            if (request.method !== "PUT") {
              response.statusCode = 405;
              response.end(json({ error: "Method not allowed." }));
              return;
            }

            let body = "";
            for await (const chunk of request) {
              body += chunk;
              if (body.length > 524288)
                throw new Error("Setup payload is too large.");
            }
            const payload = JSON.parse(body);
            const blueprint = payload.blueprint;
            const nextConfig = payload.config;
            if (!blueprint || !nextConfig)
              throw new Error(
                "Blueprint and Starter configuration are required.",
              );
            if (
              blueprint.project?.name !== nextConfig.project?.name ||
              blueprint.project?.slug !== nextConfig.project?.slug
            )
              throw new Error(
                "Blueprint and Starter configuration identities must match.",
              );
            const nextManifest = {
              ...manifest,
              project: {
                name: blueprint.project.name,
                slug: blueprint.project.slug,
              },
            };
            const snapshotPath = path.join(
              repositoryRoot,
              "design/stylekit",
              blueprint.stylekit?.slug || "",
              "snapshot.json",
            );
            const snapshotSource = await readFile(snapshotPath, "utf8");
            const failures = validateAssemblyContracts(
              nextManifest,
              blueprint,
              catalog,
              designCatalog,
              pageCatalog,
              {
                catalog: stylekitCatalog,
                snapshot: JSON.parse(snapshotSource),
                snapshotHash: sha256(snapshotSource),
              },
            );
            if (failures.length) {
              response.statusCode = 400;
              response.end(
                json({ error: "Blueprint validation failed.", failures }),
              );
              return;
            }

            const blueprintPath = path.join(
              repositoryRoot,
              "starter.blueprint.json",
            );
            const configPath = path.join(repositoryRoot, "starter.config.json");
            const blueprintTemporaryPath = path.join(
              repositoryRoot,
              ".starter.blueprint.json.tmp",
            );
            const configTemporaryPath = path.join(
              repositoryRoot,
              ".starter.config.json.tmp",
            );
            const resetIdentity =
              manifest.project?.slug === "starter" &&
              blueprint.project.slug !== "starter";
            nextConfig.email.provider = blueprint.providers.email.default;
            await Promise.all([
              writeFile(blueprintTemporaryPath, json(blueprint), {
                encoding: "utf8",
                mode: 0o600,
              }),
              writeFile(configTemporaryPath, json(nextConfig), {
                encoding: "utf8",
                mode: 0o600,
              }),
            ]);
            await rename(blueprintTemporaryPath, blueprintPath);
            await rename(configTemporaryPath, configPath);
            try {
              execFileSync(
                process.execPath,
                [
                  "scripts/sync-project-identity.mjs",
                  ...(resetIdentity ? ["--reset"] : []),
                ],
                { cwd: repositoryRoot, stdio: "pipe" },
              );
              execFileSync(process.execPath, ["scripts/build-dp.mjs"], {
                cwd: repositoryRoot,
                stdio: "pipe",
              });
            } catch (error) {
              await Promise.all([
                writeFile(blueprintPath, blueprintSource, "utf8"),
                writeFile(configPath, configSource, "utf8"),
              ]);
              execFileSync(
                process.execPath,
                ["scripts/sync-project-identity.mjs"],
                { cwd: repositoryRoot, stdio: "pipe" },
              );
              execFileSync(process.execPath, ["scripts/build-dp.mjs"], {
                cwd: repositoryRoot,
                stdio: "pipe",
              });
              throw error;
            }
            response.statusCode = 200;
            response.end(
              json({
                blueprint,
                catalog,
                designCatalog,
                pageCatalog,
                stylekitCatalog,
                stylekitSnapshots,
                stylekitSnapshot: {
                  ...JSON.parse(snapshotSource),
                  snapshotHash: sha256(snapshotSource),
                },
                saasSources,
                saasCapabilities,
                config: nextConfig,
              }),
            );
          } catch (error) {
            response.statusCode = 400;
            response.end(
              json({
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        },
      );
    },
  };
}

function optionalMapLibreWorker(): Plugin {
  return {
    name: "starter-maplibre-worker",
    async writeBundle(options) {
      if (!options.dir) return;
      for (const filename of [
        "maplibre-gl-worker.mjs",
        "maplibre-gl-shared.mjs",
      ]) {
        const source = path.join(
          repositoryRoot,
          "node_modules/maplibre-gl/dist",
          filename,
        );
        let moduleSource: string;
        try {
          moduleSource = await readFile(source, "utf8");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
          throw error;
        }
        const target = path.join(options.dir, "assets", filename);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, moduleSource);
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/_app/" : "/",
  plugins: [localSetupApi(), react(), tailwindcss(), optionalMapLibreWorker()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    outDir: "../../dist/app-site",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return /\/node_modules\/(?:react|react-dom|scheduler)\//u.test(id)
            ? "react-vendor"
            : undefined;
        },
      },
    },
  },
}));
