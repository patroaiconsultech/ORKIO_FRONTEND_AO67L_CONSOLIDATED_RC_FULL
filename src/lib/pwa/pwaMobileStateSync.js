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
        if (safeValue) store.setItem(key, safeValue);
        else store.removeItem(key);
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
  forceNewestOnMobile = true,
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
  if (!newestId) return current || stored || "";

  const storedThread = stored ? list.find((t) => threadIdOf(t) === stored) : null;
  const currentThread = current ? list.find((t) => threadIdOf(t) === current) : null;

  // PWA mobile often boots with stale localStorage from a previous installed session.
  // Prefer server's freshest thread unless the active thread is explicitly present and newer/equal.
  const candidate = currentThread || storedThread || null;
  if (!candidate) return newestId;

  const newestTime = threadTimeOf(newest);
  const candidateTime = threadTimeOf(candidate);
  if (forceNewestOnMobile && newestId && newestId !== threadIdOf(candidate)) {
    if (!candidateTime || !newestTime || newestTime >= candidateTime) return newestId;
  }

  return threadIdOf(candidate) || newestId;
}

export function normalizeDestinationForAvailableAgents({
  agents,
  mode,
  single,
  multi,
  isMobile,
} = {}) {
  const list = Array.isArray(agents) ? agents : [];
  const ids = new Set(list.map((a) => String(a?.id || a?.agent_id || a?.slug || "").trim()).filter(Boolean));

  const stored = readPwaMobileDestinationState();
  const rawMode = String(mode || stored.mode || "team").trim().toLowerCase();
  const safeMode = ["team", "single", "multi"].includes(rawMode) ? rawMode : "team";

  const rawSingle = String(single || stored.single || "").trim();
  const validSingle = rawSingle && ids.has(rawSingle) ? rawSingle : "";

  const rawMulti = Array.isArray(multi) && multi.length ? multi : stored.multi;
  const validMulti = Array.isArray(rawMulti)
    ? Array.from(new Set(rawMulti.map((v) => String(v || "").trim()).filter((id) => id && ids.has(id))))
    : [];

  if (!list.length) {
    return { mode: "team", single: "", multi: [] };
  }

  const mobile = isLikelyPwaMobileRuntime(isMobile);

  // If mobile has a stale single-agent id, do not keep it silently.
  // This prevents the PWA from showing a different selected agent from an old install session.
  if (safeMode === "single") {
    if (validSingle) return { mode: "single", single: validSingle, multi: validMulti };
    return { mode: "team", single: "", multi: validMulti };
  }

  if (safeMode === "multi") {
    if (validMulti.length) return { mode: "multi", single: validSingle, multi: validMulti };
    return { mode: "team", single: validSingle, multi: [] };
  }

  return {
    mode: mobile && !validSingle && !validMulti.length ? "team" : safeMode,
    single: validSingle,
    multi: validMulti,
  };
}

export function installPwaMobileResyncListeners(callback) {
  if (typeof callback !== "function") return () => {};
  const w = safeWindow();
  const d = safeDocument();
  if (!w) return () => {};

  const handler = () => {
    try { callback(); } catch {}
  };

  const listeners = [
    [w, "pageshow", handler],
    [w, "focus", handler],
    [w, "online", handler],
    [w, "storage", handler],
    [d, "visibilitychange", () => {
      try {
        if (!d || d.visibilityState === "visible") handler();
      } catch { handler(); }
    }],
  ].filter(([target]) => target && target.addEventListener);

  for (const [target, event, fn] of listeners) {
    try { target.addEventListener(event, fn); } catch {}
  }

  return () => {
    for (const [target, event, fn] of listeners) {
      try { target.removeEventListener(event, fn); } catch {}
    }
  };
}
