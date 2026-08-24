import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = path.join(root, "apps/mobile");
const starterConfig = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const statePath = path.join(root, ".all2cf/mobile-state.local.json");
const easVersion = "22.0.0";
const providers = JSON.parse(await readFile(path.join(root, "profiles/providers.json"), "utf8"));
const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
let profile = new Map();
let projectEnv = new Map();
try { profile = parseEnv(await readFile(profilePath, "utf8")); } catch {}
try { projectEnv = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8")); } catch {}
const state = await readState();

function required(name) {
  const value = process.env[name] || projectEnv.get(name) || profile.get(name);
  if (!value) throw new Error(`${name} is required for remote mobile release`);
  return value;
}

function optional(name) {
  return process.env[name] || projectEnv.get(name) || profile.get(name) || "";
}

function executable(command) {
  return spawnSync(command, ["-version"], { encoding: "utf8", stdio: "ignore" }).status === 0;
}

function shellQuote(value) { return `'${String(value).replaceAll("'", `'"'"'`)}'`; }

function executionTargets({ probeConnectedMac = false } = {}) {
  const macHost = optional("MOBILE_MAC_HOST");
  const macProjectRoot = optional("MOBILE_MAC_PROJECT_ROOT");
  const macKeyPath = optional("MOBILE_MAC_SSH_KEY_PATH");
  const connectedMacConfigured = Boolean(macHost && macProjectRoot);
  let connectedMac = { configured: connectedMacConfigured, reachable: false, xcode: false, commit: null, reason: connectedMacConfigured ? "not probed" : "MOBILE_MAC_HOST and MOBILE_MAC_PROJECT_ROOT are not configured" };
  if (connectedMacConfigured && probeConnectedMac) {
    const args = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=8"];
    if (macKeyPath) args.push("-i", macKeyPath);
    args.push(macHost, "sh", "-lc", `cd ${shellQuote(macProjectRoot)} && uname -s && xcodebuild -version | head -2 && git rev-parse HEAD`);
    const result = spawnSync("ssh", args, { encoding: "utf8", timeout: 15_000 });
    const lines = String(result.stdout || "").trim().split(/\r?\n/u);
    const commit = lines.find((line) => /^[a-f0-9]{40}$/u.test(line)) || null;
    connectedMac = {
      configured: true,
      reachable: result.status === 0 && lines[0] === "Darwin",
      xcode: result.status === 0 && lines.some((line) => line.startsWith("Xcode ")),
      commit,
      reason: result.status === 0 ? null : String(result.stderr || "Connected Mac probe failed").trim().slice(0, 300),
    };
  }
  return {
    host: { platform: process.platform, architecture: process.arch },
    easCloud: { configured: Boolean(optional("EXPO_TOKEN") && optional("EXPO_PROJECT_ID")) },
    localIos: { available: process.platform === "darwin" && executable("xcodebuild") },
    localAndroid: { available: Boolean(optional("ANDROID_HOME") || optional("ANDROID_SDK_ROOT")) && executable("java") },
    connectedMac,
  };
}

async function readState() {
  try { return JSON.parse(await readFile(statePath, "utf8")); }
  catch { return { schemaVersion: "starter-mobile-release/v1", releases: {} }; }
}

async function saveState() {
  await mkdir(path.dirname(statePath), { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) },
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed\n${details}`);
  }
  return result.stdout || "";
}

function npm(args, options = {}) { return run("npm", args, options); }
function eas(args, options = {}) {
  return run("npx", ["--yes", `eas-cli@${easVersion}`, ...args], {
    cwd: mobileRoot,
    ...options,
    env: { EXPO_TOKEN: required("EXPO_TOKEN"), EXPO_PROJECT_ID: required("EXPO_PROJECT_ID"), ...(options.env || {}) },
  });
}
function git(args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }

function parseJsonOutput(output) {
  const starts = [output.indexOf("["), output.indexOf("{")].filter((index) => index >= 0).sort((a, b) => a - b);
  for (const start of starts) {
    try { return JSON.parse(output.slice(start)); } catch {}
  }
  throw new Error("Command did not return parseable JSON");
}

async function doctor() {
  const requiredFiles = ["package.json", "app.config.ts", "eas.json", "app/_layout.tsx", "app/index.tsx"];
  const missing = [];
  for (const file of requiredFiles) {
    try { await readFile(path.join(mobileRoot, file)); } catch { missing.push(file); }
  }
  if (missing.length) throw new Error(`Missing Expo release files: ${missing.join(", ")}`);
  const easConfig = JSON.parse(await readFile(path.join(mobileRoot, "eas.json"), "utf8"));
  for (const profile of ["development", "development-simulator", "preview", "e2e", "production"]) {
    if (!easConfig.build?.[profile]) throw new Error(`Missing EAS build profile ${profile}`);
  }
  const endpoints = {};
  for (const [environment, url] of [["development", `https://${starterConfig.development.domain}/api/health`], ["production", `https://${starterConfig.production.domain}/api/health`]]) {
    const response = await fetch(url);
    endpoints[environment] = { url, status: response.status, ok: response.ok };
    if (!response.ok) throw new Error(`${environment} mobile API is unavailable`);
  }
  console.log(JSON.stringify({ ok: true, sdk: 57, easProfiles: Object.keys(easConfig.build), executionTargets: executionTargets(), endpoints }, null, 2));
}

async function targets() {
  const result = executionTargets({ probeConnectedMac: process.argv.includes("--probe") });
  console.log(JSON.stringify({ ok: true, executionTargets: result }, null, 2));
  return result;
}

async function verify() {
  await doctor();
  npm(["run", "typecheck", "--workspace", "apps/mobile"], { inherit: true });
  run("npx", ["expo-doctor@latest"], { cwd: mobileRoot, inherit: true });
  npm(["run", "export", "--workspace", "apps/mobile"], { inherit: true });
  npm(["run", "bundle:check:mobile"], { inherit: true });
  console.log(JSON.stringify({ ok: true, checks: ["doctor", "typecheck", "expo-doctor", "expo-export", "bundle-budget"] }, null, 2));
}

function profileFor(environment) {
  if (!new Set(["development", "preview", "production"]).has(environment)) throw new Error("Mobile environment must be development, preview, or production");
  return environment;
}

function fingerprints(profile) {
  const result = {};
  for (const platform of ["android", "ios"]) {
    const output = run("npx", ["--no-install", "fingerprint", "fingerprint:generate", "--platform", platform], {
      cwd: mobileRoot,
      env: { APP_VARIANT: profile },
    });
    const parsed = parseJsonOutput(output);
    result[platform] = parsed.hash;
    if (!result[platform]) throw new Error(`Missing ${platform} fingerprint hash`);
  }
  return result;
}

function sameFingerprint(left, right) {
  return Boolean(left && right && left.android === right.android && left.ios === right.ios);
}

async function plan(environment) {
  const profile = profileFor(environment);
  const commit = git(["rev-parse", "HEAD"]);
  const current = fingerprints(profile);
  const previous = state.releases[environment];
  const action = previous && sameFingerprint(previous.fingerprints, current) && previous.builds ? "update" : "build";
  const targets = executionTargets();
  const routes = action === "update"
    ? { ios: targets.easCloud.configured ? "eas-update" : "unavailable", android: targets.easCloud.configured ? "eas-update" : "unavailable" }
    : {
        ios: targets.easCloud.configured ? "eas-cloud-build" : targets.localIos.available ? "local-xcode" : targets.connectedMac.configured ? "connected-mac" : "unavailable",
        android: targets.easCloud.configured ? "eas-cloud-build" : targets.localAndroid.available ? "local-android" : "unavailable",
      };
  const result = { environment, profile, commit, fingerprints: current, previous: previous ? { commit: previous.commit, fingerprints: previous.fingerprints, builds: previous.builds } : null, action, routes, executionTargets: targets };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function release(environment) {
  if (git(["status", "--porcelain"])) throw new Error("Mobile release requires a clean Git worktree");
  await verify();
  const releasePlan = await plan(environment);
  if (!releasePlan.executionTargets.easCloud.configured)
    throw new Error("Remote mobile release requires EXPO_TOKEN and EXPO_PROJECT_ID. Use mobile:targets -- --probe to verify a connected Mac for Xcode debugging; connected Mac evidence does not replace EAS project identity or store submission.");
  const message = `${environment} ${releasePlan.commit.slice(0, 12)}`;
  let remote;

  if (environment === "production") {
    const preview = state.releases.preview;
    if (!preview || preview.commit !== releasePlan.commit || !preview.e2eEvidence) {
      throw new Error("Production mobile release requires the same commit verified in Preview with E2E evidence");
    }
    if (releasePlan.action === "update" && preview.updateGroupId) {
      remote = parseJsonOutput(eas(["update:republish", "--group", preview.updateGroupId, "--destination-channel", "production", "--message", message, "--platform", "all", "--json", "--non-interactive"]));
    } else {
      const builds = parseJsonOutput(eas(["build", "--profile", "production", "--platform", "all", "--message", message, "--auto-submit-with-profile", "production", "--wait", "--json", "--non-interactive"]));
      const submissions = parseJsonOutput(eas(["submit:list", "--platform", "all", "--limit", "10", "--json", "--non-interactive"]));
      remote = { builds, submissions };
    }
  } else if (releasePlan.action === "build") {
    remote = { builds: parseJsonOutput(eas(["build", "--profile", environment, "--platform", "all", "--message", message, "--wait", "--json", "--non-interactive"])) };
  } else {
    remote = parseJsonOutput(eas(["update", "--channel", environment, "--environment", environment, "--message", message, "--platform", "all", "--json", "--non-interactive"]));
  }

  const updateGroupId = remote.group || remote.groupId || remote.updateGroupId || remote?.[0]?.group;
  const builds = remote.builds || (releasePlan.action === "build" ? remote : state.releases[environment]?.builds);
  const submissions = remote.submissions || state.releases[environment]?.submissions || null;
  state.releases[environment] = {
    commit: releasePlan.commit,
    fingerprints: releasePlan.fingerprints,
    action: releasePlan.action,
    builds,
    submissions,
    updateGroupId: updateGroupId || null,
    channel: environment,
    releasedAt: new Date().toISOString(),
    ...(environment === "preview" ? { e2eEvidence: null } : {}),
  };
  await saveState();
  console.log(JSON.stringify({ ok: true, environment, release: state.releases[environment] }, null, 2));
}

async function recordE2e(environment, evidence) {
  if (!evidence) throw new Error("E2E evidence ID is required");
  if (!state.releases[environment]) throw new Error(`No ${environment} mobile release to verify`);
  state.releases[environment].e2eEvidence = { id: evidence, recordedAt: new Date().toISOString() };
  await saveState();
  console.log(JSON.stringify({ ok: true, environment, e2eEvidence: state.releases[environment].e2eEvidence }, null, 2));
}

const [command = "help", environment, evidence] = process.argv.slice(2);
if (command === "doctor") await doctor();
else if (command === "targets") await targets();
else if (command === "verify") await verify();
else if (command === "plan") await plan(environment || "development");
else if (command === "release") await release(environment || "development");
else if (command === "record-e2e") await recordE2e(environment || "preview", evidence);
else {
  console.log("mobile-release commands: doctor | targets [--probe] | verify | plan <environment> | release <environment> | record-e2e <environment> <evidence-id>");
  process.exitCode = 1;
}
