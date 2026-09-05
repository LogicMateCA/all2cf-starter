import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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
let development = {};
try { profile = parseEnv(await readFile(profilePath, "utf8")); } catch {}
try { projectEnv = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8")); } catch {}
try { development = JSON.parse(await readFile(path.join(root, ".starter/development.json"), "utf8")); } catch {}
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

function executionTargets() {
  const macBuilder = development.builders?.ios;
  const connectedMac = macBuilder
    ? { configured: true, host: macBuilder.host, runner: macBuilder.runnerName || "logicmate-xcode-headless", keychainProfile: macBuilder.keychainProfile, status: "plugin-verification-required" }
    : { configured: false, status: "blocked", reason: "Run Logicmate Starter inspect_macos_builder and configure_macos_build_keychain" };
  return {
    host: { platform: process.platform, architecture: process.arch },
    selectedBuilders: { ios: builderPreference("ios"), android: builderPreference("android") },
    easCloud: { configured: Boolean(optional("EXPO_TOKEN") && optional("EXPO_PROJECT_ID")) },
    localIos: { available: process.platform === "darwin" && executable("xcodebuild") },
    localAndroid: { available: existsSync(optional("ANDROID_HOME") || optional("ANDROID_SDK_ROOT")) && executable("java") },
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
    maxBuffer: options.maxBuffer || 64 * 1024 * 1024,
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
  const starts = [...output].map((character, index) => new Set(["[", "{"]).has(character) ? index : -1).filter((index) => index >= 0).sort((a, b) => b - a);
  for (const start of starts) {
    try { return JSON.parse(output.slice(start)); } catch {}
  }
  throw new Error("Command did not return parseable JSON");
}

function builderPreference(platform) {
  const name = platform === "ios" ? "MOBILE_IOS_BUILDER" : "MOBILE_ANDROID_BUILDER";
  const value = optional(name) || (platform === "ios" ? "connected-mac" : "local");
  const allowed = platform === "ios" ? new Set(["local", "connected-mac", "eas"]) : new Set(["local", "eas"]);
  if (value === "auto") throw new Error(`${name}=auto is no longer supported; choose an explicit builder`);
  if (!allowed.has(value)) throw new Error(`${name} must be one of ${[...allowed].join(", ")}`);
  return value;
}

function routeFor(platform, targets) {
  const preference = builderPreference(platform);
  if (platform === "android") {
    if (preference === "local") return targets.localAndroid.available ? "local-android" : "unavailable";
    if (preference === "eas") return targets.easCloud.configured ? "eas-cloud-build" : "unavailable";
    return targets.localAndroid.available ? "local-android" : "unavailable";
  }
  if (preference === "local") return targets.localIos.available ? "local-xcode" : "unavailable";
  if (preference === "connected-mac") return targets.connectedMac.configured ? "starter-plugin-connected-mac" : "unavailable";
  if (preference === "eas") return targets.easCloud.configured ? "eas-cloud-build" : "unavailable";
  throw new Error("iOS builder selection must be explicit");
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
  const result = executionTargets();
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
  const targets = executionTargets();
  const easSelected = builderPreference("ios") === "eas" && builderPreference("android") === "eas";
  const canUpdate = previous && sameFingerprint(previous.fingerprints, current) && previous.builds && targets.easCloud.configured && easSelected;
  const action = canUpdate ? "update" : "build";
  const routes = action === "update" ? { ios: "eas-update", android: "eas-update" } : { ios: routeFor("ios", targets), android: routeFor("android", targets) };
  const result = { environment, profile, commit, fingerprints: current, previous: previous ? { commit: previous.commit, fingerprints: previous.fingerprints, builds: previous.builds } : null, action, routes, executionTargets: targets };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function buildLocally(platform, environment) {
  const names = platform === "android"
    ? ["ANDROID_HOME", "ANDROID_SDK_ROOT", "MOBILE_ANDROID_ARCHITECTURES", "MOBILE_PREBUILD_CLEAN", "ANDROID_RELEASE_KEYSTORE", "ANDROID_RELEASE_STORE_PASSWORD", "ANDROID_RELEASE_KEY_ALIAS", "ANDROID_RELEASE_KEY_PASSWORD"]
    : ["MOBILE_PREBUILD_CLEAN", "MOBILE_IOS_SIMULATOR_ARCHITECTURES", "IOS_EXPORT_OPTIONS_PLIST", "IOS_ALLOW_PROVISIONING_UPDATES"];
  const env = Object.fromEntries(names.map((name) => [name, optional(name)]).filter(([, value]) => value));
  return parseJsonOutput(run(process.execPath, ["scripts/mobile-local-build.mjs", platform, environment], { cwd: root, inherit: false, env }));
}

function requireCleanMobileCommit() {
  if (git(["status", "--porcelain"])) throw new Error("Mobile build requires a clean Git worktree");
  return git(["rev-parse", "HEAD"]);
}

async function buildLocalCommand(platform, environment) {
  if (!new Set(["ios", "android"]).has(platform)) throw new Error("build-local requires ios or android");
  profileFor(environment);
  const commit = requireCleanMobileCommit();
  const result = buildLocally(platform, environment);
  console.log(JSON.stringify({ ok: true, commit, result }, null, 2));
}

async function buildConnectedIosCommand(environment) {
  profileFor(environment);
  const commit = requireCleanMobileCommit();
  throw new Error(`Connected Mac build for ${commit} is owned by the Logicmate Starter plugin. Run inspect_macos_builder, verify_macos_signing, build_ios_candidate, then install_ios_on_device; WSL SSH and bare xcodebuild are prohibited.`);
}

async function release(environment) {
  if (git(["status", "--porcelain"])) throw new Error("Mobile release requires a clean Git worktree");
  await verify();
  const releasePlan = await plan(environment);
  if (Object.values(releasePlan.routes).includes("unavailable")) throw new Error(`No configured builder for ${Object.entries(releasePlan.routes).filter(([, route]) => route === "unavailable").map(([platform]) => platform).join(" and ")}. Configure a local SDK, connected Mac or Expo/EAS.`);
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
    const builds = {};
    for (const platform of ["ios", "android"]) {
      const route = releasePlan.routes[platform];
      if (route === "eas-cloud-build") builds[platform] = parseJsonOutput(eas(["build", "--profile", environment, "--platform", platform, "--message", message, "--wait", "--json", "--non-interactive"]));
      else if (route === "starter-plugin-connected-mac") throw new Error("iOS candidate must be built and device-tested through Logicmate Starter before release. Generate the release contract with that artifact and evidence.");
      else builds[platform] = buildLocally(platform, environment);
    }
    remote = { builds };
  } else {
    remote = parseJsonOutput(eas(["update", "--channel", environment, "--environment", environment, "--message", message, "--platform", "all", "--json", "--non-interactive"]));
  }

  const updateGroupId = remote.group || remote.groupId || remote.updateGroupId || remote?.[0]?.group;
  const builds = remote.builds || state.releases[environment]?.builds;
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
else if (command === "build-local") await buildLocalCommand(environment, evidence || "development");
else if (command === "build-connected-ios") await buildConnectedIosCommand(environment || "development");
else if (command === "record-e2e") await recordE2e(environment || "preview", evidence);
else {
  console.log("mobile-release commands: doctor | targets [--probe] | verify | plan <environment> | release <environment> | build-local <ios|android> <environment> | build-connected-ios <environment> | record-e2e <environment> <evidence-id>");
  process.exitCode = 1;
}
