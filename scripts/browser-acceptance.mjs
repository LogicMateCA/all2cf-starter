import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axe from "axe-core";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const publicRoutes = [
  { surface: "marketing", route: "/", status: 200 },
  { surface: "marketing", route: "/features", status: 200 },
  { surface: "marketing", route: "/pricing", status: 200 },
  { surface: "marketing", route: "/about", status: 200 },
  { surface: "marketing", route: "/contact", status: 200 },
  { surface: "marketing", route: "/changelog", status: 200 },
  { surface: "marketing", route: "/privacy", status: 200 },
  { surface: "marketing", route: "/terms", status: 200 },
  { surface: "auth", route: "/login", status: 200 },
  { surface: "docs", route: "/docs/", status: 200 },
  { surface: "development-plan", route: "/dp", status: 200 },
  { surface: "marketing", route: "/not-a-real-route", status: 404 },
];

export const localSetupRoutes = [
  { surface: "setup", route: "/setup", status: 200 },
];

export const authenticatedRoutes = [
  { surface: "product", route: "/app", status: 200 },
  { surface: "account", route: "/app/settings", status: 200 },
  { surface: "notifications", route: "/app/notifications", status: 200 },
  { surface: "support", route: "/support", status: 200 },
  { surface: "admin", route: "/admin", status: 200 },
  { surface: "docs", route: "/docs/", status: 200 },
  { surface: "development-plan", route: "/dp", status: 200 },
];

const viewports = [
  { id: "desktop", viewport: { width: 1440, height: 900 } },
  { id: "mobile", viewport: { width: 390, height: 844 }, isMobile: true },
];
const themes = ["light", "dark"];

function parseArguments(argv) {
  return Object.fromEntries(
    argv
      .filter((value) => value.startsWith("--"))
      .map((value) => {
        const [key, ...parts] = value.slice(2).split("=");
        return [key, parts.length ? parts.join("=") : "true"];
      }),
  );
}

function safeName(value) {
  return value
    .replace(/^\/+|\/+$/gu, "")
    .replaceAll("/", "-")
    .replace(/[^a-z0-9-]+/giu, "-") || "home";
}

function cookieObjects(cookieHeader, baseUrl) {
  if (!cookieHeader) return [];
  const url = new URL(baseUrl);
  return cookieHeader
    .split(/;\s*/u)
    .map((pair) => {
      const separator = pair.indexOf("=");
      if (separator <= 0) return null;
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
        domain: url.hostname,
        path: "/",
        secure: url.protocol === "https:",
        sameSite: "Lax",
      };
    })
    .filter(Boolean);
}

async function hashDirectory(directory) {
  const hash = createHash("sha256");
  async function visit(current, relative = "") {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(current, entry.name);
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(absolute, child);
      else if (entry.isFile()) {
        hash.update(child);
        hash.update(await readFile(absolute));
      }
    }
  }
  await visit(directory);
  return hash.digest("hex");
}

async function setAccountTheme(baseUrl, cookieHeader, theme) {
  if (!cookieHeader) return;
  const response = await fetch(new URL("/api/preferences", baseUrl), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      Origin: baseUrl,
    },
    body: JSON.stringify({ theme, locale: "en" }),
  });
  if (!response.ok)
    throw new Error(`Unable to set ${theme} account preference (${response.status})`);
}

async function axeViolations(page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () =>
    globalThis.axe.run(document, { resultTypes: ["violations"] }),
  );
  return result.violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    nodes: nodes.length,
    samples: nodes.slice(0, 12).map(({ target, html, failureSummary }) => ({
      target,
      html,
      failureSummary,
    })),
  }));
}

async function takeStateScreenshot(page, outputRoot, caseId, state) {
  const filename = `${caseId}--${safeName(state)}.png`;
  const absolute = path.join(outputRoot, "evidence", filename);
  await page.screenshot({ path: absolute, fullPage: true });
  return path.relative(outputRoot, absolute);
}

async function exercisePage({ page, route, viewport, outputRoot, caseId }) {
  const interactions = [];
  const stateScreenshots = [];

  if (route === "/app") {
    await page.getByRole("heading", { name: "Recent activity" }).waitFor();
    await page
      .getByText("Browser acceptance notice", { exact: true })
      .waitFor();
    interactions.push("dashboard-recent-activity");
    const notification = page.getByRole("button", {
      name: /notifications|unread notifications/iu,
    });
    await notification.click();
    await page.getByRole("region", { name: "Notifications" }).waitFor();
    interactions.push("notification-bell");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "notification-bell"),
    );
    await notification.click();

    await page.getByRole("button", { name: "Open account menu" }).click();
    await page.getByRole("menuitem", { name: "Settings" }).waitFor();
    interactions.push("account-menu");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "account-menu"),
    );
    await page.keyboard.press("Escape");

    if (viewport === "mobile") {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("navigation", { name: "Product navigation" }).waitFor();
      interactions.push("mobile-navigation");
      stateScreenshots.push(
        await takeStateScreenshot(page, outputRoot, caseId, "mobile-navigation"),
      );
      await page.keyboard.press("Escape");
    }
  }

  if (route === "/app/settings") {
    await page.getByRole("group", { name: "Theme" }).waitFor();
    await page.getByRole("group", { name: "Shell language" }).waitFor();
    await page.getByRole("button", { name: "简体中文", exact: true }).click();
    await page.getByText("工作区", { exact: true }).first().waitFor();
    await page.waitForFunction(() => document.documentElement.lang === "zh-CN");
    interactions.push("settings-theme-language-zh-shell");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "chinese-shell"),
    );
    await page.getByRole("button", { name: "English", exact: true }).click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
  }

  if (route === "/app/team") {
    await page
      .getByRole("heading", { name: "Organizations", exact: true })
      .waitFor();
    await page.getByRole("heading", { name: "Members" }).waitFor();
    if (viewport === "mobile") {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("navigation", { name: "Product navigation" }).waitFor();
    }
    await page
      .getByRole("button", { name: /workspace/iu })
      .first()
      .click();
    await page.getByRole("menuitem", { name: /Manage organizations/iu }).waitFor();
    interactions.push("organization-workspace-member-management");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "organization-workspace"),
    );
  }

  if (route === "/app/billing") {
    await page
      .getByRole("heading", { name: "Billing", exact: true })
      .waitFor();
    await page.getByText("Current plan", { exact: true }).waitFor();
    await page
      .getByRole("button", {
        name: /Upgrade to Pro|Open Billing Portal/iu,
      })
      .waitFor();
    interactions.push("billing-subscription-actions");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "billing-subscription"),
    );
  }

  if (route === "/app/security/two-factor") {
    await page
      .getByRole("heading", { name: "Two-factor authentication", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Start TOTP setup" }).waitFor();
    interactions.push("two-factor-enrollment-surface");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "two-factor-enrollment"),
    );
  }

  if (route === "/two-factor") {
    await page
      .getByRole("heading", { name: "Verify your identity", exact: true })
      .waitFor();
    await page.getByRole("group", { name: "Verification method" }).waitFor();
    await page.getByLabel("Trust this device for 30 days").waitFor();
    interactions.push("two-factor-challenge-surface");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "two-factor-challenge"),
    );
  }

  if (route === "/app/developer") {
    await page
      .getByRole("heading", { name: "Developer platform", exact: true })
      .waitFor();
    await page.getByText("GET /api/v1/me", { exact: true }).waitFor();
    const developerLinks = page.locator(".developer-capabilities");
    for (const name of ["API keys", "Usage", "Webhooks", "API documentation"])
      await developerLinks
        .getByRole("link", { name: new RegExp(`^${name}`, "iu") })
        .waitFor();
    interactions.push("api-platform-developer-portal");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "api-platform"),
    );
  }

  if (route === "/setup") {
    await page.getByRole("button", { name: "Design" }).click();
    await page.getByRole("heading", { name: "Design" }).waitFor();
    await page
      .getByRole("heading", { name: "Global StyleKit visual system" })
      .waitFor();
    interactions.push("stylekit-selector");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "stylekit-selector"),
    );
  }

  if (route === "/admin") {
    const modules = page.getByRole("navigation", { name: "Admin modules" });
    await modules.waitFor();
    const labels = await modules.getByRole("button").allTextContents();
    if (!labels.some((label) => /health/iu.test(label)))
      throw new Error("Admin Health module is missing from the module tabs");
    interactions.push(`admin-modules:${labels.map((label) => label.trim()).join(",")}`);
    await modules.getByRole("button", { name: /^Audit/iu }).click();
    const auditRegion = page.locator(".audit-list");
    await auditRegion.getByRole("heading", { name: "Audit events" }).waitFor();
    await auditRegion.getByLabel("Target type").fill("support_ticket");
    await auditRegion.getByRole("button", { name: "Apply filters" }).click();
    await auditRegion.getByRole("button", { name: "Apply filters" }).waitFor();
    interactions.push("admin-audit-filter");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "admin-audit-filter"),
    );
    await modules
      .getByRole("button", { name: /^Notifications & announcements/iu })
      .click();
    const announcementForm = page.locator(".announcement-form");
    await announcementForm.getByLabel("Title").fill(
      `Browser acceptance announcement ${viewport} ${Date.now()}`,
    );
    await announcementForm
      .getByLabel("Message")
      .fill("This disposable announcement verifies the complete Admin delivery flow.");
    await announcementForm
      .getByRole("button", { name: "Publish announcement" })
      .click();
    await page
      .locator(".announcement-list")
      .getByText(/Browser acceptance announcement/iu)
      .first()
      .waitFor();
    interactions.push("admin-announcement-publish");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "admin-announcement"),
    );
  }

  if (route === "/dp" && viewport === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Blueprint" }).waitFor();
    interactions.push("development-plan-mobile-navigation");
    stateScreenshots.push(
      await takeStateScreenshot(page, outputRoot, caseId, "mobile-navigation"),
    );
    await page.keyboard.press("Escape");
  }

  return { interactions, stateScreenshots };
}

export async function runBrowserAcceptance({
  mode = "public",
  baseUrl = process.env.STARTER_BROWSER_BASE_URL || "http://127.0.0.1:18787",
  outputRoot,
  cookieHeader = "",
  routes,
} = {}) {
  if (!new Set(["public", "authenticated", "local-setup"]).has(mode))
    throw new Error(`Unknown browser acceptance mode: ${mode}`);
  const normalizedBaseUrl = baseUrl.replace(/\/$/u, "");
  const generatedAt = new Date();
  const evidenceRoot =
    outputRoot ||
    path.join(
      root,
      "test-results/browser-acceptance",
      generatedAt.toISOString().replace(/[:.]/gu, "-"),
      mode,
    );
  await mkdir(path.join(evidenceRoot, "evidence"), { recursive: true });

  const executablePath = process.env.STARTER_BROWSER_EXECUTABLE_PATH?.trim();
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const cases = [];
  const failures = [];
  const routeMatrix =
    routes ||
    (mode === "authenticated"
      ? authenticatedRoutes
      : mode === "local-setup"
        ? localSetupRoutes
        : publicRoutes);

  try {
    for (const routeCase of routeMatrix) {
      for (const { id: viewportId, viewport, isMobile = false } of viewports) {
        for (const theme of themes) {
          if (cookieHeader) await setAccountTheme(normalizedBaseUrl, cookieHeader, theme);
          const context = await browser.newContext({
            viewport,
            isMobile,
            colorScheme: theme,
            reducedMotion: "reduce",
            locale: "en-US",
          });
          await context.addInitScript(
            ({ selectedTheme }) => {
              localStorage.setItem("starter.theme", selectedTheme);
              localStorage.setItem("starter.locale", "en");
            },
            { selectedTheme: theme },
          );
          const cookies = cookieObjects(cookieHeader, normalizedBaseUrl);
          if (cookies.length) await context.addCookies(cookies);
          const page = await context.newPage();
          const consoleErrors = [];
          const pageErrors = [];
          const failedResponses = [];
          const apiRequests = [];
          page.on("console", (message) => {
            const expectedNavigationError =
              routeCase.status >= 400 &&
              message.location().url ===
                new URL(routeCase.route, normalizedBaseUrl).href;
            if (message.type() === "error" && !expectedNavigationError)
              consoleErrors.push({ text: message.text(), location: message.location() });
          });
          page.on("pageerror", (error) => pageErrors.push(String(error)));
          page.on("request", (request) => {
            const url = new URL(request.url());
            if (url.origin === new URL(normalizedBaseUrl).origin && url.pathname.startsWith("/api/"))
              apiRequests.push({ method: request.method(), path: url.pathname });
          });
          page.on("response", (response) => {
            if (response.status() >= 400 && response.url() !== new URL(routeCase.route, normalizedBaseUrl).href)
              failedResponses.push({ status: response.status(), url: response.url() });
          });

          const caseId = `${routeCase.surface}--${safeName(routeCase.route)}--${viewportId}-${theme}`;
          let result;
          try {
            const response = await page.goto(
              new URL(routeCase.route, normalizedBaseUrl).href,
              { waitUntil: "domcontentloaded" },
            );
            await page.waitForLoadState("networkidle").catch(() => undefined);
            await page.locator("body").waitFor({ state: "visible" });
            const metrics = await page.evaluate(() => ({
              title: document.title,
              h1: document.querySelector("h1")?.textContent?.trim() || null,
              lang: document.documentElement.lang,
              theme: document.documentElement.dataset.theme || getComputedStyle(document.documentElement).colorScheme,
              stylekit: document.documentElement.dataset.designProfile || null,
              horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
              mainLandmarks: document.querySelectorAll("main").length,
              reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            }));
            const accessibility = await axeViolations(page);
            const initialApiRequests = apiRequests.slice();
            const interaction = await exercisePage({
              page,
              route: routeCase.route,
              viewport: viewportId,
              outputRoot: evidenceRoot,
              caseId,
            });
            const screenshot = await takeStateScreenshot(
              page,
              evidenceRoot,
              caseId,
              "page",
            );
            result = {
              id: caseId,
              surface: routeCase.surface,
              route: routeCase.route,
              identity: cookieHeader ? "verified-platform-admin" : "anonymous",
              viewport: viewportId,
              theme,
              status: response?.status() ?? null,
              finalUrl: page.url(),
              metrics,
              interactions: interaction.interactions,
              axeViolations: accessibility,
              consoleErrors,
              pageErrors,
              failedResponses,
              initialApiRequests,
              screenshots: [screenshot, ...interaction.stateScreenshots],
            };
            const caseFailures = [];
            if (result.status !== routeCase.status)
              caseFailures.push(`status ${result.status}, expected ${routeCase.status}`);
            if (metrics.horizontalOverflow > 1)
              caseFailures.push(`horizontal overflow ${metrics.horizontalOverflow}px`);
            if (!metrics.mainLandmarks) caseFailures.push("missing main landmark");
            if (!metrics.reducedMotion) caseFailures.push("reduced motion not active");
            if (accessibility.length)
              caseFailures.push(`${accessibility.length} axe violation groups`);
            if (consoleErrors.length) caseFailures.push(`${consoleErrors.length} console errors`);
            if (pageErrors.length) caseFailures.push(`${pageErrors.length} page errors`);
            if (failedResponses.length)
              caseFailures.push(`${failedResponses.length} failed subresources`);
            const initialCount = (method, requestPath) =>
              initialApiRequests.filter((request) => request.method === method && request.path === requestPath).length;
            if (cookieHeader && initialCount("GET", "/api/preferences") > 1)
              caseFailures.push("duplicate initial preferences requests");
            if (cookieHeader && initialCount("GET", "/api/notifications") > 1)
              caseFailures.push("duplicate initial notification requests");
            if (routeCase.route === "/admin") {
              const eagerAdminDomains = [
                "/api/admin/support/tickets",
                "/api/admin/announcements",
                "/api/admin/audit",
                "/api/admin/webhooks",
              ].filter((requestPath) => initialApiRequests.some((request) => request.path === requestPath));
              if (eagerAdminDomains.length)
                caseFailures.push(`eager Admin requests: ${eagerAdminDomains.join(", ")}`);
            }
            if (caseFailures.length) failures.push({ id: caseId, failures: caseFailures });
          } catch (error) {
            result = {
              id: caseId,
              surface: routeCase.surface,
              route: routeCase.route,
              identity: cookieHeader ? "verified-platform-admin" : "anonymous",
              viewport: viewportId,
              theme,
              error: error instanceof Error ? error.stack || error.message : String(error),
              consoleErrors,
              pageErrors,
              failedResponses,
              screenshots: [],
            };
            failures.push({ id: caseId, failures: [result.error] });
          } finally {
            cases.push(result);
            await context.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  const distRoot = path.join(root, "dist/web");
  const report = {
    schema: "starter-browser-acceptance/v1",
    generatedAt: generatedAt.toISOString(),
    mode,
    baseUrl: normalizedBaseUrl,
    source: {
      commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      dirty: Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim()),
      artifactSha256: (await stat(distRoot)).isDirectory() ? await hashDirectory(distRoot) : null,
    },
    cases,
    failures,
    unverified: [
      "real Google OAuth callback",
      "real CFsend mailbox delivery",
      "remote provider reachability",
      "Development and Production deployment",
    ],
  };
  await writeFile(
    path.join(evidenceRoot, "manifest.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        ok: failures.length === 0,
        mode,
        cases: cases.length,
        screenshots: cases.reduce((total, item) => total + item.screenshots.length, 0),
        failures: failures.length,
        output: evidenceRoot,
        artifactSha256: report.source.artifactSha256,
      },
      null,
      2,
    ),
  );
  if (failures.length)
    throw new Error(`Browser acceptance failed in ${failures.length} cases; see ${evidenceRoot}/manifest.json`);
  return report;
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const args = parseArguments(process.argv.slice(2));
  await runBrowserAcceptance({
    mode: args.mode || "public",
    baseUrl: args["base-url"] || process.env.STARTER_BROWSER_BASE_URL,
    outputRoot: args.output ? path.resolve(args.output) : undefined,
    cookieHeader: process.env.STARTER_BROWSER_COOKIE || "",
  });
}
