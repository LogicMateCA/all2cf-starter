import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseJsonc } from "jsonc-parser";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const env = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8"));
const providers = JSON.parse(await readFile(path.join(root, "profiles/providers.json"), "utf8"));
const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
let profileEnv = new Map();
try { profileEnv = parseEnv(await readFile(profilePath, "utf8")); } catch {}
const statePath = path.join(root, ".all2cf/state.local.json");
const state = await readState();

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function exists(command, args) {
  try { run(command, args); return true; } catch { return false; }
}

function required(name) {
  const value = process.env[name] || env.get(name) || profileEnv.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function readState() {
  try { return JSON.parse(await readFile(statePath, "utf8")); }
  catch { return { schemaVersion: "starter-provision-state/v1", resources: {}, releases: {} }; }
}

async function saveState() {
  await mkdir(path.dirname(statePath), { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function cloudflare(method, apiPath, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${required("CLOUDFLARE_API_TOKEN")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    const message = (payload.errors || []).map((error) => `${error.code}: ${error.message}`).join("; ") || `HTTP ${response.status}`;
    throw new Error(`Cloudflare API ${method} ${apiPath} failed: ${message}`);
  }
  return payload.result;
}

function dockerContainerExists(name) {
  return exists("docker", ["container", "inspect", name]);
}

function ensureVolume(name) {
  if (!exists("docker", ["volume", "inspect", name])) run("docker", ["volume", "create", name]);
}

function ensureTlsVolume(volume, image) {
  ensureVolume(volume);
  run("docker", [
    "run", "--rm", "-v", `${volume}:/tls`, image, "bash", "-lc",
    "if [ ! -s /tls/server.key ]; then openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj '/CN=starter-postgres-dev' -keyout /tls/server.key -out /tls/server.crt >/dev/null 2>&1; chown 999:999 /tls/server.key /tls/server.crt; chmod 600 /tls/server.key; chmod 644 /tls/server.crt; fi",
  ]);
}

function ensureDevelopmentDatabase() {
  const database = config.development.database;
  const password = required("POSTGRES_PASSWORD");
  const dataVolume = `${config.project.slug}-postgres-dev-data`;
  const tlsVolume = `${config.project.slug}-postgres-dev-tls`;
  ensureVolume(dataVolume);
  ensureTlsVolume(tlsVolume, database.image);

  if (!dockerContainerExists(database.container)) {
    const legacy = run("docker", ["ps", "-aq", "--filter", "label=com.docker.compose.service=starter-postgres-dev"]).trim();
    if (legacy) run("docker", ["rm", "-f", legacy]);
    run("docker", [
      "run", "-d",
      "--name", database.container,
      "--restart", "unless-stopped",
      "-e", `POSTGRES_DB=${database.database}`,
      "-e", `POSTGRES_USER=${database.user}`,
      "-e", `POSTGRES_PASSWORD=${password}`,
      "-p", `${database.host}:${database.port}:5432`,
      "-v", `${dataVolume}:/var/lib/postgresql`,
      "-v", `${tlsVolume}:/tls:ro`,
      "--health-cmd", `pg_isready -U ${database.user} -d ${database.database}`,
      "--health-interval", "5s",
      "--health-timeout", "5s",
      "--health-retries", "20",
      database.image,
      "postgres", "-c", "ssl=on", "-c", "ssl_cert_file=/tls/server.crt", "-c", "ssl_key_file=/tls/server.key",
    ]);
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const health = run("docker", ["inspect", database.container, "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}"]).trim();
    if (health === "healthy") break;
    if (attempt === 39) throw new Error("Development PostgreSQL did not become healthy");
    run("sleep", ["1"]);
  }
  const ssl = run("docker", ["exec", database.container, "psql", "-U", database.user, "-d", database.database, "-Atc", "show ssl"]).trim();
  if (ssl !== "on") throw new Error("Development PostgreSQL TLS is not enabled");
  state.resources.developmentDatabase = { database: database.database, user: database.user, host: database.host, port: database.port, container: database.container, tls: true };
}

function ensureProductionDatabase() {
  const database = config.production.database;
  const password = new URL(required("STARTER_PRODUCTION_DATABASE_URL")).password;
  if (!/^[A-Za-z0-9_-]+$/u.test(password)) throw new Error("Production database password contains unsupported provisioning characters");
  const script = `set -eu\nC=${database.container}\nU=${database.adminUser}\nif ! docker exec -u postgres "$C" psql -U "$U" -tAc "select 1 from pg_roles where rolname='${database.user}'" | grep -q 1; then docker exec -u postgres "$C" psql -U "$U" -v ON_ERROR_STOP=1 -c "create role ${database.user} login"; fi\ndocker exec -u postgres "$C" psql -U "$U" -v ON_ERROR_STOP=1 -c "alter role ${database.user} password '${password}'"\nif ! docker exec -u postgres "$C" psql -U "$U" -tAc "select 1 from pg_database where datname='${database.database}'" | grep -q 1; then docker exec -u postgres "$C" createdb -U "$U" -O ${database.user} ${database.database}; fi\ndocker exec -u postgres "$C" psql -U "$U" -d ${database.database} -v ON_ERROR_STOP=1 -c "grant all on schema public to ${database.user}"\n`;
  const result = spawnSync("ssh", ["-i", database.sshKey, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", `UserKnownHostsFile=${database.sshKnownHosts}`, database.sshHost, "bash", "-s"], { cwd: root, input: script, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Production PostgreSQL provisioning failed: ${result.stderr || result.stdout}`);
  state.resources.productionDatabase = { database: database.database, user: database.user, host: database.host, port: database.port, container: database.container };
}

async function ensureVpcService() {
  const accountId = config.cloudflare.accountId;
  const database = config.development.database;
  const services = await cloudflare("GET", `/accounts/${accountId}/connectivity/directory/services`);
  let service = services.find((item) => item.name === database.vpcServiceName);
  const desired = {
    name: database.vpcServiceName,
    type: "tcp",
    app_protocol: "postgresql",
    tcp_port: database.port,
    host: { ipv4: database.host, network: { tunnel_id: database.tunnelId } },
    tls_settings: { cert_verification_mode: "disabled" },
  };
  if (!service) service = await cloudflare("POST", `/accounts/${accountId}/connectivity/directory/services`, desired);
  else if (service.tcp_port !== database.port || service.host?.ipv4 !== database.host || service.tls_settings?.cert_verification_mode !== "disabled") service = await cloudflare("PUT", `/accounts/${accountId}/connectivity/directory/services/${service.service_id}`, desired);
  state.resources.developmentVpcService = { id: service.service_id, name: service.name, tunnelId: database.tunnelId };
  return service.service_id;
}

async function ensureHyperdrive(environment, serviceId) {
  const accountId = config.cloudflare.accountId;
  const target = config[environment];
  const database = target.database;
  const url = new URL(environment === "development" ? required("DATABASE_URL") : required("STARTER_PRODUCTION_DATABASE_URL"));
  const configurations = await cloudflare("GET", `/accounts/${accountId}/hyperdrive/configs`);
  let hyperdrive = configurations.find((item) => item.name === database.hyperdriveName);
  if (!hyperdrive) {
    hyperdrive = await cloudflare("POST", `/accounts/${accountId}/hyperdrive/configs`, {
      name: database.hyperdriveName,
      origin: { scheme: "postgresql", database: database.database, user: database.user, password: url.password, service_id: serviceId },
      caching: { disabled: true },
      origin_connection_limit: environment === "development" ? 5 : 10,
    });
  }
  const full = await cloudflare("GET", `/accounts/${accountId}/hyperdrive/configs/${hyperdrive.id}`);
  if (full.origin?.database !== database.database || full.origin?.user !== database.user || full.origin?.service_id !== serviceId) throw new Error(`${environment} Hyperdrive exists with unexpected origin`);
  state.resources[`${environment}Hyperdrive`] = { id: full.id, name: full.name, database: database.database, serviceId };
  return full.id;
}

async function writeWrangler(environment, hyperdriveId) {
  const target = config[environment];
  const configPath = path.join(root, target.wranglerConfig);
  const errors = [];
  const value = parseJsonc(await readFile(configPath, "utf8"), errors, { allowTrailingComma: true });
  if (errors.length) throw new Error(`${target.wranglerConfig} contains invalid JSONC`);
  value.name = target.worker;
  value.workers_dev = true;
  value.vars = { ...(value.vars || {}), APP_ENV: environment };
  value.hyperdrive = [{ binding: "HYPERDRIVE", id: hyperdriveId }];
  value.routes = [{ pattern: target.domain, custom_domain: true }];
  await writeFile(configPath, `${JSON.stringify(value, null, 2)}\n`);
}

async function provision() {
  ensureDevelopmentDatabase();
  ensureProductionDatabase();
  const developmentServiceId = await ensureVpcService();
  const developmentHyperdriveId = await ensureHyperdrive("development", developmentServiceId);
  const productionHyperdriveId = await ensureHyperdrive("production", config.production.database.vpcServiceId);
  await writeWrangler("development", developmentHyperdriveId);
  await writeWrangler("production", productionHyperdriveId);
  await saveState();
  console.log(JSON.stringify({ ok: true, resources: state.resources }, null, 2));
}

async function walkFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(resolved));
    else if (entry.isFile()) files.push(resolved);
  }
  return files.sort();
}

async function artifactHash() {
  const hash = createHash("sha256");
  for (const file of [
    ...await walkFiles(path.join(root, "dist/web")),
    path.join(root, "workers/app/index.ts"),
    path.join(root, "workers/app/package.json"),
    path.join(root, "package-lock.json"),
  ].sort()) {
    hash.update(path.relative(root, file));
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}

async function fileHash(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function verifyUrl(environment, baseUrl) {
  const checks = ["/", "/dp", "/api/health", "/api/version", "/api/health/database"];
  const results = [];
  for (const pathname of checks) {
    let response;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try { response = await fetch(`${baseUrl}${pathname}`, { headers: { Accept: pathname.startsWith("/api/") ? "application/json" : "text/html" } }); }
      catch {}
      if (response?.ok) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!response?.ok) throw new Error(`${baseUrl}${pathname} verification failed with ${response?.status || "network error"}`);
    const contentType = response.headers.get("content-type");
    const result = { path: pathname, status: response.status, contentType };
    if (pathname.startsWith("/api/")) {
      const payload = await response.json();
      if (pathname === "/api/version" && (payload.data?.environment !== environment || payload.data?.service !== "starter")) {
        throw new Error(`${baseUrl}${pathname} returned the wrong release identity`);
      }
      if (pathname === "/api/health/database") {
        const expected = config[environment].database;
        if (payload.data?.database !== expected.database || payload.data?.user_name !== expected.user) {
          throw new Error(`${baseUrl}${pathname} returned the wrong database identity`);
        }
      }
      result.identity = payload.data;
    }
    results.push(result);
  }
  return results;
}

async function latestDeployment(worker) {
  const deployments = await cloudflare("GET", `/accounts/${config.cloudflare.accountId}/workers/scripts/${worker}/deployments`);
  const items = Array.isArray(deployments) ? deployments : deployments?.deployments || [];
  const latest = [...items].sort((left, right) => new Date(right.created_on).getTime() - new Date(left.created_on).getTime())[0];
  return latest ? { id: latest.id, createdOn: latest.created_on, versions: latest.versions } : null;
}

async function release(environment) {
  if (!new Set(["development", "production"]).has(environment)) throw new Error("release environment must be development or production");
  const dirty = run("git", ["status", "--porcelain"]).trim();
  if (dirty) throw new Error("Release requires a clean Git worktree");
  run("npm", ["run", "verify"], { inherit: true });
  const hash = await artifactHash();
  if (environment === "production" && state.releases.development?.artifactHash !== hash) throw new Error("Production requires the exact artifact already verified in Development");
  const target = config[environment];
  const commit = run("git", ["rev-parse", "HEAD"]).trim();
  run("npx", ["wrangler", "deploy", "--config", target.wranglerConfig, "--message", `${environment} ${commit.slice(0, 12)}`], { inherit: true, env: { ...process.env, CLOUDFLARE_API_TOKEN: required("CLOUDFLARE_API_TOKEN") } });
  const checks = await verifyUrl(environment, `https://${target.domain}`);
  const deployment = await latestDeployment(target.worker);
  const configPath = path.join(root, target.wranglerConfig);
  const configHash = await fileHash(configPath);
  const targetConfig = parseJsonc(await readFile(configPath, "utf8"));
  state.releases[environment] = { commit, artifactHash: hash, configHash, compatibilityDate: targetConfig.compatibility_date, domain: target.domain, worker: target.worker, deployment, checks, verifiedAt: new Date().toISOString() };
  await saveState();
  console.log(JSON.stringify({ ok: true, environment, ...state.releases[environment] }, null, 2));
}

async function rollback(environment, versionId) {
  if (!new Set(["development", "production"]).has(environment)) throw new Error("rollback environment must be development or production");
  if (!versionId) throw new Error("rollback requires an exact Worker version ID");
  const target = config[environment];
  const before = await latestDeployment(target.worker);
  run("npx", ["wrangler", "rollback", versionId, "--config", target.wranglerConfig, "--name", target.worker, "--message", `${environment} rollback drill`, "--yes"], { inherit: true, env: { ...process.env, CLOUDFLARE_API_TOKEN: required("CLOUDFLARE_API_TOKEN") } });
  const checks = await verifyUrl(environment, `https://${target.domain}`);
  const after = await latestDeployment(target.worker);
  const activeVersion = after?.versions?.find((item) => item.percentage === 100)?.version_id;
  if (activeVersion !== versionId) throw new Error(`Rollback read-back expected ${versionId}, received ${activeVersion || "unknown"}`);
  state.rollbacks ||= [];
  state.rollbacks.push({ environment, worker: target.worker, requestedVersion: versionId, before, after, checks, verifiedAt: new Date().toISOString() });
  await saveState();
  console.log(JSON.stringify({ ok: true, environment, requestedVersion: versionId, before, after, checks }, null, 2));
}

const [command = "help", argument] = process.argv.slice(2);
if (command === "provision") await provision();
else if (command === "release") await release(argument || "development");
else if (command === "rollback") await rollback(argument || "development", process.argv[4]);
else {
  console.log("starterctl commands: provision | release [development|production] | rollback [development|production] <version-id>");
  process.exitCode = 1;
}
