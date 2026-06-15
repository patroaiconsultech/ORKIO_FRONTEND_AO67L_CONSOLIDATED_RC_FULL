import { useEffect } from "react";
import {
  LANDING_LOCALE_EVENT,
  normalizeLandingLocale,
  readLandingLocale,
} from "./landingLocale.js";

const SITE_URL = "https://www.patroai.com";
const LOGO_URL = `${SITE_URL}/patroai-assets/logo-patroai-novo.png`;

const PAGE_SEO = {
  patroai: {
    pt: {
      title: "Patroai — AI Factory para agentes, plataformas e automações",
      description:
        "Patroai é uma AI Factory que une estratégia, produto, software e inteligência artificial para criar agentes, plataformas e automações para empresas. Empresa membro da AmCham RS.",
      lang: "pt-BR",
      locale: "pt_BR",
      imageAlt: "Patroai AI Factory",
    },
    en: {
      title: "Patroai — AI Factory for agents, platforms and automation",
      description:
        "Patroai is an AI Factory that combines strategy, product, software and artificial intelligence to build agents, platforms and automation for companies. Member of AmCham RS.",
      lang: "en-US",
      locale: "en_US",
      imageAlt: "Patroai AI Factory",
    },
  },
  orkio: {
    pt: {
      title: "Orkio OS — Inteligência empresarial contínua | Patroai",
      description:
        "Orkio OS conecta estratégia, dados, automação, agentes inteligentes e execução em uma plataforma viva criada pela Patroai AI Factory.",
      lang: "pt-BR",
      locale: "pt_BR",
      imageAlt: "Orkio OS, inteligência empresarial da Patroai",
    },
    en: {
      title: "Orkio OS — Continuous business intelligence | Patroai",
      description:
        "Orkio OS connects strategy, data, automation, intelligent agents and execution in a living platform created by Patroai AI Factory.",
      lang: "en-US",
      locale: "en_US",
      imageAlt: "Orkio OS, business intelligence by Patroai",
    },
  },
};

function getPageContext() {
  if (typeof window === "undefined") {
    return {
      page: "patroai",
      path: "/",
    };
  }

  const pathname = String(window.location.pathname || "/").replace(/\/+$/, "") || "/";

  if (pathname === "/orkio") {
    return {
      page: "orkio",
      path: "/orkio",
    };
  }

  if (pathname === "/patroai") {
    return {
      page: "patroai",
      path: "/patroai",
    };
  }

  return {
    page: "patroai",
    path: "/",
  };
}

function buildLocalizedUrl(path, locale) {
  const url = new URL(path, SITE_URL);

  if (normalizeLandingLocale(locale) === "en") {
    url.searchParams.set("lang", "en");
  }

  return url.toString();
}

function getSeo(localeOverride) {
  const locale = normalizeLandingLocale(
    localeOverride || (typeof window === "undefined" ? "pt" : readLandingLocale())
  );
  const context = getPageContext();
  const identity = PAGE_SEO[context.page][locale];

  return {
    ...identity,
    localeKey: locale,
    page: context.page,
    path: context.path,
    canonical: buildLocalizedUrl(context.path, locale),
    alternatePt: buildLocalizedUrl(context.path, "pt"),
    alternateEn: buildLocalizedUrl(context.path, "en"),
    xDefault: buildLocalizedUrl(context.path, "pt"),
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

  upsertMeta('meta[name="description"]', {
    name: "description",
    content: seo.description,
  });

  upsertLink('link[rel="canonical"]', {
    rel: "canonical",
    href: seo.canonical,
  });

  upsertLink('link[rel="alternate"][hreflang="en"]', {
    rel: "alternate",
    hreflang: "en",
    href: seo.alternateEn,
  });

  upsertLink('link[rel="alternate"][hreflang="pt-BR"]', {
    rel: "alternate",
    hreflang: "pt-BR",
    href: seo.alternatePt,
  });

  upsertLink('link[rel="alternate"][hreflang="x-default"]', {
    rel: "alternate",
    hreflang: "x-default",
    href: seo.xDefault,
  });

  upsertLink('link[rel="icon"][sizes="any"]', {
    rel: "icon",
    href: "/favicon.ico",
    sizes: "any",
  });

  upsertLink('link[rel="icon"][sizes="48x48"]', {
    rel: "icon",
    type: "image/png",
    sizes: "48x48",
    href: "/favicon-48x48.png",
  });

  upsertLink('link[rel="icon"][sizes="192x192"]', {
    rel: "icon",
    type: "image/png",
    sizes: "192x192",
    href: "/favicon-192x192.png",
  });

  upsertLink('link[rel="apple-touch-icon"]', {
    rel: "apple-touch-icon",
    href: "/apple-touch-icon.png",
  });

  upsertMeta('meta[property="og:title"]', {
    property: "og:title",
    content: seo.title,
  });

  upsertMeta('meta[property="og:description"]', {
    property: "og:description",
    content: seo.description,
  });

  upsertMeta('meta[property="og:url"]', {
    property: "og:url",
    content: seo.canonical,
  });

  upsertMeta('meta[property="og:type"]', {
    property: "og:type",
    content: "website",
  });

  upsertMeta('meta[property="og:locale"]', {
    property: "og:locale",
    content: seo.locale,
  });

  upsertMeta('meta[property="og:site_name"]', {
    property: "og:site_name",
    content: "Patroai",
  });

  upsertMeta('meta[property="og:image"]', {
    property: "og:image",
    content: seo.logo,
  });

  upsertMeta('meta[property="og:image:alt"]', {
    property: "og:image:alt",
    content: seo.imageAlt,
  });

  upsertMeta('meta[name="twitter:card"]', {
    name: "twitter:card",
    content: "summary_large_image",
  });

  upsertMeta('meta[name="twitter:title"]', {
    name: "twitter:title",
    content: seo.title,
  });

  upsertMeta('meta[name="twitter:description"]', {
    name: "twitter:description",
    content: seo.description,
  });

  upsertMeta('meta[name="twitter:image"]', {
    name: "twitter:image",
    content: seo.logo,
  });

  upsertMeta('meta[name="twitter:image:alt"]', {
    name: "twitter:image:alt",
    content: seo.imageAlt,
  });

  upsertJsonLd("patroai-organization", {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Patroai",
    legalName: "PATROAI CONSULTECH LTDA",
    alternateName: ["PatroAI", "Patroai AI Factory"],
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    slogan:
      seo.localeKey === "en"
        ? "Patroai is an AI Factory."
        : "Patroai é uma AI Factory.",
    description:
      seo.localeKey === "en"
        ? "Patroai is an AI Factory that combines strategy, product, software and artificial intelligence to build agents, platforms and automation for companies."
        : "Patroai é uma AI Factory que une estratégia, produto, software e inteligência artificial para criar agentes, plataformas e automações para empresas.",
    memberOf: {
      "@type": "Organization",
      name: "AmCham RS",
    },
    sameAs: [],
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
