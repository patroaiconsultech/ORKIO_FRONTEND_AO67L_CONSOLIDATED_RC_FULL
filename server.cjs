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

const HARD_NO_STORE = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0";
const HTML_REVALIDATE = "no-cache, max-age=0, must-revalidate";
const MANIFEST_REVALIDATE = "no-cache, max-age=0, must-revalidate";
const IMMUTABLE_ASSET = "public, max-age=31536000, immutable";
const STATIC_REVALIDATE = "public, max-age=86400, must-revalidate";

function setHardNoStore(res) {
  res.setHeader("Cache-Control", HARD_NO_STORE);
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader("X-EFATA777-Recovery", "v17-installability-network-only");
}

function setHtmlRevalidate(res) {
  res.setHeader("Cache-Control", HTML_REVALIDATE);
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader("X-EFATA777-Recovery", "v17-installability-network-only");
}

function setManifestRevalidate(res) {
  res.setHeader("Cache-Control", MANIFEST_REVALIDATE);
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader("X-EFATA777-Recovery", "v17-installability-network-only");
}

function sendFileWithHeaders(res, absolutePath, contentType, setHeaders, fallbackBody = null) {
  if (typeof setHeaders === "function") setHeaders(res);
  if (contentType) res.type(contentType);

  if (fs.existsSync(absolutePath)) {
    return res.sendFile(absolutePath);
  }

  if (fallbackBody !== null && fallbackBody !== undefined) {
    return res.status(200).send(fallbackBody);
  }

  return res.status(404).send("Not found");
}

const CONSERVATIVE_SW = `// EFATA777 V17 — installability network-only Service Worker
// Objetivo:
// - satisfazer critérios Chromium de installability com fetch handler real;
// - manter landing rápida e sem cache agressivo;
// - não fazer precache, não fazer warmAppShell, não cachear API;
// - limpar caches legados e responder sempre pela rede.

const EFATA777_SW_VERSION = "v17-installability-network-only";

async function clearLegacyCaches() {
  try {
    if (!self.caches) return;
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => /orkio|patroai|efata777/i.test(String(key || "")))
        .map((key) => caches.delete(key))
    );
  } catch {}
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(clearLegacyCaches());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await clearLegacyCaches();
      try {
        await self.clients.claim();
      } catch {}
    })()
  );
});

function shouldNetworkHandle(request) {
  try {
    if (!request || request.method !== "GET") return false;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;

    // Nunca interceptar API/eventos/sockets/transcrições/env runtime.
    if (url.pathname.startsWith("/api/")) return false;
    if (url.pathname === "/env.js") return false;
    if (url.pathname.startsWith("/sockjs")) return false;

    // Critério de installability Chromium: SW precisa ter fetch handler real.
    // Usamos network-only para todos os GET same-origin elegíveis.
    return true;
  } catch {
    return false;
  }
}

// Fetch handler real, porém conservador:
// - event.respondWith(fetch(...)) somente para GET same-origin elegíveis;
// - sem cache, sem fallback offline, sem shell pré-carregado;
// - evita pending por cache antigo e satisfaz installability.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!shouldNetworkHandle(request)) return;

  event.respondWith(
    fetch(request).catch(() => {
      // Sem fallback HTML para não mascarar erro real nem travar landing.
      return new Response("", {
        status: 503,
        statusText: "Network unavailable",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-EFATA777-SW": EFATA777_SW_VERSION,
        },
      });
    })
  );
});

self.addEventListener("message", (event) => {
  try {
    const type = event?.data?.type;

    if (type === "SKIP_WAITING") {
      self.skipWaiting();
      return;
    }

    if (type === "EFATA777_CLEAR_LEGACY_CACHES") {
      event.waitUntil(clearLegacyCaches());
      return;
    }

    if (type === "EFATA777_PWA_DIAGNOSTIC") {
      event?.source?.postMessage?.({
        type: "EFATA777_PWA_DIAGNOSTIC_RESULT",
        sw_version: EFATA777_SW_VERSION,
        cache_policy: "network-only",
        cache_keys_cleared: true,
      });
    }
  } catch {}
});
`;

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

// EFATA777 V16: /sw.js continua anti-cache forte, mas volta a ser SW conservador.
// Importante: Service-Worker-Allowed permite scope "/" sem cache agressivo.
app.get("/sw.js", (_req, res) => {
  setHardNoStore(res);
  res.setHeader("Service-Worker-Allowed", "/");
  res.type("application/javascript; charset=utf-8");

  const distSw = path.join(distDir, "sw.js");
  if (fs.existsSync(distSw)) return res.sendFile(distSw);
  return res.status(200).send(CONSERVATIVE_SW);
});

app.get("/public_sw.js", (_req, res) => {
  setHardNoStore(res);
  res.setHeader("Service-Worker-Allowed", "/");
  res.type("application/javascript; charset=utf-8");

  const publicSw = path.join(__dirname, "public_sw.js");
  if (fs.existsSync(publicSw)) return res.sendFile(publicSw);
  return res.status(200).send(CONSERVATIVE_SW);
});

app.get("/manifest.webmanifest", (_req, res) => {
  const distManifest = path.join(distDir, "manifest.webmanifest");
  const publicManifest = path.join(__dirname, "public", "manifest.webmanifest");

  sendFileWithHeaders(
    res,
    fs.existsSync(distManifest) ? distManifest : publicManifest,
    "application/manifest+json; charset=utf-8",
    setManifestRevalidate,
    JSON.stringify({
      id: "/app",
      name: "Grupo Patroai",
      short_name: "Patroai",
      start_url: "/app?source=pwa",
      scope: "/",
      display: "standalone",
      theme_color: "#030713",
      background_color: "#030713",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ]
    })
  );
});

app.get(["/", "/index.html"], (_req, res) => {
  sendFileWithHeaders(res, path.join(distDir, "index.html"), "text/html; charset=utf-8", setHtmlRevalidate);
});

app.use(
  express.static(distDir, {
    index: false,
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      const basename = path.basename(filePath).toLowerCase();
      const rel = filePath.replace(distDir, "").replace(/\\/g, "/").toLowerCase();

      if (basename === "sw.js") {
        setHardNoStore(res);
        res.setHeader("Service-Worker-Allowed", "/");
        return;
      }

      if (basename === "manifest.webmanifest") {
        setManifestRevalidate(res);
        return;
      }

      if (basename === "index.html" || basename === "env.js") {
        setHtmlRevalidate(res);
        return;
      }

      if (rel.startsWith("/assets/")) {
        res.setHeader("Cache-Control", IMMUTABLE_ASSET);
        res.setHeader("Vary", "Accept-Encoding");
        return;
      }

      if (/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)$/i.test(basename)) {
        res.setHeader("Cache-Control", STATIC_REVALIDATE);
        res.setHeader("Vary", "Accept-Encoding");
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
  sendFileWithHeaders(res, path.join(distDir, "index.html"), "text/html; charset=utf-8", setHtmlRevalidate);
});

app.listen(PORT, () => {
  console.log(`ORKIO WEB running on ${PORT}`);
});
