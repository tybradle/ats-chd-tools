import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { readFileSync } from "fs"

// Read package.json for version
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
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
