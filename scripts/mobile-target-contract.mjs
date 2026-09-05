import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function targets(env = {}) {
  const output = execFileSync(process.execPath, ["scripts/mobile-release.mjs", "targets"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      STARTER_DEV_PROFILE_PATH: path.join(root, "profiles/development.env.example"),
      EXPO_TOKEN: "",
      EXPO_PROJECT_ID: "",
      ...env,
    },
  });
  return JSON.parse(output).executionTargets;
}

const unavailable = targets();
assert.equal(unavailable.easCloud.configured, false);
assert.equal(unavailable.connectedMac.configured, false);
assert.deepEqual(unavailable.selectedBuilders, { ios: "connected-mac", android: "windows-host" });
const eas = targets({ EXPO_TOKEN: "contract-token", EXPO_PROJECT_ID: "00000000-0000-4000-8000-000000000000" });
assert.equal(eas.easCloud.configured, true);
assert.deepEqual(eas.selectedBuilders, { ios: "connected-mac", android: "windows-host" });
const explicitEas = targets({ EXPO_TOKEN: "contract-token", EXPO_PROJECT_ID: "00000000-0000-4000-8000-000000000000", MOBILE_IOS_BUILDER: "eas", MOBILE_ANDROID_BUILDER: "eas" });
assert.deepEqual(explicitEas.selectedBuilders, { ios: "eas", android: "eas" });
assert.throws(() => targets({ MOBILE_IOS_BUILDER: "auto" }), /auto is no longer supported/u);
console.log(JSON.stringify({ ok: true, defaults: unavailable.selectedBuilders, easRequiresExplicitSelection: true, wslSshFallback: false }, null, 2));
