import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The client builds to prototype/dist, which the Bun server serves as static assets.
// In dev we proxy /api and /events to the Bun server on PORT (default 3000).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/events": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
