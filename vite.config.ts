import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid TS error
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: './', // Fixes 404 errors on GitHub Pages
    plugins: [react()],
    // We removed the define block. The API key is now handled internally in geminiService.ts
    // to avoid exposure in build artifacts or config files.
  };
});