import { useEffect, useRef } from "react";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-starter-turnstile="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile could not load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.starterTurnstile = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile could not load.")), { once: true });
    document.head.append(script);
  });
  return scriptPromise;
}

export function TurnstileChallenge({
  siteKey,
  action,
  onToken,
  onError,
}: {
  siteKey: string;
  action: string;
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;
  useEffect(() => {
    let disposed = false;
    let widgetId = "";
    onTokenRef.current("");
    void loadTurnstile()
      .then(() => {
        if (disposed || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          action,
          theme: "auto",
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "timeout-callback": () => onTokenRef.current(""),
          "error-callback": () => {
            onTokenRef.current("");
            onErrorRef.current("Turnstile verification failed. Try again.");
          },
        });
      })
      .catch((error) => onErrorRef.current(error instanceof Error ? error.message : String(error)));
    return () => {
      disposed = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [action, siteKey]);
  return <div className="turnstile-challenge" ref={container} aria-label="Human verification" />;
}
