import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowRight,
  Blocks,
  Bot,
  CheckCircle2,
  CircleDot,
  Cloud,
  Code2,
  FileText,
  Gauge,
  GitBranch,
  Library,
  Menu,
  Moon,
  Network,
  Rocket,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { usePreferences } from "../lib/preferences";

const AccountControl = lazy(async () => {
  const module = await import("./account-control");
  return { default: module.AccountControl };
});

const TechnologyStatusChart = lazy(async () => {
  const module = await import("./technology-status-chart");
  return { default: module.TechnologyStatusChart };
});

type Technology = { area: string; choice: string; status: string };
type ModuleDocument = { id: string; title: string; status: string; summary: string; path: string };
type Environment = { id: string; worker: string; domain: string; releaseIntent: string; appEnv: string; workersDev: boolean };
type DocumentRecord = { title: string; status: string; path: string; summary: string };
type Lifecycle = { selected: boolean; materialized: boolean; localVerified: boolean; developmentVerified: boolean; productionReleased: boolean };
type BlueprintSelection = { id: string; lifecycle: Lifecycle; note?: string };
type DatabasePolicy = { engine: "postgresql"; provider: "native-postgresql" | "cfpg"; access: "sql-first"; initialState: "empty"; schemaSource: "selected-pack-baseline"; existingDataPolicy: "out-of-scope"; cfpg: { development: { databaseId: string } | null; production: { databaseId: string } | null } };
type CatalogPack = {
  id: string;
  kind: "design" | "page" | "saas" | "capability";
  name: string;
  version: string;
  status: string;
  delivery: "baseline" | "materializer" | "planned";
  targets: string[];
  ownership: string;
  updatePolicy: string;
  source?: Array<{ name: string; relationship: string }>;
};
type DesignProfile = { id: string; version: string; packId: string; name: string; description: string; status: string; targets: string[]; dials: { designVariance: number; motionIntensity: number; visualDensity: number }; adapters: Record<string, string> };
type StyleKitSnapshot = { slug: string; name: string; nameEn: string; snapshotVersion: string; snapshotHash: string; immutable: boolean; classification: string; globalEligibility: string; targets: Record<string, { status: string }>; sourceFiles: Array<{ path: string; sha256: string }>; aiRules: string };
type PageDefinition = { id: string; packId: string; name: string; route: string; group: string; renderer: string; required: boolean; defaultSelected: boolean; status: string };
type ProviderCatalogCategory = {
  id: string;
  name: string;
  kind: "provider" | "infrastructure" | "platform";
  required: boolean;
  selection: "single" | "multiple";
  defaultOptionIds: string[];
  capabilityIds: string[];
  options: Array<{
    id: string;
    name: string;
    status: string;
    delivery: string;
    selectable: boolean;
    verification: { available: boolean; mode: string };
  }>;
};
type Snapshot = {
  schemaVersion: string;
  generatedAt: string;
  source: { commit: string | null; branch: string | null; dirty: boolean; starterVersion: string; state: string };
  project: { title: string; status: string; owner: string | null; summary: string };
  technology: Technology[];
  assembly: {
    blueprint: {
      status: string;
      preset: string;
      designProfile: { id: string; version: string };
      stylekit: { slug: string; sourceRevision: string; snapshotVersion: string; snapshotHash: string };
      pageSet: { selected: string[] };
      setup: { entry: string; status: string; currentStep: string; completedSteps: string[] };
      selections: Record<"design" | "pages" | "saas" | "capabilities", BlueprintSelection[]>;
      providers: { auth: string; socialAuth: string[]; database: DatabasePolicy; email: { default: string; alternatives: string[] }; billing: string; release: string };
    };
    catalog: { schemaVersion: string; catalogVersion: string; policies: Record<string, string>; presets: Array<{ id: string; name: string; description: string; selections: string[] }>; packs: CatalogPack[] };
    providerCatalog: { schemaVersion: string; catalogVersion: string; categories: ProviderCatalogCategory[] };
    designCatalog: { schemaVersion: string; catalogVersion: string; sourcePolicy: string; profiles: DesignProfile[] };
    stylekit: { source: { revision: string; license: string }; styleCount: number; catalogVersion: string; classification: Record<string, number>; globalEligibleCount: number; selected: { slug: string; sourceRevision: string; snapshotVersion: string; snapshotHash: string }; snapshots: StyleKitSnapshot[] };
    pageCatalog: { schemaVersion: string; catalogVersion: string; policy: string; pages: PageDefinition[] };
    materialization: { schemaVersion: string; packs: Array<{ id: string; version: string; files: number }>; dependencyCount: number; generatedRoutesHash: string | null; generatedAuthServerHash: string | null; generatedAuthClientHash: string | null; generatedDesignWebHash?: string | null; generatedDesignMarketingHash?: string | null; generatedDesignDocsHash?: string | null; generatedDesignMobileHash?: string | null; generatedMarketingProjectHash?: string | null };
  };
  modules: ModuleDocument[];
  changes: Array<{ id: string; title: string; status: string; summary: string }>;
  documents: DocumentRecord[];
  environments: Environment[];
  cloudflare: {
    bindingsContract?: { bindings?: Record<string, { kind: string; status: string }> };
    mcpPolicy?: Record<string, unknown>;
    workerStudio?: string;
  };
  orchestration: {
    controller?: { name?: string; model?: string; level?: string; owns?: string[] };
    workers?: Record<string, unknown>;
  };
  release: { defaultEnvironment?: string; productionKeywords?: string[] };
  documentation: { source: string; publicPath: string; developmentPlanPath: string; moduleCount: number; documentedModuleCount: number };
};

const fallback: Snapshot = {
  schemaVersion: "starter-development-plan/v1",
  generatedAt: new Date(0).toISOString(),
  source: { commit: null, branch: null, dirty: false, starterVersion: "0.1.0", state: "template" },
  project: {
    title: "Cloudflare AI Starter",
    status: "template",
    owner: null,
    summary: "A reusable, AI-readable product foundation with explicit development and production release lanes.",
  },
  technology: [
    { area: "Web", choice: "React 19 + Vite", status: "implemented" },
    { area: "Worker", choice: "Hono + Cloudflare workerd", status: "implemented" },
    { area: "Database", choice: "PostgreSQL + SQL-first", status: "planned" },
    { area: "Cloudflare context", choice: "Official MCP + Worker Studio MCP", status: "defined" },
  ],
  assembly: {
    blueprint: {
      status: "draft",
      preset: "basic-product",
      designProfile: { id: "owned-neutral", version: "0.1.0" },
      stylekit: { slug: "unavailable", sourceRevision: "unavailable", snapshotVersion: "0.0.0", snapshotHash: "unavailable" },
      pageSet: { selected: [] },
      setup: { entry: "/setup", status: "not-started", currentStep: "identity", completedSteps: [] },
      selections: { design: [], pages: [], saas: [], capabilities: [] },
      providers: { auth: "better-auth", socialAuth: ["google"], database: { engine: "postgresql", provider: "native-postgresql", access: "sql-first", initialState: "empty", schemaSource: "selected-pack-baseline", existingDataPolicy: "out-of-scope", cfpg: { development: null, production: null } }, email: { default: "cfsend", alternatives: ["resend", "cloudflare-email-service"] }, billing: "better-auth-stripe", release: "cloudflare-workers" },
    },
    catalog: { schemaVersion: "starter-catalog/v1", catalogVersion: "0.3.0", policies: {}, presets: [], packs: [] },
    providerCatalog: { schemaVersion: "starter-provider-catalog/v1", catalogVersion: "1.0.0", categories: [] },
    designCatalog: { schemaVersion: "starter-design-catalog/v1", catalogVersion: "0.1.0", sourcePolicy: "Starter-owned profiles", profiles: [] },
    stylekit: { source: { revision: "unavailable", license: "unknown" }, styleCount: 0, catalogVersion: "0.0.0", classification: {}, globalEligibleCount: 0, selected: { slug: "unavailable", sourceRevision: "unavailable", snapshotVersion: "0.0.0", snapshotHash: "unavailable" }, snapshots: [] },
    pageCatalog: { schemaVersion: "starter-page-catalog/v1", catalogVersion: "0.1.0", policy: "Starter-owned routes", pages: [] },
    materialization: { schemaVersion: "starter-materialization/v1", packs: [], dependencyCount: 0, generatedRoutesHash: null, generatedAuthServerHash: null, generatedAuthClientHash: null, generatedDesignWebHash: null, generatedDesignMarketingHash: null, generatedDesignDocsHash: null, generatedDesignMobileHash: null, generatedMarketingProjectHash: null },
  },
  modules: [],
  changes: [],
  documents: [],
  environments: [
    { id: "development", worker: "starter-dev", domain: "dev.example.com", releaseIntent: "发布", appEnv: "development", workersDev: true },
    { id: "production", worker: "starter", domain: "app.example.com", releaseIntent: "正式发布", appEnv: "production", workersDev: true },
  ],
  cloudflare: { bindingsContract: { bindings: {} }, workerStudio: "capability-detected" },
  orchestration: { controller: { name: "Sol", level: "adaptive", owns: ["architecture", "integration", "release"] }, workers: {} },
  release: { defaultEnvironment: "development", productionKeywords: ["正式发布", "production"] },
  documentation: { source: "Markdown and frontmatter", publicPath: "/docs", developmentPlanPath: "/dp", moduleCount: 0, documentedModuleCount: 0 },
};

function useSnapshot() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [source, setSource] = useState("loading snapshot");
  useEffect(() => {
    void fetch("/dp/project.index.json", { headers: { Accept: "application/json" } })
      .then(async (response) => response.ok ? response.json() as Promise<Snapshot> : Promise.reject(new Error("snapshot unavailable")))
      .then((snapshot) => { setData(snapshot); setSource("/dp/project.index.json"); })
      .catch(() => { setData(fallback); setSource("embedded fallback"); });
  }, []);
  return { data, source };
}

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`surface ${className}`}>{children}</div>;
}

function Section({ id, title, description, icon: Icon, children }: {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return <section id={id} className="plan-section">
    <header className="section-heading"><div><h2>{title}</h2><p>{description}</p></div><Icon size={22} className="section-icon" /></header>
    {children}
  </section>;
}

function Brand({ name }: { name: string }) {
  return <a className="brand" href="/"><span><CircleDot size={17} /></span><strong>{name}</strong></a>;
}

function AccountSlot({ compact = false }: { compact?: boolean }) {
  return <span className="account-slot"><Suspense fallback={<span className="account-skeleton" aria-label="Loading account" />}><AccountControl compact={compact} /></Suspense></span>;
}

function DeferredTechnologyStatusChart({ items }: { items: Technology[] }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = anchor.current;
    if (!node || visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  return <div ref={anchor}>{visible
    ? <Suspense fallback={<div className="chart-loading">Loading chart…</div>}><TechnologyStatusChart items={items} /></Suspense>
    : <div className="chart-loading" aria-label="Technology chart loads near the viewport">Chart loads near this section</div>}
  </div>;
}

function LifecycleMark({ active, label }: { active: boolean; label: string }) {
  return <span className={active ? "lifecycle-mark active" : "lifecycle-mark inactive"} title={label}>{active ? "Yes" : "No"}</span>;
}

function Home() {
  const { data } = useSnapshot();
  const project = data?.project || fallback.project;
  return <div className="home-grid"><div className="home-wrap">
    <header className="home-header"><Brand name={project.title} /><div className="home-actions"><a href="/docs/">Docs</a><a href="/dp">Development plan</a><AccountSlot compact /></div></header>
    <main className="home-main"><div>
      <p className="home-kicker"><CircleDot size={16} /> AI-readable Cloudflare starter</p>
      <h1>Understand the system.<br /><span>Then change it.</span></h1>
      <p>A focused foundation for product code, project knowledge, Cloudflare topology, documentation, and verified releases.</p>
      <a className="primary-action" href="/dp">Open development plan <ArrowRight size={16} /></a>
    </div></main>
    <footer className="home-footer"><span>Starter workspace</span><span>Read-only planning surface</span></footer>
  </div></div>;
}

export function DevelopmentPlanPage() {
  const { data, source } = useSnapshot();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = usePreferences();
  if (!data) return <div className="plan-shell plan-loading-shell"><main className="plan-main"><header className="plan-toolbar"><span>Development Plan</span><div className="toolbar-actions"><span className="account-skeleton" aria-label="Loading account" /></div></header><div className="plan-content"><section className="plan-lead plan-lead-skeleton" aria-label="Loading Development Plan"><div><span /><span /><span /></div><dl><div /><div /><div /></dl></section></div></main></div>;
  const bindings = Object.entries(data.cloudflare.bindingsContract?.bindings || {});
  const controller = data.orchestration.controller || {};
  const commit = data.source.commit ? data.source.commit.slice(0, 12) : "not initialized";
  const lifecycleRows = Object.entries(data.assembly.blueprint.selections).flatMap(([group, selections]) => selections.map((selection) => ({
    group,
    selection,
    pack: data.assembly.catalog.packs.find(({ id }) => id === selection.id),
  })));
  const selectedStyleLifecycle = data.assembly.blueprint.selections.design.find(
    ({ id }) => id === "design.stylekit-adapted",
  )?.lifecycle;

  return <div className="plan-shell">
    <aside className={menuOpen ? "plan-nav open" : "plan-nav"}>
      <div className="nav-head"><Brand name={data.project.title} /><button aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button></div>
      <nav>{[
        ["#overview", "Overview", CircleDot], ["#blueprint", "Blueprint", Settings2], ["#catalog", "Pack catalog", Library],
        ["#technology", "Technology", Code2], ["#modules", "Modules", Blocks],
        ["#cloudflare", "Cloudflare", Network], ["#orchestration", "AI orchestration", Bot], ["#release", "Release lanes", Rocket],
        ["#documentation", "Documentation", FileText], ["#performance", "Performance", Gauge],
      ].map(([href, label, Icon]) => {
        const LinkIcon = Icon as ComponentType<{ size?: number }>;
        return <a key={String(href)} href={String(href)} onClick={() => setMenuOpen(false)}><LinkIcon size={16} />{String(label)}</a>;
      })}</nav>
      <div className="snapshot-state"><CheckCircle2 size={15} /><div><strong>Snapshot loaded</strong><span>{source}</span></div></div>
    </aside>
    {menuOpen ? <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}
    <main className="plan-main">
      <header className="plan-toolbar">
        <button className="menu-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
        <span>Development Plan</span>
        <div className="toolbar-actions"><button className="theme-button" aria-label="Toggle color theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button><AccountSlot compact /></div>
      </header>
      <div className="plan-content">
        <section id="overview" className="plan-lead">
          <div><p className="context-line">{data.schemaVersion} / {data.source.starterVersion}</p><h1>{data.project.title}</h1><p>{data.project.summary}</p></div>
          <dl><div><dt>State</dt><dd>{data.project.status}</dd></div><div><dt>Commit</dt><dd>{commit}</dd></div><div><dt>Knowledge</dt><dd>{data.documentation.documentedModuleCount}/{data.documentation.moduleCount} modules</dd></div></dl>
        </section>

        <Section id="blueprint" title="Project Blueprint" description="The canonical selection record behind /setup, with realization tracked separately from intent." icon={Settings2}>
          <div className="assembly-summary">
            <Surface><span className="role-label">Setup workspace</span><h3>{data.assembly.blueprint.setup.entry}</h3><dl className="compact-facts"><div><dt>Status</dt><dd>{data.assembly.blueprint.setup.status}</dd></div><div><dt>Preset</dt><dd>{data.assembly.blueprint.preset}</dd></div><div><dt>Style</dt><dd>{data.assembly.blueprint.stylekit.slug} / {data.assembly.blueprint.stylekit.snapshotVersion}</dd></div><div><dt>Style hash</dt><dd>{data.assembly.blueprint.stylekit.snapshotHash.slice(0, 12)}</dd></div><div><dt>Pages</dt><dd>{data.assembly.blueprint.pageSet.selected.length}</dd></div><div><dt>Blueprint</dt><dd>{data.assembly.blueprint.status}</dd></div></dl></Surface>
            <Surface><span className="role-label">Provider defaults</span><h3>{data.assembly.blueprint.providers.auth}</h3><dl className="compact-facts"><div><dt>Social</dt><dd>{data.assembly.blueprint.providers.socialAuth.join(", ") || "none"}</dd></div><div><dt>Database</dt><dd>{data.assembly.blueprint.providers.database.provider} / {data.assembly.blueprint.providers.database.initialState}</dd></div><div><dt>Schema</dt><dd>{data.assembly.blueprint.providers.database.schemaSource}</dd></div><div><dt>Email</dt><dd>{data.assembly.blueprint.providers.email.default}</dd></div><div><dt>Billing</dt><dd>{data.assembly.blueprint.providers.billing}</dd></div></dl></Surface>
            <Surface><span className="role-label">Materialization receipt</span><h3>{data.assembly.materialization.packs.length} materialized packs</h3><dl className="compact-facts"><div><dt>Files</dt><dd>{data.assembly.materialization.packs.reduce((total, pack) => total + pack.files, 0)}</dd></div><div><dt>Dependencies</dt><dd>{data.assembly.materialization.dependencyCount}</dd></div><div><dt>Auth</dt><dd>{data.assembly.materialization.generatedAuthServerHash && data.assembly.materialization.generatedAuthClientHash ? "tracked" : "missing"}</dd></div><div><dt>Design</dt><dd>{data.assembly.materialization.generatedDesignWebHash && data.assembly.materialization.generatedDesignMarketingHash && data.assembly.materialization.generatedDesignDocsHash && data.assembly.materialization.generatedDesignMobileHash ? "all targets tracked" : "missing"}</dd></div><div><dt>Pages</dt><dd>{data.assembly.materialization.generatedMarketingProjectHash ? "project output tracked" : "missing"}</dd></div><div><dt>Check</dt><dd>starter:materialize:check</dd></div></dl></Surface>
          </div>
          <Surface className="lifecycle-surface">
            <div className="lifecycle-heading"><div><span className="role-label">Current project realization</span><h3>Pack lifecycle</h3></div><p>Catalog readiness describes reusable code. The five lifecycle columns describe only this Blueprint.</p></div>
            <div className="lifecycle-scroll" role="region" aria-label="Pack lifecycle table" tabIndex={0}>
              <table className="lifecycle-table">
                <thead><tr><th scope="col">Pack</th><th scope="col">Catalog</th><th scope="col">Delivery</th><th scope="col">Selected</th><th scope="col">Materialized</th><th scope="col">Local</th><th scope="col">Development</th><th scope="col">Production</th></tr></thead>
                <tbody>{lifecycleRows.map(({ group, selection, pack }) => <tr key={selection.id}><th scope="row"><strong>{pack?.name || selection.id}</strong><small>{group} / {selection.id}</small></th><td><span className={`status ${pack?.status || "missing"}`}>{pack?.status || "missing"}</span></td><td><code>{pack?.delivery || "missing"}</code></td><td><LifecycleMark active={selection.lifecycle.selected} label={`${selection.id} selected`} /></td><td><LifecycleMark active={selection.lifecycle.materialized} label={`${selection.id} materialized`} /></td><td><LifecycleMark active={selection.lifecycle.localVerified} label={`${selection.id} locally verified`} /></td><td><LifecycleMark active={selection.lifecycle.developmentVerified} label={`${selection.id} Development verified`} /></td><td><LifecycleMark active={selection.lifecycle.productionReleased} label={`${selection.id} Production released`} /></td></tr>)}</tbody>
              </table>
            </div>
          </Surface>
        </Section>

        <Section id="catalog" title="Internal pack catalog" description="Owned assembly choices with explicit provenance, target platforms, and update behavior." icon={Library}>
          <div className="preset-grid">{data.assembly.catalog.presets.map((preset) => <Surface key={preset.id}><span className="role-label">{preset.name}</span><p>{preset.description}</p><small>{preset.selections.length} baseline packs</small></Surface>)}</div>
          <Surface className="catalog-table"><div className="catalog-row catalog-header"><span>Provider category</span><span>Default and selection</span><span>Options</span><span>Coverage</span></div>{data.assembly.providerCatalog.categories.map((category) => {
            const selectable = category.options.filter((option) => option.selectable);
            const planned = category.options.filter((option) => !option.selectable);
            return <div className="catalog-row" key={category.id}><div><strong>{category.name}</strong><small>{category.id} / {category.kind}</small></div><div><p>{category.defaultOptionIds.join(", ")}</p><small>{category.required ? "required" : "optional with None"} / {category.selection}</small></div><div><strong>{selectable.map((option) => option.name).join(", ") || "None only"}</strong><small>{planned.length ? `Planned: ${planned.map((option) => option.name).join(", ")}` : "No planned options"}</small></div><span className={`status ${planned.length ? "implemented" : "local-verified"}`}>{selectable.length} ready / {planned.length} planned</span></div>;
          })}</Surface>
          <div className="preset-grid">{data.assembly.designCatalog.profiles.map((profile) => <Surface key={profile.id}><span className={`status ${profile.status}`}>{profile.status}</span><h3>{profile.name}</h3><p>{profile.description}</p><small>{profile.id} / v{profile.version} / variance {profile.dials.designVariance} / motion {profile.dials.motionIntensity} / density {profile.dials.visualDensity}</small></Surface>)}</div>
          <div className="preset-grid">{data.assembly.stylekit.snapshots.map((snapshot) => {
            const selected = snapshot.slug === data.assembly.blueprint.stylekit.slug;
            const adaptersReady = Object.values(snapshot.targets).every(({ status }) => ["implemented", "local-verified", "development-verified", "production-released"].includes(status));
            const lifecycle = selected && selectedStyleLifecycle?.localVerified
              ? { className: "local-verified", label: "selected / local verified" }
              : selected && selectedStyleLifecycle?.materialized
                ? { className: "selected", label: "selected / browser evidence pending" }
                : adaptersReady
                  ? { className: "implemented", label: "catalog ready / not selected" }
                  : { className: "planned", label: "adapter gaps" };
            return <Surface key={snapshot.slug}><span className={`status ${lifecycle.className}`}>{snapshot.classification} / {lifecycle.label}</span><h3>{snapshot.name} / {snapshot.nameEn}</h3><p>StyleKit has {data.assembly.stylekit.styleCount} audited entries and {data.assembly.stylekit.globalEligibleCount} reviewed global systems. This immutable v{snapshot.snapshotVersion} snapshot is locked at {snapshot.snapshotHash.slice(0, 12)} and ships no donor runtime.</p><small>{snapshot.aiRules} / {Object.entries(data.assembly.stylekit.classification).map(([classification, count]) => `${classification}: ${count}`).join(" / ")} / {Object.entries(snapshot.targets).map(([target, state]) => `${target}: ${state.status}`).join(" / ")}</small></Surface>;
          })}</div>
          <Surface className="catalog-table"><div className="catalog-row catalog-header"><span>Page</span><span>Route and renderer</span><span>Pack</span><span>Reusable template</span></div>{data.assembly.pageCatalog.pages.map((page) => {
            const selected = data.assembly.blueprint.pageSet.selected.includes(page.id);
            const packLifecycle = data.assembly.blueprint.selections.pages.find(({ id }) => id === page.packId)?.lifecycle;
            const currentState = selected && packLifecycle?.materialized ? "materialized in this Blueprint" : selected ? "selected, not materialized" : "available, not selected";
            return <div className="catalog-row" key={page.id}><div><strong>{page.name}</strong><small>{page.id}{page.required ? " / required" : ""}</small></div><div><p>{page.route}</p><small>{page.renderer} / {page.group}</small></div><div><strong>{page.packId}</strong><small>{currentState}</small></div><span className={`status ${page.status}`}>{page.status}</span></div>;
          })}</Surface>
          <Surface className="catalog-table"><div className="catalog-row catalog-header"><span>Pack</span><span>Targets and source</span><span>Ownership</span><span>Status</span></div>{data.assembly.catalog.packs.map((pack) => <div className="catalog-row" key={pack.id}><div><strong>{pack.name}</strong><small>{pack.id} / {pack.version}</small></div><div><p>{pack.targets.join(", ")}</p><small>{pack.source?.length ? pack.source.map(({ name, relationship }) => `${name}: ${relationship}`).join(", ") : "Starter original"}</small></div><div><strong>{pack.ownership}</strong><small>{pack.updatePolicy}</small></div><span className={`status ${pack.status}`}>{pack.status}</span></div>)}</Surface>
        </Section>

        <Section id="technology" title="Technology map" description="The chosen foundation for each product responsibility." icon={Code2}>
          <div className="technology-grid">{data.technology.map((item) => <Surface key={item.area}><span className={`status ${item.status}`}>{item.status}</span><h3>{item.area}</h3><p>{item.choice}</p></Surface>)}</div>
          <Surface className="technology-chart"><div><span className="role-label">Decision status</span><h3>Technology maturity</h3><p>Live counts from the generated Development Plan snapshot.</p></div><DeferredTechnologyStatusChart items={data.technology} /></Surface>
        </Section>

        <Section id="modules" title="Module catalog" description="Purpose and ownership stay close to code in MODULE.md." icon={Blocks}>
          <Surface className="module-table"><div className="module-row module-header"><span>Module</span><span>Purpose</span><span>Status</span></div>{data.modules.map((module) => <div className="module-row" key={module.id}><div><strong>{module.id}</strong><small>{module.path}</small></div><p>{module.summary || module.title}</p><span className={`status ${module.status}`}>{module.status}</span></div>)}</Surface>
        </Section>

        <Section id="cloudflare" title="Cloudflare relationships" description="Runtime contracts are declared locally and verified through official MCP." icon={Cloud}>
          <div className="relationship-layout"><Surface><h3>Runtime path</h3><div className="runtime-flow"><span>Web and mobile</span><ArrowRight size={16} /><span>Worker API</span><ArrowRight size={16} /><span>Hyperdrive</span><ArrowRight size={16} /><span>PostgreSQL</span></div></Surface><Surface><h3>Reserved bindings</h3><div className="binding-list">{bindings.map(([name, contract]) => <div key={name}><code>{name}</code><span>{contract.kind}</span><small>{contract.status}</small></div>)}</div></Surface></div>
        </Section>

        <Section id="orchestration" title="AI orchestration" description="One controller retains system judgment; bounded workers execute independent scopes." icon={Bot}>
          <div className="orchestration-grid"><Surface><span className="role-label">Controller</span><h3>{controller.model || controller.name || "GPT-5.6 Sol"}</h3><p>Reasoning: {controller.level || "high"}</p><ul>{(controller.owns || ["architecture", "integration", "release"]).map((item) => <li key={item}>{item}</li>)}</ul></Surface><Surface><span className="role-label">Workers</span><h3>GPT-5.6 Luna</h3><p>Reasoning: medium</p><ul><li>bounded write scopes</li><li>structured evidence</li><li>no commit or deployment</li></ul></Surface></div>
        </Section>

        <Section id="release" title="Development and production" description="Generic release intent targets Development; Production requires explicit wording." icon={Rocket}>
          <div className="environment-grid">{data.environments.map((environment) => <Surface key={environment.id}><div className="environment-title"><div><span>{environment.id}</span><h3>{environment.worker}</h3></div><Rocket size={18} /></div><dl><div><dt>Domain</dt><dd>{environment.domain}</dd></div><div><dt>Runtime</dt><dd>{environment.appEnv}</dd></div><div><dt>Intent</dt><dd>{environment.releaseIntent}</dd></div></dl></Surface>)}</div>
        </Section>

        <Section id="documentation" title="Documentation system" description="Markdown and frontmatter remain canonical; /dp is generated and read-only." icon={FileText}>
          <Surface className="document-list">{data.documents.map((document) => <div key={document.path}><FileText size={16} /><span><strong>{document.title}</strong><small>{document.path}</small></span><span className={`status ${document.status}`}>{document.status}</span></div>)}</Surface>
        </Section>

        <Section id="performance" title="Performance gates" description="Budgets are release contracts, not suggestions." icon={Gauge}>
          <div className="metric-grid"><Surface><span>Web</span><strong>LCP &lt; 2.5s</strong><small>INP &lt; 200ms / CLS &lt; 0.1</small></Surface><Surface><span>Worker</span><strong>Bounded queries</strong><small>No N+1 or floating promises</small></Surface><Surface><span>Release</span><strong>Same artifact</strong><small>Development evidence before Production</small></Surface></div>
        </Section>

        <footer className="plan-footer"><span><GitBranch size={14} /> {data.source.branch || "no branch"} / {commit}</span><span>Generated {new Date(data.generatedAt).toLocaleString()}</span></footer>
      </div>
    </main>
  </div>;
}

export function AppHomePage() { return <Home />; }
