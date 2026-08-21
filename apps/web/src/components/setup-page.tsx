import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

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
  access: "sql-first";
  initialState: "empty";
  schemaSource: "selected-pack-baseline";
  existingDataPolicy: "out-of-scope";
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
type SetupPayload = {
  blueprint: Blueprint;
  catalog: { catalogVersion: string; presets: Preset[]; packs: Pack[] };
  designCatalog: {
    catalogVersion: string;
    sourcePolicy: string;
    profiles: DesignProfile[];
  };
  pageCatalog: {
    catalogVersion: string;
    policy: string;
    pages: PageDefinition[];
  };
  stylekitCatalog: {
    catalogVersion: string;
    source: { revision: string };
    count: number;
    styles: StyleKitEntry[];
  };
  stylekitSnapshots: Record<string, StyleKitSnapshotSummary>;
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
  config: StarterConfig;
};

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

function StylePreview({ style }: { style: StyleKitEntry }) {
  return (
    <span className="style-preview" aria-hidden="true">
      <img
        src={`/stylekit-previews/${style.slug}.svg`}
        alt=""
        width="1200"
        height="630"
        decoding="async"
      />
    </span>
  );
}

export function SetupPage() {
  const [payload, setPayload] = useState<SetupPayload | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [saveError, setSaveError] = useState("");
  const [stylekitQuery, setStylekitQuery] = useState("");
  const [stylekitCategory, setStylekitCategory] = useState("all");

  useEffect(() => {
    void fetch("/__starter/setup", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "This setup workspace is available only from the local Starter development server.",
          );
        return response.json() as Promise<SetupPayload>;
      })
      .then((next) =>
        setPayload({
          ...next,
          blueprint: hydrateSelections(next.blueprint, next.catalog.packs),
        }),
      )
      .catch((error) =>
        setLoadError(error instanceof Error ? error.message : String(error)),
      );
  }, []);

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
  const stylekitStyles = payload?.stylekitCatalog.styles || [];
  const globalStyles = stylekitStyles.filter(
    (style) =>
      style.classification === "base-visual" &&
      style.globalEligibility === "eligible",
  );
  const stylekitCategories = [
    ...new Set(globalStyles.map((style) => style.category)),
  ].sort();
  const visibleStyles = globalStyles.filter(
    (style) =>
      (stylekitCategory === "all" || style.category === stylekitCategory) &&
      `${style.name} ${style.nameEn} ${style.slug} ${(style.tags || []).join(" ")}`
        .toLowerCase()
        .includes(stylekitQuery.toLowerCase().trim()),
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

  const updateBlueprint = (updater: (blueprint: Blueprint) => Blueprint) =>
    setPayload((current) =>
      current ? { ...current, blueprint: updater(current.blueprint) } : current,
    );
  const updateConfig = (updater: (config: StarterConfig) => StarterConfig) =>
    setPayload((current) =>
      current ? { ...current, config: updater(current.config) } : current,
    );
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
      };
    });
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
  const setStyleKit = (style: StyleKitEntry) => {
    const snapshot = payload.stylekitSnapshots[style.slug];
    if (!snapshot) return;
    setPayload((current) =>
      current
        ? {
            ...current,
            stylekitSnapshot: snapshot,
            blueprint: {
              ...current.blueprint,
              stylekit: {
                slug: style.slug,
                sourceRevision: current.stylekitCatalog.source.revision,
                snapshotVersion: snapshot.snapshotVersion,
                snapshotHash: snapshot.snapshotHash,
              },
              designProfile: {
                id: `stylekit-${style.slug}`,
                version: snapshot.snapshotVersion,
              },
              selections: {
                ...current.blueprint.selections,
                design: current.blueprint.selections.design.map(
                  (selection) => ({
                    ...selection,
                    lifecycle: selectLifecycle(
                      selection.lifecycle,
                      selection.id === "design.stylekit-adapted",
                    ),
                  }),
                ),
              },
            },
          }
        : current,
    );
  };
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

  const save = async () => {
    setSaveState("saving");
    setSaveError("");
    const completedSteps = steps.slice(0, -1).map(({ id }) => id);
    const blueprint: Blueprint = {
      ...payload.blueprint,
      status: "ready",
      setup: {
        ...payload.blueprint.setup,
        status: "ready",
        currentStep: "review",
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
        body: JSON.stringify({ blueprint, config: payload.config }),
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
      setSaveState("saved");
    } catch (error) {
      setSaveState("idle");
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="setup-shell">
      <header className="setup-header">
        <a href="/">{payload.blueprint.project.name}</a>
        <span>Local project setup</span>
        <a href="/dp">View plan</a>
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
                <h2>Global StyleKit visual system</h2>
                <p>
                  Presentation is selected after the product, SaaS capabilities,
                  providers, and pages. Keep the default or change it later;
                  product behavior never depends on this visual choice.
                </p>
                <div className="stylekit-pinned">
                  <strong>
                    Locked choice: {payload.stylekitSnapshot.style.name} /{" "}
                    {payload.blueprint.stylekit.slug}
                  </strong>
                  <small>
                    StyleKit {payload.blueprint.stylekit.sourceRevision} ·
                    snapshot {payload.stylekitSnapshot.snapshotVersion} ·{" "}
                    {payload.blueprint.stylekit.snapshotHash.slice(0, 12)}…
                  </small>
                </div>
                <div className="setup-fields">
                  <Field
                    label="Search styles"
                    value={stylekitQuery}
                    onChange={setStylekitQuery}
                    helper={`${globalStyles.length} complete global systems from ${payload.stylekitCatalog.count} classified source entries.`}
                  />
                  <label className="setup-field">
                    <span>Category</span>
                    <select
                      value={stylekitCategory}
                      onChange={(event) =>
                        setStylekitCategory(event.target.value)
                      }
                    >
                      <option value="all">All categories</option>
                      {stylekitCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
              {visibleStyles.length ? (
                <div className="profile-grid">
                  {visibleStyles.map((style) => {
                    const selected =
                      payload.blueprint.stylekit.slug === style.slug;
                    const available = Boolean(
                      payload.stylekitSnapshots[style.slug],
                    );
                    return (
                      <button
                        type="button"
                        key={style.slug}
                        disabled={!available}
                        className={
                          selected
                            ? "profile-choice selected"
                            : "profile-choice"
                        }
                        onClick={() => setStyleKit(style)}
                      >
                        <StylePreview style={style} />
                        <span className="profile-swatches">
                          {[
                            style.colors?.primary,
                            style.colors?.secondary,
                            ...(style.colors?.accent || []).slice(0, 2),
                          ].map((color, index) => (
                            <i
                              key={`${style.slug}-${index}`}
                              style={{
                                background: color || "var(--surface-soft)",
                              }}
                            />
                          ))}
                        </span>
                        <span className="profile-title">
                          <strong>{style.name}</strong>
                          <small>
                            {style.nameEn} / {style.adapterFamily} /{" "}
                            {style.category}
                            {available ? " / ready" : " / unavailable"}
                          </small>
                        </span>
                        <p>{style.description}</p>
                        <span className="profile-targets">
                          {(style.tags || []).join(", ") ||
                            "global visual system"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <section className="setup-panel setup-empty">
                  <strong>No matching global StyleKit systems.</strong>
                  <p>Clear the current search or category filter.</p>
                </section>
              )}
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
            <div className="setup-panel provider-panel">
              <div>
                <span>Authentication</span>
                <strong>{payload.blueprint.providers.auth}</strong>
                <small>Stable aligned core and plugins</small>
              </div>
              <div>
                <span>Social sign-in</span>
                <div className="provider-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={payload.blueprint.providers.socialAuth.includes(
                        "google",
                      )}
                      onChange={(event) =>
                        updateBlueprint((blueprint) => ({
                          ...blueprint,
                          providers: {
                            ...blueprint.providers,
                            socialAuth: event.target.checked ? ["google"] : [],
                          },
                        }))
                      }
                    />
                    google
                  </label>
                </div>
                <small>
                  Google is the implemented social provider. Additional
                  providers require an owned adapter before they become
                  selectable.
                </small>
              </div>
              <div>
                <span>Database</span>
                <strong>
                  {payload.blueprint.providers.database.engine} /{" "}
                  {payload.blueprint.providers.database.access}
                </strong>
                <small>
                  {payload.blueprint.providers.database.initialState} database
                  from the {payload.blueprint.providers.database.schemaSource};
                  existing data is{" "}
                  {payload.blueprint.providers.database.existingDataPolicy}.
                </small>
              </div>
              <label>
                <span>Email</span>
                <select
                  value={payload.blueprint.providers.email.default}
                  onChange={(event) =>
                    updateBlueprint((blueprint) => ({
                      ...blueprint,
                      providers: {
                        ...blueprint.providers,
                        email: {
                          ...blueprint.providers.email,
                          default: event.target.value,
                        },
                      },
                    }))
                  }
                >
                  <option value="cfsend">CFsend</option>
                  <option value="resend">Resend</option>
                  <option value="cloudflare-email-service">
                    Cloudflare Email Service
                  </option>
                </select>
                <small>CFsend is the Starter default.</small>
              </label>
              <div>
                <span>Billing</span>
                <strong>{payload.blueprint.providers.billing}</strong>
                <small>Materialized only with Billing</small>
              </div>
            </div>
          ) : null}

          {currentStep.id === "review" ? (
            <div className="setup-stack">
              <section className="setup-panel review-panel">
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
                      {payload.blueprint.providers.database.engine} from{" "}
                      {payload.blueprint.providers.database.schemaSource}
                    </dd>
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
              <section className="setup-panel review-contracts">
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
              {saveError ? (
                <p className="setup-error">
                  <AlertCircle size={16} />
                  {saveError}
                </p>
              ) : null}
              {saveState === "saved" ? (
                <p className="setup-success">
                  <Check size={16} />
                  Blueprint is saved and `/dp` is current. Ask AI to review{" "}
                  <code>npm run starter:materialize</code>, then apply the
                  reviewed plan.
                </p>
              ) : null}
              <Button
                className="save-blueprint"
                onClick={save}
                disabled={saveState === "saving"}
              >
                <Save size={16} />
                {saveState === "saving"
                  ? "Saving project plan"
                  : "Save project plan"}
              </Button>
            </div>
          ) : null}

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
                onClick={() =>
                  setStepIndex((index) => Math.min(steps.length - 1, index + 1))
                }
              >
                Continue
                <ArrowRight size={15} />
              </Button>
            ) : null}
          </footer>
        </main>
      </div>
    </div>
  );
}
