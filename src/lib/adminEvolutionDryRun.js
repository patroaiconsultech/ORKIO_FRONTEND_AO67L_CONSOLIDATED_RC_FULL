// AO-16D-R9 — src/lib/adminEvolutionDryRun.js
// Dry-run governado: chama somente o endpoint de simulação.
// Não habilita execução real, commit, deploy ou migration.
//
// Patch R9:
// - força URL absoluta para a API Railway quando VITE_API_BASE_URL não vier no build/runtime;
// - evita fallback relativo /api no domínio WEB;
// - mantém execução real bloqueada por contrato;
// - não usa cookies cross-origin; usa Bearer token + org header.

import {
  getTenant as readTenant,
  getToken as readToken,
} from "../lib/auth.js";

const DEFAULT_API_BASE =
  "https://api-patchd-governance-ready-production.up.railway.app";

function readRuntimeEnvValue(key) {
  try {
    if (typeof window !== "undefined" && window.__ORKIO_ENV__) {
      return window.__ORKIO_ENV__[key];
    }
  } catch {}
  return undefined;
}

function normalizeApiBase(value) {
  let base = String(value || "").trim();

  // Remove quotes acidentais vindas de env/runtime.
  base = base.replace(/^["']+|["']+$/g, "").trim();

  // Se não houver env, NUNCA cair em /api, pois isso bate em www.patroai.com/api.
  if (!base) return DEFAULT_API_BASE;

  // Corrige host Railway sem protocolo, com ou sem barra inicial.
  const withoutLeadingSlash = base.replace(/^\/+/g, "");
  if (
    !/^https?:\/\//i.test(base) &&
    /(^|\.)railway\.app(\/)?/i.test(withoutLeadingSlash)
  ) {
    base = `https://${withoutLeadingSlash}`;
  }

  // Corrige typo comum de protocolo incompleto.
  base = base.replace(/^https:\/([^/])/i, "https://$1");
  base = base.replace(/^http:\/([^/])/i, "http://$1");

  // Se ainda for relativo, força fallback absoluto seguro.
  if (!/^https?:\/\//i.test(base)) {
    return DEFAULT_API_BASE;
  }

  return base.replace(/\/+$/g, "");
}

function getApiBase() {
  return normalizeApiBase(
    readRuntimeEnvValue("VITE_API_BASE_URL") ||
      readRuntimeEnvValue("VITE_API_URL") ||
      readRuntimeEnvValue("API_BASE_URL") ||
      import.meta?.env?.VITE_API_BASE_URL ||
      import.meta?.env?.VITE_API_URL ||
      import.meta?.env?.API_BASE_URL ||
      DEFAULT_API_BASE
  );
}

function getStoredToken() {
  try {
    return (
      readToken?.() ||
      localStorage.getItem("orkio_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("orkio_token") ||
      sessionStorage.getItem("access_token") ||
      sessionStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

function getStoredOrg(options = {}) {
  try {
    return (
      options.org ||
      options.tenant ||
      readTenant?.() ||
      localStorage.getItem("orkio_tenant") ||
      localStorage.getItem("tenant") ||
      localStorage.getItem("org") ||
      localStorage.getItem("org_slug") ||
      sessionStorage.getItem("orkio_tenant") ||
      sessionStorage.getItem("tenant") ||
      sessionStorage.getItem("org") ||
      sessionStorage.getItem("org_slug") ||
      "public"
    );
  } catch {
    return options.org || options.tenant || "public";
  }
}

async function parseResponse(response) {
  const contentType = response.headers?.get?.("content-type") || "";
  let data = {};

  if (response.status === 204) {
    data = {};
  } else if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  } else {
    const text = await response.text().catch(() => "");
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      data?.error ||
      `Falha HTTP ${response.status}`;

    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    err.payload = data;
    throw err;
  }

  return data;
}

function buildDryRunUrl(proposalId) {
  const apiBase = getApiBase();
  return `${apiBase}/api/admin/evolution/proposals/${encodeURIComponent(
    proposalId
  )}/dry-run`;
}

export async function runEvolutionDryRun(proposalId, options = {}) {
  if (!proposalId) {
    throw new Error("proposal_id ausente para dry-run.");
  }

  const token = options.token || getStoredToken();
  const org = getStoredOrg(options);
  const url = buildDryRunUrl(proposalId);

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (org) {
    // Envia ambos por compatibilidade com os padrões já usados no app/backend.
    headers["X-Org-Slug"] = org;
    headers["X-Orkio-Org"] = org;
  }

  console.log("ADMIN_EVOLUTION_DRY_RUN_REQUEST", {
    proposalId,
    url,
    org,
    apiBase: getApiBase(),
  });

  const response = await fetch(url, {
    method: "POST",
    credentials: "omit",
    headers,
    body: JSON.stringify({ dry_run: true }),
  });

  const data = await parseResponse(response);

  if (data?.execution_enabled !== false) {
    throw new Error("Dry-run retornou execution_enabled diferente de false.");
  }

  if (data?.can_execute_real !== false) {
    throw new Error("Dry-run retornou can_execute_real diferente de false.");
  }

  return data;
}

// Alias de compatibilidade caso algum componente importe runDryRun.
export const runDryRun = runEvolutionDryRun;

// Export auxiliar para auditoria manual em DevTools, se necessário.
export const getAdminEvolutionDryRunApiBase = getApiBase;
