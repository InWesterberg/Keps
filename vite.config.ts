import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Keps/' : '/',
  server: {
    host: true,
    port: 5173,
  },
}));
