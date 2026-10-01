import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// Single source of truth for the version shown in the app: package.json "version".
import { version } from './package.json';

// GitHub Pages serves the site under /GMAT-CR/
export default defineConfig({
  base: '/GMAT-CR/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifest: {
        name: 'CR 筆記',
        short_name: 'CR 筆記',
        description: 'GMAT Critical Reasoning 拆解筆記（不儲存任何資料）',
        lang: 'zh-Hant',
        start_url: '/GMAT-CR/',
        scope: '/GMAT-CR/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f4e79',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the app's own build output. No runtime caching:
        // user content (screenshots, notes) never goes through the SW cache.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,ttf,wasm}'],
        // The embedded PDF font (~7 MB) must be precached so export works offline.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
