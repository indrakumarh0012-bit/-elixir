import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// The app is hosted at a sub-path, so the worker must be registered relative
// to BASE_URL — a root-scoped '/sw.js' 404s on GitHub Pages and never installs.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then((reg) => {
        reg.update().catch(() => {})
        // When an UPDATED worker takes over, reload once so the user sees the
        // new version immediately instead of on some later visit. The check for
        // an existing controller skips the claim() on a first visit.
        const hadController = !!navigator.serviceWorker.controller
        let reloaded = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!hadController || reloaded) return
          reloaded = true
          window.location.reload()
        })
      })
      .catch(() => {
        // Non-fatal: app still works in the browser without install prompt.
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
