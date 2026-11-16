import path from "path";
import { defineConfig } from "vite";

const port = Number(process.env.PORT ?? 5173);
const basePath = process.env.BASE_PATH ?? "/";
// Where the API server runs during local development (Replit routes /api itself).
const apiTarget = process.env.API_URL ?? "http://localhost:8080";

export default defineConfig({
  base: basePath,
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: { "/api": { target: apiTarget, changeOrigin: true } },
  },
  preview: { port, host: "0.0.0.0", allowedHosts: true },
});
