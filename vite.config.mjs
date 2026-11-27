import { defineConfig } from "vite";
export default defineConfig({
  root: "client",
  base: "./",
  publicDir: "../public",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        assetFileNames: "code/[name]-[hash][extname]",
        chunkFileNames: "code/[name]-[hash].js",
        entryFileNames: "code/[name]-[hash].js",
      },
    },
  },
});
