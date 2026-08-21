import { ProductShell } from "../product-shell";
import "./developer-page.css";

export function DeveloperPage() {
  const origin = window.location.origin;
  return (
    <ProductShell activePath="/app/developer">
      <main className="developer-shell">
        <header>
          <span>API SaaS</span>
          <h1>Developer platform</h1>
          <p>
            API keys, quotas, usage evidence, signed outgoing events and public
            documentation are composed into one executable platform boundary.
          </p>
        </header>
        <section className="developer-capabilities">
          <a href="/app/api-keys"><strong>API keys</strong><small>Create and revoke hashed user-owned credentials.</small></a>
          <a href="/app/usage"><strong>Usage</strong><small>Inspect the current monthly request quota.</small></a>
          <a href="/app/webhooks"><strong>Webhooks</strong><small>Subscribe to signed API completion events.</small></a>
          <a href="/docs/guides/api-platform/"><strong>API documentation</strong><small>Read authentication, errors and examples.</small></a>
        </section>
        <section>
          <div><h2>First request</h2><span>GET /api/v1/me</span></div>
          <pre><code>{`curl ${origin}/api/v1/me \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Idempotency-Key: request-unique-id"`}</code></pre>
          <p>
            The endpoint requires <code>product:read</code>, consumes one{" "}
            <code>api.requests</code> unit, and emits{" "}
            <code>api.request.completed</code> only for a newly recorded request.
          </p>
        </section>
        <section className="developer-contract">
          <h2>Runtime contract</h2>
          <dl>
            <div><dt>Authentication</dt><dd>Better Auth API Key, no API-key session conversion</dd></div>
            <div><dt>Quota</dt><dd>1,000 Free / 100,000 Pro requests per month</dd></div>
            <div><dt>Retries</dt><dd>Repeat the same Idempotency-Key without double charging</dd></div>
            <div><dt>Events</dt><dd>Cloudflare Queue signed outgoing webhook delivery</dd></div>
          </dl>
        </section>
      </main>
    </ProductShell>
  );
}
