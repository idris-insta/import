import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    // Handle .js files containing JSX (CRA compatibility)
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
    },
    
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      // Disable HMR for stability in container environment
      hmr: false,
    },
    
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
    
    build: {
      outDir: 'build',
      sourcemap: mode !== 'production',
      target: 'es2020',
      chunkSizeWarningLimit: 1000,
    },
    
    css: {
      postcss: './postcss.config.cjs',
    },
    
    define: {
      'process.env': {},
    },
  };
});
