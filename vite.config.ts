import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png", "favicon.svg"],
      manifest: {
        name: "Jots",
        short_name: "Jots",
        description: "Personal roasting journal — time, watts, color and sound.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#D6D1C7",
        theme_color: "#D6D1C7",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html"
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        /**
         * three.js gets its own chunk. It loads on every launch either way, but
         * kept separate its hash only changes when three itself does — so an
         * installed journal re-downloads the app code on a deploy and keeps the
         * renderer it already has, instead of pulling all of it down again.
         */
        manualChunks: (id) => (id.includes("node_modules/three") ? "three" : undefined)
      }
    },
    chunkSizeWarningLimit: 800
  },
  server: { host: true }
});
