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
      MOBILE_MAC_HOST: "",
      MOBILE_MAC_PROJECT_ROOT: "",
      MOBILE_MAC_SSH_KEY_PATH: "",
      ...env,
    },
  });
  return JSON.parse(output).executionTargets;
}

const unavailable = targets();
assert.equal(unavailable.easCloud.configured, false);
assert.equal(unavailable.connectedMac.configured, false);
const eas = targets({ EXPO_TOKEN: "contract-token", EXPO_PROJECT_ID: "00000000-0000-4000-8000-000000000000" });
assert.equal(eas.easCloud.configured, true);
const mac = targets({ MOBILE_MAC_HOST: "builder@example.invalid", MOBILE_MAC_PROJECT_ROOT: "/Users/builder/project" });
assert.equal(mac.connectedMac.configured, true);
assert.equal(mac.connectedMac.reachable, false);
assert.equal(mac.connectedMac.reason, "not probed");
console.log(JSON.stringify({ ok: true, unavailable: true, easCloud: true, connectedMacConfigured: true, probeIsExplicit: true }, null, 2));
