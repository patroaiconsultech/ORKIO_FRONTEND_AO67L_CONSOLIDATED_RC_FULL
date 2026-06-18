// DEF-01A_PWA_CONSOLE_RECOVERY_SAFE
// Runtime-safe PWA/mobile console recovery utilities.
// Goals:
// - Never crash AppConsole at module import or render time.
// - Tolerate unavailable/blocked localStorage/sessionStorage in PWA/WebView.
// - Normalize /api/agents and /api/threads payload shapes without assuming one backend envelope.
// - Keep all side effects opt-in through exported helper calls.

export const PWA_THREAD_STORAGE_KEYS = Object.freeze([
  "orkio_active_thread_id",
  "orkio_pwa_active_thread_id",
  "orkio_last_active_thread_id",
]);

export const PWA_AGENT_STORAGE_KEYS = Object.freeze([
  "orkio_last_dest_single",
  "orkio_pwa_last_dest_single",
  "orkio_active_agent_id",
]);

export const PWA_AGENTS_CACHE_KEY = "orkio_pwa_agents_cache_v1";
export const PWA_THREADS_CACHE_KEY = "orkio_pwa_threads_cache_v1";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactString(value) {
  return String(value ?? "").trim();
}

function safeLower(value) {
  return compactString(value).toLowerCase();
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getGlobalWindow() {
  try {
    if (typeof window !== "undefined") return window;
  } catch {}
  return null;
}

function getGlobalDocument() {
  try {
    if (typeof document !== "undefined") return document;
  } catch {}
  return null;
}

function getStorageSurface(name) {
  const w = getGlobalWindow();
  if (!w) return null;

  try {
    const store = w[name];
    if (
      store &&
      typeof store.getItem === "function" &&
      typeof store.setItem === "function" &&
      typeof store.removeItem === "function"
    ) {
      return store;
    }
  } catch {
    // Safari/PWA/WebView can throw SecurityError just by accessing storage.
  }

  return null;
}

function storageSurfaces() {
  const surfaces = [];
  const local = getStorageSurface("localStorage");
  const session = getStorageSurface("sessionStorage");

  if (local) surfaces.push(local);
  if (session && session !== local) surfaces.push(session);

  return surfaces;
}

export function normalizeApiListPayload(response, preferredKeys = []) {
  const queue = [
    response,
    response?.data,
    response?.payload,
    response?.result,
    response?.body,
  ].filter((item) => item !== undefined && item !== null);

  const seen = new Set();

  while (queue.length) {
    const candidate = queue.shift();

    if (Array.isArray(candidate)) return candidate;
    if (!isPlainObject(candidate)) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);

    for (const key of preferredKeys || []) {
      const value = candidate?.[key];
      if (Array.isArray(value)) return value;
      if (isPlainObject(value)) queue.push(value);
    }

    for (const key of ["items", "results", "records", "rows", "list", "data", "agents", "threads", "conversations"]) {
      const value = candidate?.[key];
      if (Array.isArray(value)) return value;
      if (isPlainObject(value)) queue.push(value);
    }
  }

  return [];
}

export function normalizeThreadsResponse(response) {
  return normalizeApiListPayload(response, ["threads", "conversations"])
    .filter((item) => item && typeof item === "object")
    .map((thread) => {
      const id = compactString(thread.id || thread.thread_id || thread.threadId || thread.uuid);
      const title = compactString(
        thread.title ||
        thread.name ||
        thread.label ||
        thread.subject ||
        "Conversa"
      );

      return {
        ...thread,
        id,
        thread_id: compactString(thread.thread_id || id),
        title,
      };
    })
    .filter((thread) => thread.id);
}

export function normalizeAgentsResponse(response) {
  return normalizeApiListPayload(response, ["agents", "agent_list", "available_agents"])
    .filter((item) => item && typeof item === "object")
    .map((agent) => {
      const rawName = compactString(
        agent.name ||
        agent.agent_name ||
        agent.display_name ||
        agent.label ||
        agent.slug ||
        agent.key ||
        agent.id
      );
      const id = compactString(agent.id || agent.agent_id || agent.slug || agent.key || rawName);
      const slug = compactString(agent.slug || agent.key || rawName || id)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "");

      return {
        ...agent,
        id,
        name: rawName || id || "Agente",
        slug: slug || safeLower(id) || "agent",
      };
    })
    .filter((agent) => agent.id && agent.name);
}

export function readFirstStoredValue(keys = []) {
  const safeKeys = safeArray(keys).map(compactString).filter(Boolean);
  if (!safeKeys.length) return "";

  for (const store of storageSurfaces()) {
    for (const key of safeKeys) {
      try {
        const value = compactString(store.getItem(key));
        if (value) return value;
      } catch {}
    }
  }

  return "";
}

export function writeStoredValue(keys = [], value = "") {
  const safeKeys = safeArray(keys).map(compactString).filter(Boolean);
  if (!safeKeys.length) return;

  const safeValue = compactString(value);

  for (const store of storageSurfaces()) {
    for (const key of safeKeys) {
      try {
        if (safeValue) store.setItem(key, safeValue);
        else store.removeItem(key);
      } catch {}
    }
  }
}

export function readPwaStoredThreadId() {
  return readFirstStoredValue(PWA_THREAD_STORAGE_KEYS);
}

export function writePwaStoredThreadId(threadId = "") {
  writeStoredValue(PWA_THREAD_STORAGE_KEYS, threadId);
}

export function readPwaSelectedAgentId() {
  return readFirstStoredValue(PWA_AGENT_STORAGE_KEYS);
}

export function writePwaSelectedAgentId(agentId = "") {
  writeStoredValue(PWA_AGENT_STORAGE_KEYS, agentId);
}

function readCachedEnvelope(key) {
  const safeKey = compactString(key);
  if (!safeKey) return [];

  for (const store of storageSurfaces()) {
    try {
      const raw = store.getItem(safeKey);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      if (Array.isArray(parsed?.data)) return parsed.data;
    } catch {}
  }

  return [];
}

export function writePwaCachedList(key, list) {
  const safeKey = compactString(key);
  const safeList = safeArray(list);
  if (!safeKey || !safeList.length) return;

  const payload = JSON.stringify({
    cached_at: Date.now(),
    items: safeList,
  });

  for (const store of storageSurfaces()) {
    try {
      store.setItem(safeKey, payload);
    } catch {}
  }
}

export function readPwaCachedList(key) {
  return readCachedEnvelope(key);
}

export function readCachedAgents() {
  return normalizeAgentsResponse({ data: readPwaCachedList(PWA_AGENTS_CACHE_KEY) });
}

export function writeCachedAgents(agents) {
  const normalized = normalizeAgentsResponse({ data: agents });
  if (normalized.length) writePwaCachedList(PWA_AGENTS_CACHE_KEY, normalized);
}

export function readCachedThreads() {
  return normalizeThreadsResponse({ data: readPwaCachedList(PWA_THREADS_CACHE_KEY) });
}

export function writeCachedThreads(threads) {
  const normalized = normalizeThreadsResponse({ data: threads });
  if (normalized.length) writePwaCachedList(PWA_THREADS_CACHE_KEY, normalized);
}

export function isInternalAgentVisibleFromList(agents = []) {
  return safeArray(agents).some((agent) => {
    const key = safeLower(agent?.slug || agent?.key || agent?.name || agent?.id);
    return !!key && key !== "orkio";
  });
}

export function bindPwaConsoleResumeRestore({
  enabled,
  getActiveThreadId,
  loadThreads,
  loadMessages,
  log,
  minIntervalMs = 1200,
} = {}) {
  const w = getGlobalWindow();
  const d = getGlobalDocument();

  if (!w || !enabled) return () => {};

  let disposed = false;
  let lastRestoreAt = 0;

  const restore = (source = "pwa_resume") => {
    if (disposed) return;

    try {
      const now = Date.now();
      const interval = Math.max(250, Number(minIntervalMs || 0) || 1200);
      if (now - lastRestoreAt < interval) return;
      lastRestoreAt = now;

      const preservedId = compactString(
        (typeof getActiveThreadId === "function" ? getActiveThreadId() : "") ||
        readPwaStoredThreadId()
      );

      if (typeof loadThreads !== "function") return;

      Promise.resolve(
        loadThreads({
          preserveThreadId: preservedId,
          keepMessages: true,
          manualRetry: false,
          source,
        })
      )
        .then(() => {
          if (disposed || typeof loadMessages !== "function") return null;

          const activeId = compactString(
            (typeof getActiveThreadId === "function" ? getActiveThreadId() : "") ||
            preservedId
          );

          if (!activeId) return null;

          return loadMessages(activeId, {
            force: true,
            manualRetry: true,
            source,
          });
        })
        .catch((err) => {
          try {
            log?.("pwa:resume_restore_failed", {
              source,
              message: err?.message || null,
            });
          } catch {}
        });

      try {
        log?.("pwa:resume_restore_requested", {
          source,
          preserved_thread_id: preservedId || null,
        });
      } catch {}
    } catch (err) {
      try {
        log?.("pwa:resume_restore_crash_guarded", {
          source,
          message: err?.message || null,
        });
      } catch {}
    }
  };

  const onVisibility = () => {
    try {
      if (!d || d.visibilityState === "visible") restore("visibility_visible");
    } catch {
      restore("visibility_guarded");
    }
  };

  const onPageShow = () => restore("pageshow");
  const onFocus = () => restore("focus");
  const onOnline = () => restore("online");

  try { w.addEventListener?.("pageshow", onPageShow); } catch {}
  try { w.addEventListener?.("focus", onFocus); } catch {}
  try { w.addEventListener?.("online", onOnline); } catch {}
  try { d?.addEventListener?.("visibilitychange", onVisibility); } catch {}

  return () => {
    disposed = true;
    try { w.removeEventListener?.("pageshow", onPageShow); } catch {}
    try { w.removeEventListener?.("focus", onFocus); } catch {}
    try { w.removeEventListener?.("online", onOnline); } catch {}
    try { d?.removeEventListener?.("visibilitychange", onVisibility); } catch {}
  };
}
