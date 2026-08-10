export type UpdateState =
  | "IDLE"
  | "UPDATE_AVAILABLE"
  | "ACTIVATING"
  | "ACTIVATED"
  | "FAILED";

export type WaitingUpdateDetail = {
  registration: ServiceWorkerRegistration;
  waiting: ServiceWorker;
  version?: string;
};

const DEFAULT_TIMEOUT_MS = 15_000;

export async function activateWaitingWorker(
  detail: WaitingUpdateDetail,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<"ACTIVATED"> {
  if (!detail.waiting || detail.registration.waiting !== detail.waiting) {
    throw new Error("Waiting service worker is no longer current.");
  }

  const container = navigator.serviceWorker;
  let settled = false;

  return await new Promise<"ACTIVATED">((resolve, reject) => {
    const cleanup = () => {
      container.removeEventListener("controllerchange", onControllerChange);
      window.clearTimeout(timeoutId);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onControllerChange = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve("ACTIVATED");
    };

    container.addEventListener("controllerchange", onControllerChange, {
      once: true,
    });

    const timeoutId = window.setTimeout(() => {
      fail(new Error("Service worker activation timed out."));
    }, timeoutMs);

    try {
      detail.waiting.postMessage({ type: "SKIP_WAITING" });
    } catch (error) {
      fail(
        error instanceof Error
          ? error
          : new Error("Failed to contact waiting service worker."),
      );
    }
  });
}
