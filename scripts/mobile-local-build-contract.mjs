import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const scriptUrl = new URL("./mobile-local-build.mjs", import.meta.url);
const source = await readFile(scriptUrl, "utf8");
for (const pattern of [/expo", "prebuild"/u, /app:assembleDebug/u, /app:assembleRelease/u, /app:bundleRelease/u, /ANDROID_RELEASE_KEYSTORE/u, /signingConfigs/u, /xcodebuild/u, /-exportArchive/u, /IOS_EXPORT_OPTIONS_PLIST/u]) assert.match(source, pattern);
const android = spawnSync(process.execPath, [scriptUrl.pathname, "android", "development"], { encoding: "utf8", env: { ...process.env, ANDROID_HOME: "", ANDROID_SDK_ROOT: "" } });
assert.notEqual(android.status, 0);
assert.match(`${android.stderr}\n${android.stdout}`, /ANDROID_HOME or ANDROID_SDK_ROOT is required/u);
if (process.platform !== "darwin") {
  const ios = spawnSync(process.execPath, [scriptUrl.pathname, "ios", "development"], { encoding: "utf8" });
  assert.notEqual(ios.status, 0);
  assert.match(`${ios.stderr}\n${ios.stdout}`, /requires macOS/u);
}
console.log(JSON.stringify({ ok: true, androidTasks: ["assembleDebug", "assembleRelease", "bundleRelease"], releaseSigning: "environment-required", ios: ["Simulator Debug", "archive", "exportArchive"], failClosed: true }, null, 2));
