import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

// Auto-recover from stale chunks after new deployments
window.addEventListener('vite:preloadError', () => {
  const lastReload = sessionStorage.getItem('chunk_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('chunk_reload', now.toString());
    window.location.reload();
  }
});

window.addEventListener('error', (e) => {
  if (e?.message?.includes('Failed to fetch dynamically imported module')) {
    const lastReload = sessionStorage.getItem('chunk_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('chunk_reload', now.toString());
      window.location.reload();
    }
  }
});

// Some browser/IDE tooling injects anonymous, eval'd scripts into the page
// (DevTools shows these as "VM123" with no source file) — we don't ship any
// eval'd code ourselves, so a thrown error with no filename is always one of
// those, never this app's own. Suppress just those so they don't show as
// scary uncaught errors; anything from our own bundle always has a real
// filename and is left untouched.
window.addEventListener('error', (e) => {
  if (!e.filename) {
    e.preventDefault();
  }
});

// Prevent pinch-to-zoom and gesture zoom on mobile WebViews/browsers
if (typeof window !== 'undefined') {
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

  // Double-tap zoom is already disabled by `touch-action: manipulation` on html/body
  // (index.css). A JS touchend handler used to cancel any touch that followed another
  // within 300 ms - which also cancelled the *click*, so quickly tapping the bottom
  // nav silently dropped taps and left the app on the wrong page.
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (v5 name; `cacheTime` is ignored)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
