import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const betterAuthVersion = "1.7.2";
const output = path.join(
  root,
  `db/generated/better-auth-${betterAuthVersion}.sql`,
);
const values = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8"));
if (!values.get("DATABASE_URL") || !values.get("BETTER_AUTH_SECRET"))
  throw new Error("DATABASE_URL and BETTER_AUTH_SECRET are required");
const config = JSON.parse(
  await readFile(path.join(root, "starter.config.json"), "utf8"),
);
const databaseUrl = new URL(values.get("DATABASE_URL"));
databaseUrl.hostname = config.development.database.host;
databaseUrl.port = String(config.development.database.port);
databaseUrl.pathname = `/${config.development.database.database}`;
databaseUrl.searchParams.set("sslmode", "require");
databaseUrl.searchParams.set("uselibpqcompat", "true");
const scratchDatabase = `starter_auth_schema_${Date.now()}_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
const scratchUrl = new URL(databaseUrl);
scratchUrl.pathname = `/${scratchDatabase}`;
await mkdir(path.dirname(output), { recursive: true });

const admin = new Client({ connectionString: databaseUrl.toString() });
await admin.connect();
try {
  await admin.query(`create database "${scratchDatabase}"`);
  const result = spawnSync(
    "npx",
    [
      "--yes",
      `auth@${betterAuthVersion}`,
      "generate",
      "--config",
      "workers/app/auth.cli.ts",
      "--output",
      path.relative(root, output),
      "--yes",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: scratchUrl.toString(),
        BETTER_AUTH_SECRET: values.get("BETTER_AUTH_SECRET"),
      },
    },
  );
  if (result.status !== 0)
    throw new Error(
      `Better Auth schema generation failed\n${[result.stderr, result.stdout].filter(Boolean).join("\n")}`,
    );
  console.log(
    result.stdout ||
      JSON.stringify({ ok: true, output: path.relative(root, output) }),
  );
} finally {
  await admin
    .query(`drop database if exists "${scratchDatabase}" with (force)`)
    .catch(() => undefined);
  await admin.end();
}
