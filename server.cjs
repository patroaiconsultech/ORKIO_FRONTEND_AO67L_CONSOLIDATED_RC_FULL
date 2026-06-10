const express = require("express");
const path = require("path");
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
const API_BASE_URL = (process.env.API_BASE_URL||"").replace(/\/+$/, "");

if (!API_BASE_URL) {
  console.error("[ORKIO_WEB_PROXY] Missing required env API_BASE_URL");
  process.exit(1);
}

const distDir = path.join(__dirname, "dist");

app.disable("x-powered-by");

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use(express.static(distDir, { index: false }));

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
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`ORKIO WEB running on ${PORT}`);
});
