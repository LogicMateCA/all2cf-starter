import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { validateAssemblyContracts } from "./assembly.mjs";
import { validateVisualIntegration } from "./visual-integration.mjs";

const rootDocuments = [
  "PROJECT.md",
  "ARCHITECTURE.md",
  "DESIGN.md",
  "PERFORMANCE.md",
  "RELEASE.md",
];

function splitFrontmatter(source) {
  if (!source.startsWith("---\n"))
    return { attributes: {}, body: source.trim() };
  const end = source.indexOf("\n---\n", 4);
  if (end < 0) throw new Error("Markdown frontmatter is not closed");
  const attributes = {};
  for (const line of source.slice(4, end).split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 1 || /^\s/u.test(line)) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    let value = raw || null;
    if (/^\[.*\]$/u.test(raw))
      value = raw.slice(1, -1).trim()
        ? raw.slice(1, -1).split(",").map((item) => item.trim().replace(/^['"]|['"]$/gu, ""))
        : [];
    else if (/^(true|false)$/u.test(raw)) value = raw === "true";
    else if (/^-?\d+(?:\.\d+)?$/u.test(raw)) value = Number(raw);
    else value = raw.replace(/^['"]|['"]$/gu, "");
    attributes[key] = value;
  }
  return {
    attributes,
    body: source.slice(end + 5).trim(),
  };
}

function firstParagraph(markdown) {
  return (
    markdown
      .split(/\n\s*\n/u)
      .map((part) => part.replace(/^#+\s+.*$/gmu, "").trim())
      .find(Boolean) || ""
  );
}

async function readMarkdown(root, relativePath) {
  const source = await readFile(path.join(root, relativePath), "utf8");
  const parsed = splitFrontmatter(source);
  return {
    path: relativePath,
    title: String(
      parsed.attributes.title || parsed.attributes.module || relativePath,
    ),
    status: String(parsed.attributes.status || "documented"),
    attributes: parsed.attributes,
    summary: firstParagraph(parsed.body),
    body: parsed.body,
  };
}

async function collectModules(root) {
  const featuresRoot = path.join(root, "features");
  const entries = await readdir(featuresRoot, { withFileTypes: true });
  const modules = [];
  for (const entry of entries
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const document = await readMarkdown(
      root,
      `features/${entry.name}/MODULE.md`,
    );
    modules.push({
      id: String(document.attributes.module || entry.name),
      ...document,
    });
  }
  return modules;
}

async function collectChanges(root) {
  const changesRoot = path.join(root, "changes");
  const entries = await readdir(changesRoot, { withFileTypes: true });
  const changes = [];
  for (const entry of entries
    .filter(
      (item) =>
        item.isFile() &&
        item.name.endsWith(".md") &&
        !item.name.startsWith("_"),
    )
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const document = await readMarkdown(root, `changes/${entry.name}`);
    changes.push({
      id: String(document.attributes.id || entry.name.replace(/\.md$/u, "")),
      ...document,
    });
  }
  return changes;
}

function gitValue(root, args, fallback = null) {
  try {
    return (
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || fallback
    );
  } catch {
    return fallback;
  }
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function readJsonc(root, relativePath) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch (error) {
    throw new Error(`${relativePath} contains invalid generated JSONC`, { cause: error });
  }
}

async function readOptionalJsonc(root, relativePath) {
  try { return await readJsonc(root, relativePath); }
  catch (error) {
    if (error.cause?.code === "ENOENT") return {};
    throw error;
  }
}

function environmentFromConfig(id, config, manifestEnvironment) {
  const routes = Array.isArray(config.routes)
    ? config.routes
    : config.route
      ? [config.route]
      : [];
  return {
    id,
    worker: String(config.name || manifestEnvironment?.worker || ""),
    domain: String(manifestEnvironment?.domain || ""),
    releaseIntent: String(manifestEnvironment?.releaseIntent || ""),
    appEnv: String(config.vars?.APP_ENV || id),
    routes,
    workersDev: config.workers_dev !== false,
    bindings: {
      hyperdrive: config.hyperdrive || [],
      r2: config.r2_buckets || [],
      kv: config.kv_namespaces || [],
      queues: config.queues || {},
      services: config.services || [],
    },
  };
}

export async function collectKnowledge(root) {
  let sourceRoot = process.env.STARTER_FACTORY_BUILD_SOURCE_ROOT
    ? path.resolve(process.env.STARTER_FACTORY_BUILD_SOURCE_ROOT)
    : root;
  try {
    const sourceReceipt = await readJson(root, ".starter/source.json");
    if (sourceReceipt.sourceRoot) sourceRoot = path.resolve(sourceReceipt.sourceRoot);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const [
    manifest,
    blueprint,
    catalog,
    providerCatalog,
    visualIntegration,
    saasSources,
    saasCapabilities,
    pageCatalog,
    materialization,
    aiManifest,
    orchestrationSource,
    bindings,
    developmentConfig,
    productionConfig,
  ] = await Promise.all([
    readJson(root, "starter.manifest.json"),
    readJson(root, "starter.blueprint.json"),
    readJson(sourceRoot, "catalog/catalog.json"),
    readJson(sourceRoot, "catalog/providers.json"),
    readJson(root, "integrations/visual.json"),
    readJson(sourceRoot, "catalog/saas-sources.json"),
    readJson(sourceRoot, "catalog/saas-capabilities.json"),
    readJson(sourceRoot, "pages/catalog.json"),
    readJson(root, ".starter/materialization.json"),
    readJson(root, ".ai/manifest.json"),
    readFile(path.join(root, ".ai/orchestration.yaml"), "utf8"),
    readJson(root, "cloudflare/bindings.contract.json"),
    readOptionalJsonc(root, "cloudflare/wrangler.development.jsonc"),
    readOptionalJsonc(root, "cloudflare/wrangler.production.jsonc"),
  ]);
  const documents = await Promise.all(
    rootDocuments.map((file) => readMarkdown(root, file)),
  );
  const project = documents.find((document) => document.path === "PROJECT.md");
  const manifestEnvironments = new Map(
    (manifest.environments || []).map((environment) => [
      environment.id,
      environment,
    ]),
  );
  const commit = gitValue(root, ["rev-parse", "HEAD"]);
  const branch = gitValue(root, ["branch", "--show-current"]);
  const dirty = Boolean(gitValue(root, ["status", "--porcelain"], ""));
  const commitTime = commit
    ? gitValue(root, ["show", "-s", "--format=%cI", commit])
    : null;
  const assemblyFailures = validateAssemblyContracts(
    manifest,
    blueprint,
    catalog,
    null,
    pageCatalog,
    null,
  );
  if (assemblyFailures.length)
    throw new Error(
      `Assembly contracts are invalid:\n- ${assemblyFailures.join("\n- ")}`,
    );
  const visualIntegrationFailures = validateVisualIntegration(visualIntegration, blueprint);
  if (visualIntegrationFailures.length)
    throw new Error(`Visual integration contracts are invalid:\n- ${visualIntegrationFailures.join("\n- ")}`);
  const modules = await collectModules(root);

  return {
    schemaVersion: "starter-development-plan/v1",
    generatedAt: commitTime || new Date().toISOString(),
    source: {
      commit,
      branch,
      dirty,
      starterVersion: manifest.starterVersion,
      state: manifest.state,
    },
    project: {
      title: project?.title || "Starter",
      status: project?.status || manifest.state,
      owner: project?.attributes.owner || null,
      summary: project?.summary || "",
    },
    technology: manifest.technology || [],
    assembly: {
      blueprint,
      catalog: {
        schemaVersion: catalog.schemaVersion,
        catalogVersion: catalog.catalogVersion,
        policies: catalog.policies,
        presets: catalog.presets,
        packs: catalog.packs,
      },
      providerCatalog,
      visualIntegration,
      pageCatalog,
      saas: {
        sources: saasSources,
        capabilities: saasCapabilities,
      },
      materialization: {
        schemaVersion: materialization.schemaVersion,
        packs: Object.entries(materialization.packs || {}).map(
          ([id, value]) => ({
            id,
            version: value.version,
            files: Object.keys(value.files || {}).length,
          }),
        ),
        dependencyCount: Object.keys(materialization.dependencies || {}).length,
        generatedRoutesHash: materialization.generatedRoutesHash,
        generatedAuthServerHash: materialization.generatedAuthServerHash,
        generatedAuthClientHash: materialization.generatedAuthClientHash,
        generatedStorageAdapterHash:
          materialization.generatedStorageAdapterHash,
        generatedMobileConfigPluginsHash:
          materialization.generatedMobileConfigPluginsHash,
        generatedWorkflowExportsHash:
          materialization.generatedWorkflowExportsHash,
        generatedDurableObjectExportsHash:
          materialization.generatedDurableObjectExportsHash,
        generatedDesignWebHash: materialization.generatedDesignWebHash,
        generatedDesignMarketingHash:
          materialization.generatedDesignMarketingHash,
        generatedDesignDocsHash: materialization.generatedDesignDocsHash,
        generatedDesignMobileHash: materialization.generatedDesignMobileHash,
        generatedMarketingProjectHash:
          materialization.generatedMarketingProjectHash,
      },
    },
    modules,
    changes: await collectChanges(root),
    documents,
    environments: [
      environmentFromConfig(
        "development",
        developmentConfig,
        manifestEnvironments.get("development"),
      ),
      environmentFromConfig(
        "production",
        productionConfig,
        manifestEnvironments.get("production"),
      ),
    ],
    cloudflare: {
      bindingsContract: bindings,
      mcpPolicy: aiManifest.cloudflare,
      workerStudio: "capability-detected",
    },
    orchestration: JSON.parse(orchestrationSource),
    release: aiManifest.release,
    documentation: {
      source: "Markdown and frontmatter",
      publicPath: "/docs",
      developmentPlanPath: "/dp",
      moduleCount: manifest.modules?.length || 0,
      documentedModuleCount: modules.length,
    },
  };
}

export function stableSnapshot(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
