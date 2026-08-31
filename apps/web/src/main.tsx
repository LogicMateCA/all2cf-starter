import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { PreferencesProvider } from './lib/preferences'
import { loadSiteIntegrations } from './lib/site-integrations-loader'
import './index.css'
import './generated/stylekit-adapter.css'

loadSiteIntegrations()
createRoot(document.getElementById('root')!).render(<StrictMode><PreferencesProvider><App /></PreferencesProvider></StrictMode>)
