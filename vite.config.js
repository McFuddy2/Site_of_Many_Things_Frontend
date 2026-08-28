import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devProxyTarget = env.VITE_DEV_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: devProxyTarget.startsWith('https://'),
          configure: (proxy) => {
            // The dev server itself is plain http://localhost:5173. When the
            // proxy target is the production API (https), its Set-Cookie for
            // the refresh token carries `Secure`, which a browser silently
            // refuses to store on a non-https page -- the refresh cookie
            // never lands, so every reload (and any 401 mid-session) looks
            // like a logout. Strip `Secure` only on this local relay; the
            // real production deployment (frontend and API both https, no
            // proxy involved) never goes through this code path.
            proxy.on('proxyRes', (proxyRes) => {
              const setCookie = proxyRes.headers['set-cookie']
              if (setCookie) {
                proxyRes.headers['set-cookie'] = setCookie.map((cookie) =>
                  cookie.replace(/;\s*Secure/gi, '')
                )
              }
            })
          }
        }
      }
    }
  }
})