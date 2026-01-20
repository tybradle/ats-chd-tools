import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Prevent Vite from obscuring Rust errors
  clearScreen: false,
  // Tauri dev server configuration
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    hmr: {
      host: "ui.tybrad.org", // Replace with your actual tunnel domain for HMR
      protocol: "wss",
      clientPort: 443,
    },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
})
