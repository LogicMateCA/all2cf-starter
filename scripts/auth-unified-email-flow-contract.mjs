import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const web = await readFile(new URL("../apps/web/src/components/auth-page.tsx", import.meta.url), "utf8");
const client = await readFile(new URL("../apps/web/src/lib/auth-client.ts", import.meta.url), "utf8");
const worker = await readFile(new URL("../workers/app/auth-config.ts", import.meta.url), "utf8");
const routes = await readFile(new URL("../workers/app/index.ts", import.meta.url), "utf8");
const outbox = await readFile(new URL("../db/migrations/0002_auth_constraints_and_outbox.sql", import.meta.url), "utf8");
const organizationOutbox = await readFile(new URL("../packs/saas/team-organizations/templates/0005_organization.sql", import.meta.url), "utf8");
const protectedApp = await readFile(new URL("../apps/web/src/components/protected-app.tsx", import.meta.url), "utf8");
const resilientSession = await readFile(new URL("../apps/web/src/lib/use-resilient-session.ts", import.meta.url), "utf8");

assert.doesNotMatch(web, /Create (?:an )?account|Create your account|"register"|password-setup/u, "Web auth must expose one email continuation flow, not a registration branch");
assert.match(web, /next\.hasPassword\) setStep\("password"\)/u, "Existing credentials must route to password entry");
assert.match(web, /next\.exists\) await requestOwnershipCode\(\)/u, "Social-only accounts must prove email ownership before setting a password");
assert.match(web, /else setStep\("choose-password"\)/u, "A new email must route directly to password choice");
assert.match(web, /emailOtp\.requestPasswordReset/u, "Ownership and recovery must use the Better Auth OTP flow");
assert.match(web, /emailOtp\.resetPassword/u, "OTP and password must be verified atomically");
assert.match(client, /emailOTPClient\(\)/u, "The Web client must install Better Auth Email OTP");
assert.match(worker, /emailOTP\(\{/u, "The Worker must install Better Auth Email OTP");
assert.match(worker, /disableSignUp: true/u, "OTP must never create an unknown account");
assert.match(worker, /storeOTP: "hashed"/u, "OTP must be hashed at rest");
assert.match(worker, /allowedAttempts: 5/u, "OTP attempts must be bounded");
assert.match(worker, /const cookiePrefix =/u, "Every generated project must derive its own Better Auth cookie prefix");
assert.match(worker, /cookiePrefix,/u, "The generated cookie prefix must be applied to Better Auth");
assert.doesNotMatch(routes, /APP_ENV === "production"[\s\S]{0,160}publicLookupRestricted/u, "Production must not fall back to a guessed password screen");
assert.match(outbox, /'email-otp'/u, "The base outbox must accept OTP messages");
assert.match(organizationOutbox, /'email-otp'/u, "The Organization pack must preserve OTP messages when extending the outbox constraint");
assert.match(protectedApp, /useResilientSession\(\)/u, "Protected Web entry must not clear identity on one transient null session response");
assert.match(resilientSession, /authClient\.getSession\(\)/u, "Transient session loss must be confirmed against Better Auth before logout");

console.log(JSON.stringify({ ok: true, flow: "email -> password | choose-password | ownership-otp" }, null, 2));
