export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  experimental: {
    appManifest: false,
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint', '@pinia/nuxt'],
  routeRules: {
    '/api/**': {},
  },
  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
      ],
      script: [],
      noscript: [],
    },
  },
  runtimeConfig: {
    public: {
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:8089',
    },
  },
  vite: {
    server: {
      hmr: {
        host: 'localhost',
        clientPort: 8089,
        protocol: 'ws',
      },
    },
    optimizeDeps: {
      include: ['axios'],
    },
  },
});
