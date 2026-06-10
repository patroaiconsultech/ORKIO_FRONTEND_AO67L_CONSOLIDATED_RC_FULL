import { useCallback, useEffect, useMemo, useState } from "react";

export const LANDING_LOCALE_KEY = "orkio_landing_locale";
export const LANDING_LOCALE_LEGACY_KEY = "orkio_landing_lang";
export const LANDING_LOCALE_EVENT = "orkio:landing-locale-change";

export const LANDING_LOCALES = [
  { value: "pt", label: "PT", title: "Português" },
  { value: "en", label: "EN", title: "English" },
];

export function normalizeLandingLocale(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "en" || raw === "en-us" || raw === "english") return "en";
  return "pt";
}

export function landingLocaleToTts(locale) {
  return normalizeLandingLocale(locale) === "en" ? "en-US" : "pt-BR";
}

function writeDocumentLocale(locale) {
  if (typeof document === "undefined") return;

  const normalized = normalizeLandingLocale(locale);
  const htmlLang = normalized === "en" ? "en-US" : "pt-BR";

  try {
    document.documentElement.lang = htmlLang;
    document.documentElement.dataset.orkioLandingLocale = normalized;
    document.body?.setAttribute("data-orkio-landing-locale", normalized);
  } catch {}
}

function writeStoredLocale(locale) {
  if (typeof window === "undefined") return;

  const normalized = normalizeLandingLocale(locale);

  try {
    window.localStorage?.setItem(LANDING_LOCALE_KEY, normalized);
    window.localStorage?.setItem(LANDING_LOCALE_LEGACY_KEY, normalized);
  } catch {}
}

function writeUrlLocale(locale, { replace = true } = {}) {
  if (typeof window === "undefined") return;

  const normalized = normalizeLandingLocale(locale);

  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", normalized);
    const next = `${url.pathname}${url.search}${url.hash}`;

    if (replace && window.history?.replaceState) {
      window.history.replaceState({}, "", next);
    }
  } catch {}
}

export function readLandingLocale() {
  if (typeof window === "undefined") return "pt";

  try {
    const query = new URLSearchParams(window.location.search);
    const urlLang = query.get("lang");
    if (urlLang) {
      const normalized = normalizeLandingLocale(urlLang);
      writeStoredLocale(normalized);
      writeDocumentLocale(normalized);
      return normalized;
    }
  } catch {}

  try {
    const stored =
      window.localStorage?.getItem(LANDING_LOCALE_KEY) ||
      window.localStorage?.getItem(LANDING_LOCALE_LEGACY_KEY);

    const normalized = normalizeLandingLocale(stored);
    writeStoredLocale(normalized);
    writeDocumentLocale(normalized);
    return normalized;
  } catch {
    writeDocumentLocale("pt");
    return "pt";
  }
}

export function setLandingLocaleEverywhere(locale, { replaceUrl = true } = {}) {
  const normalized = normalizeLandingLocale(locale);

  writeStoredLocale(normalized);
  writeUrlLocale(normalized, { replace: replaceUrl });
  writeDocumentLocale(normalized);

  try {
    window.dispatchEvent(
      new CustomEvent(LANDING_LOCALE_EVENT, {
        detail: { locale: normalized },
      })
    );
  } catch {}

  return normalized;
}

export function useLandingLocale() {
  const [locale, setLocaleState] = useState(() => readLandingLocale());

  const setLocale = useCallback((nextLocale) => {
    const normalized = setLandingLocaleEverywhere(nextLocale, { replaceUrl: true });
    setLocaleState(normalized);
  }, []);

  useEffect(() => {
    const sync = () => {
      setLocaleState(readLandingLocale());
    };

    const onCustom = (event) => {
      const next = normalizeLandingLocale(event?.detail?.locale);
      writeDocumentLocale(next);
      setLocaleState(next);
    };

    window.addEventListener("popstate", sync);
    window.addEventListener(LANDING_LOCALE_EVENT, onCustom);

    writeDocumentLocale(locale);

    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(LANDING_LOCALE_EVENT, onCustom);
    };
  }, [locale]);

  const ttsLocale = useMemo(() => landingLocaleToTts(locale), [locale]);

  return {
    locale,
    setLocale,
    ttsLocale,
    isEnglish: locale === "en",
    isPortuguese: locale !== "en",
  };
}
