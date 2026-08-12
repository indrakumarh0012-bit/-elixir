import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const CURSOR_VM_HOST =
  '42cb064804a6ebdb4e3b-pod-fgje5lxmmja27nvmmeihdgm7ve-5173.us1.cursorvm.com'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [CURSOR_VM_HOST, '.cursorvm.com'],
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [CURSOR_VM_HOST, '.cursorvm.com'],
  },
})
