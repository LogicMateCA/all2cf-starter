import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./device-page.css";
type RequestInfo = {
  client_id?: string;
  scope?: string;
  resource?: string | string[];
};
const normalize = (value: string) =>
  value.trim().replaceAll("-", "").toUpperCase();
export function DeviceAuthorizationPage() {
  const initial =
    new URLSearchParams(window.location.search).get("user_code") || "";
  const [code, setCode] = useState(initial);
  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function inspect(value: string) {
    const userCode = normalize(value);
    if (!userCode) {
      setError("Enter the code shown on your device.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await authClient.device({ query: { user_code: userCode } });
    setBusy(false);
    if (result.error || !result.data) {
      setError("This device code is invalid or expired.");
      return;
    }
    setCode(userCode);
    setRequest(result.data as RequestInfo);
  }
  useEffect(() => {
    if (initial) void inspect(initial);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await inspect(code);
  }
  async function decide(approve: boolean) {
    setBusy(true);
    setError("");
    const result = approve
      ? await authClient.device.approve({ userCode: code })
      : await authClient.device.deny({ userCode: code });
    setBusy(false);
    if (result.error) {
      setError("The device authorization decision failed.");
      return;
    }
    window.location.assign("/app");
  }
  const resources = request
    ? Array.isArray(request.resource)
      ? request.resource.join(", ")
      : request.resource || "None"
    : "";
  return (
    <main className="device-auth">
      <section>
        <span>Device authorization</span>
        <h1>Confirm a device</h1>
        {!request ? (
          <form onSubmit={(event) => void submit(event)}>
            <p>
              Only enter a code displayed on a device you possess. Never approve
              a code sent by another person.
            </p>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              maxLength={12}
              placeholder="ABCD-1234"
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Checking code" : "Review request"}
            </Button>
          </form>
        ) : (
          <div className="device-request">
            <p>Confirm that this code matches your device before continuing.</p>
            <dl>
              <div>
                <dt>Code</dt>
                <dd>{code}</dd>
              </div>
              <div>
                <dt>Client</dt>
                <dd>{request.client_id || "Unknown"}</dd>
              </div>
              <div>
                <dt>Scopes</dt>
                <dd>{request.scope || "None"}</dd>
              </div>
              <div>
                <dt>Resources</dt>
                <dd>{resources}</dd>
              </div>
            </dl>
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void decide(false)}
              >
                Deny
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void decide(true)}
              >
                Approve device
              </Button>
            </div>
          </div>
        )}
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
