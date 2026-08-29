import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const CURSOR_VM_HOSTS = [
  '42cb064804a6ebdb4e3b-pod-fgje5lxmmja27nvmmeihdgm7ve-5173.us1.cursorvm.com',
  'p-5173-pod-fgje5lxmmja27nvmmeihdgm7ve-42cb064804a6ebdb4e3b-us1.agent.cvm.dev',
]

export default defineConfig({
  // Absolute base for the web/Netlify build: the SPA catch-all rewrite serves
  // index.html for unknown paths, and relative asset URLs would then resolve
  // against that path and 404 into the rewrite (blank page). The Capacitor
  // build needs relative URLs instead and passes --base=./ (see build:android).
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [...CURSOR_VM_HOSTS, '.cursorvm.com', '.agent.cvm.dev'],
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [...CURSOR_VM_HOSTS, '.cursorvm.com', '.agent.cvm.dev'],
  },
})
