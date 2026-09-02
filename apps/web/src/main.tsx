import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { PreferencesProvider } from './lib/preferences'
import { loadSiteIntegrations } from './lib/site-integrations-loader'
import './index.css'
import './generated/stylekit-adapter.css'

if (window.location.pathname.startsWith("/dashboard")) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
      url.pathname = "/dashboard" + url.pathname;
      return nativeFetch(new Request(url, request));
    }
    return nativeFetch(input, init);
  };
}

loadSiteIntegrations()
createRoot(document.getElementById('root')!).render(<StrictMode><PreferencesProvider><App /></PreferencesProvider></StrictMode>)
