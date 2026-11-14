
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // GitHub Pages project-site path: https://gantulu.github.io/bumn/
  base: "/bumn/",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
