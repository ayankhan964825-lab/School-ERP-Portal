// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://thenutridry.com',
  output: 'server',
  adapter: vercel(),

  // 🚀 Prefetch: hover pe requests bahot jyada jaati hain Vercel par, isliye 'tap' (click start) best hai Edge requests bachane ke liye 🚀
  prefetch: {
    prefetchAll: false,          
    defaultStrategy: 'tap',   // Tap pe fetch hoga (saves Vercel Edge Requests)
  },

  image: {
    domains: ['xgfikdhcudyixwbwlcuh.supabase.co'],
  },

  vite: {
    server: { allowedHosts: true },
    plugins: [tailwindcss()],
    build: {
      target: 'es2015',
      sourcemap: false,
      cssMinify: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'nanostores', '@nanostores/react'],
    },
  },
  integrations: [react()],
  compressHTML: true,
});