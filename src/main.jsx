import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './responsive-final.css'
import App from './App.jsx'

// Restore deep links redirected through GitHub Pages' 404 fallback.
const redirectRoute = new URLSearchParams(window.location.search).get('route')
if (redirectRoute) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  window.history.replaceState(null, '', `${basePath}${redirectRoute}`)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Register and actively check the production service worker for updates.
// Supabase requests and private user data are never cached by this worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      updateViaCache: 'none',
    })
      .then(registration => registration.update())
      .catch(error => console.warn('LiftLab service worker update check failed:', error))
  })
}
