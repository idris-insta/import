import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Custom plugin to treat .js files as JSX
function jsToJsxPlugin() {
  return {
    name: 'treat-js-as-jsx',
    async transform(code, id) {
      if (!id.match(/src\/.*\.js$/)) return null;
      
      // Check if the file contains JSX
      if (code.includes('<') && (code.includes('/>') || code.includes('</'))) {
        return {
          code,
          map: null,
        };
      }
      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        // Include .js files for JSX transformation
        include: /\.(jsx?|tsx?)$/,
      }),
    ],
    
    // Path aliases - replaces CRACO's webpack.alias
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    // Configure esbuild to handle .js files as JSX
    // This maintains backwards compatibility with CRA's behavior
    esbuild: {
      include: /\.(js|jsx|ts|tsx)$/,
      loader: 'jsx',
    },
    
    // Optimize deps - tell Vite to process .js files containing JSX
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
        'lucide-react',
      ],
    },
    
    // Development server configuration - replaces CRACO devServer
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      // HMR configuration for containerized/proxy environments
      hmr: {
        port: 443,
        clientPort: 443,
        protocol: 'wss',
      },
      // Watch options - replaces webpack watchOptions
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
        ],
      },
      // CORS and proxy settings
      cors: true,
    },
    
    // Preview server (for production builds locally)
    preview: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
    },
    
    // Build configuration
    build: {
      outDir: 'build',
      sourcemap: mode !== 'production',
      // Rollup options
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          },
        },
      },
      // Target modern browsers
      target: 'es2020',
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },
    
    // CSS configuration
    css: {
      postcss: './postcss.config.cjs',
    },
    
    // Define global constants - replaces process.env.REACT_APP_*
    define: {
      // Provide backwards compatibility for any remaining process.env usage
      'process.env': {},
    },
  };
});
