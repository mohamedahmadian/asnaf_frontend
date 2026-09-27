import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** PM2 on the public host has no nginx WebSocket proxy; HMR only matters locally. */
function disableHmrOnPublicDevServer() {
  if (process.env.ENABLE_HMR === "1" || process.env.ENABLE_HMR === "true") {
    return false;
  }
  if (process.env.DISABLE_HMR === "1" || process.env.DISABLE_HMR === "true") {
    return true;
  }
  return process.env.pm_id !== undefined || Boolean(process.env.PM2_HOME);
}

export default defineConfig(({ command }) => {
  if (command === "serve") {
    process.env.NODE_ENV = "development";
  }

  const disableHmr = disableHmrOnPublicDevServer();

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,

      allowedHosts: true,

      hmr: disableHmr ? false : undefined,
      watch: disableHmr ? null : undefined,

      proxy: {
        "/api": {
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
