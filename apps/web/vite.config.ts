import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 2222,
    proxy: {
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://localhost:3333",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
