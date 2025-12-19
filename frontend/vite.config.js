import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
                 strategies: 'injectManifest',

      // 👇 THIS enables ./src/sw.js
      srcDir: 'src',
      filename: 'sw.js',

            includeAssets: [
                'favicon.ico',
                'favicon-16x16.png',
                'favicon-32x32.png',
                'apple-touch-icon.png',
                'safari-pinned-tab.svg',
                'mstile-144x144.png'
            ],
            manifest: {
                name: 'ABY Inventory Management',
                short_name: 'ABY Inventory',
                description: 'Professional inventory management application for businesses',
                theme_color: '#0ea5e9',
                background_color: '#f0f9ff',
                display: 'standalone',
                orientation: 'portrait-primary',
                start_url: '/',
                scope: '/',
                categories: ['business', 'productivity', 'utilities'],
                prefer_related_applications: false,
                lang: 'en',
                dir: 'ltr',
                icons: [
                    // Standard PWA icons
                    {
                        src: '/pwa-72x72.png',
                        sizes: '72x72',
                        type: 'image/png'
                    },
                    {
                        src: '/pwa-96x96.png',
                        sizes: '96x96',
                        type: 'image/png'
                    },
                    {
                        src: '/pwa-128x128.png',
                        sizes: '128x128',
                        type: 'image/png'
                    },
                    {
                        src: '/pwa-144x144.png',
                        sizes: '144x144',
                        type: 'image/png'
                    },
                    {
                        src: '/pwa-152x152.png',
                        sizes: '152x152',
                        type: 'image/png'
                    },
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/pwa-384x384.png',
                        sizes: '384x384',
                        type: 'image/png'
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    // Maskable icons for Android
                    {
                        src: '/maskable-icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable'
                    },
                    {
                        src: '/maskable-icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    },
                    // Any purpose icons
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    }
                ],
                screenshots: [
                    {
                        src: '/screenshots/desktop.png',
                        sizes: '1280x720',
                        type: 'image/png',
                        form_factor: 'wide',
                        label: 'Desktop view of ABY Inventory Management'
                    },
                    {
                        src: '/screenshots/mobile.png',
                        sizes: '375x812',
                        type: 'image/png',
                        form_factor: 'narrow',
                        label: 'Mobile view of ABY Inventory Management'
                    }
                ]
            },
                   injectManifest: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,eot}'],
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
},
            devOptions: {
                enabled: true,
                type: 'module',
                navigateFallback: 'index.html'
            }
        })
    ],
    optimizeDeps: {
        exclude: ['axios'],
        include: ['react', 'react-dom', 'lucide-react']
    },
    build: {
        target: 'es2015',
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    },
    server: {
        host: true, // Allows access from network for testing on mobile devices
        port: 5173
    }
})