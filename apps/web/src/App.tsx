import { lazy, Suspense } from "react";
import { capabilityRoutes } from "./generated/capability-routes";

const AuthPage = lazy(async () => ({ default: (await import("./components/auth-page")).AuthPage }));
const ProtectedApp = lazy(async () => ({ default: (await import("./components/protected-app")).ProtectedApp }));
const SetupPage = lazy(async () => ({ default: (await import("./components/setup-page")).SetupPage }));
const SupportPage = lazy(async () => ({ default: (await import("./components/support-page")).SupportPage }));
const AdminPage = lazy(async () => ({ default: (await import("./components/admin-page")).AdminPage }));
const DevelopmentPlanPage = lazy(async () => ({ default: (await import("./components/development-plan-page")).DevelopmentPlanPage }));
const AppHomePage = lazy(async () => ({ default: (await import("./components/development-plan-page")).AppHomePage }));

function RouteLoading() {
  return <main className="protected-loading" aria-label="Loading page"><span /><span /><span /></main>;
}

export function App() {
  const path = window.location.pathname;
  const localSetupSave =
    new Set(["localhost", "127.0.0.1", "[::1]"]).has(window.location.hostname) &&
    (sessionStorage.getItem("starter.setup.savePending") ||
      sessionStorage.getItem("starter.setup.saved"));
  if (path === "/" && localSetupSave) {
    window.location.replace("/setup?result=saved");
    return <RouteLoading />;
  }
  let page;
  if (path === "/login") page = <AuthPage />;
  else if (path === "/app" || path === "/app/settings" || path === "/app/notifications") page = <ProtectedApp />;
  else if (path === "/support") page = <SupportPage />;
  else if (path === "/admin") page = <AdminPage />;
  else if (path === "/setup") page = <SetupPage />;
  else if (path === "/dp") page = <DevelopmentPlanPage />;
  else {
    const capabilityRoute = capabilityRoutes.find((route) => route.path === path);
    page = capabilityRoute ? <capabilityRoute.Component /> : <AppHomePage />;
  }
  return <Suspense fallback={<RouteLoading />}>{page}</Suspense>;
}
