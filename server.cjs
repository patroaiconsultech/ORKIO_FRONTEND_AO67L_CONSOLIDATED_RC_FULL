const express = require("express");
const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");

const app = express();

// AO-SEO01B: canonical redirect from apex domain to www.
// Keeps the original path and query string.
function canonicalWwwRedirect(req, res, next) {
  const host = String(req.headers.host || "").split(":")[0].toLowerCase();

  const legacyHosts = new Set([
    "patroai.com",
    "patroai.com.br",
    "www.patroai.com.br",
  ]);

  if (legacyHosts.has(host)) {
    return res.redirect(308, `https://www.patroai.com${req.originalUrl || "/"}`);
  }

  return next();
}

app.use(canonicalWwwRedirect);

const PORT = process.env.PORT || 8080;
const API_BASE_URL = (process.env.API_BASE_URL || "").replace(/\/+$/, "");

if (!API_BASE_URL) {
  console.error("[ORKIO_WEB_PROXY] Missing required env API_BASE_URL");
  process.exit(1);
}

const distDir = path.join(__dirname, "dist");

app.disable("x-powered-by");

const NO_STORE = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0";

function setHardNoStore(res) {
  res.setHeader("Cache-Control", NO_STORE);
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader("X-EFATA777-Recovery", "v15-hard-cache-expulsion");
}

function sendFileNoStore(res, absolutePath, contentType, fallbackBody = null) {
  setHardNoStore(res);
  if (contentType) res.type(contentType);

  if (fs.existsSync(absolutePath)) {
    return res.sendFile(absolutePath);
  }

  if (fallbackBody !== null && fallbackBody !== undefined) {
    return res.status(200).send(fallbackBody);
  }

  return res.status(404).send("Not found");
}

const SELF_DESTRUCT_SW = `// EFATA777 V15 fallback self-destruct SW
self.addEventListener("install", event => { self.skipWaiting(); event.waitUntil(Promise.resolve()); });
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map(key => caches.delete(key))); } catch {}
    try { await self.registration.unregister(); } catch {}
    try {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(clients.map(client => client.navigate(client.url).catch(() => {})));
    } catch {}
  })());
});
self.addEventListener("fetch", () => {});
`;

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

// EFATA777 V15: rotas explícitas anti-cache para expulsar SW/HTML antigos.
app.get("/sw.js", (_req, res) => {
  sendFileNoStore(res, path.join(distDir, "sw.js"), "application/javascript; charset=utf-8", SELF_DESTRUCT_SW);
});

app.get("/public_sw.js", (_req, res) => {
  sendFileNoStore(res, path.join(__dirname, "public_sw.js"), "application/javascript; charset=utf-8", SELF_DESTRUCT_SW);
});

app.get("/manifest.webmanifest", (_req, res) => {
  const distManifest = path.join(distDir, "manifest.webmanifest");
  const publicManifest = path.join(__dirname, "public", "manifest.webmanifest");
  sendFileNoStore(
    res,
    fs.existsSync(distManifest) ? distManifest : publicManifest,
    "application/manifest+json; charset=utf-8",
    JSON.stringify({
      id: "/app",
      name: "Grupo Patroai",
      short_name: "Patroai",
      start_url: "/app?source=pwa",
      scope: "/",
      display: "standalone",
      theme_color: "#030713",
      background_color: "#030713",
      icons: []
    })
  );
});

app.get(["/", "/index.html"], (_req, res) => {
  sendFileNoStore(res, path.join(distDir, "index.html"), "text/html; charset=utf-8");
});

app.use(
  express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      const basename = path.basename(filePath).toLowerCase();

      if (
        basename === "index.html" ||
        basename === "sw.js" ||
        basename === "manifest.webmanifest"
      ) {
        setHardNoStore(res);
      }
    },
  })
);

app.use("/api", async (req, res) => {
  const target = `${API_BASE_URL}${req.originalUrl}`;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { ...req.headers },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
      duplex: "half"
    });

    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error(err);

    res.status(502).json({
      detail: "WEB_PROXY_UPSTREAM_ERROR"
    });
  }
});

app.get("*", (_req, res) => {
  sendFileNoStore(res, path.join(distDir, "index.html"), "text/html; charset=utf-8");
});

app.listen(PORT, () => {
  console.log(`ORKIO WEB running on ${PORT}`);
});
