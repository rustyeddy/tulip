import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Allows trader's build to embed Tulip at a sub-path, e.g.
//   TULIP_BASE_PATH=/ui/ npm run build
// Defaults to root ('/') for standalone dev/preview.
const basePath = process.env.TULIP_BASE_PATH || '/';

export default defineConfig({
  plugins: [svelte()],
  base: basePath,

  server: {
    port: 5173,
    open: false,
    host: true, // expose on LAN — useful when trader's embed runs in a separate container/VM
  },

  preview: {
    port: 4173,
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Single predictable asset names make it easier for trader's embed
    // logic to reference files if it ever needs to (otherwise hashed
    // filenames + index.html are sufficient for a plain static embed).
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
