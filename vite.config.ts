
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const edgeFunctionsProxy = {
  "/supabase-functions": {
    target: "https://zyiavfljweavoxyyplxj.supabase.co",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/supabase-functions/, "/functions/v1"),
    configure: (proxy: { on: (event: string, listener: (proxyReq: { removeHeader: (name: string) => void }) => void) => void }) => {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.removeHeader("origin");
        proxyReq.removeHeader("referer");
      });
    },
  },
};

export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    proxy: edgeFunctionsProxy,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    proxy: edgeFunctionsProxy,
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
