import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const clientPort = Number(env.VITE_PORT || 5173);

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: clientPort,
      strictPort: false,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${env.PORT || 5000}`,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: Number(env.VITE_PREVIEW_PORT || 4173),
    },
  };
});
