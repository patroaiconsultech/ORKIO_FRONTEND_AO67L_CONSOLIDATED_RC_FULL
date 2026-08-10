export type PwaPlatform = "ios" | "android" | "desktop" | "unknown";

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}

export function detectPwaPlatform(): PwaPlatform {
  const userAgent = navigator.userAgent || "";
  const isTouchMac =
    /Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1;

  if (/iPhone|iPad|iPod/.test(userAgent) || isTouchMac) {
    return "ios";
  }
  if (/Android/.test(userAgent)) {
    return "android";
  }
  if (/Windows|Macintosh|Linux/.test(userAgent)) {
    return "desktop";
  }
  return "unknown";
}
