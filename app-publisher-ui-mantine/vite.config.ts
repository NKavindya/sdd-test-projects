import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { Agent } from "node:https";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const target = env.UEM_ORIGIN || "https://localhost:9443";
  const ca = env.NODE_EXTRA_CA_CERTS;
  const agent = ca
    ? new Agent({ ca: readFileSync(ca), rejectUnauthorized: true })
    : undefined;
  const proxy = {
    target,
    changeOrigin: true,
    agent,
    cookieDomainRewrite: "",
    headers: { Origin: target },
  };
  return {
    base: "/app-publisher/",
    plugins: [
      react(),
      {
        name: "publisher-config-path",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "public/conf/config.json",
            source: readFileSync("public/conf/config.json", "utf8"),
          });
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id))
              return "react";
            if (id.includes("@mantine")) return "mantine";
            if (id.includes("i18next")) return "i18n";
          },
        },
      },
    },
    server: {
      https:
        command === "serve"
          ? {
              key: readFileSync(".local/localhost-key.pem"),
              cert: readFileSync(".local/localhost.pem"),
            }
          : undefined,
      port: 5173,
      strictPort: true,
      proxy: {
        "/publisher-ui-request-handler": proxy,
        "/api": proxy,
        "/authenticationendpoint": proxy,
        "/oauth2": proxy,
        "/commonauth": proxy,
        "/store": proxy,
        "/endpoint-mgt": proxy,
      },
    },
  };
});
