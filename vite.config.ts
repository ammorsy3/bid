import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    // Dev-only overlay that surfaces runtime errors in the browser instead of
    // letting them vanish into the console. Not included in the production build.
    runtimeErrorOverlay(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  // .env lives at the repo root, but `root` is client/, and Vite looks for env
  // files relative to `root` unless told otherwise. Without this, a production
  // build silently inlines nothing for VITE_* and the app ships with no Clerk
  // key — while `npm run dev` still works, because the server loads .env into
  // process.env before Vite ever runs.
  envDir: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
