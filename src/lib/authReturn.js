/**
 * AO-14C — Auth Return Bridge
 *
 * Purpose:
 * Preserve a safe in-app return path when a protected route sends the user to login.
 *
 * Security:
 * - Rejects absolute URLs and protocol-relative URLs to avoid open redirects.
 * - Allows only internal paths.
 * - Stores only a short-lived returnTo in sessionStorage.
 */

const RETURN_TO_KEY = "orkio:returnTo";

export const DEFAULT_AFTER_LOGIN_PATH = "/app";

export function sanitizeReturnTo(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  // Avoid open redirects.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "";
  if (value.startsWith("//")) return "";

  const normalized = value.startsWith("/") ? value : `/${value}`;

  // Keep this list intentionally narrow.
  const allowedPrefixes = [
    "/admin/evolution",
    "/orkio/admin/evolution",
    "/admin/pte",
    "/admin/autoevolucao",
    "/admin",
    "/app",
    "/console",
    "/chat",
    "/orkio"
  ];

  const isAllowed = allowedPrefixes.some((prefix) => {
    return (
      normalized === prefix ||
      normalized.startsWith(`${prefix}/`) ||
      normalized.startsWith(`${prefix}?`)
    );
  });

  return isAllowed ? normalized : "";
}

export function getCurrentReturnPath(locationObj) {
  const loc = locationObj || window.location;
  const pathname = loc.pathname || "/";
  const search = loc.search || "";
  const hash = loc.hash || "";
  return sanitizeReturnTo(`${pathname}${search}${hash}`);
}

export function buildLoginUrl(returnTo) {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (!safeReturnTo) return "/login";
  return `/login?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function rememberReturnTo(returnTo) {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (!safeReturnTo) return "";
  try {
    window.sessionStorage.setItem(RETURN_TO_KEY, safeReturnTo);
  } catch (_) {
    // Non-blocking: browser privacy modes can block storage.
  }
  return safeReturnTo;
}

export function readReturnToFromSearch(search) {
  const params = new URLSearchParams(search || "");
  return sanitizeReturnTo(params.get("returnTo") || params.get("next") || "");
}

export function consumeReturnTo(locationObj) {
  const loc = locationObj || window.location;
  const fromQuery = readReturnToFromSearch(loc.search || "");
  if (fromQuery) {
    try {
      window.sessionStorage.removeItem(RETURN_TO_KEY);
    } catch (_) {}
    return fromQuery;
  }

  try {
    const stored = sanitizeReturnTo(window.sessionStorage.getItem(RETURN_TO_KEY));
    window.sessionStorage.removeItem(RETURN_TO_KEY);
    return stored;
  } catch (_) {
    return "";
  }
}
