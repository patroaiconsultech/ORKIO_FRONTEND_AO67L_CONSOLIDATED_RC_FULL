import { useEffect } from "react";
import {
  LANDING_LOCALE_EVENT,
  normalizeLandingLocale,
  readLandingLocale,
} from "./landingLocale.js";

const SITE_URL = "https://www.patroai.com";
const LOGO_URL = `${SITE_URL}/patroai-assets/logo-patroai-novo.png`;

const SEO = {
  pt: {
    title: "Grupo Patroai | Consultech, Holding e AI Factory",
    description:
      "O Grupo Patroai atua com consultoria estratégica, valuation, inteligência artificial, ESG, desenvolvimento de negócios, rede de consultores associados e relacionamento com investidores.",
    lang: "pt-BR",
    locale: "pt_BR",
    imageAlt: "Grupo Patroai — Consultech, Holding e AI Factory",
  },
  en: {
    title: "Grupo Patroai | Consultech, Holding and AI Factory",
    description:
      "Grupo Patroai works with strategic consulting, valuation, artificial intelligence, ESG, new venture development, associated consultants and investor relations.",
    lang: "en-US",
    locale: "en_US",
    imageAlt: "Grupo Patroai — Consultech, Holding and AI Factory",
  },
};

function buildLocalizedUrl(locale) {
  const url = new URL("/", SITE_URL);
  if (normalizeLandingLocale(locale) === "en") {
    url.searchParams.set("lang", "en");
  }
  return url.toString();
}

function getSeo(localeOverride) {
  const locale = normalizeLandingLocale(
    localeOverride || (typeof window === "undefined" ? "pt" : readLandingLocale())
  );

  return {
    ...SEO[locale],
    localeKey: locale,
    canonical: buildLocalizedUrl(locale),
    alternatePt: buildLocalizedUrl("pt"),
    alternateEn: buildLocalizedUrl("en"),
    xDefault: buildLocalizedUrl("pt"),
    logo: LOGO_URL,
  };
}

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
}

function upsertLink(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("link");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
}

function upsertJsonLd(id, payload) {
  let el = document.head.querySelector(`script[data-seo-id="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-id", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

export function applyPatroaiSeoIdentity(localeOverride) {
  if (typeof document === "undefined") return;

  const seo = getSeo(localeOverride);
  document.documentElement.setAttribute("lang", seo.lang);
  document.title = seo.title;

  upsertMeta('meta[name="description"]', { name: "description", content: seo.description });
  upsertLink('link[rel="canonical"]', { rel: "canonical", href: seo.canonical });
  upsertLink('link[rel="alternate"][hreflang="en"]', { rel: "alternate", hreflang: "en", href: seo.alternateEn });
  upsertLink('link[rel="alternate"][hreflang="pt-BR"]', { rel: "alternate", hreflang: "pt-BR", href: seo.alternatePt });
  upsertLink('link[rel="alternate"][hreflang="x-default"]', { rel: "alternate", hreflang: "x-default", href: seo.xDefault });

  upsertMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: seo.canonical });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
  upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: seo.locale });
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Grupo Patroai" });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: seo.logo });
  upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: seo.imageAlt });

  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: seo.title });
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: seo.description });
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: seo.logo });
  upsertMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: seo.imageAlt });

  upsertJsonLd("patroai-organization", {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Grupo Patroai",
    legalName: "PATROAI CONSULTECH LTDA",
    alternateName: ["Patroai Consultech", "Patroai Holding", "Patroai AI Factory"],
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    slogan:
      seo.localeKey === "en"
        ? "Consultech, Holding and AI Factory."
        : "Consultech, Holding e AI Factory.",
    description: seo.description,
    areaServed: ["BR"],
    knowsAbout: [
      "consultoria estratégica",
      "valuation",
      "inteligência artificial",
      "ESG",
      "desenvolvimento de negócios",
      "consultores associados",
      "investidores",
    ],
  });

  upsertJsonLd("patroai-services", {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seo.localeKey === "en" ? "Grupo Patroai strategic fronts" : "Frentes estratégicas do Grupo Patroai",
    itemListElement: [
      { "@type": "Service", name: "Patroai Consultech", serviceType: "Consultoria estratégica, valuation e gestão" },
      { "@type": "Service", name: "Patroai Holding", serviceType: "Desenvolvimento de novos negócios e parcerias" },
      { "@type": "Service", name: "Patroai AI Factory", serviceType: "Sistemas governados de inteligência artificial e automação" },
    ],
  });
}

export default function usePatroaiSeo() {
  useEffect(() => {
    const syncSeo = (event) => {
      applyPatroaiSeoIdentity(event?.detail?.locale);
    };

    applyPatroaiSeoIdentity();
    window.addEventListener(LANDING_LOCALE_EVENT, syncSeo);
    window.addEventListener("popstate", syncSeo);

    return () => {
      window.removeEventListener(LANDING_LOCALE_EVENT, syncSeo);
      window.removeEventListener("popstate", syncSeo);
    };
  }, []);
}
