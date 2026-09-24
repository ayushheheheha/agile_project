import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnon = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    envDir: '../',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
    },
    server: {
      port: 5173,
      proxy: {
        // Proxy API calls to the backend during dev so we avoid CORS issues
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      host: '0.0.0.0',
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
