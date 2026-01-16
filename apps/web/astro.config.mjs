import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    react(),
    tailwind(),
  ],
  vite: {
    resolve: {
      alias: {
        '@': './src',
        '@beepd/ui': '../../packages/ui/src',
        '@beepd/api-client': '../../packages/api-client/src',
      },
    },
  },
});
