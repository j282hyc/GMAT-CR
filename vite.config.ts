import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the site under /GMAT-CR/
export default defineConfig({
  base: '/GMAT-CR/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['icons/apple-touch-icon.png'],
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
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        runtimeCaching: [],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
