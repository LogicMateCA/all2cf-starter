import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const command = args.find((value) => !value.startsWith("--")) || "status";
const option = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name) => args.includes(`--${name}`);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const candidateRoot = path.join(root, ".all2cf", "engine-candidates");
const channelRoot = path.join(root, ".all2cf", "engine-channels");
const verificationPath = path.join(root, ".all2cf", "source-release-verification.local.json");
const versionPattern = /^(\d+)\.(\d+)\.(\d+)(?:-(dev|rc)\.(\d+))?$/u;

function run(commandName, commandArgs, options = {}) {
  const result = spawnSync(commandName, commandArgs, {
    cwd: options.cwd || root,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0)
    throw new Error(result.stderr || result.stdout || `${commandName} failed`);
  return result.stdout?.trim() || "";
}

function git(args, cwd = root) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function gitStatus(cwd = root) {
  return execFileSync("git", ["status", "--porcelain=v1"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
}

function sourceIdentity() {
  const commit = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const dirtyLines = gitStatus().split("\n").filter(Boolean);
  return { commit, branch, dirty: dirtyLines.length > 0, dirtyFiles: dirtyLines.map((line) => line.slice(3)) };
}

function requireCleanSource() {
  const source = sourceIdentity();
  if (source.dirty)
    throw new Error(`Starter source release requires a clean commit; dirty files: ${source.dirtyFiles.slice(0, 8).join(", ")}`);
  if (!/^[a-f0-9]{40}$/u.test(source.commit)) throw new Error("Starter source commit is invalid");
  return source;
}

async function exists(filename) {
  try { await access(filename); return true; }
  catch { return false; }
}

async function sha256File(filename) {
  const bytes = await readFile(filename);
  return createHash("sha256").update(bytes).digest("hex");
}

async function packVersions() {
  const rootPath = path.join(root, "packs");
  const files = (await readdir(rootPath, { recursive: true }))
    .map(String)
    .filter((file) => file.endsWith("pack.json"));
  const entries = await Promise.all(files.map(async (file) => {
    const manifest = JSON.parse(await readFile(path.join(rootPath, file), "utf8"));
    if (!manifest.id || !manifest.version) throw new Error(`Pack manifest is incomplete: ${file}`);
    return [String(manifest.id), String(manifest.version)];
  }));
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function parseVersion(value) {
  const version = String(value || "").trim();
  if (!versionPattern.test(version))
    throw new Error("Engine version must be SemVer such as 2.0.0-dev.9, 2.0.0-rc.1 or 2.0.0");
  return version;
}

function compareVersions(leftValue, rightValue) {
  const parse = (value) => {
    const match = String(value || "").match(versionPattern);
    if (!match) throw new Error(`Cannot compare invalid Engine version ${value}`);
    const channel = match[4] || "stable";
    return [Number(match[1]), Number(match[2]), Number(match[3]), { dev: 0, rc: 1, stable: 2 }[channel], Number(match[5] || 0)];
  };
  const left = parse(leftValue);
  const right = parse(rightValue);
  for (let index = 0; index < left.length; index += 1)
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  return 0;
}

async function candidateDirectories() {
  if (!(await exists(candidateRoot))) return [];
  return (await readdir(candidateRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && versionPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

async function status() {
  const source = sourceIdentity();
  let verification = null;
  if (await exists(verificationPath)) verification = JSON.parse(await readFile(verificationPath, "utf8"));
  return {
    ok: !source.dirty,
    command: "status",
    source,
    stylekit: {
      policy: "starter-owned-curated-snapshots",
      upstreamAutomaticSync: false,
      selected: JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8")).stylekit,
    },
    packs: await packVersions(),
    verification: verification
      ? { sourceCommit: verification.sourceCommit, ok: verification.ok, completedAt: verification.completedAt }
      : null,
    candidates: await candidateDirectories(),
    channels: await channelStatus(),
  };
}

async function channelStatus() {
  if (!(await exists(channelRoot))) return [];
  const entries = await readdir(channelRoot, { withFileTypes: true });
  const channels = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const descriptor = path.join(channelRoot, entry.name, "channel.json");
    if (!(await exists(descriptor))) continue;
    const value = JSON.parse(await readFile(descriptor, "utf8"));
    channels.push({ channel: value.channel || entry.name, version: value.engine?.version || null, sourceCommit: value.engine?.sourceCommit || null, artifactSha256: value.engine?.artifactSha256 || null, publishedAt: value.publishedAt || null, descriptor });
  }
  return channels.sort((left, right) => left.channel.localeCompare(right.channel));
}

const permanentPackIds = new Set(["design.owned-neutral", "design.stylekit-adapted", "page.core-product-site", "saas.product-shell", "saas.identity-core", "saas.notifications-core", "saas.product-operations-lite"]);

async function portableBlueprint(dataLayer, { minimal = false } = {}) {
  const blueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
  const profile = minimal ? "minimal" : dataLayer;
  blueprint.project = { ...blueprint.project, name: `Engine ${profile} proof`, slug: `engine-${profile.replaceAll("-", "")}-proof` };
  blueprint.providers.database.access = dataLayer;
  if (minimal) {
    blueprint.preset = "custom";
    for (const selections of Object.values(blueprint.selections)) for (const selection of selections) {
      const selected = permanentPackIds.has(selection.id);
      selection.lifecycle = { selected, materialized: false, localVerified: false, developmentVerified: false, productionReleased: false };
    }
    blueprint.pageSet.selected = blueprint.pageSet.selected.filter((id) => !id.startsWith("growth."));
    blueprint.providers.billing = "none";
    blueprint.providers.storage.provider = "none";
    blueprint.providers.antiAbuse.provider = "none";
    blueprint.providers.ai.provider = "none";
    blueprint.providers.search.provider = "none";
    blueprint.providers.push.provider = "none";
    blueprint.providers.sms.provider = "none";
    blueprint.providers.media.images.provider = "none";
    blueprint.providers.media.stream.provider = "none";
    blueprint.providers.background.cron.enabled = false;
    blueprint.providers.background.workflow.enabled = false;
    blueprint.providers.background.workflow.scheduleEnabled = false;
    blueprint.providers.background.realtime.enabled = false;
  }
  const selection = blueprint.selections.capabilities.find(({ id }) => id === "capability.data-layer-drizzle");
  if (!selection) throw new Error("Blueprint is missing capability.data-layer-drizzle");
  selection.lifecycle = { selected: dataLayer === "drizzle", materialized: false, localVerified: false, developmentVerified: false, productionReleased: false };
  return blueprint;
}

async function verifyPortableProject(source, dataLayer, version, { minimal = false } = {}) {
  const profile = minimal ? "minimal" : dataLayer;
  const slug = `engine-${profile.replaceAll("-", "")}-${source.commit.slice(0, 8)}`;
  const target = path.join(root, ".factory-output", slug);
  const archive = path.join(root, ".factory-output", `${slug}.tar.gz`);
  const inputPath = path.join(root, ".all2cf", `source-release-${profile}.local.json`);
  await mkdir(path.dirname(inputPath), { recursive: true });
  await rm(target, { recursive: true, force: true });
  await rm(archive, { force: true });
  const config = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
  await writeFile(inputPath, json({ blueprint: await portableBlueprint(dataLayer, { minimal }), config }), { mode: 0o600 });
  const startedAt = performance.now();
  try {
    const factoryOutput = run(process.execPath, [
      "scripts/starter-factory.mjs",
      "create",
      `--slug=${slug}`,
      `--name=Engine ${profile} proof`,
      `--input=${path.relative(root, inputPath)}`,
    ], {
      env: {
        STARTER_FACTORY_PORTABLE: "true",
        STARTER_FACTORY_PACKAGE_LOCK_ONLY: "true",
        STARTER_FACTORY_SOURCE_URL: `https://app.all2cf.com/api/starter-v2/engine/${encodeURIComponent(version)}`,
      },
    });
    const factory = JSON.parse(factoryOutput);
    run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: target });
    run("npm", ["run", "verify"], { cwd: target });
    const [receipt, sourceReceipt] = await Promise.all([
      readFile(path.join(target, ".starter", "materialization.json"), "utf8").then(JSON.parse),
      readFile(path.join(target, ".starter", "source.json"), "utf8").then(JSON.parse),
    ]);
    if (sourceReceipt.sourceCommit !== source.commit || sourceReceipt.sourceDirty !== false || sourceReceipt.updateMode !== "engine-channel")
      throw new Error(`${dataLayer} portable source receipt does not match the clean source commit`);
    if (dataLayer === "drizzle" && !receipt.packs?.["capability.data-layer-drizzle"])
      throw new Error("Drizzle proof did not materialize capability.data-layer-drizzle");
    if (dataLayer === "sql-first" && receipt.packs?.["capability.data-layer-drizzle"])
      throw new Error("SQL proof unexpectedly materialized capability.data-layer-drizzle");
    const materializedPackIds = Object.keys(receipt.packs || {});
    const packCount = materializedPackIds.length;
    const optionalPackIds = materializedPackIds.filter((id) => !permanentPackIds.has(id));
    if (minimal && optionalPackIds.length)
      throw new Error(`Minimal proof loaded optional Packs: ${optionalPackIds.join(", ")}`);
    return {
      ok: true,
      dataLayer,
      profile,
      sourceCommit: source.commit,
      generatedCommit: git(["rev-parse", "HEAD"], target),
      blueprintHash: factory.blueprintHash,
      archiveSha256: factory.archiveSha256,
      packCount,
      optionalPackCount: optionalPackIds.length,
      ...(minimal ? { permanentPackIds: materializedPackIds } : {}),
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    await rm(target, { recursive: true, force: true });
    await rm(archive, { force: true });
    await rm(inputPath, { force: true });
  }
}

async function verify(versionValue) {
  const source = requireCleanSource();
  const version = parseVersion(versionValue);
  const startedAt = new Date().toISOString();
  run(process.execPath, ["scripts/changelog-contract.mjs", `--version=${version}`]);
  run("npm", ["run", "verify"]);
  const projects = [];
  for (const dataLayer of ["sql-first", "drizzle"])
    projects.push(await verifyPortableProject(source, dataLayer, version));
  projects.push(await verifyPortableProject(source, "sql-first", version, { minimal: true }));
  const report = {
    schemaVersion: "starter-source-verification/v1",
    ok: true,
    version,
    sourceCommit: source.commit,
    sourceBranch: source.branch,
    sourceVerification: "npm run verify",
    projects,
    stylekit: { policy: "starter-owned-curated-snapshots", upstreamAutomaticSync: false },
    startedAt,
    completedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(verificationPath), { recursive: true });
  await writeFile(verificationPath, json(report), { mode: 0o600 });
  return report;
}

async function archiveCommit(source, output) {
  run("git", ["archive", "--format=tar.gz", `--output=${output}`, source.commit], { cwd: root });
  return sha256File(output);
}

async function build(versionValue) {
  const source = requireCleanSource();
  const version = parseVersion(versionValue);
  if (!(await exists(verificationPath))) throw new Error("Run source:verify for this version before engine:build");
  const verification = JSON.parse(await readFile(verificationPath, "utf8"));
  if (verification.ok !== true || verification.sourceCommit !== source.commit || verification.version !== version)
    throw new Error("Source verification does not match this exact commit and Engine version");
  const candidate = path.join(candidateRoot, version);
  if (await exists(candidate)) throw new Error(`Engine candidate already exists: ${candidate}`);
  await mkdir(candidateRoot, { recursive: true });
  const staging = await mkdtemp(path.join(candidateRoot, `.staging-${version}-`));
  const artifact = `factory-engine-${source.commit.slice(0, 7)}.tar.gz`;
  try {
    const first = path.join(staging, artifact);
    const second = path.join(staging, `${artifact}.reproducible`);
    const firstHash = await archiveCommit(source, first);
    const secondHash = await archiveCommit(source, second);
    if (firstHash !== secondHash) throw new Error("Engine capsule is not reproducible for the same commit");
    await rm(second, { force: true });
    const manifest = {
      schemaVersion: "all2cf-starter-engine/v2",
      engine: "all2cf-starter-factory-v2",
      version,
      sourceCommit: source.commit,
      artifact,
      artifactSha256: firstHash,
      blueprintSchemaVersion: "starter-blueprint/v1",
      runtimeProfile: "cloudflare-react-vite",
      database: "postgresql",
      dataLayers: ["sql-first", "drizzle"],
      packVersions: await packVersions(),
    };
    const registration = {
      schemaVersion: "all2cf-starter-engine-registration/v1",
      sourceRepository: root,
      sourceCommit: source.commit,
      engineManifest: manifest,
      files: [
        { source: artifact, target: `www/console/runner/factory/${artifact}`, sha256: firstHash },
        { source: "factory-engine.json", target: "www/console/runner/factory/factory-engine.json" },
      ],
      targetRequirements: {
        cleanWorktree: true,
        branchOwnedByIntegrationController: true,
        all2cfTypecheckAfterRegistration: true,
        runnerGenerationTestsAfterRegistration: true,
        deploymentAuthorized: false,
      },
      stylekit: { policy: "starter-owned-curated-snapshots", upstreamAutomaticSync: false },
    };
    const channel = {
      schemaVersion: "all2cf-starter-channel/v1",
      channel: "candidate",
      engine: {
        version,
        sourceCommit: source.commit,
        artifactSha256: firstHash,
        artifactUrl: artifact,
        manifestUrl: "factory-engine.json",
        packVersions: manifest.packVersions,
      },
      publishedAt: null,
    };
    const report = {
      schemaVersion: "starter-engine-candidate/v1",
      ok: true,
      version,
      sourceCommit: source.commit,
      artifact,
      artifactSha256: firstHash,
      reproducibleBuilds: 2,
      reproducible: true,
      verification: { completedAt: verification.completedAt, sql: verification.projects.find(({ dataLayer }) => dataLayer === "sql-first"), drizzle: verification.projects.find(({ dataLayer }) => dataLayer === "drizzle") },
      registration: "registration.json",
      deploymentAuthorized: false,
      createdAt: new Date().toISOString(),
    };
    await Promise.all([
      writeFile(path.join(staging, "factory-engine.json"), json(manifest)),
      writeFile(path.join(staging, "registration.json"), json(registration)),
      writeFile(path.join(staging, "channel.json"), json(channel)),
      writeFile(path.join(staging, "candidate-report.json"), json(report)),
      copyFile(verificationPath, path.join(staging, "source-verification.json")),
    ]);
    await rename(staging, candidate);
    return report;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function publish(versionValue) {
  const checked = await check(versionValue);
  if (!checked.ok) throw new Error(`Engine candidate check failed: ${checked.failures.join("; ")}`);
  const { version, candidate } = await resolveCandidate(versionValue);
  const channelName = option("channel") || "development";
  if (!/^[a-z][a-z0-9-]{1,31}$/u.test(channelName)) throw new Error("Channel name is invalid");
  const target = path.resolve(option("target") || path.join(channelRoot, channelName));
  if (target === root || target.startsWith(`${path.join(root, ".git")}${path.sep}`))
    throw new Error("Channel target must not be the source root or Git metadata");
  const manifest = JSON.parse(await readFile(path.join(candidate, "factory-engine.json"), "utf8"));
  const currentPath = path.join(target, "channel.json");
  let current = null;
  if (await exists(currentPath)) current = JSON.parse(await readFile(currentPath, "utf8"));
  if (current) {
    const comparison = compareVersions(version, current.engine?.version);
    if (comparison < 0) throw new Error(`Channel downgrade is forbidden: ${current.engine.version} -> ${version}`);
    if (comparison === 0 && current.engine?.artifactSha256 !== manifest.artifactSha256)
      throw new Error(`Channel version ${version} already points to a different artifact`);
  }
  const artifactDirectory = path.join(target, "artifacts", version);
  const manifestDirectory = path.join(target, "manifests");
  await Promise.all([mkdir(artifactDirectory, { recursive: true }), mkdir(manifestDirectory, { recursive: true })]);
  const artifactTarget = path.join(artifactDirectory, manifest.artifact);
  if (await exists(artifactTarget)) {
    if (await sha256File(artifactTarget) !== manifest.artifactSha256)
      throw new Error(`Published artifact path is occupied by a different file: ${artifactTarget}`);
  } else {
    await copyFile(path.join(candidate, manifest.artifact), artifactTarget);
  }
  const manifestTarget = path.join(manifestDirectory, `${version}.json`);
  if (await exists(manifestTarget)) {
    const publishedManifest = JSON.parse(await readFile(manifestTarget, "utf8"));
    if (publishedManifest.artifactSha256 !== manifest.artifactSha256)
      throw new Error(`Published manifest ${version} is immutable`);
  } else {
    await copyFile(path.join(candidate, "factory-engine.json"), manifestTarget);
  }
  const descriptor = {
    schemaVersion: "all2cf-starter-channel/v1",
    channel: channelName,
    engine: {
      version,
      sourceCommit: manifest.sourceCommit,
      artifactSha256: manifest.artifactSha256,
      artifactUrl: `artifacts/${encodeURIComponent(version)}/${encodeURIComponent(manifest.artifact)}`,
      manifestUrl: `manifests/${encodeURIComponent(version)}.json`,
      packVersions: manifest.packVersions,
    },
    publishedAt: new Date().toISOString(),
  };
  const staging = path.join(target, `.channel-${process.pid}-${Date.now()}.json`);
  await mkdir(target, { recursive: true });
  await writeFile(staging, json(descriptor), { mode: 0o644 });
  await rename(staging, currentPath);
  const artifactStat = await stat(artifactTarget);
  return { ok: true, command: "publish", version, target, channel: descriptor.channel, descriptor: currentPath, artifact: artifactTarget, artifactSha256: manifest.artifactSha256, artifactBytes: artifactStat.size, previousVersion: current?.engine?.version || null, deploymentAuthorized: false };
}

async function resolveCandidate(versionValue) {
  const version = parseVersion(versionValue);
  const candidate = path.join(candidateRoot, version);
  if (!(await exists(candidate))) throw new Error(`Engine candidate does not exist: ${candidate}`);
  return { version, candidate };
}

async function check(versionValue) {
  const source = requireCleanSource();
  const { version, candidate } = await resolveCandidate(versionValue);
  const manifest = JSON.parse(await readFile(path.join(candidate, "factory-engine.json"), "utf8"));
  const report = JSON.parse(await readFile(path.join(candidate, "candidate-report.json"), "utf8"));
  const registration = JSON.parse(await readFile(path.join(candidate, "registration.json"), "utf8"));
  const channel = JSON.parse(await readFile(path.join(candidate, "channel.json"), "utf8"));
  const verification = JSON.parse(await readFile(path.join(candidate, "source-verification.json"), "utf8"));
  const artifact = path.join(candidate, manifest.artifact || "");
  const failures = [];
  if (manifest.schemaVersion !== "all2cf-starter-engine/v2" || manifest.engine !== "all2cf-starter-factory-v2") failures.push("Engine manifest identity is invalid");
  if (manifest.version !== version || manifest.sourceCommit !== source.commit) failures.push("Engine manifest does not match the current source/version");
  if (!/^[a-f0-9]{64}$/u.test(manifest.artifactSha256 || "") || !(await exists(artifact)) || await sha256File(artifact) !== manifest.artifactSha256) failures.push("Engine artifact hash is invalid");
  if (JSON.stringify(manifest.packVersions) !== JSON.stringify(await packVersions())) failures.push("Engine Pack versions are stale");
  const verificationProfiles = verification.projects?.map(({ profile }) => profile).sort() || [];
  const minimalVerification = verification.projects?.find(({ profile }) => profile === "minimal");
  if (verification.ok !== true || verification.version !== version || verification.sourceCommit !== source.commit || JSON.stringify(verificationProfiles) !== JSON.stringify(["drizzle", "minimal", "sql-first"]) || minimalVerification?.optionalPackCount !== 0)
    failures.push("Source verification evidence is stale or missing the zero-optional-Pack proof");
  if (report.reproducible !== true || report.reproducibleBuilds !== 2) failures.push("Reproducible build evidence is missing");
  if (registration.sourceCommit !== source.commit || registration.engineManifest?.artifactSha256 !== manifest.artifactSha256) failures.push("Registration bundle does not match the Engine manifest");
  if (channel.schemaVersion !== "all2cf-starter-channel/v1" || channel.engine?.version !== version || channel.engine?.sourceCommit !== source.commit || channel.engine?.artifactSha256 !== manifest.artifactSha256) failures.push("Engine Channel descriptor does not match the candidate");
  if (!failures.length) {
    const replayRoot = await mkdtemp(path.join(candidateRoot, `.check-${version}-`));
    try {
      const replay = path.join(replayRoot, manifest.artifact);
      const replayHash = await archiveCommit(source, replay);
      if (replayHash !== manifest.artifactSha256) failures.push("Engine capsule cannot be reproduced from the current source commit");
    } finally {
      await rm(replayRoot, { recursive: true, force: true });
    }
  }
  if (!failures.length) {
    const listing = run("tar", ["-tzf", artifact], { cwd: candidate }).split("\n").filter(Boolean);
    for (const required of ["AGENTS.md", "scripts/starter-factory.mjs", "starter.blueprint.json", "packs/saas/billing-stripe/pack.json"])
      if (!listing.includes(required)) failures.push(`Engine capsule is missing ${required}`);
    if (listing.some((entry) => entry.startsWith("/") || entry.split("/").includes("..") || entry === ".git" || entry.startsWith(".git/"))) failures.push("Engine capsule contains an unsafe or Git path");
  }
  return { ok: failures.length === 0, command: "check", version, sourceCommit: source.commit, artifact: manifest.artifact, artifactSha256: manifest.artifactSha256, failures };
}

async function register(versionValue) {
  const checked = await check(versionValue);
  if (!checked.ok) throw new Error(`Engine candidate check failed: ${checked.failures.join("; ")}`);
  const { version, candidate } = await resolveCandidate(versionValue);
  const targetValue = option("target");
  const plan = JSON.parse(await readFile(path.join(candidate, "registration.json"), "utf8"));
  if (!targetValue) return { ok: true, command: "register", mode: "plan", version, candidate, registration: plan, applied: false };
  const target = path.resolve(targetValue);
  const targetManifest = path.join(target, "www/console/runner/factory/factory-engine.json");
  if (!(await exists(targetManifest)) || !(await exists(path.join(target, ".git")))) throw new Error("Registration target is not an All2CF worktree");
  const dirty = gitStatus(target);
  if (dirty) throw new Error("Registration target must be a clean integration worktree");
  const currentManifest = JSON.parse(await readFile(targetManifest, "utf8"));
  if (compareVersions(version, currentManifest.version) <= 0)
    throw new Error(`Engine ${version} must be newer than target Engine ${currentManifest.version}`);
  if (!flag("apply")) return { ok: true, command: "register", mode: "target-plan", version, target, registration: plan, applied: false };
  const manifest = JSON.parse(await readFile(path.join(candidate, "factory-engine.json"), "utf8"));
  await copyFile(path.join(candidate, manifest.artifact), path.join(target, "www/console/runner/factory", manifest.artifact));
  await writeFile(targetManifest, json(manifest));
  const receiptPath = path.join(target, ".all2cf", "starter-engine-registration.local.json");
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, json({ ...plan, appliedAt: new Date().toISOString(), target, targetCommitBefore: git(["rev-parse", "HEAD"], target) }), { mode: 0o600 });
  return { ok: true, command: "register", mode: "apply", version, target, artifact: manifest.artifact, artifactSha256: manifest.artifactSha256, receipt: receiptPath, applied: true, deploymentAuthorized: false };
}

async function candidate(versionValue) {
  await verify(versionValue);
  await build(versionValue);
  const checked = await check(versionValue);
  if (!checked.ok) throw new Error(`Engine candidate check failed: ${checked.failures.join("; ")}`);
  return { ok: true, command: "candidate", version: parseVersion(versionValue), verification: verificationPath, candidate: path.join(candidateRoot, parseVersion(versionValue)), check: checked, registration: await register(versionValue) };
}

async function main() {
  const version = option("version");
  let result;
  if (command === "status") result = await status();
  else if (command === "verify") result = await verify(version);
  else if (command === "build") result = await build(version);
  else if (command === "check") result = await check(version);
  else if (command === "register") result = await register(version);
  else if (command === "publish") result = await publish(version);
  else if (command === "candidate") result = await candidate(version);
  else throw new Error(`Unknown source release command ${command}`);
  console.log(json(result));
  if (result.ok === false) process.exitCode = 1;
}

main().catch((error) => {
  console.error(json({ ok: false, command, error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
