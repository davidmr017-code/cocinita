import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { networkInterfaces } from 'node:os'

/** IP local (WiFi) para incluirla en el certificado SSL de desarrollo. */
function ipLocal(): string {
  try {
    for (const interfaces of Object.values(networkInterfaces())) {
      for (const net of interfaces ?? []) {
        if (net.family === 'IPv4' && !net.internal) return net.address
      }
    }
  } catch {
    /* entornos CI / sandbox sin interfaces de red */
  }
  return '127.0.0.1'
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // HTTPS solo al servir en local (cámara en móvil). En build/Vercel no hace falta.
    ...(command === 'serve'
      ? [
          basicSsl({
            name: 'cocinita',
            domains: ['localhost', '127.0.0.1', ipLocal()],
          }),
        ]
      : []),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/openfoodfacts': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openfoodfacts/, ''),
        headers: {
          'User-Agent': 'Cocinita/1.0 (dev-proxy; pantry-recipe-app)',
        },
      },
      // API familiar (Postgres / Railway) en desarrollo local
      '/api/auth': {
        target: 'http://127.0.0.1:3080',
        changeOrigin: true,
      },
      '/api/state': {
        target: 'http://127.0.0.1:3080',
        changeOrigin: true,
      },
      '/api/hogar': {
        target: 'http://127.0.0.1:3080',
        changeOrigin: true,
      },
    },
  },
}))
