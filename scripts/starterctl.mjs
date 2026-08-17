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
const preflightPath = path.join(root, ".all2cf/preflight.local.json");
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

function syncWorkerSecrets(environment, wranglerConfig) {
  const secrets = {
    BETTER_AUTH_SECRET: required(environment === "production" ? "STARTER_PRODUCTION_BETTER_AUTH_SECRET" : "BETTER_AUTH_SECRET"),
    GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),
    ...(environment === "production" ? {
      CFSEND_API_URL: required("CFSEND_API_URL"),
      CFSEND_API_KEY: required("CFSEND_API_KEY"),
      CFSEND_FROM: required("CFSEND_FROM"),
    } : {}),
  };
  const result = spawnSync("npx", ["wrangler", "secret", "bulk", "--config", wranglerConfig], {
    cwd: root,
    input: JSON.stringify(secrets),
    encoding: "utf8",
    env: { ...process.env, CLOUDFLARE_API_TOKEN: required("CLOUDFLARE_API_TOKEN") },
  });
  if (result.status !== 0) throw new Error(`Worker secret sync failed: ${result.stderr || result.stdout}`);
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

async function requireProvisionPreflight() {
  let receipt;
  try { receipt = JSON.parse(await readFile(preflightPath, "utf8")); }
  catch { throw new Error("Cloudflare provisioning requires a current official MCP preflight receipt; run the MCP preflight, then npm run cf:preflight:record"); }
  const configSource = await readFile(path.join(root, "starter.config.json"), "utf8");
  const configHash = createHash("sha256").update(configSource).digest("hex");
  const age = Date.now() - new Date(receipt.checkedAt).getTime();
  if (receipt.schemaVersion !== "starter-cloudflare-preflight/v1" || receipt.evidence !== "official-cloudflare-mcp-snapshot" || !receipt.snapshotHash || receipt.configHash !== configHash || receipt.accountId !== config.cloudflare.accountId || receipt.projectSlug !== config.project.slug || receipt.collisions?.length || !Number.isFinite(age) || age < 0 || age > 30 * 60 * 1000) {
    throw new Error("Cloudflare MCP preflight receipt is stale or does not match the current project configuration");
  }
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
    `if [ ! -s /tls/server.key ]; then openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj '/CN=${config.development.database.container}' -keyout /tls/server.key -out /tls/server.crt >/dev/null 2>&1; chown 999:999 /tls/server.key /tls/server.crt; chmod 600 /tls/server.key; chmod 644 /tls/server.crt; fi`,
  ]);
}

function ensureDevelopmentDatabase() {
  const database = config.development.database;
  const password = required("POSTGRES_PASSWORD");
  const dataVolume = `${config.project.slug}-postgres-dev-data`;
  const tlsVolume = `${config.project.slug}-postgres-dev-tls`;
  ensureVolume(dataVolume);
  ensureTlsVolume(tlsVolume, database.image);

  if (dockerContainerExists(database.container)) {
    const inspection = JSON.parse(run("docker", ["container", "inspect", database.container]))[0];
    const envValues = new Set(inspection.Config?.Env || []);
    const port = inspection.NetworkSettings?.Ports?.["5432/tcp"]?.[0];
    if (inspection.Config?.Image !== database.image || !envValues.has(`POSTGRES_DB=${database.database}`) || !envValues.has(`POSTGRES_USER=${database.user}`) || port?.HostIp !== database.host || Number(port?.HostPort) !== database.port) {
      throw new Error(`Development database container ${database.container} exists with an unexpected identity`);
    }
  } else {
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
  const allowExisting = state.resources.productionDatabase?.database === database.database && state.resources.productionDatabase?.user === database.user;
  const script = `set -eu\nC=${database.container}\nU=${database.adminUser}\nROLE_EXISTS=$(docker exec -u postgres "$C" psql -U "$U" -tAc "select 1 from pg_roles where rolname='${database.user}'")\nDB_OWNER=$(docker exec -u postgres "$C" psql -U "$U" -tAc "select pg_get_userbyid(datdba) from pg_database where datname='${database.database}'")\nif [ "${allowExisting ? "1" : "0"}" != 1 ] && { [ "$ROLE_EXISTS" = 1 ] || [ -n "$DB_OWNER" ]; }; then echo "production database or role collision" >&2; exit 42; fi\nif [ -n "$DB_OWNER" ] && [ "$DB_OWNER" != "${database.user}" ]; then echo "production database has unexpected owner" >&2; exit 43; fi\nif [ "$ROLE_EXISTS" != 1 ]; then docker exec -u postgres "$C" psql -U "$U" -v ON_ERROR_STOP=1 -c "create role ${database.user} login"; fi\ndocker exec -u postgres "$C" psql -U "$U" -v ON_ERROR_STOP=1 -c "alter role ${database.user} password '${password}'"\nif [ -z "$DB_OWNER" ]; then docker exec -u postgres "$C" createdb -U "$U" -O ${database.user} ${database.database}; fi\ndocker exec -u postgres "$C" psql -U "$U" -d ${database.database} -v ON_ERROR_STOP=1 -c "grant all on schema public to ${database.user}"\n`;
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
  else if (service.type !== "tcp" || service.app_protocol !== "postgresql" || service.tcp_port !== database.port || service.host?.ipv4 !== database.host || service.host?.network?.tunnel_id !== database.tunnelId || service.tls_settings?.cert_verification_mode !== "disabled") throw new Error(`VPC service ${database.vpcServiceName} exists with an unexpected identity`);
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
  value.vars = {
    ...(value.vars || {}),
    APP_ENV: environment,
    SERVICE_NAME: config.project.slug,
    APP_NAME: config.project.name,
    AUTH_CANONICAL_ORIGIN: `https://${target.domain}`,
    AUTH_REQUIRE_EMAIL_VERIFICATION: environment === "production" ? "true" : "false",
    AUTH_EMAIL_MODE: environment === "production" ? "cfsend" : "database-outbox",
    MOBILE_DEEP_LINK_SCHEMES: [`${config.project.slug}-dev://`, `${config.project.slug}-preview://`, `${config.project.slug}://`].join(","),
  };
  value.secrets = { required: ["BETTER_AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", ...(environment === "production" ? ["CFSEND_API_URL", "CFSEND_API_KEY", "CFSEND_FROM"] : [])] };
  value.hyperdrive = [{ binding: "HYPERDRIVE", id: hyperdriveId }];
  value.routes = [{ pattern: target.domain, custom_domain: true }];
  await writeFile(configPath, `${JSON.stringify(value, null, 2)}\n`);
}

async function provision() {
  await requireProvisionPreflight();
  ensureDevelopmentDatabase();
  await saveState();
  ensureProductionDatabase();
  await saveState();
  const developmentServiceId = await ensureVpcService();
  await saveState();
  const developmentHyperdriveId = await ensureHyperdrive("development", developmentServiceId);
  await saveState();
  const productionHyperdriveId = await ensureHyperdrive("production", config.production.database.vpcServiceId);
  await saveState();
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
    ...await walkFiles(path.join(root, "workers/app")),
    ...await walkFiles(path.join(root, "db/migrations")),
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
  const checks = ["/", "/dp", "/login", "/api/health", "/api/version", "/api/health/database", "/api/auth-methods", "/api/session", "/api/preferences"];
  const results = [];
  for (const pathname of checks) {
    const expectedStatus = new Set(["/api/session", "/api/preferences"]).has(pathname) ? 401 : 200;
    let response;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try { response = await fetch(`${baseUrl}${pathname}`, { headers: { Accept: pathname.startsWith("/api/") ? "application/json" : "text/html" } }); }
      catch {}
      if (response?.status === expectedStatus) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (response?.status !== expectedStatus) throw new Error(`${baseUrl}${pathname} verification failed with ${response?.status || "network error"}; expected ${expectedStatus}`);
    const contentType = response.headers.get("content-type");
    const result = { path: pathname, status: response.status, contentType };
    if (pathname.startsWith("/api/")) {
      const payload = await response.json();
      if (new Set(["/api/session", "/api/preferences"]).has(pathname) && payload.error?.code !== "UNAUTHORIZED") throw new Error(`${baseUrl}${pathname} did not enforce authentication`);
      if (pathname === "/api/version" && (payload.data?.environment !== environment || payload.data?.service !== config.project.slug)) {
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
  run("npm", ["run", environment === "production" ? "db:migrate:production" : "db:migrate:dev"], { inherit: true });
  run("npm", ["run", "verify"], { inherit: true });
  if (environment === "development") run("npm", ["run", "auth:smoke:dev"], { inherit: true });
  const hash = await artifactHash();
  if (environment === "production" && state.releases.development?.artifactHash !== hash) throw new Error("Production requires the exact artifact already verified in Development");
  const target = config[environment];
  const commit = run("git", ["rev-parse", "HEAD"]).trim();
  syncWorkerSecrets(environment, target.wranglerConfig);
  run("npx", ["wrangler", "deploy", "--config", target.wranglerConfig, "--message", `${environment} ${commit.slice(0, 12)}`], { inherit: true, env: { ...process.env, CLOUDFLARE_API_TOKEN: required("CLOUDFLARE_API_TOKEN") } });
  const checks = await verifyUrl(environment, `https://${target.domain}`);
  const deployment = await latestDeployment(target.worker);
  const configPath = path.join(root, target.wranglerConfig);
  const configHash = await fileHash(configPath);
  const targetConfig = parseJsonc(await readFile(configPath, "utf8"));
  const releaseRecord = { commit, artifactHash: hash, configHash, compatibilityDate: targetConfig.compatibility_date, domain: target.domain, worker: target.worker, deployment, checks, verifiedAt: new Date().toISOString() };
  state.releaseHistory ||= [];
  state.releaseHistory.push({ environment, ...releaseRecord });
  state.releases[environment] = releaseRecord;
  await saveState();
  console.log(JSON.stringify({ ok: true, environment, ...state.releases[environment] }, null, 2));
}

async function rollback(environment, versionId) {
  if (!new Set(["development", "production"]).has(environment)) throw new Error("rollback environment must be development or production");
  if (!versionId) throw new Error("rollback requires an exact Worker version ID");
  const target = config[environment];
  const knownGood = (state.releaseHistory || []).find((release) => release.environment === environment && release.deployment?.versions?.some((item) => item.version_id === versionId));
  if (!knownGood) throw new Error(`rollback target ${versionId} is not present in recorded release history`);
  const before = await latestDeployment(target.worker);
  run("npx", ["wrangler", "rollback", versionId, "--config", target.wranglerConfig, "--name", target.worker, "--message", `${environment} rollback drill`, "--yes"], { inherit: true, env: { ...process.env, CLOUDFLARE_API_TOKEN: required("CLOUDFLARE_API_TOKEN") } });
  const checks = await verifyUrl(environment, `https://${target.domain}`);
  const after = await latestDeployment(target.worker);
  const activeVersion = after?.versions?.find((item) => item.percentage === 100)?.version_id;
  if (activeVersion !== versionId) throw new Error(`Rollback read-back expected ${versionId}, received ${activeVersion || "unknown"}`);
  state.rollbacks ||= [];
  state.rollbacks.push({ environment, worker: target.worker, requestedVersion: versionId, before, after, checks, verifiedAt: new Date().toISOString() });
  state.releases[environment] = { ...knownGood, deployment: after, checks, verifiedAt: new Date().toISOString(), rolledBackFrom: before };
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
