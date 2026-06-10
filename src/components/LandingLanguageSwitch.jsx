import React, { useMemo } from "react";
import {
  LANDING_LOCALES,
  normalizeLandingLocale,
  readLandingLocale,
  setLandingLocaleEverywhere,
} from "../lib/landingLocale.js";

/**
 * AO-05D — LandingLanguageSwitch
 *
 * Seletor fixo, independente do header.
 * Também funciona com ou sem props:
 * - com props: locale/onChange controlam a página React.
 * - sem props: lê URL/localStorage e atualiza tudo.
 */

export default function LandingLanguageSwitch({
  locale,
  onChange,
  compact = false,
  tone = "dark",
}) {
  const activeLocale = normalizeLandingLocale(locale || readLandingLocale());

  const labels = useMemo(
    () => ({
      aria: activeLocale === "en" ? "Select landing language" : "Selecionar idioma da landing",
    }),
    [activeLocale]
  );

  function selectLocale(next) {
    const normalized = setLandingLocaleEverywhere(next, { replaceUrl: true });

    if (typeof onChange === "function") {
      onChange(normalized);
      return;
    }

    // Fallback defensivo para páginas que ainda não usam useLandingLocale.
    try {
      window.location.reload();
    } catch {}
  }

  const shellStyle = {
    position: "fixed",
    top: "max(14px, env(safe-area-inset-top))",
    right: "max(14px, env(safe-area-inset-right))",
    zIndex: 2147483647,
    display: "inline-flex",
    alignItems: "center",
    gap: compact ? 4 : 6,
    padding: compact ? 4 : 6,
    borderRadius: 999,
    border: tone === "light" ? "1px solid rgba(15,23,42,0.14)" : "1px solid rgba(247,200,98,0.42)",
    background: tone === "light" ? "rgba(255,255,255,0.82)" : "rgba(2,6,11,0.84)",
    boxShadow: "0 12px 34px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.045) inset",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    pointerEvents: "auto",
    isolation: "isolate",
  };

  const buttonBase = {
    minWidth: compact ? 38 : 44,
    minHeight: compact ? 30 : 32,
    border: 0,
    borderRadius: 999,
    padding: compact ? "6px 9px" : "7px 11px",
    fontSize: compact ? 11 : 12,
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    pointerEvents: "auto",
    WebkitAppearance: "none",
    appearance: "none",
  };

  function buttonStyle(lang) {
    const active = activeLocale === lang;

    return {
      ...buttonBase,
      color: active ? "#08111b" : tone === "light" ? "rgba(15,23,42,0.72)" : "rgba(255,255,255,0.82)",
      background: active
        ? "linear-gradient(135deg, #fff0bd, #f7c862 54%, #a76f19)"
        : tone === "light"
          ? "rgba(15,23,42,0.06)"
          : "rgba(255,255,255,0.07)",
      boxShadow: active ? "0 8px 20px rgba(247,200,98,0.22)" : "none",
    };
  }

  return (
    <nav style={shellStyle} aria-label={labels.aria} data-orkio-language-switch="true">
      {LANDING_LOCALES.map((item) => (
        <button
          key={item.value}
          type="button"
          title={item.title}
          style={buttonStyle(item.value)}
          aria-pressed={activeLocale === item.value}
          onClick={() => selectLocale(item.value)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
