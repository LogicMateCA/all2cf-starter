const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const token = "XXXX.DUMMY.TOKEN.XXXX";

async function verify(secret) {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  body.set("remoteip", "203.0.113.10");
  const response = await fetch(endpoint, { method: "POST", body });
  if (!response.ok)
    throw new Error(`Turnstile Siteverify returned HTTP ${response.status}`);
  return response.json();
}

const [passing, failing] = await Promise.all([
  verify("1x0000000000000000000000000000000AA"),
  verify("2x0000000000000000000000000000000AA"),
]);
const failures = [];
if (passing.success !== true)
  failures.push(`official passing key failed: ${JSON.stringify(passing)}`);
if (failing.success !== false)
  failures.push(`official failing key passed: ${JSON.stringify(failing)}`);
console.log(JSON.stringify({
  ok: failures.length === 0,
  endpoint,
  passing: { success: passing.success, errors: passing["error-codes"] || [] },
  failing: { success: failing.success, errors: failing["error-codes"] || [] },
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
