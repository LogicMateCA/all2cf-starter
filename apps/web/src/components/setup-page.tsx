import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, ExternalLink, Save } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { providerSetupLinks } from "../lib/provider-setup-links";
import { TurnstileChallenge } from "./turnstile-challenge";

type Lifecycle = {
  selected: boolean;
  materialized: boolean;
  localVerified: boolean;
  developmentVerified: boolean;
  productionReleased: boolean;
};
type Selection = { id: string; lifecycle: Lifecycle; note?: string };
type SelectionGroup = "design" | "pages" | "saas" | "capabilities";
type Pack = {
  id: string;
  kind: "design" | "page" | "saas" | "capability";
  name: string;
  status: string;
  delivery: "baseline" | "materializer" | "planned";
  targets: string[];
  provides: string[];
  requires: string[];
  conflicts: string[];
};
type DatabasePolicy = {
  engine: "postgresql";
  provider: "native-postgresql" | "cfpg";
  transports?: {
    development: "native-postgresql" | "cfpg";
    production: "native-postgresql" | "cfpg";
  };
  access: "sql-first" | "drizzle";
  initialState: "empty";
  schemaSource: "selected-pack-baseline";
  existingDataPolicy: "out-of-scope";
  cfpg: {
    development: CfpgConnection | null;
    production: CfpgConnection | null;
  };
};
const databaseTransport = (policy: DatabasePolicy, environment: "development" | "production") =>
  policy.transports?.[environment] || policy.provider;
type StorageEnvironment = {
  bucket: string;
  publicDomain: string;
  s3Endpoint: string;
  s3Region: string;
  s3ForcePathStyle: boolean;
};
type StoragePolicy = {
  provider: "none" | "cloudflare-r2" | "s3-compatible";
  access: "private" | "public";
  uploadMode: "worker";
  maxUploadBytes: number;
  development: StorageEnvironment;
  production: StorageEnvironment;
};
type AntiAbusePolicy = {
  provider: "none" | "turnstile";
  development: { siteKey: string };
  production: { siteKey: string };
};
type AiPolicy = {
  provider: "none" | "workers-ai";
  development: { model: string; gatewayId: string };
  production: { model: string; gatewayId: string };
};
type SearchPolicy = {
  provider: "none" | "postgresql" | "vectorize";
  development: { indexName: string; dimensions: number; metric: "cosine" | "euclidean" | "dot-product" };
  production: { indexName: string; dimensions: number; metric: "cosine" | "euclidean" | "dot-product" };
};
type PushPolicy = {
  provider: "none" | "expo-push";
  accessTokenRequired: boolean;
  development: { projectId: string };
  production: { projectId: string };
};
type SmsPolicy = {
  provider: "none" | "twilio";
  development: { apiBaseUrl: string };
  production: { apiBaseUrl: string };
};
type MediaPolicy = {
  images: { provider: "none" | "cloudflare-images"; maxInputBytes: number; defaultFormat: "image/webp" | "image/avif" | "image/jpeg" | "image/png" };
  stream: { provider: "none" | "cloudflare-stream"; maxDurationSeconds: number; development: { accountId: string; allowedOrigins: string[]; apiBaseUrl: string }; production: { accountId: string; allowedOrigins: string[]; apiBaseUrl: string } };
};
type BackgroundPolicy = { cron: { enabled: boolean; development: { expression: string }; production: { expression: string } }; workflow: { enabled: boolean; scheduleEnabled: boolean; development: { expression: string }; production: { expression: string } }; realtime: { enabled: boolean } };
type CfpgConnection = {
  connectCommand: string;
  databaseId: string;
  databaseWorker: string;
  entrypoint: "All2CFDatabase";
  package: "@all2cf/database-connect";
  version: "0.2.0-rc.2";
  sha256: string;
  alias: "@all2cf/database-connect/pg";
};
type Blueprint = {
  schemaVersion: string;
  status: string;
  preset: string;
  designProfile: { id: string; version: string };
  stylekit: {
    slug: string;
    sourceRevision: string;
    snapshotVersion: string;
    snapshotHash: string;
  };
  visualIntegration: {
    enabled: boolean;
    contractVersion: "1.0.1";
    plugin: { id: "visual-design"; version: "0.1.0"; installation: "external-recommended" };
    environment: "development" | "production";
    status: "disabled" | "unavailable" | "configured" | "resolved";
    profileReceipt: ".visual/receipt.json";
    fallbackProfile: { id: string; version: string; sha256: string };
    warnings: string[];
  };
  pageSet: { selected: string[] };
  project: {
    name: string;
    slug: string;
    brief: string;
    platforms: string[];
    locales: string[];
    defaultLocale: string;
  };
  productIntent: {
    summary: string;
    audiences: string[];
    coreObjects: string[];
    tenantModel: "personal" | "organization" | "hybrid";
    chargingModel:
      | "free"
      | "one-time"
      | "subscription-user"
      | "subscription-organization"
      | "usage"
      | "hybrid";
  };
  setup: {
    entry: string;
    status: string;
    currentStep: string;
    completedSteps: string[];
  };
  selections: Record<SelectionGroup, Selection[]>;
  providers: {
    auth: string;
    socialAuth: string[];
    database: DatabasePolicy;
    storage: StoragePolicy;
    antiAbuse: AntiAbusePolicy;
    ai: AiPolicy;
    search: SearchPolicy;
    push: PushPolicy;
    sms: SmsPolicy;
    media: MediaPolicy;
    background: BackgroundPolicy;
    email: { default: string; alternatives: string[] };
    billing: string;
    release: string;
  };
  environments: string[];
};
type StarterConfig = {
  project: { name: string; slug: string };
  cloudflare: { zoneName: string; [key: string]: unknown };
  email: { provider: string; [key: string]: unknown };
  development: {
    worker: string;
    domain: string;
    database: {
      database: string;
      user: string;
      container: string;
      vpcServiceName: string;
      hyperdriveName: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  production: {
    worker: string;
    domain: string;
    database: {
      database: string;
      user: string;
      hyperdriveName: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
type Preset = {
  id: string;
  name: string;
  description: string;
  selections: string[];
};
type DesignProfile = {
  id: string;
  version: string;
  packId: string;
  name: string;
  description: string;
  status: string;
  targets: string[];
  direction: { tone: string; typography: string; shape: string; depth: string };
  dials: {
    designVariance: number;
    motionIntensity: number;
    visualDensity: number;
  };
  semanticColors: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  rules: { do: string[]; dont: string[] };
  adapters: Record<string, string>;
};
type PageDefinition = {
  id: string;
  packId: string;
  name: string;
  route: string;
  group: string;
  renderer: string;
  required: boolean;
  defaultSelected: boolean;
  status: string;
  sections: string[];
};
type StyleKitEntry = {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: string;
  styleType: string;
  adapterFamily?: string;
  classification:
    | "base-visual"
    | "layout-pattern"
    | "density-pattern"
    | "style-variant"
    | "enhancement"
    | "content-domain"
    | "pending-review";
  globalEligibility: "eligible" | "pending" | "ineligible";
  classificationReason: string;
  tags?: string[];
  colors?: { primary?: string; secondary?: string; accent?: string[] };
};
type StyleKitSnapshotSummary = {
  snapshotVersion: string;
  snapshotHash: string;
  immutable: boolean;
  targets: Record<string, { status: string }>;
  style: StyleKitEntry;
};
type ProviderCatalogOption = {
  id: string;
  name: string;
  status: "implemented" | "local-verified" | "development-verified" | "production-released" | "planned";
  delivery: "baseline" | "materializer" | "platform" | "planned";
  selectable: boolean;
  credentials: string[];
  bindings: string[];
  dependencies: string[];
  verification: { available: boolean; mode: string };
  setupLinks: string[];
  notes: string;
};
type ProviderCatalogCategory = {
  id: string;
  name: string;
  kind: "provider" | "infrastructure" | "platform";
  required: boolean;
  selection: "single" | "multiple";
  defaultOptionIds: string[];
  capabilityIds: string[];
  options: ProviderCatalogOption[];
};
type SetupPayload = {
  blueprint: Blueprint;
  catalog: { catalogVersion: string; presets: Preset[]; packs: Pack[] };
  designCatalog: {
    catalogVersion: string;
    sourcePolicy: string;
    profiles: DesignProfile[];
  };
  visualIntegrationContract: {
    integrationVersion: "1.0.1";
    status: string;
    plugin: { id: "visual-design"; version: "0.1.0"; installation: "external-recommended"; bundled: false };
    service: { developmentOrigin: string; productionOrigin: string; discoveryPath: string; mcpPath: string; requiredDiscoveryFields: string[] };
    projectArchive: { profile: string; receipt: string };
    fallback: { required: true; behavior: "starter-owned-baseline"; blocksFactory: false };
  };
  pageCatalog: {
    catalogVersion: string;
    policy: string;
    pages: PageDefinition[];
  };
  stylekitSnapshot: StyleKitSnapshotSummary;
  saasSources: {
    sources: Array<{ id: string; name: string; role: string }>;
  };
  saasCapabilities: {
    capabilities: Array<{
      id: string;
      owner: string;
      delivery: "baseline" | "materializer" | "planned";
      status: string;
      gaps?: string[];
    }>;
  };
  providerCatalog: {
    catalogVersion: string;
    categories: ProviderCatalogCategory[];
  };
  providerCredentials: Record<
    "google" | "github" | "apple" | "cfsend" | "resend" | "cloudflare-email-service" | "stripe" | "s3-compatible" | "turnstile" | "expo-push" | "twilio-sms" | "cloudflare-stream" | "cloudflare-release" | "github-release" | "expo-eas" | "mobile-local-build" | "apple-app-store" | "google-play",
    {
      configured: boolean;
      source: "project" | "shared" | "mixed" | "missing";
      missing: string[];
    }
  >;
  config: StarterConfig;
};
type ProviderTestState = {
  status: "idle" | "testing" | "success" | "error";
  provider?: string;
  message?: string;
};
type ReleaseProvider = "cloudflare-release" | "github-release" | "expo-eas" | "mobile-local-build" | "apple-app-store" | "google-play";

const providerSecretFields = {
  google: [
    { name: "GOOGLE_CLIENT_ID", label: "Client ID", secret: false },
    { name: "GOOGLE_CLIENT_SECRET", label: "Client secret", secret: true },
  ],
  github: [
    { name: "GITHUB_CLIENT_ID", label: "Client ID", secret: false },
    { name: "GITHUB_CLIENT_SECRET", label: "Client secret", secret: true },
  ],
  apple: [
    { name: "APPLE_CLIENT_ID", label: "Services ID", secret: false },
    { name: "APPLE_TEAM_ID", label: "Team ID", secret: false },
    { name: "APPLE_KEY_ID", label: "Key ID", secret: false },
    { name: "APPLE_PRIVATE_KEY_BASE64", label: "P8 private key (base64)", secret: true },
    { name: "APPLE_APP_BUNDLE_IDENTIFIER", label: "iOS bundle identifier", secret: false },
  ],
  cfsend: [
    { name: "CFSEND_API_URL", label: "Runtime URL", secret: false },
    { name: "CFSEND_API_KEY", label: "API key", secret: true },
    { name: "CFSEND_FROM", label: "Verified sender", secret: false },
  ],
  resend: [
    { name: "RESEND_API_KEY", label: "API key", secret: true },
    { name: "RESEND_FROM", label: "Verified sender", secret: false },
  ],
  "cloudflare-email-service": [
    { name: "CLOUDFLARE_EMAIL_FROM", label: "Verified sender", secret: false },
  ],
  stripe: [
    { name: "STRIPE_SECRET_KEY", label: "Test secret key", secret: true },
    { name: "STRIPE_PUBLISHABLE_KEY", label: "Test publishable key", secret: false },
    { name: "STRIPE_WEBHOOK_SECRET", label: "Webhook signing secret", secret: true },
    { name: "STRIPE_PRICE_PRO", label: "Pro Price ID", secret: false },
  ],
  "s3-compatible": [
    { name: "S3_ACCESS_KEY_ID", label: "Access Key ID", secret: false },
    { name: "S3_SECRET_ACCESS_KEY", label: "Secret Access Key", secret: true },
  ],
  turnstile: [
    { name: "TURNSTILE_SECRET_KEY", label: "Development secret key", secret: true },
    { name: "STARTER_PRODUCTION_TURNSTILE_SECRET_KEY", label: "Production secret key", secret: true },
  ],
  "expo-push": [
    { name: "EXPO_PUSH_ACCESS_TOKEN", label: "Development access token", secret: true },
    { name: "STARTER_PRODUCTION_EXPO_PUSH_ACCESS_TOKEN", label: "Production access token", secret: true },
  ],
  "twilio-sms": [
    { name: "TWILIO_ACCOUNT_SID", label: "Development Account SID", secret: false },
    { name: "TWILIO_API_KEY", label: "Development API Key SID", secret: false },
    { name: "TWILIO_API_SECRET", label: "Development API Secret", secret: true },
    { name: "TWILIO_FROM", label: "Development sender (E.164)", secret: false },
    { name: "STARTER_PRODUCTION_TWILIO_ACCOUNT_SID", label: "Production Account SID", secret: false },
    { name: "STARTER_PRODUCTION_TWILIO_API_KEY", label: "Production API Key SID", secret: false },
    { name: "STARTER_PRODUCTION_TWILIO_API_SECRET", label: "Production API Secret", secret: true },
    { name: "STARTER_PRODUCTION_TWILIO_FROM", label: "Production sender (E.164)", secret: false },
  ],
  "cloudflare-stream": [
    { name: "CLOUDFLARE_STREAM_TOKEN", label: "Development Stream token", secret: true },
    { name: "STREAM_WEBHOOK_SECRET", label: "Development webhook secret", secret: true },
    { name: "STARTER_PRODUCTION_CLOUDFLARE_STREAM_TOKEN", label: "Production Stream token", secret: true },
    { name: "STARTER_PRODUCTION_STREAM_WEBHOOK_SECRET", label: "Production webhook secret", secret: true },
  ],
  "cloudflare-release": [
    { name: "CLOUDFLARE_API_TOKEN", label: "Account API token", secret: true },
    { name: "CLOUDFLARE_ACCOUNT_ID", label: "Account ID", secret: false },
  ],
  "github-release": [
    { name: "GITHUB_TOKEN", label: "Fine-grained access token", secret: true },
  ],
  "expo-eas": [
    { name: "EXPO_TOKEN", label: "Expo access token", secret: true },
    { name: "EXPO_OWNER", label: "Expo account / organization", secret: false },
    { name: "EXPO_PROJECT_ID", label: "EAS project ID", secret: false },
  ],
  "mobile-local-build": [
    { name: "MOBILE_ANDROID_BUILDER", label: "Android builder: auto, local or eas", secret: false },
    { name: "MOBILE_IOS_BUILDER", label: "iOS builder: auto, local, connected-mac or eas", secret: false },
    { name: "ANDROID_HOME", label: "Android SDK path", secret: false },
    { name: "MOBILE_ANDROID_ARCHITECTURES", label: "Development ABIs (default arm64-v8a)", secret: false },
    { name: "ANDROID_RELEASE_KEYSTORE", label: "Android upload keystore path", secret: false },
    { name: "ANDROID_RELEASE_STORE_PASSWORD", label: "Android keystore password", secret: true },
    { name: "ANDROID_RELEASE_KEY_ALIAS", label: "Android key alias", secret: false },
    { name: "ANDROID_RELEASE_KEY_PASSWORD", label: "Android key password", secret: true },
    { name: "MOBILE_MAC_HOST", label: "Connected Mac SSH host", secret: false },
    { name: "MOBILE_MAC_PROJECT_ROOT", label: "Project path on Mac", secret: false },
    { name: "MOBILE_MAC_SSH_KEY_PATH", label: "Mac SSH key path", secret: false },
    { name: "IOS_EXPORT_OPTIONS_PLIST", label: "iOS ExportOptions.plist path", secret: false },
  ],
  "apple-app-store": [
    { name: "ASC_KEY_ID", label: "API key ID", secret: false },
    { name: "ASC_ISSUER_ID", label: "Issuer ID", secret: false },
    { name: "ASC_API_KEY_BASE64", label: "P8 API key (base64)", secret: true },
    { name: "ASC_APP_ID", label: "App Store Connect app ID", secret: false },
  ],
  "google-play": [
    { name: "GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64", label: "Service account JSON (base64)", secret: true },
    { name: "GOOGLE_PLAY_PACKAGE_NAME", label: "Android package name", secret: false },
  ],
} as const;

const steps = [
  { id: "identity", label: "Product" },
  { id: "saas", label: "SaaS" },
  { id: "capabilities", label: "Capabilities" },
  { id: "providers", label: "Providers" },
  { id: "pages", label: "Pages" },
  { id: "design", label: "Design" },
  { id: "review", label: "Review" },
] as const;

const groupForKind: Record<Pack["kind"], SelectionGroup> = {
  design: "design",
  page: "pages",
  saas: "saas",
  capability: "capabilities",
};
const requiredPacks = new Set([
  "page.core-product-site",
  "saas.identity-core",
  "saas.product-shell",
  "saas.notifications-core",
  "saas.product-operations-lite",
]);
const emptyLifecycle = (): Lifecycle => ({
  selected: false,
  materialized: false,
  localVerified: false,
  developmentVerified: false,
  productionReleased: false,
});
const selectLifecycle = (lifecycle: Lifecycle, selected: boolean): Lifecycle =>
  selected
    ? { ...lifecycle, selected: true }
    : {
        ...lifecycle,
        selected: false,
        localVerified: false,
        developmentVerified: false,
        productionReleased: false,
      };

const listValue = (items: string[]) => items.join(", ");
const parseList = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

function hydrateSelections(blueprint: Blueprint, packs: Pack[]) {
  const copy = structuredClone(blueprint);
  for (const pack of packs) {
    const group = groupForKind[pack.kind];
    const existing = copy.selections[group].find(({ id }) => id === pack.id);
    if (!existing)
      copy.selections[group].push({
        id: pack.id,
        lifecycle: {
          ...emptyLifecycle(),
          selected: requiredPacks.has(pack.id),
        },
      });
    else if (requiredPacks.has(pack.id)) existing.lifecycle.selected = true;
  }
  return copy;
}

function Field({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <label className="setup-field">
      <span>{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

function PackChoice({
  pack,
  selection,
  type,
  onChange,
}: {
  pack: Pack;
  selection: Selection;
  type: "radio" | "checkbox";
  onChange: (selected: boolean) => void;
}) {
  const required = requiredPacks.has(pack.id);
  const unavailable = pack.delivery === "planned";
  return (
    <label
      className={
        selection.lifecycle.selected ? "pack-choice selected" : "pack-choice"
      }
    >
      <input
        type={type}
        name={type === "radio" ? "design-profile" : pack.id}
        checked={selection.lifecycle.selected}
        disabled={required || unavailable}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="pack-choice-main">
        <span>
          <strong>{pack.name}</strong>
          {required ? (
            <small>Required</small>
          ) : unavailable ? (
            <small>Planned — unavailable</small>
          ) : null}
        </span>
        <p>{pack.provides.slice(0, 3).join(", ")}</p>
        <small>
          {pack.targets.join(", ")} / {pack.status} / {pack.delivery}
        </small>
        {pack.requires.length ? (
          <small>Requires: {pack.requires.join(", ")}</small>
        ) : null}
        {pack.conflicts.length ? (
          <small>Conflicts: {pack.conflicts.join(", ")}</small>
        ) : null}
      </span>
      <span className="pack-check">
        <Check size={15} />
      </span>
    </label>
  );
}

function PageChoice({
  page,
  selected,
  onChange,
}: {
  page: PageDefinition;
  selected: boolean;
  onChange: (selected: boolean) => void;
}) {
  return (
    <label className={selected ? "pack-choice selected" : "pack-choice"}>
      <input
        type="checkbox"
        checked={selected}
        disabled={page.required}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="pack-choice-main">
        <span>
          <strong>{page.name}</strong>
          {page.required ? <small>Required</small> : null}
        </span>
        <p>{page.sections.slice(0, 4).join(", ")}</p>
        <small>
          {page.route} / {page.renderer} / {page.status}
        </small>
      </span>
      <span className="pack-check">
        <Check size={15} />
      </span>
    </label>
  );
}

function ProviderCredentialEditor({
  provider,
  state,
  editing,
  values,
  onEditing,
  onChange,
  callbackUrls = [],
}: {
  provider: keyof typeof providerSecretFields;
  state: SetupPayload["providerCredentials"][keyof SetupPayload["providerCredentials"]];
  editing: boolean;
  values: Record<string, string>;
  onEditing: (editing: boolean) => void;
  onChange: (name: string, value: string) => void;
  callbackUrls?: string[];
}) {
  const fields = providerSecretFields[provider];
  return (
    <div className="provider-credentials">
      <div className="provider-credential-state">
        <span className={state.configured ? "status configured" : "status deferred"}>
          {state.configured ? "Configured" : "Configure later"}
        </span>
        <p>
          {state.configured
            ? `Using ${state.source === "shared" ? "the shared development profile" : state.source === "project" ? "project-local values" : "combined project and shared values"}.`
            : `Missing ${state.missing.join(", ")}. The plan can be saved, but affected authentication or email flows are not ready for release.`}
        </p>
      </div>
      <div className="provider-resource-links" aria-label={`${provider} setup resources`}>
        {providerSetupLinks[provider].map((link) => (
          <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>
            {link.label}<ExternalLink size={14} />
          </a>
        ))}
      </div>
      {callbackUrls.length ? (
        <div className="provider-callbacks">
          <strong>Authorized callback URLs</strong>
          {callbackUrls.map((url) => <code key={url}>{url}</code>)}
        </div>
      ) : null}
      {editing ? (
        <div className="provider-secret-fields">
          {fields.map((field) => (
            <label key={field.name}>
              <span>{field.label}</span>
              <Input
                type={field.secret ? "password" : "text"}
                autoComplete="off"
                value={values[field.name] || ""}
                placeholder={state.configured ? "Configured — leave blank to keep" : field.name}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            </label>
          ))}
          <div className="provider-secret-actions">
            <Button type="button" size="sm" variant="outline" onClick={() => onEditing(false)}>
              Configure later
            </Button>
            <small>Non-empty values are saved only to the project-local development environment.</small>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => onEditing(true)}>
          {state.configured ? "Replace credentials" : "Configure now"}
        </Button>
      )}
    </div>
  );
}

export function SetupPage() {
  const [payload, setPayload] = useState<SetupPayload | null>(null);
  const [generation, setGeneration] = useState<{ status: "idle" | "generating" | "done" | "error"; message?: string; target?: string }>({ status: "idle" });
  const [stepIndex, setStepIndex] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [saveError, setSaveError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [providerSecrets, setProviderSecrets] = useState<Record<string, string>>({});
  const [providerEditors, setProviderEditors] = useState<Record<string, boolean>>({});
  const [testRecipient, setTestRecipient] = useState("");
  const [providerTest, setProviderTest] = useState<ProviderTestState>({ status: "idle" });
  const [visualTest, setVisualTest] = useState<ProviderTestState>({ status: "idle" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileTest, setTurnstileTest] = useState<ProviderTestState>({ status: "idle" });
  const [workersAiTest, setWorkersAiTest] = useState<ProviderTestState>({ status: "idle" });
  const [vectorizeTest, setVectorizeTest] = useState<ProviderTestState>({ status: "idle" });
  const [expoPushToken, setExpoPushToken] = useState("");
  const [expoPushTest, setExpoPushTest] = useState<ProviderTestState>({ status: "idle" });
  const [smsRecipient, setSmsRecipient] = useState("");
  const [smsTest, setSmsTest] = useState<ProviderTestState>({ status: "idle" });
  const [streamTest, setStreamTest] = useState<ProviderTestState>({ status: "idle" });
  const [releaseTests, setReleaseTests] = useState<Partial<Record<ReleaseProvider, ProviderTestState>>>({});
  const [cfpgCommands, setCfpgCommands] = useState({ development: "", production: "" });

  useEffect(() => {
    void fetch("/__starter/setup", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "This setup workspace is available only from the local Starter development server.",
          );
        return response.json() as Promise<SetupPayload>;
      })
      .then((next) => {
        const restoredStep = steps.findIndex(
          ({ id }) => id === next.blueprint.setup.currentStep,
        );
        if (restoredStep >= 0) setStepIndex(restoredStep);
        setPayload({
          ...next,
          blueprint: hydrateSelections(next.blueprint, next.catalog.packs),
        });
        setCfpgCommands({
          development: next.blueprint.providers.database.cfpg?.development?.connectCommand || "",
          production: next.blueprint.providers.database.cfpg?.production?.connectCommand || "",
        });
        const resumedSave = sessionStorage.getItem("starter.setup.savePending");
        if (next.blueprint.setup.status === "ready" || resumedSave) setSaveState("saved");
        sessionStorage.removeItem("starter.setup.savePending");
        sessionStorage.removeItem("starter.setup.saved");
      })
      .catch((error) =>
        setLoadError(error instanceof Error ? error.message : String(error)),
      );
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const currentStep = steps[stepIndex];
  const selectedPacks = useMemo(
    () =>
      payload
        ? Object.values(payload.blueprint.selections)
            .flat()
            .filter(({ lifecycle }) => lifecycle.selected)
        : [],
    [payload],
  );
  const selectedPackDetails = useMemo(
    () =>
      payload
        ? selectedPacks
            .map(({ id }) =>
              payload.catalog.packs.find((pack) => pack.id === id),
            )
            .filter((pack): pack is Pack => Boolean(pack))
        : [],
    [payload, selectedPacks],
  );
  const selectedPages = payload?.blueprint.pageSet.selected || [];
  const stripeSelected = selectedPacks.some(
    ({ id }) => id === "saas.billing-stripe",
  );
  const intentProposal = useMemo(() => {
    if (!payload) return [];
    const proposals: Array<{ id: string; reason: string }> = [];
    if (
      payload.blueprint.productIntent.tenantModel === "organization" ||
      payload.blueprint.productIntent.tenantModel === "hybrid"
    )
      proposals.push({
        id: "saas.team-organizations",
        reason:
          "Organization tenancy needs members, invitations, roles, and an active workspace.",
      });
    if (payload.blueprint.productIntent.chargingModel !== "free")
      proposals.push({
        id: "saas.billing-stripe",
        reason: `${payload.blueprint.productIntent.chargingModel} charging needs Checkout, Portal, subscription projection, and signed webhook handling.`,
      });
    return proposals;
  }, [payload]);

  if (loadError)
    return (
      <main className="setup-unavailable">
        <AlertCircle size={24} />
        <h1>Local setup is not running</h1>
        <p>{loadError}</p>
        <code>npm run setup</code>
        <a href="/dp">Open the current Development Plan</a>
      </main>
    );
  if (!payload)
    return (
      <main className="protected-loading">
        <span />
        <span />
        <span />
      </main>
    );

  const markDirty = () => {
    setDirty(true);
    setSaveState("idle");
    setSaveError("");
  };
  const updateBlueprint = (updater: (blueprint: Blueprint) => Blueprint) => {
    markDirty();
    setPayload((current) =>
      current ? { ...current, blueprint: updater(current.blueprint) } : current,
    );
  };
  const updateConfig = (updater: (config: StarterConfig) => StarterConfig) => {
    markDirty();
    setPayload((current) =>
      current ? { ...current, config: updater(current.config) } : current,
    );
  };
  const updateProviderSecret = (name: string, value: string) => {
    markDirty();
    setProviderSecrets((current) => ({ ...current, [name]: value }));
  };
  const updateCfpgCommand = (environment: "development" | "production", value: string) => {
    markDirty();
    setCfpgCommands((current) => ({ ...current, [environment]: value }));
  };
  const setProviderEditing = (
    provider: keyof typeof providerSecretFields,
    editing: boolean,
  ) => {
    setProviderEditors((current) => ({ ...current, [provider]: editing }));
    if (editing) return;
    const names = new Set<string>(
      providerSecretFields[provider].map(({ name }) => name),
    );
    setProviderSecrets((current) =>
      Object.fromEntries(Object.entries(current).filter(([name]) => !names.has(name))),
    );
  };
  const runEmailProviderTest = async () => {
    const provider = payload.blueprint.providers.email.default;
    setProviderTest({ status: "testing", provider });
    try {
      const response = await fetch("/__starter/provider-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider, recipient: testRecipient, providerSecrets }),
      });
      const result = (await response.json()) as {
        error?: string;
        result?: { provider: string; providerMessageId: string; attempts: number; recipient: string };
      };
      if (!response.ok || !result.result)
        throw new Error(result.error || `Provider test returned HTTP ${response.status}.`);
      setProviderTest({
        status: "success",
        provider,
        message: `${result.result.provider} accepted the message for ${result.result.recipient}. Message ID: ${result.result.providerMessageId}. Attempts: ${result.result.attempts}.`,
      });
    } catch (error) {
      setProviderTest({
        status: "error",
        provider,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  const runVisualDiscoveryTest = async () => {
    setVisualTest({ status: "testing", provider: "visual-design" });
    try {
      const response = await fetch("/__starter/visual-discovery", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: "{}" });
      const result = (await response.json()) as { error?: string; status?: string; discovery?: { serviceVersion?: string; protocolVersion?: string }; warnings?: string[] };
      if (!response.ok) throw new Error(result.error || `Visual discovery returned HTTP ${response.status}.`);
      if (result.status !== "configured") throw new Error(result.warnings?.join(" ") || "Visual discovery is unavailable; Starter baseline remains active.");
      setVisualTest({ status: "success", provider: "visual-design", message: `Visual discovery is compatible${result.discovery?.serviceVersion ? `; service ${result.discovery.serviceVersion}` : ""}${result.discovery?.protocolVersion ? `; protocol ${result.discovery.protocolVersion}` : ""}.` });
    } catch (error) {
      setVisualTest({ status: "error", provider: "visual-design", message: error instanceof Error ? error.message : String(error) });
    }
  };
  const runTurnstileTest = async () => {
    setTurnstileTest({ status: "testing", provider: "turnstile" });
    try {
      const response = await fetch("/__starter/provider-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider: "turnstile", token: turnstileToken, providerSecrets }),
      });
      const result = (await response.json()) as {
        error?: string;
        result?: { verified: boolean; hostname: string; action: string };
      };
      if (!response.ok || !result.result?.verified)
        throw new Error(result.error || `Turnstile test returned HTTP ${response.status}.`);
      setTurnstileTest({ status: "success", provider: "turnstile", message: `Siteverify accepted the challenge for ${result.result.hostname}; action: ${result.result.action}.` });
      setTurnstileToken("");
    } catch (error) {
      setTurnstileTest({ status: "error", provider: "turnstile", message: error instanceof Error ? error.message : String(error) });
    }
  };
  const runWorkersAiTest = async () => {
    setWorkersAiTest({ status: "testing", provider: "workers-ai" });
    try {
      const environment = payload.blueprint.providers.ai.development;
      const response = await fetch("/__starter/provider-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider: "workers-ai", model: environment.model, gatewayId: environment.gatewayId }),
      });
      const result = (await response.json()) as {
        error?: string;
        result?: { model: string; gatewayId: string | null; response: string };
      };
      if (!response.ok || !result.result)
        throw new Error(result.error || `Workers AI test returned HTTP ${response.status}.`);
      setWorkersAiTest({ status: "success", provider: "workers-ai", message: `${result.result.model} responded${result.result.gatewayId ? ` through ${result.result.gatewayId}` : " directly"}: ${result.result.response || "response received"}` });
    } catch (error) {
      setWorkersAiTest({ status: "error", provider: "workers-ai", message: error instanceof Error ? error.message : String(error) });
    }
  };
  const runVectorizeTest = async () => {
    setVectorizeTest({ status: "testing", provider: "vectorize" });
    try {
      const environment = payload.blueprint.providers.search.development;
      const response = await fetch("/__starter/provider-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider: "vectorize", ...environment }),
      });
      const result = (await response.json()) as { error?: string; result?: { indexName: string; dimensions: number; metric: string; match: { id: string; score: number | null } } };
      if (!response.ok || !result.result)
        throw new Error(result.error || `Vectorize test returned HTTP ${response.status}.`);
      setVectorizeTest({ status: "success", provider: "vectorize", message: `${result.result.indexName} accepted, queried and deleted a ${result.result.dimensions}-dimension test vector (${result.result.metric}); score: ${result.result.match.score ?? "n/a"}.` });
    } catch (error) {
      setVectorizeTest({ status: "error", provider: "vectorize", message: error instanceof Error ? error.message : String(error) });
    }
  };
  const runExpoPushTest = async () => {
    setExpoPushTest({ status: "testing", provider: "expo-push" });
    try {
      const response = await fetch("/__starter/provider-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider: "expo-push", token: expoPushToken, accessTokenRequired: payload.blueprint.providers.push.accessTokenRequired, providerSecrets }),
      });
      const result = (await response.json()) as { error?: string; result?: { ticketId: string; status: string } };
      if (!response.ok || !result.result)
        throw new Error(result.error || `Expo Push test returned HTTP ${response.status}.`);
      setExpoPushTest({ status: "success", provider: "expo-push", message: `Expo accepted the Development push ticket ${result.result.ticketId}. Device delivery and receipt still require physical-device confirmation.` });
    } catch (error) {
      setExpoPushTest({ status: "error", provider: "expo-push", message: error instanceof Error ? error.message : String(error) });
    }
  };
  const runSmsTest = async () => {
    setSmsTest({ status: "testing", provider: "twilio-sms" });
    try {
      const response = await fetch("/__starter/provider-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider: "twilio-sms", recipient: smsRecipient, apiBaseUrl: payload.blueprint.providers.sms.development.apiBaseUrl, providerSecrets }),
      });
      const result = (await response.json()) as { error?: string; result?: { providerSid: string; status: string; recipientLast4: string } };
      if (!response.ok || !result.result) throw new Error(result.error || `Twilio test returned HTTP ${response.status}.`);
      setSmsTest({ status: "success", provider: "twilio-sms", message: `Twilio accepted ${result.result.providerSid} for ••••${result.result.recipientLast4}; initial status: ${result.result.status}. Carrier delivery remains a separate receipt/status check.` });
    } catch (error) {
      setSmsTest({ status: "error", provider: "twilio-sms", message: error instanceof Error ? error.message : String(error) });
    }
  };
  const runStreamTest = async () => {
    setStreamTest({ status: "testing", provider: "cloudflare-stream" });
    try {
      const environment = payload.blueprint.providers.media.stream.development;
      const response = await fetch("/__starter/provider-test", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ provider: "cloudflare-stream", ...environment, providerSecrets }) });
      const result = (await response.json()) as { error?: string; result?: { uid: string; deleted: boolean } };
      if (!response.ok || !result.result?.deleted) throw new Error(result.error || `Stream test returned HTTP ${response.status}.`);
      setStreamTest({ status: "success", provider: "cloudflare-stream", message: `Stream created direct upload ${result.result.uid} and deleted the unused draft successfully.` });
    } catch (error) { setStreamTest({ status: "error", provider: "cloudflare-stream", message: error instanceof Error ? error.message : String(error) }); }
  };
  const runReleasePlatformTest = async (provider: ReleaseProvider) => {
    setReleaseTests((current) => ({ ...current, [provider]: { status: "testing", provider } }));
    try {
      const response = await fetch("/__starter/provider-test", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ provider, providerSecrets }) });
      const result = (await response.json()) as { error?: string; result?: { verified: boolean; identity: string } };
      if (!response.ok || !result.result?.verified) throw new Error(result.error || `${provider} returned HTTP ${response.status}.`);
      setReleaseTests((current) => ({ ...current, [provider]: { status: "success", provider, message: `Verified read-only access to ${result.result?.identity}.` } }));
    } catch (error) {
      setReleaseTests((current) => ({ ...current, [provider]: { status: "error", provider, message: error instanceof Error ? error.message : String(error) } }));
    }
  };
  const updateIdentity = (key: "name" | "slug", value: string) => {
    updateBlueprint((blueprint) => ({
      ...blueprint,
      project: { ...blueprint.project, [key]: value },
    }));
    updateConfig((config) => ({
      ...config,
      project: { ...config.project, [key]: value },
    }));
  };
  const applySafeDefaults = () => {
    const slug = payload.blueprint.project.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/gu, "-")
      .replace(/^-+|-+$/gu, "");
    const database = slug.replaceAll("-", "_");
    const zone = payload.config.cloudflare.zoneName;
    updateIdentity("slug", slug);
    updateBlueprint((blueprint) => ({
      ...blueprint,
      providers: {
        ...blueprint.providers,
        storage: {
          ...blueprint.providers.storage,
          development: {
            ...blueprint.providers.storage.development,
            bucket: `${slug}-dev-objects`,
          },
          production: {
            ...blueprint.providers.storage.production,
            bucket: `${slug}-objects`,
          },
        },
      },
    }));
    updateConfig((config) => ({
      ...config,
      development: {
        ...config.development,
        worker: `${slug}-dev`,
        domain: `${slug}-dev.${zone}`,
        database: {
          ...config.development.database,
          database: `${database}dev`,
          user: `${database}dev`,
          container: `${slug}-postgres-dev`,
          vpcServiceName: `${slug}-postgres-dev`,
          hyperdriveName: `${slug}-dev-db`,
        },
      },
      production: {
        ...config.production,
        worker: slug,
        domain: `${slug}.${zone}`,
        database: {
          ...config.production.database,
          database,
          user: database,
          hyperdriveName: `${slug}-prod-db`,
        },
      },
    }));
  };
  const setPackSelected = (pack: Pack, selected: boolean) =>
    updateBlueprint((blueprint) => {
      if (pack.delivery === "planned") return blueprint;
      const group = groupForKind[pack.kind];
      const selections = blueprint.selections[group].map((selection) => {
        const nextSelected =
          pack.kind === "design"
            ? selection.id === pack.id
            : selection.id === pack.id
              ? selected
              : selection.lifecycle.selected;
        if (nextSelected === selection.lifecycle.selected) return selection;
        return {
          ...selection,
          lifecycle: selectLifecycle(selection.lifecycle, nextSelected),
        };
      });
      return {
        ...blueprint,
        preset: requiredPacks.has(pack.id) ? blueprint.preset : "custom",
        selections: { ...blueprint.selections, [group]: selections },
        providers:
          pack.id === "capability.object-storage"
            ? {
                ...blueprint.providers,
                storage: {
                  ...blueprint.providers.storage,
                  provider: selected ? "cloudflare-r2" : "none",
                },
              }
            : pack.id === "capability.turnstile"
              ? {
                  ...blueprint.providers,
                  antiAbuse: {
                    ...blueprint.providers.antiAbuse,
                    provider: selected ? "turnstile" : "none",
                  },
                }
            : pack.id === "capability.workers-ai"
              ? {
                  ...blueprint.providers,
                  ai: {
                    ...blueprint.providers.ai,
                    provider: selected ? "workers-ai" : "none",
                  },
                }
            : pack.id === "capability.vectorize"
              ? {
                  ...blueprint.providers,
                  search: {
                    ...blueprint.providers.search,
                    provider: selected ? "vectorize" : "none",
                  },
                }
            : pack.id === "capability.expo-push"
              ? {
                  ...blueprint.providers,
                  push: { ...blueprint.providers.push, provider: selected ? "expo-push" : "none" },
                }
            : pack.id === "capability.twilio-sms"
              ? { ...blueprint.providers, sms: { ...blueprint.providers.sms, provider: selected ? "twilio" : "none" } }
            : pack.id === "capability.cloudflare-images"
              ? { ...blueprint.providers, media: { ...blueprint.providers.media, images: { ...blueprint.providers.media.images, provider: selected ? "cloudflare-images" : "none" } } }
            : pack.id === "capability.cloudflare-stream"
              ? { ...blueprint.providers, media: { ...blueprint.providers.media, stream: { ...blueprint.providers.media.stream, provider: selected ? "cloudflare-stream" : "none" } } }
            : pack.id === "capability.cron"
              ? { ...blueprint.providers, background: { ...blueprint.providers.background, cron: { ...blueprint.providers.background.cron, enabled: selected } } }
            : pack.id === "capability.workflows"
              ? { ...blueprint.providers, background: { ...blueprint.providers.background, workflow: { ...blueprint.providers.background.workflow, enabled: selected, scheduleEnabled: selected ? blueprint.providers.background.workflow.scheduleEnabled : false } } }
            : pack.id === "capability.durable-objects"
              ? { ...blueprint.providers, background: { ...blueprint.providers.background, realtime: { enabled: selected } } }
            : blueprint.providers,
      };
    });
  const setStorageProvider = (provider: StoragePolicy["provider"]) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: {
        ...blueprint.providers,
        storage: { ...blueprint.providers.storage, provider },
      },
      selections: {
        ...blueprint.selections,
        capabilities: blueprint.selections.capabilities.map((selection) =>
          selection.id === "capability.object-storage"
            ? {
                ...selection,
                lifecycle: selectLifecycle(
                  selection.lifecycle,
                  provider !== "none",
                ),
              }
            : selection,
        ),
      },
    }));
  const setAntiAbuseProvider = (provider: AntiAbusePolicy["provider"]) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: {
        ...blueprint.providers,
        antiAbuse: { ...blueprint.providers.antiAbuse, provider },
      },
      selections: {
        ...blueprint.selections,
        capabilities: blueprint.selections.capabilities.map((selection) =>
          selection.id === "capability.turnstile"
            ? {
                ...selection,
                lifecycle: selectLifecycle(
                  selection.lifecycle,
                  provider === "turnstile",
                ),
              }
            : selection,
        ),
      },
    }));
  const setAiProvider = (provider: AiPolicy["provider"]) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: {
        ...blueprint.providers,
        ai: { ...blueprint.providers.ai, provider },
      },
      selections: {
        ...blueprint.selections,
        capabilities: blueprint.selections.capabilities.map((selection) =>
          selection.id === "capability.workers-ai"
            ? {
                ...selection,
                lifecycle: selectLifecycle(
                  selection.lifecycle,
                  provider === "workers-ai",
                ),
              }
            : selection,
        ),
      },
    }));
  const setSearchProvider = (provider: SearchPolicy["provider"]) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: {
        ...blueprint.providers,
        search: { ...blueprint.providers.search, provider },
      },
      selections: {
        ...blueprint.selections,
        capabilities: blueprint.selections.capabilities.map((selection) =>
          selection.id === "capability.vectorize"
            ? { ...selection, lifecycle: selectLifecycle(selection.lifecycle, provider === "vectorize") }
            : selection,
        ),
      },
    }));
  const setPushProvider = (provider: PushPolicy["provider"]) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: { ...blueprint.providers, push: { ...blueprint.providers.push, provider } },
      selections: {
        ...blueprint.selections,
        capabilities: blueprint.selections.capabilities.map((selection) =>
          selection.id === "capability.expo-push"
            ? { ...selection, lifecycle: selectLifecycle(selection.lifecycle, provider === "expo-push") }
            : selection,
        ),
      },
    }));
  const setSmsProvider = (provider: SmsPolicy["provider"]) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: { ...blueprint.providers, sms: { ...blueprint.providers.sms, provider } },
      selections: {
        ...blueprint.selections,
        capabilities: blueprint.selections.capabilities.map((selection) =>
          selection.id === "capability.twilio-sms"
            ? { ...selection, lifecycle: selectLifecycle(selection.lifecycle, provider === "twilio") }
            : selection,
        ),
      },
    }));
  const setImagesProvider = (provider: MediaPolicy["images"]["provider"]) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: { ...blueprint.providers, media: { ...blueprint.providers.media, images: { ...blueprint.providers.media.images, provider } } },
      selections: {
        ...blueprint.selections,
        capabilities: blueprint.selections.capabilities.map((selection) =>
          selection.id === "capability.cloudflare-images"
            ? { ...selection, lifecycle: selectLifecycle(selection.lifecycle, provider === "cloudflare-images") }
            : selection,
        ),
      },
    }));
  const setStreamProvider = (provider: MediaPolicy["stream"]["provider"]) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: { ...blueprint.providers, media: { ...blueprint.providers.media, stream: { ...blueprint.providers.media.stream, provider } } },
      selections: {
        ...blueprint.selections,
        capabilities: blueprint.selections.capabilities.map((selection) => selection.id === "capability.cloudflare-stream" ? { ...selection, lifecycle: selectLifecycle(selection.lifecycle, provider === "cloudflare-stream") } : selection),
      },
    }));
  const setCronEnabled = (enabled: boolean) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: { ...blueprint.providers, background: { ...blueprint.providers.background, cron: { ...blueprint.providers.background.cron, enabled } } },
      selections: { ...blueprint.selections, capabilities: blueprint.selections.capabilities.map((selection) => selection.id === "capability.cron" ? { ...selection, lifecycle: selectLifecycle(selection.lifecycle, enabled) } : selection) },
    }));
  const setWorkflowsEnabled = (enabled: boolean) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: { ...blueprint.providers, background: { ...blueprint.providers.background, workflow: { ...blueprint.providers.background.workflow, enabled, scheduleEnabled: enabled ? blueprint.providers.background.workflow.scheduleEnabled : false } } },
      selections: { ...blueprint.selections, capabilities: blueprint.selections.capabilities.map((selection) => selection.id === "capability.workflows" ? { ...selection, lifecycle: selectLifecycle(selection.lifecycle, enabled) } : selection) },
    }));
  const setRealtimeEnabled = (enabled: boolean) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      providers: { ...blueprint.providers, background: { ...blueprint.providers.background, realtime: { enabled } } },
      selections: { ...blueprint.selections, capabilities: blueprint.selections.capabilities.map((selection) => selection.id === "capability.durable-objects" ? { ...selection, lifecycle: selectLifecycle(selection.lifecycle, enabled) } : selection) },
    }));
  const setDesignProfile = (profile: DesignProfile) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      designProfile: { id: profile.id, version: profile.version },
      selections: {
        ...blueprint.selections,
        design: blueprint.selections.design.map((selection) => ({
          ...selection,
          lifecycle: selectLifecycle(
            selection.lifecycle,
            selection.id === profile.packId,
          ),
        })),
      },
    }));
  const setVisualIntegrationEnabled = (enabled: boolean) =>
    updateBlueprint((blueprint) => ({
      ...blueprint,
      preset: "custom",
      visualIntegration: {
        ...blueprint.visualIntegration,
        enabled,
        status: enabled ? "unavailable" : "disabled",
        warnings: enabled
          ? ["Visual is external and optional; Starter baseline remains active until a compatible receipt is verified."]
          : [],
      },
    }));
  const setPageSelected = (page: PageDefinition, selected: boolean) =>
    updateBlueprint((blueprint) => {
      const pageIds = new Set(blueprint.pageSet.selected);
      if (selected || page.required) pageIds.add(page.id);
      else pageIds.delete(page.id);
      const backingPack = payload.catalog.packs.find(
        ({ id }) => id === page.packId,
      );
      if (!backingPack) return blueprint;
      const backingGroup = groupForKind[backingPack.kind];
      const pagesInPack = payload.pageCatalog.pages
        .filter(({ packId }) => packId === page.packId)
        .map(({ id }) => id);
      const packSelected =
        requiredPacks.has(page.packId) ||
        pagesInPack.some((id) => pageIds.has(id));
      const backingSelections = blueprint.selections[backingGroup].map(
        (selection) =>
          selection.id === page.packId
            ? {
                ...selection,
                lifecycle: selectLifecycle(selection.lifecycle, packSelected),
              }
            : selection,
      );
      return {
        ...blueprint,
        preset: requiredPacks.has(page.packId) ? blueprint.preset : "custom",
        pageSet: { selected: [...pageIds] },
        selections: {
          ...blueprint.selections,
          [backingGroup]: backingSelections,
        },
      };
    });
  const applyPreset = (preset: Preset) =>
    updateBlueprint((blueprint) => {
      const presetSelections = new Set(preset.selections);
      const selections = structuredClone(blueprint.selections);
      for (const group of ["pages", "saas"] as const) {
        selections[group] = selections[group].map((selection) => {
          const selected =
            requiredPacks.has(selection.id) ||
            presetSelections.has(selection.id);
          if (selected === selection.lifecycle.selected) return selection;
          return {
            ...selection,
            lifecycle: selectLifecycle(selection.lifecycle, selected),
          };
        });
      }
      const selectedPagePacks = new Set(
        selections.pages
          .filter(({ lifecycle }) => lifecycle.selected)
          .map(({ id }) => id),
      );
      const selectedPages = blueprint.pageSet.selected.filter((pageId) => {
        const page = payload.pageCatalog.pages.find(({ id }) => id === pageId);
        return Boolean(
          page?.required || (page && selectedPagePacks.has(page.packId)),
        );
      });
      return {
        ...blueprint,
        preset: preset.id,
        pageSet: { selected: selectedPages },
        selections,
      };
    });
  const packsFor = (kind: Pack["kind"]) =>
    payload.catalog.packs.filter((pack) => pack.kind === kind);
  const selectionFor = (pack: Pack) =>
    payload.blueprint.selections[groupForKind[pack.kind]].find(
      ({ id }) => id === pack.id,
    )!;

  const save = async ({
    finish = false,
    nextStepIndex,
  }: {
    finish?: boolean;
    nextStepIndex?: number;
  } = {}) => {
    setSaveState("saving");
    setSaveError("");
    sessionStorage.setItem("starter.setup.savePending", "true");
    const targetStepIndex = nextStepIndex ?? stepIndex;
    const completedSteps = steps
      .slice(0, finish ? -1 : Math.min(steps.length - 1, Math.max(stepIndex + 1, targetStepIndex)))
      .map(({ id }) => id);
    const blueprint: Blueprint = {
      ...payload.blueprint,
      status: finish ? "ready" : "draft",
      setup: {
        ...payload.blueprint.setup,
        status: finish ? "ready" : "in-progress",
        currentStep: finish ? "review" : steps[targetStepIndex].id,
        completedSteps,
      },
    };
    try {
      const response = await fetch("/__starter/setup", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          blueprint,
          config: payload.config,
          providerSecrets,
          cfpgCommands,
        }),
      });
      const result = (await response.json()) as SetupPayload & {
        error?: string;
        failures?: string[];
      };
      if (!response.ok)
        throw new Error(
          [result.error, ...(result.failures || [])].filter(Boolean).join(" "),
        );
      setPayload({
        ...result,
        blueprint: hydrateSelections(result.blueprint, result.catalog.packs),
      });
      setProviderSecrets({});
      setCfpgCommands({
        development: result.blueprint.providers.database.cfpg?.development?.connectCommand || "",
        production: result.blueprint.providers.database.cfpg?.production?.connectCommand || "",
      });
      setDirty(false);
      setSaveState("saved");
      sessionStorage.removeItem("starter.setup.savePending");
      sessionStorage.setItem("starter.setup.saved", finish ? "complete" : "draft");
      window.setTimeout(
        () => sessionStorage.removeItem("starter.setup.saved"),
        2000,
      );
      if (nextStepIndex !== undefined) {
        setStepIndex(nextStepIndex);
        window.requestAnimationFrame(() =>
          document
            .querySelector(".setup-main > header")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      }
      return true;
    } catch (error) {
      setSaveState("idle");
      sessionStorage.removeItem("starter.setup.savePending");
      setSaveError(error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  const generateProject = async () => {
    if (!(await save({ finish: true }))) return;
    setGeneration({ status: "generating", message: "Creating the independent project and AI handoff…" });
    try {
      const response = await fetch("/__starter/factory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: payload.blueprint.project.name, slug: payload.blueprint.project.slug }),
      });
      const result = (await response.json()) as { error?: string; target?: string; archive?: string };
      if (!response.ok) throw new Error(result.error || "Project generation failed.");
      setGeneration({ status: "done", message: result.archive ? `Independent project and package generated: ${result.archive}` : "Independent project generated.", target: result.target });
    } catch (error) {
      setGeneration({ status: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="setup-shell">
      <header className="setup-header">
        <a href="/">{payload.blueprint.project.name}</a>
        <span>{__STARTER_FACTORY_MODE__ ? "Starter Factory" : "Local project setup"}</span>
        <div className="setup-header-actions">
          <span className={`setup-save-state ${dirty ? "unsaved" : saveState}`} role="status">
            {saveState === "saving"
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : saveState === "saved"
                  ? "Saved"
                  : "No changes"}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saveState === "saving" || !dirty}
            onClick={() => void save()}
          >
            <Save size={15} />
            Save draft
          </Button>
          <a href="/dp">View plan</a>
        </div>
      </header>
      <div className="setup-layout">
        <aside className="setup-steps">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={
                index === stepIndex
                  ? "active"
                  : index < stepIndex
                    ? "complete"
                    : ""
              }
              onClick={() => setStepIndex(index)}
            >
              <span>{index < stepIndex ? <Check size={13} /> : index + 1}</span>
              {step.label}
            </button>
          ))}
        </aside>
        <main className="setup-main">
          <header>
            <p>
              {stepIndex + 1} of {steps.length}
            </p>
            <h1>{currentStep.label}</h1>
          </header>

          {currentStep.id === "identity" ? (
            <div className="setup-stack">
              <section className="setup-panel">
                <h2>Product identity</h2>
                <p>
                  These values become the shared identity used by AI, packages,
                  mobile, and release tooling.
                </p>
                <div className="setup-fields">
                  <Field
                    label="Product name"
                    value={payload.blueprint.project.name}
                    onChange={(value) => updateIdentity("name", value)}
                  />
                  <Field
                    label="Project slug"
                    value={payload.blueprint.project.slug}
                    onChange={(value) => updateIdentity("slug", value)}
                    helper="Lowercase letters, numbers, and hyphens."
                  />
                </div>
                <label className="setup-field">
                  <span>Product brief</span>
                  <textarea
                    value={payload.blueprint.project.brief}
                    onChange={(event) =>
                      updateBlueprint((blueprint) => ({
                        ...blueprint,
                        project: {
                          ...blueprint.project,
                          brief: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <div className="platform-options">
                  {["desktop-web", "mobile-web", "ios", "android"].map(
                    (platform) => (
                      <label key={platform}>
                        <input
                          type="checkbox"
                          checked={payload.blueprint.project.platforms.includes(
                            platform,
                          )}
                          onChange={(event) =>
                            updateBlueprint((blueprint) => ({
                              ...blueprint,
                              project: {
                                ...blueprint.project,
                                platforms: event.target.checked
                                  ? [...blueprint.project.platforms, platform]
                                  : blueprint.project.platforms.filter(
                                      (item) => item !== platform,
                                    ),
                              },
                            }))
                          }
                        />
                        {platform}
                      </label>
                    ),
                  )}
                </div>
              </section>
              <section className="setup-panel">
                <h2>Product intent</h2>
                <p>
                  AI uses this contract to propose product modules. It is not
                  marketing copy and should name the real users, owned objects,
                  tenancy, and charging model.
                </p>
                <label className="setup-field">
                  <span>What does this SaaS do?</span>
                  <textarea
                    value={payload.blueprint.productIntent.summary}
                    onChange={(event) =>
                      updateBlueprint((blueprint) => ({
                        ...blueprint,
                        productIntent: {
                          ...blueprint.productIntent,
                          summary: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <div className="setup-fields">
                  <Field
                    label="Who uses it?"
                    value={listValue(payload.blueprint.productIntent.audiences)}
                    onChange={(value) =>
                      updateBlueprint((blueprint) => ({
                        ...blueprint,
                        productIntent: {
                          ...blueprint.productIntent,
                          audiences: parseList(value),
                        },
                      }))
                    }
                    helper="Comma-separated user groups."
                  />
                  <Field
                    label="Core product objects"
                    value={listValue(
                      payload.blueprint.productIntent.coreObjects,
                    )}
                    onChange={(value) =>
                      updateBlueprint((blueprint) => ({
                        ...blueprint,
                        productIntent: {
                          ...blueprint.productIntent,
                          coreObjects: parseList(value),
                        },
                      }))
                    }
                    helper="Comma-separated nouns owned by the product."
                  />
                  <label className="setup-field">
                    <span>Tenant model</span>
                    <select
                      value={payload.blueprint.productIntent.tenantModel}
                      onChange={(event) =>
                        updateBlueprint((blueprint) => ({
                          ...blueprint,
                          productIntent: {
                            ...blueprint.productIntent,
                            tenantModel: event.target
                              .value as Blueprint["productIntent"]["tenantModel"],
                          },
                        }))
                      }
                    >
                      <option value="personal">Personal</option>
                      <option value="organization">Organization</option>
                      <option value="hybrid">Personal + organization</option>
                    </select>
                  </label>
                  <label className="setup-field">
                    <span>Charging model</span>
                    <select
                      value={payload.blueprint.productIntent.chargingModel}
                      onChange={(event) =>
                        updateBlueprint((blueprint) => ({
                          ...blueprint,
                          productIntent: {
                            ...blueprint.productIntent,
                            chargingModel: event.target
                              .value as Blueprint["productIntent"]["chargingModel"],
                          },
                        }))
                      }
                    >
                      <option value="free">Free</option>
                      <option value="one-time">One-time</option>
                      <option value="subscription-user">
                        Subscription per user
                      </option>
                      <option value="subscription-organization">
                        Subscription per organization
                      </option>
                      <option value="usage">Usage based</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </label>
                </div>
              </section>
              <section className="setup-panel">
                <div className="panel-title">
                  <div>
                    <h2>Development and Production</h2>
                    <p>
                      Keep the two Workers, domains, databases, and Hyperdrive
                      identities separate.
                    </p>
                  </div>
                  <Button variant="outline" onClick={applySafeDefaults}>
                    Generate from slug
                  </Button>
                </div>
                <div className="environment-fields">
                  <div>
                    <h3>Development</h3>
                    <Field
                      label="Worker"
                      value={payload.config.development.worker}
                      onChange={(value) =>
                        updateConfig((config) => ({
                          ...config,
                          development: { ...config.development, worker: value },
                        }))
                      }
                    />
                    <Field
                      label="Domain"
                      value={payload.config.development.domain}
                      onChange={(value) =>
                        updateConfig((config) => ({
                          ...config,
                          development: { ...config.development, domain: value },
                        }))
                      }
                    />
                    <Field
                      label="Database"
                      value={payload.config.development.database.database}
                      onChange={(value) =>
                        updateConfig((config) => ({
                          ...config,
                          development: {
                            ...config.development,
                            database: {
                              ...config.development.database,
                              database: value,
                              user: value,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <h3>Production</h3>
                    <Field
                      label="Worker"
                      value={payload.config.production.worker}
                      onChange={(value) =>
                        updateConfig((config) => ({
                          ...config,
                          production: { ...config.production, worker: value },
                        }))
                      }
                    />
                    <Field
                      label="Domain"
                      value={payload.config.production.domain}
                      onChange={(value) =>
                        updateConfig((config) => ({
                          ...config,
                          production: { ...config.production, domain: value },
                        }))
                      }
                    />
                    <Field
                      label="Database"
                      value={payload.config.production.database.database}
                      onChange={(value) =>
                        updateConfig((config) => ({
                          ...config,
                          production: {
                            ...config.production,
                            database: {
                              ...config.production.database,
                              database: value,
                              user: value,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {currentStep.id === "design" ? (
            <div className="setup-stack">
              <section className="setup-panel">
                <h2>Starter baseline visual system</h2>
                <p>
                  Starter keeps one restrained fallback so every generated product
                  remains usable before independent visual design is connected.
                  Product behavior never depends on the external service.
                </p>
                <div className="stylekit-pinned">
                  <strong>
                    Locked choice: {payload.stylekitSnapshot.style.name} /{" "}
                    {payload.blueprint.stylekit.slug}
                  </strong>
                  <small>
                    Baseline {payload.stylekitSnapshot.snapshotVersion} ·{" "}
                    {payload.blueprint.stylekit.snapshotHash.slice(0, 12)}…
                  </small>
                </div>
                <p className="stylekit-materialization-note">
                  This baseline is intentionally fixed and lightweight. It keeps Setup,
                  authentication, product, Admin and Docs usable without an external
                  visual service. Later visual direction belongs to the independent plugin.
                </p>
              </section>
              <section className="setup-panel">
                <div className="panel-title">
                  <div>
                    <h2>AI visual design</h2>
                    <p>
                      Connect the independent visual-design plugin after project creation.
                      Starter keeps its functional baseline when the plugin is not installed or its service is unavailable.
                    </p>
                  </div>
                  <small>{payload.blueprint.visualIntegration.enabled ? "recommended" : "disabled"}</small>
                </div>
                <label className={payload.blueprint.visualIntegration.enabled ? "pack-choice selected" : "pack-choice"}>
                  <input type="checkbox" checked={payload.blueprint.visualIntegration.enabled} onChange={(event) => setVisualIntegrationEnabled(event.target.checked)} />
                  <span className="pack-choice-main">
                    <span><strong>Prepare this project for independent visual intelligence</strong><small>Optional</small></span>
                    <p>Records the compatible plugin and Visual Receipt contract without bundling an external catalog or runtime.</p>
                    <small>{payload.blueprint.visualIntegration.contractVersion} / {payload.blueprint.visualIntegration.status} / Starter baseline fallback</small>
                  </span>
                  <span className="pack-check"><Check size={15} /></span>
                </label>
                {payload.blueprint.visualIntegration.enabled ? (
                  <div className="provider-secret-actions">
                    <Button type="button" size="sm" variant="outline" disabled={visualTest.status === "testing"} onClick={() => void runVisualDiscoveryTest()}>
                      {visualTest.status === "testing" ? "Checking visual service" : "Check visual service"}
                    </Button>
                    <small>This checks only capability discovery. It does not send project source, install a plugin, apply a profile, or call MCP tools.</small>
                  </div>
                ) : null}
                {visualTest.message ? <p className={visualTest.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">{visualTest.message}</p> : null}
                <p className="stylekit-materialization-note">
                  Project creation never waits for the external service. A resolved visual profile becomes active only after a compatible receipt and local materialization checks pass.
                </p>
              </section>
            </div>
          ) : null}
          {currentStep.id === "pages" ? (
            <div className="setup-stack">
              <section className="setup-panel">
                <h2>Owned Page Catalog</h2>
                <p>{payload.pageCatalog.policy}</p>
              </section>
              {[
                ...new Set(payload.pageCatalog.pages.map(({ group }) => group)),
              ].map((group) => (
                <section className="setup-panel" key={group}>
                  <div className="panel-title">
                    <div>
                      <h2>{group}</h2>
                      <p>
                        Select routes, not a monolithic theme. Required product
                        surfaces stay enabled.
                      </p>
                    </div>
                    <small>
                      {
                        payload.pageCatalog.pages.filter(
                          (page) =>
                            page.group === group &&
                            selectedPages.includes(page.id),
                        ).length
                      }{" "}
                      selected
                    </small>
                  </div>
                  <div className="pack-grid">
                    {payload.pageCatalog.pages
                      .filter((page) => page.group === group)
                      .map((page) => (
                        <PageChoice
                          key={page.id}
                          page={page}
                          selected={selectedPages.includes(page.id)}
                          onChange={(selected) =>
                            setPageSelected(page, selected)
                          }
                        />
                      ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
          {currentStep.id === "saas" ? (
            <div className="setup-stack">
              <section className="setup-panel">
                <div className="panel-title">
                  <div>
                    <h2>Intent-derived module proposal</h2>
                    <p>
                      This is derived from the Product step. It shows
                      consequences before materialization and never selects a
                      planned pack.
                    </p>
                  </div>
                  {intentProposal.length ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        intentProposal.forEach(({ id }) => {
                          const pack = payload.catalog.packs.find(
                            (candidate) => candidate.id === id,
                          );
                          if (pack) setPackSelected(pack, true);
                        })
                      }
                    >
                      Apply proposal
                    </Button>
                  ) : null}
                </div>
                {intentProposal.length ? (
                  <div className="review-contracts">
                    {intentProposal.map(({ id, reason }) => (
                      <article key={id}>
                        <div>
                          <strong>{id}</strong>
                          <small>
                            {payload.catalog.packs.find(
                              (pack) => pack.id === id,
                            )?.status || "missing"}
                          </small>
                        </div>
                        <p>{reason}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="setup-empty">
                    Personal, free products need no additional SaaS pack by
                    default. Product-specific modules are still selected below.
                  </p>
                )}
                <p className="setup-field-help">
                  Source coverage: {payload.saasSources.sources.length} pinned
                  donors and {payload.saasCapabilities.capabilities.length}{" "}
                  named SaaS capabilities. Planned capabilities remain visible
                  in /dp, not selectable here.
                </p>
              </section>
              <section className="setup-panel preset-selector">
                <label>
                  <span>Starting preset</span>
                  <select
                    value={payload.blueprint.preset}
                    onChange={(event) => {
                      const preset = payload.catalog.presets.find(
                        ({ id }) => id === event.target.value,
                      );
                      if (preset) applyPreset(preset);
                    }}
                  >
                    {payload.catalog.presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {
                    payload.catalog.presets.find(
                      ({ id }) => id === payload.blueprint.preset,
                    )?.description
                  }
                </p>
              </section>
              <div className="pack-grid">
                {packsFor("saas").map((pack) => (
                  <PackChoice
                    key={pack.id}
                    pack={pack}
                    selection={selectionFor(pack)}
                    type="checkbox"
                    onChange={(selected) => setPackSelected(pack, selected)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {currentStep.id === "capabilities" ? (
            <div className="pack-grid">
              {packsFor("capability").map((pack) => (
                <PackChoice
                  key={pack.id}
                  pack={pack}
                  selection={selectionFor(pack)}
                  type="checkbox"
                  onChange={(selected) => setPackSelected(pack, selected)}
                />
              ))}
            </div>
          ) : null}

          {currentStep.id === "providers" ? (
            <div className="setup-stack provider-setup">
              <section className="setup-panel provider-summary">
                <div><span>Authentication</span><strong>{payload.blueprint.providers.auth}</strong><small>Better Auth core and selected official plugins</small></div>
                <div><span>Database</span><strong>Development {databaseTransport(payload.blueprint.providers.database, "development") === "cfpg" ? "All2CF connector" : "Native PostgreSQL"}</strong><small>Production {databaseTransport(payload.blueprint.providers.database, "production") === "cfpg" ? "All2CF connector" : "Native PostgreSQL"} / {payload.blueprint.providers.database.access}</small></div>
                <div><span>Billing</span><strong>{payload.blueprint.providers.billing}</strong><small>Activated only when the Billing pack is materialized</small></div>
              </section>

              <section className="setup-panel provider-section">
                <header><h2>PostgreSQL</h2><p>Application code always uses the native pg contract. Choose SQL-first or Drizzle for product-domain code. Hyperdrive is native; the optional All2CF adapter only changes how the Worker connects.</p></header>
                <div className="storage-provider-options" role="group" aria-label="Product data layer">
                  {(["sql-first", "drizzle"] as const).map((access) => <button type="button" key={access} aria-pressed={payload.blueprint.providers.database.access === access} onClick={() => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, database: { ...blueprint.providers.database, access } }, selections: { ...blueprint.selections, capabilities: blueprint.selections.capabilities.map((selection) => selection.id === "capability.data-layer-drizzle" ? { ...selection, lifecycle: { ...selection.lifecycle, selected: access === "drizzle", ...(access === "drizzle" ? {} : { localVerified: false, developmentVerified: false, productionReleased: false }) } } : selection) } }))}><strong>{access === "sql-first" ? "SQL" : "Drizzle"}</strong><span>{access === "sql-first" ? "Smallest and AI-first." : "Typed product-domain schema over the same pg connection."}</span></button>)}
                </div>
                <div className="storage-environment-grid">
                  {(["development", "production"] as const).map((environment) => (
                    <div key={environment}>
                      <h3>{environment === "development" ? "Development" : "Production"}</h3>
                      <div className="provider-option-grid" role="radiogroup" aria-label={`${environment} database runtime`}>
                        {[
                          { id: "native-postgresql", name: "Native PostgreSQL", note: "PostgreSQL through this environment's isolated Hyperdrive binding." },
                          { id: "cfpg", name: "All2CF database connector", note: "Optional @all2cf/database-connect adapter. The external database remains owned and managed by All2CF Database." },
                        ].map(({ id, name, note }) => {
                          const selected = databaseTransport(payload.blueprint.providers.database, environment) === id;
                          return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name={`database-provider-${environment}`} checked={selected} onChange={() => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, database: { ...blueprint.providers.database, transports: { development: databaseTransport(blueprint.providers.database, "development"), production: databaseTransport(blueprint.providers.database, "production"), [environment]: id as DatabasePolicy["provider"] } } } }))} /><span><strong>{name}</strong><small>{note}</small></span></label></div>;
                        })}
                      </div>
                      {databaseTransport(payload.blueprint.providers.database, environment) === "cfpg" ? <label className="setup-field"><span>All2CF connector command</span><Input type="text" autoComplete="off" value={cfpgCommands[environment]} placeholder="npx @all2cf/database-connect@0.2.0-rc.2 db_..." onChange={(event) => updateCfpgCommand(environment, event.target.value)} /><small>{payload.blueprint.providers.database.cfpg?.[environment]?.databaseId || (cfpgCommands[environment] ? "Save to validate this connector command." : "Configure later; this environment cannot be materialized until provided.")}</small></label> : null}
                    </div>
                  ))}
                </div>
                <p>Each environment is independent. Saving validates the supplied connector descriptor; it never creates, migrates, upgrades or manages the external database. If both environments use the connector, they require different database IDs.</p>
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Object storage</h2><p>Keep file bytes outside PostgreSQL. None adds no runtime; R2 uses a native Worker Binding and local simulation; S3-compatible adds its SDK only when selected.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Object storage Provider">
                  {[
                    { id: "none", name: "None", note: "No upload API, storage dependency, bucket or Binding." },
                    { id: "cloudflare-r2", name: "Cloudflare R2", note: "Recommended: local R2 simulation plus isolated cloud buckets." },
                    { id: "s3-compatible", name: "S3-compatible", note: "AWS S3, MinIO, R2 S3 API, Backblaze or Wasabi." },
                  ].map(({ id, name, note }) => {
                    const selected = payload.blueprint.providers.storage.provider === id;
                    return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="storage-provider" checked={selected} onChange={() => setStorageProvider(id as StoragePolicy["provider"])} /><span><strong>{name}</strong><small>{note}</small></span></label></div>;
                  })}
                </div>
                {payload.blueprint.providers.storage.provider !== "none" ? (
                  <div className="storage-provider-config">
                    <div className="setup-fields">
                      <label className="setup-field"><span>Default access</span><select value={payload.blueprint.providers.storage.access} onChange={(event) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, storage: { ...blueprint.providers.storage, access: event.target.value as StoragePolicy["access"] } } }))}><option value="private">Private</option><option value="public">Public through authorized Worker route</option></select></label>
                      <label className="setup-field"><span>Maximum upload</span><select value={payload.blueprint.providers.storage.maxUploadBytes} onChange={(event) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, storage: { ...blueprint.providers.storage, maxUploadBytes: Number(event.target.value) } } }))}><option value={1_048_576}>1 MiB</option><option value={5_242_880}>5 MiB</option><option value={10_485_760}>10 MiB</option></select></label>
                    </div>
                    <div className="storage-environment-grid">
                      {(["development", "production"] as const).map((environment) => {
                        const value = payload.blueprint.providers.storage[environment];
                        const update = (patch: Partial<StorageEnvironment>) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, storage: { ...blueprint.providers.storage, [environment]: { ...blueprint.providers.storage[environment], ...patch } } } }));
                        return <div key={environment}><h3>{environment === "development" ? "Development" : "Production"}</h3><Field label="Bucket" value={value.bucket} onChange={(bucket) => update({ bucket })} /><Field label="Public domain (optional)" value={value.publicDomain} onChange={(publicDomain) => update({ publicDomain })} />{payload.blueprint.providers.storage.provider === "s3-compatible" ? <><Field label="S3 endpoint" value={value.s3Endpoint} onChange={(s3Endpoint) => update({ s3Endpoint })} /><Field label="Region" value={value.s3Region} onChange={(s3Region) => update({ s3Region })} /><label className="platform-option"><input type="checkbox" checked={value.s3ForcePathStyle} onChange={(event) => update({ s3ForcePathStyle: event.target.checked })} />Force path-style URLs</label></> : <p>Local Worker development uses an empty simulated R2 bucket; cloud provisioning creates this environment's real bucket.</p>}</div>;
                      })}
                    </div>
                    {payload.blueprint.providers.storage.provider === "s3-compatible" ? <ProviderCredentialEditor provider="s3-compatible" state={payload.providerCredentials["s3-compatible"]} editing={Boolean(providerEditors["s3-compatible"])} values={providerSecrets} onEditing={(editing) => setProviderEditing("s3-compatible", editing)} onChange={updateProviderSecret} /> : <div className="provider-resource-links"><a href="https://dash.cloudflare.com/?to=/:account/r2/overview" target="_blank" rel="noreferrer">Open Cloudflare R2<ExternalLink size={14} /></a><a href="https://developers.cloudflare.com/r2/" target="_blank" rel="noreferrer">R2 documentation<ExternalLink size={14} /></a></div>}
                  </div>
                ) : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Anti-abuse</h2><p>Turnstile protects credential registration, sign-in and password reset through the official Better Auth Captcha plugin. The browser widget and server-side Siteverify are both mandatory.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Anti-abuse Provider">
                  {[
                    { id: "none", name: "None", note: "No challenge Provider. Better Auth rate limits still apply." },
                    { id: "turnstile", name: "Cloudflare Turnstile", note: "Recommended for public credential flows; no puzzle for most legitimate users." },
                  ].map(({ id, name, note }) => {
                    const selected = payload.blueprint.providers.antiAbuse.provider === id;
                    return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="anti-abuse-provider" checked={selected} onChange={() => setAntiAbuseProvider(id as AntiAbusePolicy["provider"])} /><span><strong>{name}</strong><small>{note}</small></span></label></div>;
                  })}
                </div>
                {payload.blueprint.providers.antiAbuse.provider === "turnstile" ? (
                  <div className="storage-provider-config">
                    <div className="storage-environment-grid">
                      {(["development", "production"] as const).map((environment) => (
                        <div key={environment}>
                          <h3>{environment === "development" ? "Development widget" : "Production widget"}</h3>
                          <Field
                            label="Public site key"
                            value={payload.blueprint.providers.antiAbuse[environment].siteKey}
                            onChange={(siteKey) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, antiAbuse: { ...blueprint.providers.antiAbuse, [environment]: { siteKey } } } }))}
                          />
                          <p>Use a different widget and hostname allowlist for this environment.</p>
                        </div>
                      ))}
                    </div>
                    <ProviderCredentialEditor provider="turnstile" state={payload.providerCredentials.turnstile} editing={Boolean(providerEditors.turnstile)} values={providerSecrets} onEditing={(editing) => setProviderEditing("turnstile", editing)} onChange={updateProviderSecret} />
                    <div className="provider-resource-links">{providerSetupLinks.turnstile.map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}<ExternalLink size={14} /></a>)}</div>
                    {payload.blueprint.providers.antiAbuse.development.siteKey ? <div className="provider-email-test"><div><strong>Real Siteverify test</strong><p>Complete the Development widget, then validate its one-time token with the saved or newly entered Development secret.</p></div><TurnstileChallenge siteKey={payload.blueprint.providers.antiAbuse.development.siteKey} action="starter_setup_test" onToken={(token) => { setTurnstileToken(token); if (token) setTurnstileTest({ status: "idle" }); }} onError={(message) => setTurnstileTest({ status: "error", provider: "turnstile", message })} /><Button type="button" variant="outline" disabled={!turnstileToken || turnstileTest.status === "testing"} onClick={() => void runTurnstileTest()}>{turnstileTest.status === "testing" ? "Validating challenge" : "Validate Turnstile"}</Button>{turnstileTest.message ? <p className={turnstileTest.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">{turnstileTest.message}</p> : null}</div> : <p className="provider-test-unavailable">Enter the Development site key to load the validation widget.</p>}
                    <div className="provider-live-test"><Button asChild type="button" size="sm" variant="outline"><a href={`https://${payload.config.development.domain}/login`} target="_blank" rel="noreferrer">Test protected auth on Development<ExternalLink size={13} /></a></Button><small>After a Development release, this opens the real Better Auth sign-up, sign-in and password-reset enforcement path.</small></div>
                  </div>
                ) : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>AI models and Gateway</h2><p>Workers AI keeps inference inside the Cloudflare runtime. AI Gateway is an optional per-environment overlay for logs, caching, routing and billing; no client API key is exposed.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="AI Provider">
                  {[
                    { id: "none", name: "None", note: "No AI Binding, model traffic or AI runtime code." },
                    { id: "workers-ai", name: "Cloudflare Workers AI", note: "Native AI Binding with an optional AI Gateway ID." },
                  ].map(({ id, name, note }) => {
                    const selected = payload.blueprint.providers.ai.provider === id;
                    return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="ai-provider" checked={selected} onChange={() => setAiProvider(id as AiPolicy["provider"])} /><span><strong>{name}</strong><small>{note}</small></span></label></div>;
                  })}
                </div>
                {payload.blueprint.providers.ai.provider === "workers-ai" ? <div className="storage-provider-config"><div className="storage-environment-grid">{(["development", "production"] as const).map((environment) => { const value = payload.blueprint.providers.ai[environment]; const update = (patch: Partial<AiPolicy[typeof environment]>) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, ai: { ...blueprint.providers.ai, [environment]: { ...blueprint.providers.ai[environment], ...patch } } } })); return <div key={environment}><h3>{environment === "development" ? "Development AI" : "Production AI"}</h3><Field label="Workers AI model" value={value.model} onChange={(model) => update({ model })} /><Field label="AI Gateway ID (optional)" value={value.gatewayId} onChange={(gatewayId) => update({ gatewayId })} /><p>Leave Gateway empty for a direct Binding call. Use an existing Gateway ID or <code>default</code> to let Cloudflare create/use the account default on the first authenticated request.</p></div>; })}</div><div className="provider-resource-links">{providerSetupLinks["workers-ai"].map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}<ExternalLink size={14} /></a>)}</div><div className="provider-email-test"><div><strong>Real Workers AI test</strong><p>Uses the saved Cloudflare account token to call the selected Development model. The prompt is fixed and output is bounded.</p></div><Button type="button" variant="outline" disabled={workersAiTest.status === "testing" || !payload.blueprint.providers.ai.development.model} onClick={() => void runWorkersAiTest()}>{workersAiTest.status === "testing" ? "Running Workers AI" : "Test Development model"}</Button>{workersAiTest.message ? <p className={workersAiTest.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">{workersAiTest.message}</p> : null}</div><div className="provider-live-test"><Button asChild type="button" size="sm" variant="outline"><a href={`https://${payload.config.development.domain}/admin`} target="_blank" rel="noreferrer">Test deployed AI Binding<ExternalLink size={13} /></a></Button><small>The local REST test proves provider access; Development acceptance still requires the deployed Worker Binding and Admin test route.</small></div></div> : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Product search and vector index</h2><p>Use PostgreSQL first for ordinary product search. Select Vectorize only for embedding similarity or RAG; its dimensions and distance metric are immutable after index creation.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Search Provider">
                  {[
                    { id: "none", name: "None", note: "No product-data search index. Registered route search remains available." },
                    { id: "postgresql", name: "PostgreSQL search", note: "Recommended for text/filter search without another Cloudflare resource." },
                    { id: "vectorize", name: "Cloudflare Vectorize", note: "Embedding similarity and RAG with isolated environment indexes." },
                  ].map(({ id, name, note }) => { const selected = payload.blueprint.providers.search.provider === id; return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="search-provider" checked={selected} onChange={() => setSearchProvider(id as SearchPolicy["provider"])} /><span><strong>{name}</strong><small>{note}</small></span></label></div>; })}
                </div>
                {payload.blueprint.providers.search.provider === "vectorize" ? (
                  <div className="storage-provider-config">
                    <div className="storage-environment-grid">
                      {(["development", "production"] as const).map((environment) => {
                        const value = payload.blueprint.providers.search[environment];
                        const update = (patch: Partial<SearchPolicy[typeof environment]>) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, search: { ...blueprint.providers.search, [environment]: { ...blueprint.providers.search[environment], ...patch } } } }));
                        return <div key={environment}><h3>{environment === "development" ? "Development index" : "Production index"}</h3><Field label="Index name" value={value.indexName} onChange={(indexName) => update({ indexName })} /><label className="setup-field"><span>Dimensions</span><Input type="number" min={32} max={1536} value={value.dimensions} onChange={(event) => update({ dimensions: Number(event.target.value) })} /></label><label className="setup-field"><span>Distance metric</span><select value={value.metric} onChange={(event) => update({ metric: event.target.value as SearchPolicy[typeof environment]["metric"] })}><option value="cosine">Cosine</option><option value="euclidean">Euclidean</option><option value="dot-product">Dot product</option></select></label><p>Dimensions must match the chosen embedding model and cannot be changed on an existing index.</p></div>;
                      })}
                    </div>
                    <div className="provider-resource-links">{providerSetupLinks.vectorize.map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}<ExternalLink size={14} /></a>)}</div>
                    <div className="provider-email-test"><div><strong>Real Vectorize round trip</strong><p>Requires the Development index to be provisioned. The test inserts, queries and deletes one generated vector without exposing product data.</p></div><Button type="button" variant="outline" disabled={vectorizeTest.status === "testing"} onClick={() => void runVectorizeTest()}>{vectorizeTest.status === "testing" ? "Testing Vectorize" : "Test Development index"}</Button>{vectorizeTest.message ? <p className={vectorizeTest.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">{vectorizeTest.message}</p> : null}</div>
                  </div>
                ) : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Native push notifications</h2><p>Expo Push is only for native iOS/Android builds. It adds notification permissions, Android channel setup, user-owned device tokens and server delivery; Expo Go is not a physical delivery acceptance target.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Push Provider">
                  {[
                    { id: "none", name: "None", note: "No native notification module, device table or push delivery." },
                    { id: "expo-push", name: "Expo Push", note: "One server API for APNs and FCM through Expo Push Service." },
                  ].map(({ id, name, note }) => { const selected = payload.blueprint.providers.push.provider === id; return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="push-provider" checked={selected} onChange={() => setPushProvider(id as PushPolicy["provider"])} /><span><strong>{name}</strong><small>{note}</small></span></label></div>; })}
                </div>
                {payload.blueprint.providers.push.provider === "expo-push" ? (
                  <div className="storage-provider-config">
                    <div className="storage-environment-grid">
                      {(["development", "production"] as const).map((environment) => <div key={environment}><h3>{environment === "development" ? "Development Expo project" : "Production Expo project"}</h3><Field label="EAS project ID" value={payload.blueprint.providers.push[environment].projectId} onChange={(projectId) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, push: { ...blueprint.providers.push, [environment]: { projectId } } } }))} /><p>Use a different EAS project ID for each environment so device tokens and credentials cannot cross release lanes.</p></div>)}
                    </div>
                    <label className="platform-option"><input type="checkbox" checked={payload.blueprint.providers.push.accessTokenRequired} onChange={(event) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, push: { ...blueprint.providers.push, accessTokenRequired: event.target.checked } } }))} />Require Expo Push access-token security</label>
                    {payload.blueprint.providers.push.accessTokenRequired ? <ProviderCredentialEditor provider="expo-push" state={payload.providerCredentials["expo-push"]} editing={Boolean(providerEditors["expo-push"])} values={providerSecrets} onEditing={(editing) => setProviderEditing("expo-push", editing)} onChange={updateProviderSecret} /> : null}
                    <div className="provider-resource-links">{providerSetupLinks["expo-push"].map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}<ExternalLink size={14} /></a>)}</div>
                    <div className="provider-email-test"><div><strong>Real Development push test</strong><p>Paste an ExpoPushToken from a signed-in physical Development build. Setup sends a fixed message and returns only the Expo ticket ID.</p></div><label><span>Development ExpoPushToken</span><Input value={expoPushToken} autoComplete="off" onChange={(event) => { setExpoPushToken(event.target.value); setExpoPushTest({ status: "idle" }); }} placeholder="ExpoPushToken[...]" /></label><Button type="button" variant="outline" disabled={expoPushTest.status === "testing" || !expoPushToken.trim()} onClick={() => void runExpoPushTest()}>{expoPushTest.status === "testing" ? "Sending push" : "Send Development push"}</Button>{expoPushTest.message ? <p className={expoPushTest.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">{expoPushTest.message}</p> : null}</div>
                  </div>
                ) : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>SMS notifications</h2><p>SMS is an explicit server channel, not a default second factor and not implied by in-app notifications. Twilio credentials, sender numbers, compliance and delivery evidence remain environment-specific.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="SMS Provider">
                  {[
                    { id: "none", name: "None", note: "No SMS provider, secret requirements or delivery ledger." },
                    { id: "twilio", name: "Twilio SMS", note: "Programmable Messaging with API-key authentication and SQL idempotency." },
                  ].map(({ id, name, note }) => { const selected = payload.blueprint.providers.sms.provider === id; return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="sms-provider" checked={selected} onChange={() => setSmsProvider(id as SmsPolicy["provider"])} /><span><strong>{name}</strong><small>{note}</small></span></label></div>; })}
                </div>
                {payload.blueprint.providers.sms.provider === "twilio" ? (
                  <div className="storage-provider-config">
                    <div className="storage-environment-grid">{(["development", "production"] as const).map((environment) => <div key={environment}><h3>{environment === "development" ? "Development Twilio region" : "Production Twilio region"}</h3><Field label="API base URL" value={payload.blueprint.providers.sms[environment].apiBaseUrl} onChange={(apiBaseUrl) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, sms: { ...blueprint.providers.sms, [environment]: { apiBaseUrl } } } }))} /><p>Use <code>https://api.twilio.com</code> or the documented regional base URL. Setup requires HTTPS.</p></div>)}</div>
                    <ProviderCredentialEditor provider="twilio-sms" state={payload.providerCredentials["twilio-sms"]} editing={Boolean(providerEditors["twilio-sms"])} values={providerSecrets} onEditing={(editing) => setProviderEditing("twilio-sms", editing)} onChange={updateProviderSecret} />
                    <div className="provider-resource-links">{providerSetupLinks["twilio-sms"].map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}<ExternalLink size={14} /></a>)}</div>
                    <div className="provider-email-test"><div><strong>Real Development SMS test</strong><p>Twilio receives a fixed message. Setup returns only the provider SID, initial status and recipient last four digits.</p></div><label><span>Test recipient (E.164)</span><Input type="tel" value={smsRecipient} autoComplete="tel" onChange={(event) => { setSmsRecipient(event.target.value); setSmsTest({ status: "idle" }); }} placeholder="+14035551234" /></label><Button type="button" variant="outline" disabled={smsTest.status === "testing" || !smsRecipient.trim()} onClick={() => void runSmsTest()}>{smsTest.status === "testing" ? "Sending SMS" : "Send Development SMS"}</Button>{smsTest.message ? <p className={smsTest.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">{smsTest.message}</p> : null}</div>
                  </div>
                ) : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Image optimization</h2><p>Cloudflare Images transforms raw image bytes inside the Worker. R2 or S3 remains the original-file authority; this Pack adds resize/transcode behavior only.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Image Provider">
                  {[
                    { id: "none", name: "None", note: "Ordinary files still use Object Storage; no image transformation Binding." },
                    { id: "cloudflare-images", name: "Cloudflare Images", note: "Worker-native image info, resize and modern-format output." },
                  ].map(({ id, name, note }) => { const selected = payload.blueprint.providers.media.images.provider === id; return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="images-provider" checked={selected} onChange={() => setImagesProvider(id as MediaPolicy["images"]["provider"])} /><span><strong>{name}</strong><small>{note}</small></span></label></div>; })}
                </div>
                {payload.blueprint.providers.media.images.provider === "cloudflare-images" ? <div className="storage-provider-config"><div className="setup-fields"><label className="setup-field"><span>Maximum input</span><select value={payload.blueprint.providers.media.images.maxInputBytes} onChange={(event) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, media: { ...blueprint.providers.media, images: { ...blueprint.providers.media.images, maxInputBytes: Number(event.target.value) } } } }))}><option value={5_242_880}>5 MiB</option><option value={10_485_760}>10 MiB</option><option value={20_971_520}>20 MiB platform maximum</option></select></label><label className="setup-field"><span>Default output</span><select value={payload.blueprint.providers.media.images.defaultFormat} onChange={(event) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, media: { ...blueprint.providers.media, images: { ...blueprint.providers.media.images, defaultFormat: event.target.value as MediaPolicy["images"]["defaultFormat"] } } } }))}><option value="image/webp">WebP</option><option value="image/avif">AVIF</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></label></div><div className="provider-resource-links">{providerSetupLinks["cloudflare-images"].map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}<ExternalLink size={14} /></a>)}</div><div className="provider-live-test"><Button asChild type="button" size="sm" variant="outline"><a href={`https://${payload.config.development.domain}/admin`} target="_blank" rel="noreferrer">Test Images Binding on Development<ExternalLink size={13} /></a></Button><small>The Pack exposes an Admin-only fixed 2×2 PNG → 1×1 WebP round trip. Local Workerd uses Cloudflare's low-fidelity binding; Development verifies the high-fidelity Binding.</small></div></div> : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Video streaming</h2><p>Cloudflare Stream creates one-time direct upload URLs so clients never receive the API token. This initial Pack supports public playback; private signed playback remains unavailable until signing-token generation is implemented.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Video Provider">{[{ id: "none", name: "None", note: "No video upload, encoding, webhook or playback runtime." }, { id: "cloudflare-stream", name: "Cloudflare Stream", note: "User-owned direct uploads, encoding state and public HLS/DASH playback." }].map(({ id, name, note }) => { const selected = payload.blueprint.providers.media.stream.provider === id; return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="stream-provider" checked={selected} onChange={() => setStreamProvider(id as MediaPolicy["stream"]["provider"])} /><span><strong>{name}</strong><small>{note}</small></span></label></div>; })}</div>
                {payload.blueprint.providers.media.stream.provider === "cloudflare-stream" ? <div className="storage-provider-config"><label className="setup-field"><span>Maximum video duration</span><select value={payload.blueprint.providers.media.stream.maxDurationSeconds} onChange={(event) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, media: { ...blueprint.providers.media, stream: { ...blueprint.providers.media.stream, maxDurationSeconds: Number(event.target.value) } } } }))}><option value={300}>5 minutes</option><option value={600}>10 minutes</option><option value={1800}>30 minutes</option><option value={3600}>1 hour</option></select></label><div className="storage-environment-grid">{(["development", "production"] as const).map((environment) => { const value = payload.blueprint.providers.media.stream[environment]; const update = (patch: Partial<typeof value>) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, media: { ...blueprint.providers.media, stream: { ...blueprint.providers.media.stream, [environment]: { ...blueprint.providers.media.stream[environment], ...patch } } } } })); return <div key={environment}><h3>{environment === "development" ? "Development Stream" : "Production Stream"}</h3><Field label="Account ID" value={value.accountId} onChange={(accountId) => update({ accountId })} /><Field label="Allowed origins" value={value.allowedOrigins.join(", ")} onChange={(origins) => update({ allowedOrigins: parseList(origins) })} /><Field label="API base URL" value={value.apiBaseUrl} onChange={(apiBaseUrl) => update({ apiBaseUrl })} /></div>; })}</div><ProviderCredentialEditor provider="cloudflare-stream" state={payload.providerCredentials["cloudflare-stream"]} editing={Boolean(providerEditors["cloudflare-stream"])} values={providerSecrets} onEditing={(editing) => setProviderEditing("cloudflare-stream", editing)} onChange={updateProviderSecret} /><div className="provider-resource-links">{providerSetupLinks["cloudflare-stream"].map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}<ExternalLink size={14} /></a>)}</div><div className="provider-email-test"><div><strong>Real Stream token test</strong><p>Creates a one-time one-second direct-upload draft and immediately deletes it without uploading media.</p></div><Button type="button" variant="outline" disabled={streamTest.status === "testing"} onClick={() => void runStreamTest()}>{streamTest.status === "testing" ? "Testing Stream" : "Test Development Stream"}</Button>{streamTest.message ? <p className={streamTest.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">{streamTest.message}</p> : null}</div></div> : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Scheduled background work</h2><p>Cron Triggers run in UTC and should start only bounded, idempotent product jobs. The Starter Pack records a heartbeat; copied products register their own work explicitly.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Cron Provider">{[{ id: "none", name: "None", note: "No scheduled handler or deployed Cron Trigger." }, { id: "cron", name: "Cloudflare Cron", note: "Environment-specific schedule with SQL run evidence." }].map(({ id, name, note }) => { const selected = payload.blueprint.providers.background.cron.enabled === (id === "cron"); return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="cron-provider" checked={selected} onChange={() => setCronEnabled(id === "cron")} /><span><strong>{name}</strong><small>{note}</small></span></label></div>; })}</div>
                {payload.blueprint.providers.background.cron.enabled ? <div className="storage-provider-config"><div className="storage-environment-grid">{(["development", "production"] as const).map((environment) => <div key={environment}><h3>{environment === "development" ? "Development schedule" : "Production schedule"}</h3><Field label="UTC Cron expression" value={payload.blueprint.providers.background.cron[environment].expression} onChange={(expression) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, background: { ...blueprint.providers.background, cron: { ...blueprint.providers.background.cron, [environment]: { expression } } } } }))} /><p>The expression is copied exactly to Wrangler and is available as <code>controller.cron</code>.</p></div>)}</div><div className="provider-resource-links"><a href="https://developers.cloudflare.com/workers/configuration/cron-triggers/" target="_blank" rel="noreferrer">Cron Trigger documentation<ExternalLink size={14} /></a></div><div className="provider-live-test"><Button asChild type="button" size="sm" variant="outline"><a href={`https://${payload.config.development.domain}/admin`} target="_blank" rel="noreferrer">View Development Cron evidence<ExternalLink size={13} /></a></Button><small>Local verification invokes Wrangler's scheduled test route and reads the heartbeat; Development release verifies the deployed trigger after propagation.</small></div></div> : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Durable multi-step jobs</h2><p>Cloudflare Workflows persists step results and retries across Worker invocations. Starter installs only a fixed two-step test skeleton; copied products replace its payload and steps.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Workflow Provider">{[{ id: "none", name: "None", note: "No Workflow class, binding, instance API or remote resource." }, { id: "workflows", name: "Cloudflare Workflows", note: "Durable step execution with Admin instance create/status." }].map(({ id, name, note }) => { const selected = payload.blueprint.providers.background.workflow.enabled === (id === "workflows"); return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="workflow-provider" checked={selected} onChange={() => setWorkflowsEnabled(id === "workflows")} /><span><strong>{name}</strong><small>{note}</small></span></label></div>; })}</div>
                {payload.blueprint.providers.background.workflow.enabled ? <div className="storage-provider-config"><label className="platform-option"><input type="checkbox" checked={payload.blueprint.providers.background.workflow.scheduleEnabled} onChange={(event) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, background: { ...blueprint.providers.background, workflow: { ...blueprint.providers.background.workflow, scheduleEnabled: event.target.checked } } } }))} />Create Workflow instances on a schedule</label>{payload.blueprint.providers.background.workflow.scheduleEnabled ? <div className="storage-environment-grid">{(["development", "production"] as const).map((environment) => <div key={environment}><h3>{environment === "development" ? "Development Workflow schedule" : "Production Workflow schedule"}</h3><Field label="UTC Cron expression" value={payload.blueprint.providers.background.workflow[environment].expression} onChange={(expression) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, background: { ...blueprint.providers.background, workflow: { ...blueprint.providers.background.workflow, [environment]: { expression } } } } }))} /></div>)}</div> : null}<div className="provider-resource-links"><a href="https://developers.cloudflare.com/workflows/" target="_blank" rel="noreferrer">Workflows documentation<ExternalLink size={14} /></a></div><div className="provider-live-test"><Button asChild type="button" size="sm" variant="outline"><a href={`https://${payload.config.development.domain}/admin`} target="_blank" rel="noreferrer">Test Workflow on Development<ExternalLink size={13} /></a></Button><small>The Admin test creates a fixed instance and reads status/output. A deselected release removes the binding/class first, then deletes the recorded remote Workflow resource.</small></div></div> : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Realtime rooms</h2><p>Durable Objects keep one strongly consistent SQLite-backed state authority per room. Hibernatable WebSockets preserve client connections while idle without keeping the object billed as active.</p></header>
                <div className="provider-option-grid" role="radiogroup" aria-label="Realtime Provider">{[{ id: "none", name: "None", note: "No Durable Object class, Binding, room route or WebSocket runtime." }, { id: "durable-objects", name: "Durable Objects / WebSockets", note: "Authenticated per-room messages, sequence state and hibernatable sockets." }].map(({ id, name, note }) => { const selected = payload.blueprint.providers.background.realtime.enabled === (id === "durable-objects"); return <div className={selected ? "provider-option selected" : "provider-option"} key={id}><label><input type="radio" name="realtime-provider" checked={selected} onChange={() => setRealtimeEnabled(id === "durable-objects")} /><span><strong>{name}</strong><small>{note}</small></span></label></div>; })}</div>
                {payload.blueprint.providers.background.realtime.enabled ? <div className="storage-provider-config"><div className="provider-resource-links"><a href="https://developers.cloudflare.com/durable-objects/" target="_blank" rel="noreferrer">Durable Objects documentation<ExternalLink size={14} /></a><a href="https://developers.cloudflare.com/durable-objects/best-practices/websockets/" target="_blank" rel="noreferrer">WebSocket hibernation guide<ExternalLink size={14} /></a></div><div className="provider-live-test"><Button asChild type="button" size="sm" variant="outline"><a href={`https://${payload.config.development.domain}/admin`} target="_blank" rel="noreferrer">Test realtime room on Development<ExternalLink size={13} /></a></Button><small>The Admin test opens the real Durable Object socket, sends one bounded message, receives the broadcast and reads persisted sequence state. Deselecting removes access and the Binding but never deletes namespace data automatically.</small></div></div> : null}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Release platforms</h2><p>These credentials belong to build and release tooling, not the deployed product runtime. Cloudflare is required for Web; EAS, Apple and Google are needed only for the corresponding mobile lanes; GitHub is optional automation.</p></header>
                <div className="provider-test-stack">
                  {([
                    { id: "cloudflare-release", name: "Cloudflare Workers", note: "Verifies the active token and exact account without deploying." },
                    { id: "github-release", name: "GitHub", note: "Verifies the token's authenticated GitHub identity without changing a repository." },
                    { id: "expo-eas", name: "Expo / EAS", note: "Verifies that EAS CLI resolves the exact configured project." },
                    { id: "mobile-local-build", name: "Local Android + Mac/Xcode", note: "Verifies the local Android SDK and either local Xcode or an exact-commit connected Mac. EAS remains optional." },
                    { id: "apple-app-store", name: "Apple App Store Connect", note: "Signs a short-lived API JWT and reads the exact configured app." },
                    { id: "google-play", name: "Google Play", note: "Exchanges the service-account JWT and reads the configured Android app's subscriptions surface." },
                  ] satisfies Array<{ id: ReleaseProvider; name: string; note: string }>).map(({ id, name, note }) => {
                    const test = releaseTests[id] || { status: "idle" as const };
                    return <div className="storage-provider-config" key={id}><div><strong>{name}</strong><p>{note}</p></div><ProviderCredentialEditor provider={id} state={payload.providerCredentials[id]} editing={Boolean(providerEditors[id])} values={providerSecrets} onEditing={(editing) => setProviderEditing(id, editing)} onChange={updateProviderSecret} /><div className="provider-email-test"><Button type="button" variant="outline" disabled={test.status === "testing"} onClick={() => void runReleasePlatformTest(id)}>{test.status === "testing" ? `Testing ${name}` : `Test ${name}`}</Button>{test.message ? <p className={test.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">{test.message}</p> : null}</div></div>;
                  })}
                </div>
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Social sign-in</h2><p>Select the providers this project will support. Credentials may be inherited, entered now, or configured later from this local Setup.</p></header>
                <div className="provider-option-grid" role="group" aria-label="Social sign-in providers">
                  {[
                    { id: "google", name: "Google", note: "OAuth redirect flow for Web and Expo.", href: providerSetupLinks.google[0].href },
                    { id: "github", name: "GitHub", note: "OAuth sign-in with verified email access.", href: providerSetupLinks.github[0].href },
                    { id: "apple", name: "Apple", note: "Web redirect and native iOS audience support.", href: providerSetupLinks.apple[0].href },
                  ].map(({ id, name, note, href }) => {
                    const selected = payload.blueprint.providers.socialAuth.includes(id);
                    return <div className={selected ? "provider-option selected" : "provider-option"} key={id}>
                      <label>
                        <input type="checkbox" checked={selected} onChange={(event) => updateBlueprint((blueprint) => {
                          const providers = new Set(blueprint.providers.socialAuth);
                          if (event.target.checked) providers.add(id);
                          else providers.delete(id);
                          return { ...blueprint, providers: { ...blueprint.providers, socialAuth: [...providers] } };
                        })} />
                        <span><strong>{name}</strong><small>{note}</small></span>
                      </label>
                      <a href={href} target="_blank" rel="noreferrer">{name} setup<ExternalLink size={13} /></a>
                    </div>
                  } )}
                </div>
                {payload.blueprint.providers.socialAuth.map((provider) => (
                  <div className="provider-test-stack" key={provider}>
                    <ProviderCredentialEditor
                      provider={provider as "google" | "github" | "apple"}
                      state={payload.providerCredentials[provider as "google" | "github" | "apple"]}
                      editing={Boolean(providerEditors[provider])}
                      values={providerSecrets}
                      onEditing={(editing) => setProviderEditing(provider as "google" | "github" | "apple", editing)}
                      onChange={updateProviderSecret}
                      callbackUrls={[
                        `https://${payload.config.development.domain}/api/auth/callback/${provider}`,
                        `https://${payload.config.production.domain}/api/auth/callback/${provider}`,
                      ]}
                    />
                    <div className="provider-live-test">
                      <Button asChild type="button" size="sm" variant="outline">
                        <a
                          href={`https://${payload.config.development.domain}/login?returnTo=%2Fapp`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Test {provider} sign-in on Development
                          <ExternalLink size={13} />
                        </a>
                      </Button>
                      <small>This opens the real deployed OAuth flow. Saved replacement credentials must be released to Development before this test can validate them.</small>
                    </div>
                  </div>
                ))}
              </section>

              <section className="setup-panel provider-section">
                <header><h2>Authentication email</h2><p>Email verification remains mandatory. Choosing “configure later” defers only credentials and will remain a visible release blocker.</p></header>
                <label className="provider-select">
                  <span>Email provider</span>
                  <select
                    value={payload.blueprint.providers.email.default}
                    onChange={(event) => updateBlueprint((blueprint) => ({ ...blueprint, providers: { ...blueprint.providers, email: { ...blueprint.providers.email, default: event.target.value } } }))}
                  >
                    <option value="cfsend">CFsend</option>
                    <option value="resend">Resend</option>
                    <option value="cloudflare-email-service">Cloudflare Email Service</option>
                  </select>
                </label>
                <ProviderCredentialEditor
                  provider={payload.blueprint.providers.email.default as keyof typeof providerSecretFields}
                  state={payload.providerCredentials[payload.blueprint.providers.email.default as keyof SetupPayload["providerCredentials"]]}
                  editing={Boolean(providerEditors[payload.blueprint.providers.email.default])}
                  values={providerSecrets}
                  onEditing={(editing) => setProviderEditing(payload.blueprint.providers.email.default as keyof typeof providerSecretFields, editing)}
                  onChange={updateProviderSecret}
                />
                {new Set(["cfsend", "resend"]).has(payload.blueprint.providers.email.default) ? (
                  <div className="provider-email-test">
                    <div>
                      <strong>Real delivery test</strong>
                      <p>Send through the same adapter used by authentication email. Entered replacement values are used for this test without being returned by the server.</p>
                    </div>
                    <label>
                      <span>Test recipient</span>
                      <Input
                        type="email"
                        autoComplete="email"
                        value={testRecipient}
                        placeholder="you@example.com"
                        onChange={(event) => {
                          setTestRecipient(event.target.value);
                          setProviderTest({ status: "idle" });
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={providerTest.status === "testing" || !testRecipient.trim()}
                      onClick={() => void runEmailProviderTest()}
                    >
                      {providerTest.status === "testing" ? "Sending test email" : `Send ${payload.blueprint.providers.email.default} test email`}
                    </Button>
                    {providerTest.message ? (
                      <p className={providerTest.status === "success" ? "provider-test-result success" : "provider-test-result error"} role="status">
                        {providerTest.message}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="provider-test-unavailable">Cloudflare Email Service needs its deployed Worker binding and is tested after a Development release.</p>
                )}
              </section>

              <section className="setup-panel provider-section">
                <header>
                  <h2>Stripe Billing</h2>
                  <p>{stripeSelected ? "The Billing pack is selected. Test keys, a signed webhook secret and a real Price ID are required before its Development release." : "The Billing pack is not selected. You may prepare Stripe Test credentials now or configure them later if Billing is added."}</p>
                </header>
                <ProviderCredentialEditor
                  provider="stripe"
                  state={payload.providerCredentials.stripe}
                  editing={Boolean(providerEditors.stripe)}
                  values={providerSecrets}
                  onEditing={(editing) => setProviderEditing("stripe", editing)}
                  onChange={updateProviderSecret}
                />
              </section>

              <details className="setup-panel provider-section provider-catalog-section">
                <summary>
                  <span><strong>Advanced Provider catalog</strong><small>Inspect all 17 categories and Planned choices</small></span>
                  <span>Optional reference</span>
                </summary>
                <p>Every common category is accounted for. Available options have executable code and verification; Planned options remain visible but disabled until their Pack is real.</p>
                <div className="provider-catalog-grid">
                  {payload.providerCatalog.categories.map((category) => (
                    <article key={category.id}>
                      <header>
                        <div>
                          <strong>{category.name}</strong>
                          <small>{category.kind} / {category.selection}</small>
                        </div>
                        <span className={`status ${category.required ? "defined" : "available"}`}>
                          {category.required ? "required" : "optional / None"}
                        </span>
                      </header>
                      <p>Default: {category.defaultOptionIds.join(", ")}.</p>
                      <div className="provider-catalog-options">
                        {category.options.map((option) => (
                          <span
                            key={option.id}
                            className={option.selectable ? "provider-catalog-option available" : "provider-catalog-option planned"}
                            title={option.notes}
                          >
                            {option.name}
                            <small>{option.selectable ? option.status : "planned"}</small>
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            </div>
          ) : null}

          {currentStep.id === "review" ? (
            <div className="setup-stack">
              {saveState === "saved" && !dirty ? (
                <section className="setup-panel setup-completion" role="status">
                  <span className="setup-completion-icon"><Check size={22} /></span>
                  <div>
                    <h2>Project plan saved</h2>
                    <p>Your Blueprint and project configuration are persisted. Nothing has been materialized or deployed automatically.</p>
                  </div>
                  <div className="setup-completion-actions">
                    <Button asChild><a href="/dp">View saved plan</a></Button>
                    <Button type="button" variant="outline" onClick={() => setSaveState("idle")}>Continue editing</Button>
                  </div>
                </section>
              ) : null}
              <section className="setup-panel review-panel" hidden={saveState === "saved" && !dirty}>
                <h2>{payload.blueprint.project.name}</h2>
                <p>{payload.blueprint.project.brief}</p>
                <dl>
                  <div>
                    <dt>Slug</dt>
                    <dd>{payload.blueprint.project.slug}</dd>
                  </div>
                  <div>
                    <dt>Preset</dt>
                    <dd>{payload.blueprint.preset}</dd>
                  </div>
                  <div>
                    <dt>Product intent</dt>
                    <dd>{payload.blueprint.productIntent.summary}</dd>
                  </div>
                  <div>
                    <dt>Audience</dt>
                    <dd>
                      {payload.blueprint.productIntent.audiences.join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Core objects</dt>
                    <dd>
                      {payload.blueprint.productIntent.coreObjects.join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Tenancy / charging</dt>
                    <dd>
                      {payload.blueprint.productIntent.tenantModel} /{" "}
                      {payload.blueprint.productIntent.chargingModel}
                    </dd>
                  </div>
                  <div>
                    <dt>StyleKit</dt>
                    <dd>
                      {payload.blueprint.stylekit.slug} /{" "}
                      {payload.blueprint.stylekit.sourceRevision.slice(0, 12)} /{" "}
                      {payload.blueprint.stylekit.snapshotVersion} /{" "}
                      {payload.blueprint.stylekit.snapshotHash.slice(0, 12)}…
                    </dd>
                  </div>
                  <div>
                    <dt>Design pointer</dt>
                    <dd>
                      {payload.blueprint.designProfile.id} /{" "}
                      {payload.blueprint.designProfile.version}
                    </dd>
                  </div>
                  <div>
                    <dt>Pages</dt>
                    <dd>{selectedPages.length} selected routes</dd>
                  </div>
                  <div>
                    <dt>Platforms</dt>
                    <dd>{payload.blueprint.project.platforms.join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Database</dt>
                    <dd>
                      {payload.blueprint.providers.database.initialState}{" "}
                      Development {databaseTransport(payload.blueprint.providers.database, "development")} / Production {databaseTransport(payload.blueprint.providers.database, "production")} from{" "}
                      {payload.blueprint.providers.database.schemaSource}
                    </dd>
                  </div>
                  <div>
                    <dt>Storage</dt>
                    <dd>
                      {payload.blueprint.providers.storage.provider} / {payload.blueprint.providers.storage.access} / {payload.blueprint.providers.storage.uploadMode}
                    </dd>
                  </div>
                  <div>
                    <dt>Anti-abuse</dt>
                    <dd>{payload.blueprint.providers.antiAbuse.provider}</dd>
                  </div>
                  <div>
                    <dt>AI</dt>
                    <dd>{payload.blueprint.providers.ai.provider}</dd>
                  </div>
                  <div>
                    <dt>Search</dt>
                    <dd>{payload.blueprint.providers.search.provider}</dd>
                  </div>
                  <div>
                    <dt>Push</dt>
                    <dd>{payload.blueprint.providers.push.provider}</dd>
                  </div>
                  <div>
                    <dt>SMS</dt>
                    <dd>{payload.blueprint.providers.sms.provider}</dd>
                  </div>
                  <div>
                    <dt>Images</dt>
                    <dd>{payload.blueprint.providers.media.images.provider}</dd>
                  </div>
                  <div>
                    <dt>Video</dt>
                    <dd>{payload.blueprint.providers.media.stream.provider}</dd>
                  </div>
                  <div>
                    <dt>Cron</dt>
                    <dd>{payload.blueprint.providers.background.cron.enabled ? payload.blueprint.providers.background.cron.development.expression : "none"}</dd>
                  </div>
                  <div>
                    <dt>Workflows</dt>
                    <dd>{payload.blueprint.providers.background.workflow.enabled ? "enabled" : "none"}</dd>
                  </div>
                  <div>
                    <dt>Realtime rooms</dt>
                    <dd>{payload.blueprint.providers.background.realtime.enabled ? "Durable Objects" : "none"}</dd>
                  </div>
                  <div>
                    <dt>Social sign-in</dt>
                    <dd>
                      {payload.blueprint.providers.socialAuth.join(", ") ||
                        "none"}
                    </dd>
                  </div>
                  <div>
                    <dt>Selected packs</dt>
                    <dd>{selectedPacks.length}</dd>
                  </div>
                  <div>
                    <dt>Development</dt>
                    <dd>
                      {payload.config.development.worker} /{" "}
                      {payload.config.development.domain}
                    </dd>
                  </div>
                  <div>
                    <dt>Production</dt>
                    <dd>
                      {payload.config.production.worker} /{" "}
                      {payload.config.production.domain}
                    </dd>
                  </div>
                </dl>
                <div className="review-packs">
                  {selectedPacks.map(({ id }) => (
                    <code key={id}>{id}</code>
                  ))}
                </div>
              </section>
              <section className="setup-panel review-contracts" hidden={saveState === "saved" && !dirty}>
                <h2>Materialization plan</h2>
                <p>
                  These are the outputs and constraints AI must review before
                  applying the Blueprint.
                </p>
                {selectedPackDetails.map((pack) => (
                  <article key={pack.id}>
                    <div>
                      <strong>{pack.name}</strong>
                      <small>{pack.id}</small>
                    </div>
                    <p>
                      <b>Outputs</b>
                      {pack.provides.join(", ")}
                    </p>
                    <p>
                      <b>Requires</b>
                      {pack.requires.join(", ") || "none"}
                    </p>
                    <p>
                      <b>Conflicts</b>
                      {pack.conflicts.join(", ") || "none"}
                    </p>
                  </article>
                ))}
              </section>
              {(__STARTER_FACTORY_MODE__ || saveState !== "saved" || dirty) ? <Button
                type="button"
                className="save-blueprint"
                onClick={() => void (__STARTER_FACTORY_MODE__ ? generateProject() : save({ finish: true }))}
                disabled={saveState === "saving" || generation.status === "generating"}
              >
                <Save size={16} />
                {generation.status === "generating" ? "Generating project" : saveState === "saving" ? "Saving project plan" : __STARTER_FACTORY_MODE__ ? "Generate project" : "Save and finish"}
              </Button> : null}
              {generation.message ? <p className={generation.status === "error" ? "setup-error" : "setup-saved-feedback"} role="status">{generation.message}{generation.target ? <> <code>{generation.target}</code></> : null}</p> : null}
            </div>
          ) : null}

          <div className="setup-save-feedback" aria-live="polite">
            {saveError ? (
              <p className="setup-error">
                <AlertCircle size={16} />
                {saveError}
              </p>
            ) : saveState === "saved" && !dirty ? (
              <p className="setup-saved-feedback">
                <Check size={16} />
                Saved to the local Blueprint.
              </p>
            ) : null}
          </div>

          <footer className="setup-actions">
            <Button
              variant="outline"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            >
              <ArrowLeft size={15} />
              Back
            </Button>
            {stepIndex < steps.length - 1 ? (
              <Button
                type="button"
                disabled={saveState === "saving"}
                onClick={() => void save({ nextStepIndex: Math.min(steps.length - 1, stepIndex + 1) })}
              >
                {saveState === "saving" ? "Saving" : "Save and continue"}
                <ArrowRight size={15} />
              </Button>
            ) : null}
          </footer>
        </main>
      </div>
    </div>
  );
}
