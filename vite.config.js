import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Dev-only proxy so browser mode can download PDFs without CORS. */
function browserProxyPlugin() {
  return {
    name: "browser-proxy",
    configureServer(server) {
      server.middlewares.use("/__browser_proxy", async (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }
        try {
          const u = new URL(req.url || "", "http://localhost");
          const target = u.searchParams.get("url");
          if (!target) {
            res.statusCode = 400;
            res.end("Missing url");
            return;
          }
          const parsed = new URL(target);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            res.statusCode = 400;
            res.end("Invalid protocol");
            return;
          }
          const response = await fetch(parsed.href, {
            headers: { "User-Agent": "PaperManager/0.3 (browser-dev)" },
            redirect: "follow",
          });
          res.statusCode = response.status;
          const cd = response.headers.get("content-disposition");
          if (cd) res.setHeader("content-disposition", cd);
          const ct = response.headers.get("content-type");
          if (ct) res.setHeader("content-type", ct);
          const buf = Buffer.from(await response.arrayBuffer());
          res.end(buf);
        } catch (e) {
          res.statusCode = 502;
          res.end(String(e.message || e));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), browserProxyPlugin()],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true,
  },
  publicDir: "public",
});
