import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, CircleDot, Menu, Search } from "lucide-react";
import { AccountControl } from "@/components/account-control";
import { NotificationBell, NotificationsProvider } from "@/components/notification-bell";
import { authClient } from "@/lib/auth-client";
import { message } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { capabilityRoutes } from "@/generated/capability-routes";
import {
  isProductNavigationActive,
  searchProductNavigation,
  visibleProductNavigation,
  type ProductNavigationItem,
} from "@/lib/product-navigation";
import "@/styles/saas-shell.css";

function currentTitle(items: ProductNavigationItem[], pathname: string) {
  return (
    items.find((item) => isProductNavigationActive(item, pathname))?.label ||
    "Workspace"
  );
}

type WorkspaceOrganization = {
  id: string;
  name: string;
  slug: string;
};

export function ProductShell({
  children,
  activePath,
  enabledModules,
}: {
  children: ReactNode;
  activePath?: string;
  enabledModules?: string[];
}) {
  const { data: session } = authClient.useSession();
  const { locale } = usePreferences();
  const pathname = activePath || window.location.pathname;
  const isAdmin = String(
    session?.user && "role" in session.user ? session.user.role || "" : "",
  )
    .split(",")
    .map((item) => item.trim())
    .includes("admin");
  const materializedModules = useMemo(() => {
    const modules = new Set(enabledModules || []);
    for (const route of capabilityRoutes) {
      if (route.path === "/app/team") modules.add("saas.team-organizations");
      if (route.path === "/app/billing") modules.add("saas.billing-stripe");
      if (route.path === "/app/entitlements") modules.add("saas.entitlements");
      if (route.path === "/app/usage") modules.add("saas.usage");
      if (route.path === "/app/storage") modules.add("capability.object-storage");
      if (route.path === "/app/api-keys") modules.add("saas.api-keys");
      if (route.path === "/app/developer") modules.add("saas.api-platform");
      if (route.path === "/app/webhooks")
        modules.add("saas.outgoing-webhooks");
      if (route.path === "/app/onboarding") modules.add("saas.onboarding");
    }
    return modules;
  }, [enabledModules]);
  const navigation = useMemo(
    () =>
      visibleProductNavigation({
        isAdmin,
        enabledModules: materializedModules,
      }).map((item) => ({
        ...item,
        label: message(locale, `nav.${item.id}.label`, item.label),
        description: message(locale, `nav.${item.id}.description`, item.description),
      })),
    [isAdmin, locale, materializedModules],
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [organizations, setOrganizations] = useState<WorkspaceOrganization[]>(
    [],
  );
  const [activeOrganization, setActiveOrganization] =
    useState<WorkspaceOrganization | null>(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [query, setQuery] = useState("");
  const mobileMenuRef = useRef<HTMLButtonElement>(null);
  const firstNavRef = useRef<HTMLAnchorElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const searchResults = searchProductNavigation(query, navigation);

  useEffect(() => {
    if (
      !session?.user ||
      !materializedModules.has("saas.team-organizations")
    ) {
      setOrganizations([]);
      setActiveOrganization(null);
      setWorkspaceError("");
      return;
    }
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/auth/organization/list", {
        credentials: "include",
        signal: controller.signal,
      }),
      fetch("/api/auth/organization/get-full-organization", {
        credentials: "include",
        signal: controller.signal,
      }),
    ])
      .then(async ([listResponse, activeResponse]) => {
        if (!listResponse.ok)
          throw new Error("Organization workspaces could not be loaded.");
        const list = (await listResponse.json()) as WorkspaceOrganization[];
        const active = activeResponse.ok
          ? ((await activeResponse.json()) as WorkspaceOrganization)
          : null;
        setOrganizations(Array.isArray(list) ? list : []);
        setActiveOrganization(active?.id ? active : null);
        setWorkspaceError("");
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setWorkspaceError(
          cause instanceof Error
            ? cause.message
            : "Organization workspaces could not be loaded.",
        );
      });
    return () => controller.abort();
  }, [materializedModules, session?.user?.id]);

  const switchWorkspace = async (
    organization: WorkspaceOrganization | null,
  ) => {
    setWorkspaceError("");
    const response = await fetch("/api/auth/organization/set-active", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: organization?.id || null }),
    });
    if (!response.ok) {
      setWorkspaceError("Workspace could not be changed.");
      return;
    }
    setActiveOrganization(organization);
    setWorkspaceOpen(false);
  };

  useEffect(() => {
    if (
      !session?.user ||
      !materializedModules.has("saas.onboarding") ||
      !pathname.startsWith("/app") ||
      pathname === "/app/onboarding" ||
      pathname.startsWith("/app/settings")
    )
      return;
    let active = true;
    void fetch("/api/onboarding", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok || !active) return;
        const payload = (await response.json()) as {
          data?: { complete?: boolean };
        };
        if (active && payload.data?.complete === false) {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          window.location.replace(
            `/app/onboarding?returnTo=${encodeURIComponent(returnTo)}`,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [materializedModules, pathname, session?.user]);

  useEffect(() => {
    if (!drawerOpen) return;
    firstNavRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        mobileMenuRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    if (window.matchMedia("(max-width: 820px)").matches)
      mobileMenuRef.current?.focus();
  };
  const goTo = (href: string) => {
    setQuery("");
    setWorkspaceOpen(false);
    closeDrawer();
    window.location.href = href;
  };

  return (
    <NotificationsProvider limit={pathname === "/app/notifications" ? 50 : 8}>
    <div className="saas-shell">
      {drawerOpen ? (
        <button
          type="button"
          className="saas-scrim"
          aria-label="Close navigation"
          onClick={closeDrawer}
        />
      ) : null}
      <aside
        ref={sidebarRef}
        id="product-navigation"
        className="saas-sidebar"
        data-open={drawerOpen}
        aria-label="Product navigation"
      >
        <a className="saas-brand" href="/" onClick={closeDrawer}>
          <span className="saas-brand-mark">
            <CircleDot size={17} />
          </span>
          <strong>Cloudflare AI Starter</strong>
        </a>
        <div className="saas-workspace-switcher">
          <button
            type="button"
            className="saas-workspace-trigger"
            aria-expanded={workspaceOpen}
            aria-haspopup="menu"
            onClick={() => setWorkspaceOpen((value) => !value)}
          >
            <span>
              <strong>
                {activeOrganization?.name || message(locale, "shell.personal-workspace", "Personal workspace")}
              </strong>
              <small>
                {materializedModules.has("saas.team-organizations")
                  ? "Switch workspace"
                  : "Organizations not enabled"}
              </small>
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {workspaceOpen ? (
            <div className="saas-workspace-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => void switchWorkspace(null)}
              >
                <span>
                  <strong>{message(locale, "shell.personal-workspace", "Personal workspace")}</strong>
                  <small>
                    {activeOrganization ? "Use personal context" : "Current workspace"}
                  </small>
                </span>
              </button>
              {materializedModules.has("saas.team-organizations") ? (
                <>
                  {organizations.map((organization) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={organization.id}
                      aria-current={
                        activeOrganization?.id === organization.id
                          ? "true"
                          : undefined
                      }
                      onClick={() => void switchWorkspace(organization)}
                    >
                      <span>
                        <strong>{organization.name}</strong>
                        <small>
                          {activeOrganization?.id === organization.id
                            ? "Current workspace"
                            : organization.slug}
                        </small>
                      </span>
                    </button>
                  ))}
                  <a
                    href="/app/team"
                    role="menuitem"
                    onClick={() => setWorkspaceOpen(false)}
                  >
                    <span>
                      <strong>Manage organizations</strong>
                      <small>Members, teams, and invitations</small>
                    </span>
                  </a>
                  {workspaceError ? (
                    <p className="saas-workspace-error" role="alert">
                      {workspaceError}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="saas-workspace-note">
                  <small>
                    Organization workspaces appear after the Organizations
                    module is enabled.
                  </small>
                </div>
              )}
            </div>
          ) : null}
        </div>
        <nav className="saas-sidebar-nav" aria-label="Product navigation">
          <span className="saas-nav-label">{message(locale, "shell.product", "Product")}</span>
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                ref={index === 0 ? firstNavRef : undefined}
                className="saas-nav-link"
                href={item.href}
                aria-current={
                  isProductNavigationActive(item, pathname) ? "page" : undefined
                }
                onClick={closeDrawer}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="saas-sidebar-footer">
          {message(locale, "shell.module-note", "Product modules add their own navigation through the same registry.")}
        </div>
      </aside>
      <div className="saas-main-column">
        <header className="saas-topbar">
          <button
            type="button"
            className="saas-mobile-menu"
            aria-label="Open navigation"
            aria-controls="product-navigation"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="saas-topbar-title">
            <strong>{currentTitle(navigation, pathname)}</strong>
            <small>{activeOrganization?.name || message(locale, "shell.personal-workspace", "Personal workspace")}</small>
          </div>
          <div className="saas-search">
            <label htmlFor="product-navigation-search">
              <Search size={15} aria-hidden="true" />
            </label>
            <input
              id="product-navigation-search"
              type="search"
              placeholder={message(locale, "shell.search", "Search product")}
              value={query}
              aria-label="Search registered product routes"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0])
                  goTo(searchResults[0].href);
                if (event.key === "Escape") setQuery("");
              }}
            />
            {query ? (
              <div
                className="saas-search-results"
                role="listbox"
                aria-label="Registered product routes"
              >
                {searchResults.length ? (
                  searchResults.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      role="option"
                      onClick={() => setQuery("")}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </a>
                  ))
                ) : (
                  <small className="saas-search-empty">
                    {message(locale, "shell.no-search-results", "No registered product route matches.")}
                  </small>
                )}
              </div>
            ) : null}
          </div>
          <div className="saas-topbar-actions">
            <NotificationBell />
            <AccountControl compact />
          </div>
        </header>
        <div className="saas-shell-content">
          <div
            className="saas-product-module-slot"
            data-product-module-slot="true"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
    </NotificationsProvider>
  );
}
