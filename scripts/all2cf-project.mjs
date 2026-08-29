import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const command = process.argv[2] || "status";
const authPath = path.join(root, ".starter/update-auth.local.json");
const receiptPath = path.join(root, ".starter/source.json");
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const output = (value) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

async function status() {
  const receipt = await readJson(receiptPath);
  const authorization = await readJson(authPath).catch(() => null);
  const connected = Boolean(authorization?.accessToken && (!authorization.expiresAt || Date.parse(authorization.expiresAt) > Date.now()));
  output({ ok: true, mode: connected ? "all2cf-connected" : "independent", connected, project: receipt.project, engineVersion: receipt.engineVersion || null, sourceCommit: receipt.sourceCommit, expiresAt: connected ? authorization.expiresAt || null : null, runtimeDependency: false });
}

async function connect() {
  const source = process.argv[3];
  if (!source) throw new Error("Usage: npm run all2cf:connect -- /path/to/all2cf-connection.json");
  const authorization = await readJson(path.resolve(root, source));
  if (authorization.schemaVersion !== "all2cf-project-connection/v1" || !authorization.accessToken || !authorization.projectId || !authorization.installationId)
    throw new Error("All2CF project connection file is invalid");
  if (authorization.expiresAt && Date.parse(authorization.expiresAt) <= Date.now()) throw new Error("All2CF project connection file has expired");
  if (!authorization.updateServiceUrl || !/^https:\/\//u.test(authorization.updateServiceUrl))
    throw new Error("All2CF project connection file has an invalid update service URL");
  await writeFile(authPath, `${JSON.stringify({ schemaVersion: "starter-update-auth/v1", accessToken: authorization.accessToken, projectId: authorization.projectId, installationId: authorization.installationId, expiresAt: authorization.expiresAt, updateServiceUrl: authorization.updateServiceUrl }, null, 2)}\n`, { mode: 0o600 });
  await chmod(authPath, 0o600);
  output({ ok: true, connected: true, projectId: authorization.projectId, expiresAt: authorization.expiresAt });
}

async function disconnect() {
  const authorization = await readJson(authPath).catch(() => null);
  let remoteRevoked = false;
  let remoteWarning = null;
  if (authorization?.accessToken && authorization?.updateServiceUrl) {
    try {
      const endpoint = new URL("disconnect", authorization.updateServiceUrl).toString();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${authorization.accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ installationId: authorization.installationId, projectId: authorization.projectId }),
      });
      remoteRevoked = response.ok;
      if (!response.ok) remoteWarning = `All2CF returned HTTP ${response.status}; the local connection was still removed.`;
    } catch (error) {
      remoteWarning = `All2CF could not be reached; the local connection was still removed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  await rm(authPath, { force: true });
  output({ ok: true, connected: false, mode: "independent", remoteRevoked, remoteWarning, projectFilesChanged: false });
}

async function doctor() {
  const receipt = await readJson(receiptPath);
  const authorization = await readJson(authPath).catch(() => null);
  output({ ok: true, receipt: Boolean(receipt.sourceCommit), optionalConnection: true, connected: Boolean(authorization?.accessToken), independentCommands: ["npm ci", "npm run typecheck", "npm run build", "npm run dev:worker"], all2cfRuntimeDependency: false });
}

if (command === "status") await status();
else if (command === "connect") await connect();
else if (command === "disconnect") await disconnect();
else if (command === "doctor") await doctor();
else throw new Error(`Unknown All2CF project command ${command}`);
