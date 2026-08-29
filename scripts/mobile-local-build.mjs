import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = path.join(root, "apps/mobile");
const [platform, environment = "development"] = process.argv.slice(2);
if (!new Set(["android", "ios"]).has(platform)) throw new Error("Platform must be android or ios");
if (!new Set(["development", "preview", "production"]).has(environment)) throw new Error("Environment must be development, preview, or production");
const outputRoot = path.join(root, ".all2cf/mobile-builds", environment, platform);

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required for ${platform} ${environment} local build`);
  return value;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || mobileRoot,
    encoding: "utf8",
    env: { ...process.env, APP_VARIANT: environment, ...(options.env || {}) },
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed\n${result.stderr || result.stdout || ""}`);
  return result.stdout || "";
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function findFirst(directory, predicate) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (predicate(target)) return target;
    if (entry.isDirectory()) {
      const nested = await findFirst(target, predicate).catch(() => null);
      if (nested) return nested;
    }
  }
  return null;
}

async function buildAndroid() {
  const androidSdk = String(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "").trim();
  if (!androidSdk) throw new Error("ANDROID_HOME or ANDROID_SDK_ROOT is required for Android local build");
  process.env.ANDROID_HOME = androidSdk;
  if (environment !== "development") {
    for (const name of ["ANDROID_RELEASE_KEYSTORE", "ANDROID_RELEASE_STORE_PASSWORD", "ANDROID_RELEASE_KEY_ALIAS", "ANDROID_RELEASE_KEY_PASSWORD"]) required(name);
    const keystore = path.resolve(process.env.ANDROID_RELEASE_KEYSTORE);
    if (!(await stat(keystore).then((value) => value.isFile(), () => false))) throw new Error("ANDROID_RELEASE_KEYSTORE does not point to a file");
    process.env.ANDROID_RELEASE_KEYSTORE = keystore;
  }
  const nativeExists = await stat(path.join(mobileRoot, "android")).then((value) => value.isDirectory(), () => false);
  const cleanPrebuild = environment !== "development" || process.env.MOBILE_PREBUILD_CLEAN === "true" || !nativeExists;
  run("npx", ["expo", "prebuild", "--platform", "android", ...(cleanPrebuild ? ["--clean"] : []), "--no-install"], { inherit: true });
  const gradle = path.join(mobileRoot, "android/app/build.gradle");
  if (environment !== "development") {
    const source = await readFile(gradle, "utf8");
    const marker = "// starter-local-release-signing";
    if (!source.includes(marker)) await writeFile(gradle, `${source.trimEnd()}\n\n${marker}\nandroid {\n    signingConfigs {\n        releaseLocal {\n            storeFile file(System.getenv(\"ANDROID_RELEASE_KEYSTORE\"))\n            storePassword System.getenv(\"ANDROID_RELEASE_STORE_PASSWORD\")\n            keyAlias System.getenv(\"ANDROID_RELEASE_KEY_ALIAS\")\n            keyPassword System.getenv(\"ANDROID_RELEASE_KEY_PASSWORD\")\n        }\n    }\n    buildTypes {\n        release { signingConfig signingConfigs.releaseLocal }\n    }\n}\n`);
  }
  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const task = environment === "development" ? "app:assembleDebug" : environment === "preview" ? "app:assembleRelease" : "app:bundleRelease";
  const architectures = String(process.env.MOBILE_ANDROID_ARCHITECTURES || (environment === "production" ? "" : "arm64-v8a")).trim();
  const architectureArgs = architectures ? [`-PreactNativeArchitectures=${architectures}`] : [];
  run(gradlew, [task, "--no-daemon", ...architectureArgs], { cwd: path.join(mobileRoot, "android"), inherit: true });
  const extension = environment === "production" ? ".aab" : ".apk";
  const built = await findFirst(path.join(mobileRoot, "android/app/build/outputs"), (file) => file.endsWith(extension));
  if (!built) throw new Error(`Gradle did not produce a ${extension} Artifact`);
  await mkdir(outputRoot, { recursive: true });
  const artifact = path.join(outputRoot, `starter-${environment}${extension}`);
  await copyFile(built, artifact);
  return { platform, environment, builder: "local-gradle", task, cleanPrebuild, architectures: architectures || "store-defaults", artifact, sha256: await sha256(artifact) };
}

async function buildIos() {
  if (process.platform !== "darwin") throw new Error("Local iOS build requires macOS");
  run("xcodebuild", ["-version"]);
  const nativeExists = await stat(path.join(mobileRoot, "ios")).then((value) => value.isDirectory(), () => false);
  const cleanPrebuild = environment !== "development" || process.env.MOBILE_PREBUILD_CLEAN === "true" || !nativeExists;
  run("npx", ["expo", "prebuild", "--platform", "ios", ...(cleanPrebuild ? ["--clean"] : []), "--no-install"], { inherit: true });
  const userGemDir = run("ruby", ["-e", "print Gem.user_dir"]).trim();
  const gemBin = path.join(userGemDir, "bin");
  run("npx", ["pod-install"], { inherit: true, env: { PATH: `${gemBin}:${process.env.PATH || ""}`, RUBYOPT: [process.env.RUBYOPT, "-rlogger"].filter(Boolean).join(" "), LANG: process.env.LANG?.includes("UTF-8") ? process.env.LANG : "en_US.UTF-8", LC_ALL: process.env.LC_ALL?.includes("UTF-8") ? process.env.LC_ALL : "en_US.UTF-8" } });
  const iosRoot = path.join(mobileRoot, "ios");
  const workspace = (await readdir(iosRoot)).find((name) => name.endsWith(".xcworkspace"));
  if (!workspace) throw new Error("Expo prebuild did not produce an Xcode workspace");
  const list = JSON.parse(run("xcodebuild", ["-list", "-json", "-workspace", workspace], { cwd: iosRoot }));
  const scheme = list.workspace?.schemes?.[0];
  if (!scheme) throw new Error("Xcode workspace has no shared scheme");
  await mkdir(outputRoot, { recursive: true });
  if (environment === "development") {
    const derived = path.join(outputRoot, "DerivedData");
    const simulatorArchitectures = String(process.env.MOBILE_IOS_SIMULATOR_ARCHITECTURES || (process.arch === "arm64" ? "arm64" : "x86_64")).trim();
    run("xcodebuild", ["-quiet", "-workspace", workspace, "-scheme", scheme, "-configuration", "Debug", "-sdk", "iphonesimulator", "-derivedDataPath", derived, "ONLY_ACTIVE_ARCH=YES", `ARCHS=${simulatorArchitectures}`, "build"], { cwd: iosRoot, inherit: true });
    const app = await findFirst(path.join(derived, "Build/Products"), (file) => file.endsWith(".app"));
    return { platform, environment, builder: "local-xcode", configuration: "Debug", cleanPrebuild, architectures: simulatorArchitectures, artifact: app, sha256: null };
  }
  const archive = path.join(outputRoot, `starter-${environment}.xcarchive`);
  const provisioning = process.env.IOS_ALLOW_PROVISIONING_UPDATES === "true" ? ["-allowProvisioningUpdates"] : [];
  run("xcodebuild", ["-quiet", "-workspace", workspace, "-scheme", scheme, "-configuration", "Release", "-destination", "generic/platform=iOS", "-archivePath", archive, "archive", ...provisioning], { cwd: iosRoot, inherit: true });
  const exportOptions = path.resolve(required("IOS_EXPORT_OPTIONS_PLIST"));
  const exported = path.join(outputRoot, "export");
  run("xcodebuild", ["-quiet", "-exportArchive", "-archivePath", archive, "-exportOptionsPlist", exportOptions, "-exportPath", exported, ...provisioning], { cwd: iosRoot, inherit: true });
  const ipa = await findFirst(exported, (file) => file.endsWith(".ipa"));
  if (!ipa) throw new Error("Xcode export did not produce an IPA");
  return { platform, environment, builder: "local-xcode", configuration: "Release", cleanPrebuild, archive, artifact: ipa, sha256: await sha256(ipa) };
}

const result = platform === "android" ? await buildAndroid() : await buildIos();
console.log(JSON.stringify({ ok: true, ...result }, null, 2));
