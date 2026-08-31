import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.STARTER_ADMIN_BROWSER_PORT || 18793);
const baseUrl = `http://127.0.0.1:${port}`;
const output = path.join(root, "test-results/admin-control-center");
await mkdir(output, { recursive: true });
const server = spawn(path.join(root, "node_modules/.bin/vite"), ["--host", "0.0.0.0", "--port", String(port)], { cwd: path.join(root, "apps/web"), env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });
for (let attempt = 0; attempt < 60; attempt += 1) {
  try { if ((await fetch(baseUrl)).ok) break; } catch {}
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (attempt === 59) throw new Error(`Vite did not start\n${logs}`);
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = [];
try {
  for (const viewport of [{ id: "desktop", width: 1440, height: 900 }, { id: "mobile", width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await context.newPage();
    const pageErrors = [];
    const apiPaths = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname.startsWith("/api/")) apiPaths.push(url.pathname); });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      let body = { data: [] };
      if (url.pathname === "/api/auth/get-session") body = { session: { id: "session-proof", userId: "admin-proof", expiresAt: new Date(Date.now() + 3600000).toISOString() }, user: { id: "admin-proof", name: "Platform owner", email: "owner@example.com", emailVerified: true, role: "admin" } };
      else if (url.pathname === "/api/admin/overview") body = { data: { users: 27, openTickets: 3, notifications24h: 18, auditEvents24h: 42, database: "ok" } };
      else if (url.pathname === "/api/admin/site-integrations") body = { data: [] };
      else if (url.pathname === "/api/notifications") body = { data: { notifications: [], unreadCount: 0 } };
      else if (url.pathname === "/api/notifications/unread-count") body = { data: { count: 0 } };
      else if (url.pathname === "/api/preferences") body = { data: { theme: "dark" } };
      else if (url.pathname === "/api/public/site-integrations.js") return route.fulfill({ status: 200, contentType: "application/javascript", body: "/* no published integrations */" });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
    try { await page.getByRole("heading", { name: "Admin" }).waitFor(); }
    catch { throw new Error(JSON.stringify({ url: page.url(), apiPaths, body: (await page.locator("body").innerText()).slice(0, 1000), pageErrors }, null, 2)); }
    const nav = page.getByRole("navigation", { name: "Admin modules" });
    await nav.getByRole("link", { name: "Analytics & scripts" }).click();
    await page.getByRole("heading", { name: "Add analytics or an external script" }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const providerCount = await page.locator(".integration-provider-grid button").count();
    await page.screenshot({ path: path.join(output, `${viewport.id}.png`), fullPage: true });
    results.push({ viewport: viewport.id, path: page.url(), overflow, providerCount, pageErrors });
    await context.close();
  }
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 3000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
if (results.some((result) => result.path.endsWith("/login") || result.overflow > 0 || result.providerCount !== 5 || result.pageErrors.length)) throw new Error(JSON.stringify(results, null, 2));
console.log(JSON.stringify({ ok: true, results, screenshots: output }, null, 2));
