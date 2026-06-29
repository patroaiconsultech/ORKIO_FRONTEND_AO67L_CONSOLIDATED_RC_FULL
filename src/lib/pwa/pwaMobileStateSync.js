// SYNC-M01 — PWA mobile state sync helpers
// Scope: frontend-only mobile/PWA state alignment.
// This module is deliberately defensive: no direct storage access without try/catch.

const THREAD_KEYS = [
  "orkio_active_thread_id",
  "orkio_pwa_active_thread_id",
  "orkio_last_active_thread_id",
];

const DEST_MODE_KEYS = [
  "orkio_last_dest_mode",
  "orkio_pwa_dest_mode",
];

const DEST_SINGLE_KEYS = [
  "orkio_last_dest_single",
  "orkio_pwa_dest_single",
];

const DEST_MULTI_KEYS = [
  "orkio_last_dest_multi",
  "orkio_pwa_dest_multi",
];

const RESYNC_STORAGE_KEYS = new Set([
  ...THREAD_KEYS,
  ...DEST_MODE_KEYS,
  ...DEST_SINGLE_KEYS,
  ...DEST_MULTI_KEYS,
]);

function safeWindow() {
  try {
    return typeof window !== "undefined" ? window : null;
  } catch {
    return null;
  }
}

function safeDocument() {
  try {
    return typeof document !== "undefined" ? document : null;
  } catch {
    return null;
  }
}

function safeNavigator() {
  try {
    return typeof navigator !== "undefined" ? navigator : null;
  } catch {
    return null;
  }
}

function getLocalStorage() {
  try {
    const w = safeWindow();
    return w?.localStorage || null;
  } catch {
    return null;
  }
}

function getSessionStorage() {
  try {
    const w = safeWindow();
    return w?.sessionStorage || null;
  } catch {
    return null;
  }
}

function readFirstStorageValue(keys = []) {
  const stores = [getLocalStorage(), getSessionStorage()].filter(Boolean);
  for (const store of stores) {
    for (const key of keys) {
      try {
        const value = store.getItem(key);
        if (value !== null && value !== undefined && String(value).trim()) {
          return String(value).trim();
        }
      } catch {}
    }
  }
  return "";
}

function writeStorageValue(keys = [], value = "") {
  const safeValue = String(value || "").trim();
  const stores = [getLocalStorage(), getSessionStorage()].filter(Boolean);
  for (const store of stores) {
    for (const key of keys) {
      try {
        const currentValue = store.getItem(key);
        if (safeValue) {
          if (currentValue !== safeValue) store.setItem(key, safeValue);
        } else if (currentValue !== null) {
          store.removeItem(key);
        }
      } catch {}
    }
  }
}

function readJsonStorage(keys = [], fallback = null) {
  const raw = readFirstStorageValue(keys);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonStorage(keys = [], value) {
  let raw = "";
  try {
    raw = JSON.stringify(value);
  } catch {
    raw = "";
  }
  writeStorageValue(keys, raw);
}

export function isLikelyPwaMobileRuntime(isMobileHint = false) {
  const w = safeWindow();
  const d = safeDocument();
  const n = safeNavigator();

  let standalone = false;
  try {
    standalone = Boolean(
      w?.matchMedia?.("(display-mode: standalone)")?.matches ||
      w?.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      n?.standalone === true ||
      String(d?.referrer || "").startsWith("android-app://")
    );
  } catch {
    standalone = false;
  }

  let mobile = Boolean(isMobileHint);
  try {
    mobile = mobile || Boolean(w?.matchMedia?.("(max-width: 820px)")?.matches);
  } catch {}
  try {
    mobile = mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(String(n?.userAgent || ""));
  } catch {}

  return Boolean(standalone || mobile);
}

export function readPwaMobileActiveThreadId() {
  return readFirstStorageValue(THREAD_KEYS);
}

export function persistPwaMobileActiveThreadId(threadId = "") {
  writeStorageValue(THREAD_KEYS, threadId);
}

export function readPwaMobileDestinationState() {
  const mode = readFirstStorageValue(DEST_MODE_KEYS);
  const single = readFirstStorageValue(DEST_SINGLE_KEYS);
  const multi = readJsonStorage(DEST_MULTI_KEYS, []);
  return {
    mode: ["team", "single", "multi"].includes(String(mode || "").toLowerCase()) ? String(mode).toLowerCase() : "",
    single: String(single || "").trim(),
    multi: Array.isArray(multi) ? multi.map((v) => String(v || "").trim()).filter(Boolean) : [],
  };
}

export function persistPwaMobileDestinationState({ mode, single, multi } = {}) {
  if (mode !== undefined) {
    const safeMode = ["team", "single", "multi"].includes(String(mode || "").trim().toLowerCase())
      ? String(mode || "").trim().toLowerCase()
      : "team";
    writeStorageValue(DEST_MODE_KEYS, safeMode);
  }
  if (single !== undefined) {
    writeStorageValue(DEST_SINGLE_KEYS, single);
  }
  if (multi !== undefined) {
    const clean = Array.isArray(multi)
      ? Array.from(new Set(multi.map((v) => String(v || "").trim()).filter(Boolean)))
      : [];
    writeJsonStorage(DEST_MULTI_KEYS, clean);
  }
}

function coerceTimeMs(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 10_000_000_000 ? value : value * 1000;
  }
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const n = Number(raw);
  if (Number.isFinite(n)) return n > 10_000_000_000 ? n : n * 1000;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function threadIdOf(thread) {
  return String(thread?.id || thread?.thread_id || thread?.threadId || "").trim();
}

function threadTimeOf(thread) {
  return Math.max(
    coerceTimeMs(thread?.updated_at),
    coerceTimeMs(thread?.updatedAt),
    coerceTimeMs(thread?.last_message_at),
    coerceTimeMs(thread?.lastMessageAt),
    coerceTimeMs(thread?.created_at),
    coerceTimeMs(thread?.createdAt),
    coerceTimeMs(thread?.timestamp)
  );
}

export function selectPreferredThreadIdForPwaMobile({
  threads,
  currentThreadId,
  storedThreadId,
  isMobile,
  forceNewestOnMobile = false,
} = {}) {
  const list = Array.isArray(threads) ? threads : [];
  const current = String(currentThreadId || "").trim();
  const stored = String(storedThreadId || "").trim();

  if (!list.length) return current || stored || "";

  const mobile = isLikelyPwaMobileRuntime(isMobile);

  // On desktop/browser, preserve explicit current/stored behavior.
  if (!mobile) return current || stored || threadIdOf(list[0]);

  const newest = [...list].sort((a, b) => {
    const tb = threadTimeOf(b);
    const ta = threadTimeOf(a);
    if (tb !== ta) return tb - ta;
    return 0;
  })[0] || list[0];

  const newestId = threadIdOf(newest);
  const storedThread = stored ? list.find((t) => threadIdOf(t) === stored) : null;
  const currentThread = current ? list.find((t) => threadIdOf(t) === current) : null;

  // EFATA777_V4:
  // Realtime must never jump to the newest thread merely because the PWA resumed.
  // Preserve the visible/current thread first, then the stored thread, then fallback
  // to the newest server thread only when no explicit thread is still valid.
  if (currentThread) return threadIdOf(currentThread);
  if (storedThread) return threadIdOf(storedThread);
  if (!newestId) return current || stored || "";

  if (forceNewestOnMobile) return newestId;

  return current || stored || newestId;
}

function normalizeAgentToken(value = "") {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function collectAgentIdentifiers(agent) {
  const out = new Set();
  const rawValues = [
    agent?.id,
    agent?.agent_id,
    agent?.slug,
    agent?.agent_slug,
    agent?.key,
    agent?.code,
    agent?.name,
    agent?.label,
  ];

  for (const value of rawValues) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    out.add(raw);
    const normalized = normalizeAgentToken(raw);
    if (normalized) out.add(normalized);
  }

  return out;
}

function buildAgentIdentifierMap(agents = []) {
  const map = new Map();
  for (const agent of Array.isArray(agents) ? agents : []) {
    const canonicalId = String(agent?.id || agent?.agent_id || agent?.slug || agent?.agent_slug || agent?.name || "").trim();
    if (!canonicalId) continue;
    for (const identifier of collectAgentIdentifiers(agent)) {
      map.set(String(identifier || "").trim(), canonicalId);
      const normalized = normalizeAgentToken(identifier);
      if (normalized) map.set(normalized, canonicalId);
    }
  }
  return map;
}

export function normalizeDestinationForAvailableAgents({
  agents,
  mode,
  single,
  multi,
  isMobile,
} = {}) {
  const list = Array.isArray(agents) ? agents : [];
  const idMap = buildAgentIdentifierMap(list);

  const resolveAgentId = (value = "") => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return idMap.get(raw) || idMap.get(normalizeAgentToken(raw)) || "";
  };

  const stored = readPwaMobileDestinationState();
  const rawMode = String(mode || stored.mode || "team").trim().toLowerCase();
  const safeMode = ["team", "single", "multi"].includes(rawMode) ? rawMode : "team";

  const rawSingle = String(single || stored.single || "").trim();
  const validSingle = resolveAgentId(rawSingle);

  const rawMulti = Array.isArray(multi) && multi.length ? multi : stored.multi;
  const validMulti = Array.isArray(rawMulti)
    ? Array.from(new Set(rawMulti.map((v) => resolveAgentId(v)).filter(Boolean)))
    : [];

  if (!list.length) {
    return { mode: "team", single: "", multi: [] };
  }

  const mobile = isLikelyPwaMobileRuntime(isMobile);

  if (safeMode === "single") {
    if (validSingle) return { mode: "single", single: validSingle, multi: [] };
    if (validMulti.length === 1) return { mode: "single", single: validMulti[0], multi: [] };
    return { mode: "team", single: "", multi: validMulti };
  }

  if (safeMode === "multi") {
    if (validMulti.length) return { mode: "multi", single: validSingle, multi: validMulti };
    if (validSingle) return { mode: "single", single: validSingle, multi: [] };
    return { mode: "team", single: "", multi: [] };
  }

  // In Team mode we keep a valid single value in storage for Realtime fallback,
  // but the visible mode remains Team unless the user explicitly selects a specialist.
  return {
    mode: mobile && !validSingle && !validMulti.length ? "team" : safeMode,
    single: validSingle,
    multi: validMulti,
  };
}


export function installPwaMobileResyncListeners(callback, options = {}) {
  if (typeof callback !== "function") return () => {};
  const w = safeWindow();
  const d = safeDocument();
  if (!w) return () => {};

  const debounceMs = Math.max(250, Number(options?.debounceMs || 500));
  let disposed = false;
  let timer = null;
  let inFlight = false;
  let queuedSource = "";

  const run = async (source = "pwa_resync") => {
    if (disposed) return;
    if (inFlight) {
      queuedSource = queuedSource || source;
      return;
    }

    inFlight = true;
    try {
      await Promise.resolve(callback({ source }));
    } catch {
      // Resume synchronization is fail-open and must never break AppConsole.
    } finally {
      inFlight = false;
      if (!disposed && queuedSource) {
        const nextSource = queuedSource;
        queuedSource = "";
        schedule(nextSource);
      }
    }
  };

  const schedule = (source = "pwa_resync") => {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void run(source);
    }, debounceMs);
  };

  const onPageShow = () => schedule("pageshow");
  const onFocus = () => schedule("focus");
  const onOnline = () => schedule("online");
  const onStorage = (event) => {
    const key = String(event?.key || "").trim();
    if (key && !RESYNC_STORAGE_KEYS.has(key)) return;
    schedule("storage");
  };
  const onVisibilityChange = () => {
    try {
      if (!d || d.visibilityState === "visible") schedule("visibilitychange");
    } catch {
      schedule("visibilitychange");
    }
  };

  const listeners = [
    [w, "pageshow", onPageShow],
    [w, "focus", onFocus],
    [w, "online", onOnline],
    [w, "storage", onStorage],
    [d, "visibilitychange", onVisibilityChange],
  ].filter(([target]) => target && target.addEventListener);

  for (const [target, event, fn] of listeners) {
    try { target.addEventListener(event, fn); } catch {}
  }

  return () => {
    disposed = true;
    queuedSource = "";
    if (timer) clearTimeout(timer);
    timer = null;
    for (const [target, event, fn] of listeners) {
      try { target.removeEventListener(event, fn); } catch {}
    }
  };
}
