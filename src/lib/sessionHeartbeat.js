import { getToken, getTenant, getSessionVersion } from "./auth.js";
import { heartbeat } from "../ui/api.js";

export function startSessionHeartbeat({
  intervalMs = 45000,
  onUnauthorized = null,
} = {}) {
  let alive = true;
  let timer = null;
  let consecutiveFailures = 0;
  let auth401Count = 0;
  let pausedByAuth = false;
  let observedSessionVersion = getSessionVersion();
  let inFlight = false;

  function resetState(nextVersion = getSessionVersion()) {
    observedSessionVersion = nextVersion;
    consecutiveFailures = 0;
    auth401Count = 0;
    pausedByAuth = false;
  }

  async function tick() {
    if (inFlight) return;
    inFlight = true;
    const liveVersion = getSessionVersion();
    if (liveVersion !== observedSessionVersion) {
      resetState(liveVersion);
    }

    const token = getToken();
    const org = getTenant();

    if (!token) {
      resetState(liveVersion);
      return;
    }

    if (pausedByAuth) {
      return;
    }

    try {
      await heartbeat({ token, org });

      if (getSessionVersion() !== liveVersion) {
        return;
      }

      consecutiveFailures = 0;
      auth401Count = 0;
    } catch (err) {
      if (getSessionVersion() !== liveVersion) {
        return;
      }

      consecutiveFailures += 1;

      if (err?.status === 401 || err?.isAuthError) {
        auth401Count += 1;
        console.warn("sessionHeartbeat non-fatal 401", {
          consecutiveFailures,
          auth401Count,
          code: err?.code,
        });

        if (auth401Count >= 2) {
          pausedByAuth = true;
          if (typeof onUnauthorized === "function") {
            try {
              onUnauthorized({
                ...err,
                code: err?.code || "AUTH_SESSION_EXPIRED",
                heartbeatPaused: true,
                auth401Count,
                consecutiveFailures,
              });
            } catch {}
          }
        }
        return;
      }

      auth401Count = 0;

      if (consecutiveFailures >= 3 && typeof onUnauthorized === "function") {
        try {
          onUnauthorized(err);
        } catch {}
      }
    } finally {
      inFlight = false;
    }
  }

  void tick();
  timer = setInterval(() => {
    if (alive) void tick();
  }, intervalMs);

  return () => {
    alive = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
