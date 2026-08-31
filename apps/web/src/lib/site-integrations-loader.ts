export function loadSiteIntegrations() {
  const script = document.createElement("script");
  script.src = "/api/public/site-integrations.js?surface=web";
  script.defer = true;
  script.dataset.owner = "starter-site-integrations";
  document.head.appendChild(script);
}
