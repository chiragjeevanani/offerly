import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// main.jsx loads one of two roots by path: DeliveryRoot.jsx for /delivery/*,
// App.jsx for everything else. Both are dynamic imports, so the browser would
// only learn about them after main.js has downloaded and run. This writes a tiny
// script into index.html that preloads the right root and everything it imports
// straight away, so neither app pays an extra round trip at startup.
const preloadRootByPath = () => ({
  name: 'offerly-preload-root-by-path',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const bundle = ctx.bundle || {}
      const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
      const byFile = Object.fromEntries(chunks.map((c) => [c.fileName, c]))
      const entry = chunks.find((c) => c.isEntry)
      const alreadyLoaded = new Set([entry?.fileName, ...(entry?.imports || [])])
      // A chunk plus all of its static imports, minus what index.html loads anyway.
      const closure = (fileName, seen = new Set()) => {
        if (!fileName || seen.has(fileName)) return seen
        seen.add(fileName)
        for (const dep of byFile[fileName]?.imports || []) closure(dep, seen)
        return seen
      }
      const rootFiles = (suffix) => {
        const root = chunks.find((c) => c.facadeModuleId?.replace(/\\/g, '/').endsWith(suffix))
        if (!root) throw new Error(`preload-root-by-path: no chunk for ${suffix}`)
        return [...closure(root.fileName)].filter((f) => !alreadyLoaded.has(f)).map((f) => `/${f}`)
      }
      const delivery = rootFiles('/src/DeliveryRoot.jsx')
      const app = rootFiles('/src/App.jsx')
      const script = `<script>(function(){var l=location.pathname.indexOf('/delivery')===0?${JSON.stringify(delivery)}:${JSON.stringify(app)};for(var i=0;i<l.length;i++){var e=document.createElement('link');e.rel='modulepreload';e.crossOrigin='';e.href=l[i];document.head.appendChild(e);}})();</script>`
      return html.replace('</head>', `    ${script}\n  </head>`)
    },
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadRootByPath()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    hmr: {
      overlay: true
    }
  }
})
