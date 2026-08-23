import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVisualFactoryRequest, validateVisualDiscovery, validateVisualIntegration } from "./lib/visual-integration.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const [contract, blueprint, plugins] = await Promise.all([readJson("integrations/visual.json"), readJson("starter.blueprint.json"), readJson(".ai/plugins.json")]);
const failures = validateVisualIntegration(contract, blueprint);
const visualPlugin = plugins.plugins?.find(({ id }) => id === "visual-design");
const projectPlugin = plugins.plugins?.find(({ id }) => id === "all2cf-project");
if (!visualPlugin || visualPlugin.installation !== "external-recommended" || visualPlugin.optional !== true)
  failures.push("Project plugin declaration must keep visual-design external and optional");
if (!projectPlugin || projectPlugin.installation !== "bundled")
  failures.push("Project plugin declaration must keep all2cf-project bundled");
const request = buildVisualFactoryRequest(contract, blueprint);
const validDiscovery = Object.fromEntries(contract.service.requiredDiscoveryFields.map((field) => [field, field === "service" ? "visual" : field === "contractVersions" ? [contract.source.contractVersion] : field === "capabilities" ? request.requestedCapabilities : field === "authorization" ? { mode: "oauth" } : field === "freshness" ? { generatedAt: "2026-08-23T00:00:00.000Z" } : "1.0.0"]));
failures.push(...validateVisualDiscovery(contract, request, validDiscovery));
const rejectedDiscovery = { ...validDiscovery, capabilities: request.requestedCapabilities.slice(1) };
if (validateVisualDiscovery(contract, request, rejectedDiscovery).length === 0) failures.push("Visual discovery validator accepted a missing requested capability");
if (failures.length) throw new Error(`Visual integration contract failed:\n- ${failures.join("\n- ")}`);
console.log(JSON.stringify({ ok: true, integration: contract.integrationVersion, sourceContract: `${contract.source.contractId}@${contract.source.contractVersion}`, sourceCommit: contract.source.sourceCommit, plugin: contract.plugin, blueprint: blueprint.visualIntegration, request, discoveryValidation: { compatibleAccepted: true, missingCapabilityRejected: true } }, null, 2));
