import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const values = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8"));
const databaseUrl = values.get("DATABASE_URL")?.trim();
const detached = process.platform !== "win32";

if (!databaseUrl)
  throw new Error(".dev.vars must define DATABASE_URL for local Hyperdrive emulation");

const starter = JSON.parse(
  await readFile(path.join(root, "starter.config.json"), "utf8"),
);
const localDatabase = new URL(databaseUrl);
localDatabase.hostname = starter.development.database.host;
localDatabase.port = String(starter.development.database.port);

const child = spawn(
  "npx",
  [
    "--no-install",
    "wrangler",
    "dev",
    "--config",
    "cloudflare/wrangler.development.jsonc",
    "--ip",
    process.env.STARTER_LOCAL_WORKER_IP || "0.0.0.0",
    "--port",
    process.env.STARTER_LOCAL_WORKER_PORT || "8787",
  ],
  {
    cwd: root,
    detached,
    stdio: "inherit",
    env: {
      ...Object.fromEntries(values),
      ...process.env,
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:
        localDatabase.toString(),
    },
  },
);

let stopping = false;
function terminate(signal) {
  if (stopping) return;
  stopping = true;
  if (detached) process.kill(-child.pid, signal);
  else child.kill(signal);
}

for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => terminate(signal));

child.once("error", (error) => {
  throw error;
});
child.once("exit", (code, signal) => {
  process.exitCode = signal ? 0 : (code ?? 1);
});
