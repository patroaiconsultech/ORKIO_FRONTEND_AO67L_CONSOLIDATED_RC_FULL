import { useEffect } from "react";

const SEO = {
  en: {
    title: "Patroai — AI Infrastructure, Vertical Ventures & Business Execution",
    description:
      "Patroai builds AI infrastructure and on-demand vertical ventures with Orkio, integrating systems, business plans, governance and fast, secure, efficient execution for companies and partners.",
    canonical: "https://patroai.com/",
    logo: "https://patroai.com/patroai-assets/logo-patroai-novo.png",
    lang: "en",
    locale: "en_US",
  },
  pt: {
    title: "PatroAI Consultech — IA, Verticais e Execução de Negócios",
    description:
      "A PatroAI resolve dores de negócios com IA, integrações, business plan, verticais sob demanda, ESG, governança e execução rápida, segura e eficiente.",
    canonical: "https://patroai.com.br/",
    logo: "https://patroai.com.br/patroai-assets/logo-patroai-novo.png",
    lang: "pt-BR",
    locale: "pt_BR",
  },
};

function getSeo() {
  if (typeof window === "undefined") return SEO.en;

  const host = String(window.location.hostname || "").toLowerCase();
  if (host.includes("patroai.com.br")) return SEO.pt;

  return SEO.en;
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

export function applyPatroaiSeoIdentity() {
  if (typeof document === "undefined") return;

  const seo = getSeo();

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
    href: "https://patroai.com/",
  });

  upsertLink('link[rel="alternate"][hreflang="pt-BR"]', {
    rel: "alternate",
    hreflang: "pt-BR",
    href: "https://patroai.com.br/",
  });

  upsertLink('link[rel="alternate"][hreflang="x-default"]', {
    rel: "alternate",
    hreflang: "x-default",
    href: "https://patroai.com/",
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

  upsertMeta('meta[property="og:image"]', {
    property: "og:image",
    content: seo.logo,
  });

  upsertMeta('meta[property="og:image:alt"]', {
    property: "og:image:alt",
    content: "PatroAI Consultech",
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

  upsertJsonLd("patroai-organization", {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PatroAI Consultech",
    alternateName: "PatroAI",
    url: seo.canonical,
    logo: seo.logo,
    description: seo.description,
    sameAs: [],
  });
}

export default function usePatroaiSeo() {
  useEffect(() => {
    applyPatroaiSeoIdentity();
  }, []);
}
