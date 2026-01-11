import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
    ],
    
    // Path aliases and extension resolution
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // Explicitly set extension resolution order to prefer .jsx
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    
    // Configure esbuild to handle all .js files as JSX (CRA compatibility)
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
      exclude: [],
    },
    
    // Optimize deps with JSX loader for .js files
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
      force: true, // Force re-optimization
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
        'lucide-react',
        '@radix-ui/react-avatar',
        '@radix-ui/react-progress',
        '@radix-ui/react-switch',
      ],
    },
    
    // Development server configuration
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      hmr: {
        port: 443,
        clientPort: 443,
        protocol: 'wss',
      },
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
        ],
      },
      cors: true,
    },
    
    // Preview server
    preview: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
    },
    
    // Build configuration
    build: {
      outDir: 'build',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          },
        },
      },
      target: 'es2020',
      chunkSizeWarningLimit: 1000,
    },
    
    // CSS configuration
    css: {
      postcss: './postcss.config.cjs',
    },
    
    // Define global constants
    define: {
      'process.env': {},
    },
  };
});
