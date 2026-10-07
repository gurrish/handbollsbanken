import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    proxy: { "/api": "http://127.0.0.1:7071" },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      workbox: {
        navigateFallbackDenylist: [/^\/\.auth\//],
      },
      manifest: {
        name: "Handbollsbanken",
        short_name: "Handboll",
        description: "Planera bättre handbollsträningar tillsammans.",
        theme_color: "#f7f8fc",
        background_color: "#f7f8fc",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "canvas-vendor": ["konva", "react-konva"],
        },
      },
    },
  },
});
