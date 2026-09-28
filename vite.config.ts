import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      // The NestJS backend has no CORS and no /api prefix: in dev, proxy
      // /api/* → backend (stripping /api) so the browser stays same-origin.
      proxy: {
        "/api": {
          target: env.BACKEND_URL || "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
