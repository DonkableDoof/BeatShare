import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 1430, strictPort: true },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
  build: { chunkSizeWarningLimit: 1000 },
});
