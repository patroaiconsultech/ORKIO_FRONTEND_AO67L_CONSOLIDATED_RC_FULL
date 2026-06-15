import usePatroaiSeo from "../lib/usePatroaiSeo.js";
import React, { useMemo, useState } from "react";
import AvatarPrechatModal from "../components/AvatarPrechatModal.jsx";
import LandingLanguageSwitch from "../components/LandingLanguageSwitch.jsx";
import { useLandingLocale } from "../lib/landingLocale.js";
import { apiFetch } from "../ui/api.js";

const ROUTES = {
  orkioOS: "/orkio",
  patroai: "/patroai",
  auth: "/auth",
  app: "/app",
  admin: "/admin",
};

const LOGO_PRIMARY = "/patroai-assets/logo-patroai-novo.png";
const LOGO_FALLBACK = "/patroai-assets/logo-patroai-novo.webp";

// AO69B-HF3_LANDING_CONTACT_WHATSAPP_RECOVERY
// Fallback confirmado no fluxo público de contato atual. Pode ser sobrescrito
// por VITE_WHATSAPP_PHONE_E164 ou window.__ORKIO_ENV__.WHATSAPP_PHONE_E164.
const PATROAI_WHATSAPP_FALLBACK_E164 = "555189697605";

function readPatroaiWhatsappNumber() {
  const runtimeValue =
    typeof window !== "undefined"
      ? window.__ORKIO_ENV__?.WHATSAPP_PHONE_E164 ||
        window.__ORKIO_ENV__?.VITE_WHATSAPP_PHONE_E164
      : "";

  const buildValue =
    import.meta.env.VITE_WHATSAPP_PHONE_E164 ||
    import.meta.env.WHATSAPP_PHONE_E164 ||
    "";

  return String(runtimeValue || buildValue || PATROAI_WHATSAPP_FALLBACK_E164)
    .replace(/\D/g, "");
}

function buildPatroaiWhatsappHref(locale = "pt") {
  const number = readPatroaiWhatsappNumber();
  const message =
    locale === "en"
      ? "Hello, I came from the PatroAI website and would like to speak with the team."
      : "Olá, vim pelo site da PatroAI e gostaria de falar com a equipe.";

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function normalizeContactReceipt(result) {
  const payload =
    result?.data && typeof result.data === "object"
      ? result.data
      : result && typeof result === "object"
        ? result
        : {};

  const emailDelivery =
    payload?.email_delivery && typeof payload.email_delivery === "object"
      ? payload.email_delivery
      : {};

  return {
    id: payload?.id || emailDelivery?.contact_id || null,
    message: payload?.message || "",
    emailStatus: String(emailDelivery?.status || "unknown").trim().toLowerCase(),
  };
}

const PATROAI_PAGE_COPY = {
  pt: {
    navAria: "Navegação principal",
    brandAria: "Ir para PatroAI",
    nav: {
      solutions: "FactoryAI",
      verticals: "Console Tech",
      orkio: "Orkio",
      resources: "Método",
      about: "Sobre",
      contact: "Contato",
    },
    actions: {
      admin: "Admin",
      login: "Login",
      demo: "Agendar demonstração →",
    },
    hero: {
      kicker: "AI Factory • Produto • Software • Automações • Orkio",
      titleBefore: "Patroai é uma",
      titleHighlight: "AI Factory.",
      subtitle:
        "Unimos estratégia, produto, software e inteligência artificial para construir agentes, plataformas e automações capazes de gerar valor real para empresas.",
      primary: "Agendar conversa →",
      secondary: "Conhecer a FactoryAI",
      trust:
        "Empresa membro da AmCham RS.",
    },
    orkioSpeech:
      "Olá. Eu sou Orkio, a inteligência e experiência de IA da Patroai. Posso mostrar como a Patroai transforma desafios reais em agentes, plataformas e automações com estratégia, produto, software, governança e execução.",
    missionVision: {
      label: "Patroai AI Factory",
      title: "Estratégia, produto, software e inteligência artificial no mesmo ciclo de execução.",
      text:
        "A Patroai combina visão de negócio, arquitetura de produto, engenharia de software e IA aplicada para criar soluções digitais governáveis, úteis e prontas para evoluir com empresas.",
      cards: [
        {
          title: "Patroai",
          text:
            "A marca principal: uma AI Factory para construir agentes, plataformas e automações com foco em valor real para empresas.",
        },
        {
          title: "FactoryAI",
          text:
            "A capacidade produtiva da Patroai para desenhar, desenvolver e implantar soluções com IA, integrações, dados e governança.",
        },
        {
          title: "Console Tech",
          text:
            "O ambiente técnico e operacional para organizar execução, acompanhamento, documentação, evolução e sustentação das soluções.",
          values: [
            "Produto",
            "Software",
            "IA aplicada",
            "Governança",
            "Automação",
            "Integrações",
            "Rastreabilidade",
            "Evolução contínua",
          ],
        },
      ],
    },
    processAria: "Como atuamos",
    processSteps: [
      {
        number: "01",
        title: "Entender",
        text: "Mapeamos contexto, dores, prioridades, sistemas existentes e oportunidades reais de valor para a empresa.",
        icon: "search",
      },
      {
        number: "02",
        title: "Arquitetar",
        text: "Definimos produto, fluxo, dados, integrações, riscos e o menor caminho técnico para gerar resultado com IA.",
        icon: "plan",
      },
      {
        number: "03",
        title: "Construir",
        text: "Desenvolvemos agentes, plataformas, automações e produtos digitais com engenharia de software, segurança e governança.",
        icon: "code",
      },
      {
        number: "04",
        title: "Implantar",
        text: "Colocamos a solução em operação com documentação, rastreabilidade, acompanhamento e clareza para equipes e gestores.",
        icon: "rocket",
      },
      {
        number: "05",
        title: "Evoluir",
        text: "Acompanhamos uso, aprendizados, melhorias, novas automações e expansão da solução conforme a operação amadurece.",
        icon: "growth",
      },
    ],
    servicesIntro: {
      label: "FactoryAI",
      title:
        "A capacidade produtiva da Patroai para criar soluções com IA.",
      text:
        "FactoryAI transforma estratégia em execução: desenhamos produtos, desenvolvemos software, criamos agentes, conectamos sistemas e organizamos automações capazes de gerar valor real para empresas.",
    },
    services: [
      {
        title: "Agentes de IA",
        text:
          "Criamos agentes para atendimento, análise, operação, suporte e tomada de decisão, com contexto, limites e governança.",
        icon: "target",
      },
      {
        title: "Plataformas digitais",
        text:
          "Desenvolvemos produtos, portais, consoles e sistemas sob medida para organizar processos e acelerar operações.",
        icon: "brain",
      },
      {
        title: "Automações empresariais",
        text:
          "Automatizamos fluxos repetitivos, documentos, triagens, comunicações e rotinas críticas com segurança e rastreabilidade.",
        icon: "leaf",
      },
      {
        title: "Integrações e dados",
        text:
          "Conectamos sistemas, bases e informações existentes para reduzir perda de contexto e qualificar decisões.",
        icon: "system",
      },
      {
        title: "Produto e estratégia",
        text:
          "Traduzimos dores de negócio em escopo, roadmap, arquitetura, prioridades e critérios de sucesso.",
        icon: "gear",
      },
      {
        title: "Governança e evolução",
        text:
          "Estruturamos documentação, controles, acompanhamento e ciclos de melhoria para sustentar a solução em operação.",
        icon: "gear",
      },
    ],
    verticalsSection: {
      label: "Console Tech",
      title: "O ambiente técnico e operacional da Patroai.",
      text:
        "Console Tech organiza a execução das soluções da Patroai: acompanhamento técnico, documentação, decisões, integrações, indicadores e evolução operacional em um fluxo claro para equipes e gestores.",
      primary: "Conversar sobre Console Tech →",
      secondary: "Ver método",
      cards: [
        {
          eyebrow: "Operação técnica",
          title: "Execução acompanhada",
          text:
            "Centralizamos prioridades, status, documentação e próximos passos para que a solução evolua com previsibilidade.",
          status: "Console Tech",
          featured: true,
        },
        {
          eyebrow: "Governança",
          title: "Rastreabilidade e clareza",
          text:
            "Mantemos decisões, integrações e mudanças documentadas para reduzir risco e preservar contexto operacional.",
          status: "Método Patroai",
          featured: false,
        },
        {
          eyebrow: "Evolução",
          title: "Melhoria contínua",
          text:
            "Acompanhamos uso, feedbacks e novas oportunidades para ampliar agentes, automações e plataformas com segurança.",
          status: "Em ciclos",
          featured: false,
        },
      ],
    },
    esgSection: {
      label: "Governança aplicada",
      title: "IA com responsabilidade, segurança e clareza operacional.",
      text:
        "A Patroai trata IA como infraestrutura de negócio: cada solução precisa de contexto, limites, rastreabilidade, proteções de dados, documentação e acompanhamento para gerar valor sem perder controle.",
      items: [
        "Arquitetura orientada a valor real, segurança e continuidade operacional",
        "Documentação, integrações e rastreabilidade de decisões relevantes",
        "Proteção contra uso indevido de IA, vazamento de dados e perda de contexto",
      ],
    },
    orkioSection: {
      label: "Conheça Orkio",
      title: "Orkio é a inteligência e experiência de IA da Patroai.",
      text:
        "Orkio apoia diagnóstico, clareza executiva, interação conversacional e próximos passos. Ele conecta a experiência pública da Patroai com a capacidade produtiva da FactoryAI e o ambiente operacional Console Tech.",
      primary: "Explorar Orkio OS →",
      secondary: "Conversar com Orkio",
      avatarLabel: "Orkio — experiência de IA da Patroai",
      avatarTitle: "Presença de Orkio",
      avatarText: "Olá, eu sou Orkio.",
    },
    orkioBenefits: [
      ["search", "Entende contexto e prioridades"],
      ["voice", "Responde por voz e texto"],
      ["brain", "Gera insights e recomendações"],
      ["gear", "Conecta estratégia, produto e execução"],
    ],
    contact: {
      label: "Fale com a PatroAI",
      title: "Conte o desafio. A Patroai ajuda a transformar em solução.",
      text:
        "Use o formulário para conversar sobre agentes, plataformas, automações, integrações, Orkio, FactoryAI ou Console Tech.",
      formTitle: "Enviar uma mensagem",
      formText: "Sua solicitação será registrada e você receberá um protocolo.",
      fields: {
        name: "Nome completo",
        email: "E-mail",
        whatsapp: "WhatsApp",
        subject: "Assunto",
        message: "Como podemos ajudar?",
      },
      subjects: [
        ["General Inquiry", "Informações gerais"],
        ["Partnerships", "Parcerias"],
        ["Technical Support", "Suporte técnico"],
        ["Data Privacy Request", "Privacidade e dados"],
        ["Other", "Outro"],
      ],
      consent:
        "Li e aceito os Termos de Uso e a Política de Privacidade.",
      marketing:
        "Autorizo contato institucional por e-mail e WhatsApp.",
      send: "Enviar mensagem",
      sending: "Enviando...",
      successTitle: "Mensagem registrada com sucesso.",
      successText:
        "Nossa equipe recebeu sua solicitação. Guarde o protocolo abaixo.",
      protocol: "Protocolo",
      emailSent: "Confirmação por e-mail enviada.",
      emailPending:
        "A solicitação foi registrada. A confirmação por e-mail pode levar alguns minutos.",
      errorFallback:
        "Não foi possível enviar agora. Revise os dados ou fale conosco pelo WhatsApp.",
      whatsappTitle: "Prefere falar agora?",
      whatsappText:
        "Abra uma conversa direta com a equipe Patroai pelo WhatsApp.",
      whatsappButton: "Falar pelo WhatsApp",
      floatingWhatsapp: "Falar com a Patroai no WhatsApp",
    },
    footer: {
      text:
        "Patroai · AI Factory. Estratégia, produto, software e inteligência artificial para empresas. Empresa membro da AmCham RS.",
      rights: "© 2026 Patroai. Todos os direitos reservados.",
    },
  },

  en: {
    navAria: "Main navigation",
    brandAria: "Go to PatroAI",
    nav: {
      solutions: "FactoryAI",
      verticals: "Console Tech",
      orkio: "Orkio",
      resources: "Method",
      about: "About",
      contact: "Contact",
    },
    actions: {
      admin: "Admin",
      login: "Login",
      demo: "Schedule a demo →",
    },
    hero: {
      kicker: "AI Factory • Product • Software • Automation • Orkio",
      titleBefore: "Patroai is an",
      titleHighlight: "AI Factory.",
      subtitle:
        "We combine strategy, product, software and artificial intelligence to build agents, platforms and automations that create real value for companies.",
      primary: "Schedule a conversation →",
      secondary: "Explore FactoryAI",
      trust:
        "Member of AmCham RS.",
    },
    orkioSpeech:
      "Hello. I am Orkio, Patroai's AI intelligence and experience. I can show how Patroai turns real challenges into agents, platforms and automations with strategy, product, software, governance and execution.",
    missionVision: {
      label: "Patroai AI Factory",
      title: "Strategy, product, software and artificial intelligence in one execution cycle.",
      text:
        "Patroai combines business vision, product architecture, software engineering and applied AI to create governable, useful digital solutions ready to evolve with companies.",
      cards: [
        {
          title: "Patroai",
          text:
            "The main brand: an AI Factory for building agents, platforms and automations focused on real value for companies.",
        },
        {
          title: "FactoryAI",
          text:
            "Patroai's production capability to design, develop and deploy AI solutions, integrations, data flows and governance.",
        },
        {
          title: "Console Tech",
          text:
            "The technical and operational environment for organizing execution, monitoring, documentation, evolution and support.",
          values: [
            "Product",
            "Software",
            "Applied AI",
            "Governance",
            "Automation",
            "Integrations",
            "Traceability",
            "Continuous evolution",
          ],
        },
      ],
    },
    processAria: "How we work",
    processSteps: [
      {
        number: "01",
        title: "Understand",
        text: "We map context, pains, priorities, existing systems and real value opportunities for the company.",
        icon: "search",
      },
      {
        number: "02",
        title: "Architect",
        text: "We define product, flows, data, integrations, risks and the shortest technical path to generate results with AI.",
        icon: "plan",
      },
      {
        number: "03",
        title: "Build",
        text: "We develop agents, platforms, automations and digital products with software engineering, security and governance.",
        icon: "code",
      },
      {
        number: "04",
        title: "Deploy",
        text: "We put the solution into operation with documentation, traceability, monitoring and clarity for teams and managers.",
        icon: "rocket",
      },
      {
        number: "05",
        title: "Evolve",
        text: "We monitor usage, learnings, improvements, new automations and expansion as the operation matures.",
        icon: "growth",
      },
    ],
    servicesIntro: {
      label: "FactoryAI",
      title:
        "Patroai's production capability for building AI solutions.",
      text:
        "FactoryAI turns strategy into execution: we design products, develop software, create agents, connect systems and organize automations capable of generating real value for companies.",
    },
    services: [
      {
        title: "AI agents",
        text:
          "We create agents for service, analysis, operations, support and decision-making, with context, boundaries and governance.",
        icon: "target",
      },
      {
        title: "Digital platforms",
        text:
          "We develop products, portals, consoles and custom systems to organize processes and accelerate operations.",
        icon: "brain",
      },
      {
        title: "Business automation",
        text:
          "We automate repetitive flows, documents, triage, communications and critical routines with security and traceability.",
        icon: "leaf",
      },
      {
        title: "Integrations and data",
        text:
          "We connect existing systems, databases and information to reduce context loss and improve decisions.",
        icon: "system",
      },
      {
        title: "Product and strategy",
        text:
          "We translate business pains into scope, roadmap, architecture, priorities and success criteria.",
        icon: "gear",
      },
      {
        title: "Governance and evolution",
        text:
          "We structure documentation, controls, monitoring and improvement cycles to sustain the solution in operation.",
        icon: "gear",
      },
    ],
    verticalsSection: {
      label: "Console Tech",
      title: "Patroai's technical and operational environment.",
      text:
        "Console Tech organizes Patroai's solution execution: technical monitoring, documentation, decisions, integrations, indicators and operational evolution in a clear flow for teams and managers.",
      primary: "Discuss Console Tech →",
      secondary: "View method",
      cards: [
        {
          eyebrow: "Technical operation",
          title: "Guided execution",
          text:
            "We centralize priorities, status, documentation and next steps so the solution can evolve predictably.",
          status: "Console Tech",
          featured: true,
        },
        {
          eyebrow: "Governance",
          title: "Traceability and clarity",
          text:
            "We keep decisions, integrations and changes documented to reduce risk and preserve operational context.",
          status: "Patroai method",
          featured: false,
        },
        {
          eyebrow: "Evolution",
          title: "Continuous improvement",
          text:
            "We monitor usage, feedback and new opportunities to expand agents, automations and platforms safely.",
          status: "In cycles",
          featured: false,
        },
      ],
    },
    esgSection: {
      label: "Applied governance",
      title: "AI with responsibility, security and operational clarity.",
      text:
        "Patroai treats AI as business infrastructure: every solution needs context, boundaries, traceability, data protection, documentation and monitoring to generate value without losing control.",
      items: [
        "Architecture oriented to real value, security and operational continuity",
        "Documentation, integrations and traceability of relevant decisions",
        "Protection against AI misuse, data leakage and context loss",
      ],
    },
    orkioSection: {
      label: "Meet Orkio",
      title: "Orkio is Patroai's AI intelligence and experience.",
      text:
        "Orkio supports diagnosis, executive clarity, conversational interaction and next steps. It connects Patroai's public experience with FactoryAI's production capability and the Console Tech operating environment.",
      primary: "Explore Orkio OS →",
      secondary: "Talk to Orkio",
      avatarLabel: "Orkio — Patroai's AI experience",
      avatarTitle: "Orkio's presence",
      avatarText: "Hello, I am Orkio.",
    },
    orkioBenefits: [
      ["search", "Understands context and priorities"],
      ["voice", "Responds by voice and text"],
      ["brain", "Generates insights and recommendations"],
      ["gear", "Connects strategy, product and execution"],
    ],
    contact: {
      label: "Talk to PatroAI",
      title: "Share the challenge. Patroai helps turn it into a solution.",
      text:
        "Use the form to discuss agents, platforms, automations, integrations, Orkio, FactoryAI or Console Tech.",
      formTitle: "Send a message",
      formText: "Your request will be registered and you will receive a protocol.",
      fields: {
        name: "Full name",
        email: "Email",
        whatsapp: "WhatsApp",
        subject: "Subject",
        message: "How can we help?",
      },
      subjects: [
        ["General Inquiry", "General inquiry"],
        ["Partnerships", "Partnerships"],
        ["Technical Support", "Technical support"],
        ["Data Privacy Request", "Privacy and data"],
        ["Other", "Other"],
      ],
      consent:
        "I have read and accept the Terms of Use and Privacy Policy.",
      marketing:
        "I authorize institutional contact by email and WhatsApp.",
      send: "Send message",
      sending: "Sending...",
      successTitle: "Message registered successfully.",
      successText:
        "Our team received your request. Keep the protocol below.",
      protocol: "Protocol",
      emailSent: "Email confirmation sent.",
      emailPending:
        "The request was registered. Email confirmation may take a few minutes.",
      errorFallback:
        "We could not send it now. Review the information or contact us on WhatsApp.",
      whatsappTitle: "Would you rather talk now?",
      whatsappText:
        "Open a direct conversation with the Patroai team on WhatsApp.",
      whatsappButton: "Talk on WhatsApp",
      floatingWhatsapp: "Talk to Patroai on WhatsApp",
    },
    footer: {
      text:
        "Patroai · AI Factory. Strategy, product, software and artificial intelligence for companies. Member of AmCham RS.",
      rights: "© 2026 Patroai. All rights reserved.",
    },
  },
};

function rememberAppRedirect() {
  try {
    window.localStorage?.setItem("post_auth_redirect", ROUTES.app);
    window.sessionStorage?.setItem("post_auth_redirect", ROUTES.app);
  } catch {
    // Navegação deve continuar mesmo se storage estiver indisponível.
  }
}

function safeNavigateToAuth(params = {}) {
  rememberAppRedirect();

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.set(key, String(value));
  });

  window.location.href = `${ROUTES.auth}${query.toString() ? `?${query.toString()}` : ""}`;
}

function navigateTo(path) {
  window.location.href = path;
}

function PatroaiLogo({ compact = false }) {
  const [src, setSrc] = useState(LOGO_PRIMARY);

  return (
    <div className="patroai-logo-wrap-inner">
      <img
        src={src}
        alt="Patroai"
        className="patroai-logo-img"
        onError={() => {
          if (src !== LOGO_FALLBACK) setSrc(LOGO_FALLBACK);
        }}
      />
      {!compact ? (
        <div className="patroai-logo-text">
          <strong>Patroai</strong>
          <span>AI Factory</span>
        </div>
      ) : null}
    </div>
  );
}

function PatroaiHeroLogo() {
  const [src, setSrc] = useState(LOGO_PRIMARY);

  return (
    <div className="patroai-hero-orb" aria-hidden="true">
      <div className="patroai-hero-logo-shell">
        <span className="patroai-hero-orb-ring one" />
        <span className="patroai-hero-orb-ring two" />
        <img
          src={src}
          alt=""
          className="patroai-hero-logo-img"
          onError={() => {
            if (src !== LOGO_FALLBACK) setSrc(LOGO_FALLBACK);
          }}
        />
      </div>
    </div>
  );
}

function PremiumMark({ icon = "✦" }) {
  return (
    <span className="premium-mark" aria-hidden="true">
      {icon}
    </span>
  );
}

export default function PatroaiLanding() {
  usePatroaiSeo();

  const [prechatOpen, setPrechatOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    full_name: "",
    email: "",
    whatsapp: "",
    subject: "General Inquiry",
    message: "",
    consent_terms: false,
    consent_marketing: false,
  });
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactReceipt, setContactReceipt] = useState(null);

  const { locale, setLocale, ttsLocale } = useLandingLocale();
  const copy = PATROAI_PAGE_COPY[locale] || PATROAI_PAGE_COPY.pt;

  const heroSubtitle = useMemo(() => copy.hero.subtitle, [copy.hero.subtitle]);
  const orkioSpeech = useMemo(() => copy.orkioSpeech, [copy.orkioSpeech]);
  const whatsappHref = useMemo(() => buildPatroaiWhatsappHref(locale), [locale]);

  function updateContactField(field, value) {
    setContactForm((current) => ({ ...current, [field]: value }));
    if (contactError) setContactError("");
  }

  function handleDemo() {
    document.getElementById("contact")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleContactSubmit(event) {
    event.preventDefault();

    if (!contactForm.consent_terms) {
      setContactError(
        locale === "en"
          ? "You must accept the Terms of Use and Privacy Policy."
          : "Você precisa aceitar os Termos de Uso e a Política de Privacidade."
      );
      return;
    }

    setContactSending(true);
    setContactError("");
    setContactReceipt(null);

    try {
      const result = await apiFetch("/api/public/contact", {
        method: "POST",
        body: {
          ...contactForm,
          terms_version: "2026-06",
        },
      });

      setContactReceipt(normalizeContactReceipt(result));
      setContactForm((current) => ({
        ...current,
        message: "",
        consent_terms: false,
        consent_marketing: false,
      }));
    } catch (error) {
      setContactError(
        error?.userMessage ||
          error?.message ||
          copy.contact.errorFallback
      );
    } finally {
      setContactSending(false);
    }
  }

  function handleStartAvatarJourney() {
    setPrechatOpen(true);
  }

  function handleContinueAfterPrechat() {
    setPrechatOpen(false);
    safeNavigateToAuth({
      entry: "avatar",
      onboarding: 1,
      prechat: 1,
      mode: "register",
      source: "patroai_landing",
      lang: locale,
    });
  }

  return (
    <main className="patroai-page">
      <style>{`
        .patroai-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 8% 0%, rgba(34,197,94,.12), transparent 28%),
            radial-gradient(circle at 78% 8%, rgba(245,158,11,.16), transparent 30%),
            radial-gradient(circle at 50% 54%, rgba(14,165,233,.08), transparent 34%),
            linear-gradient(180deg, #030711 0%, #071019 52%, #04070d 100%);
          color: #f8fafc;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow-x: hidden;
        }

        .patroai-shell {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .patroai-header {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(18px);
          background: rgba(3, 7, 18, .78);
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .patroai-header-inner {
          min-height: 82px;
          display: grid;
          grid-template-columns: auto minmax(260px, 1fr) auto;
          align-items: center;
          gap: clamp(14px, 2vw, 26px);
        }

        .patroai-logo-button,
        .patroai-logo-wrap {
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 0;
        }

        .patroai-logo-wrap-inner {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .patroai-logo-img {
          width: 54px;
          height: 54px;
          object-fit: contain;
          border-radius: 18px;
          box-shadow: 0 16px 40px rgba(0,0,0,.28);
        }

        .patroai-logo-text {
          display: grid;
          gap: 2px;
          line-height: 1;
          text-align: left;
        }

        .patroai-logo-text strong {
          font-size: 18px;
          letter-spacing: .04em;
          color: #facc15;
        }

        .patroai-logo-text span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .18em;
          color: rgba(255,255,255,.72);
        }

        .patroai-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(16px, 2vw, 24px);
          min-width: 0;
          color: rgba(255,255,255,.75);
          font-size: 14px;
        }

        .patroai-nav a {
          color: inherit;
          text-decoration: none;
          font-weight: 750;
        }

        .patroai-nav a:hover {
          color: #facc15;
        }

        .patroai-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          min-width: 0;
        }

        .patroai-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.06);
          color: #fff;
          font-weight: 850;
          text-decoration: none;
          cursor: pointer;
          transition: transform .18s ease, border-color .18s ease, background .18s ease;
          white-space: nowrap;
        }

        .patroai-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(250,204,21,.45);
          background: rgba(255,255,255,.10);
        }

        .patroai-btn.primary {
          color: #111827;
          background: linear-gradient(135deg, #fff7cc, #facc15 58%, #d97706);
          border-color: rgba(250,204,21,.42);
          box-shadow: 0 14px 36px rgba(250,204,21,.18);
        }

        .patroai-hero {
          padding: clamp(62px, 8vw, 112px) 0 52px;
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(300px, .82fr);
          gap: clamp(32px, 5vw, 76px);
          align-items: center;
        }

        .patroai-hero-main {
          max-width: 790px;
        }

        .patroai-kicker,
        .esg-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #86efac;
          background: rgba(34,197,94,.10);
          border: 1px solid rgba(34,197,94,.24);
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .patroai-hero h1 {
          margin: 24px 0 18px;
          font-size: clamp(40px, 6.4vw, 76px);
          line-height: .94;
          letter-spacing: -.072em;
          max-width: 780px;
        }

        .patroai-hero h1 span,
        .section-heading h2 span {
          background: linear-gradient(135deg, #fef3c7 0%, #facc15 38%, #67e8f9 86%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .patroai-subtitle {
          max-width: 760px;
          color: rgba(255,255,255,.78);
          font-size: clamp(17px, 2vw, 21px);
          line-height: 1.66;
        }

        .patroai-hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .patroai-trust {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,.74);
          font-size: 14px;
          font-weight: 700;
        }

        .patroai-hero-orb {
          position: relative;
          min-height: 420px;
          display: grid;
          place-items: center;
          align-self: center;
          isolation: isolate;
          transform: translateY(-64px);
        }

        .patroai-hero-orb::before {
          content: "";
          position: absolute;
          width: min(460px, 34vw);
          aspect-ratio: 1;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 48%, rgba(250,204,21,.22), transparent 35%),
            radial-gradient(circle at 50% 50%, rgba(34,197,94,.16), transparent 62%);
          filter: blur(4px);
          animation: patroaiGlowPulse 4.8s ease-in-out infinite;
          z-index: -2;
        }

        .patroai-hero-logo-shell {
          position: relative;
          width: clamp(230px, 28vw, 360px);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border-radius: 42px;
          background:
            radial-gradient(circle at 50% 45%, rgba(250,204,21,.16), transparent 36%),
            linear-gradient(145deg, rgba(255,255,255,.10), rgba(255,255,255,.035));
          border: 1px solid rgba(250,204,21,.20);
          box-shadow:
            0 28px 90px rgba(0,0,0,.38),
            inset 0 0 80px rgba(250,204,21,.06);
          overflow: hidden;
        }

        .patroai-hero-logo-shell::after {
          content: "";
          position: absolute;
          inset: -38%;
          background: conic-gradient(from 90deg, transparent, rgba(250,204,21,.24), transparent, rgba(103,232,249,.16), transparent);
          animation: spin 16s linear infinite;
          opacity: .74;
        }

        .patroai-hero-logo-img {
          position: relative;
          z-index: 2;
          width: 58%;
          height: 58%;
          object-fit: contain;
          filter: drop-shadow(0 18px 38px rgba(0,0,0,.40));
          animation: patroaiLogoFloat 5.5s ease-in-out infinite;
        }

        .patroai-hero-orb-ring {
          position: absolute;
          inset: 22px;
          border-radius: 36px;
          border: 1px solid rgba(250,204,21,.22);
          z-index: 1;
          pointer-events: none;
        }

        .patroai-hero-orb-ring.two {
          inset: 44px;
          border-color: rgba(103,232,249,.16);
          animation: patroaiRingPulse 4.8s ease-in-out infinite;
        }

        @keyframes patroaiGlowPulse {
          0%, 100% { transform: scale(.96); opacity: .58; }
          50% { transform: scale(1.05); opacity: .9; }
        }

        @keyframes patroaiLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes patroaiRingPulse {
          0%, 100% { transform: scale(.98); opacity: .42; }
          50% { transform: scale(1.04); opacity: .86; }
        }

        .premium-mark {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          color: #facc15;
          background: rgba(250,204,21,.10);
          border: 1px solid rgba(250,204,21,.24);
          flex: 0 0 auto;
        }


        .patroai-section {
          padding: 54px 0;
        }

        .process-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
        }

        .process-card,
        .service-card,
        .orkio-benefit,
        .esg-card {
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.055);
          padding: 20px;
          box-shadow: 0 18px 46px rgba(0,0,0,.20);
        }

        .process-card strong {
          color: #facc15;
          font-size: 13px;
          letter-spacing: .12em;
        }

        .process-card h3,
        .service-card h3,
        .esg-card h3 {
          margin: 12px 0 8px;
          font-size: 18px;
          letter-spacing: -.025em;
        }

        .process-card p,
        .service-card p,
        .esg-card p {
          margin: 0;
          color: rgba(255,255,255,.68);
          line-height: 1.55;
          font-size: 14px;
        }


        .mission-section {
          padding-top: 30px;
        }

        .mission-heading {
          max-width: 920px;
        }

        .mission-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .mission-card {
          position: relative;
          overflow: hidden;
          min-height: 250px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(circle at top left, rgba(250,204,21,.12), transparent 38%),
            linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.035));
          padding: 24px;
          box-shadow: 0 22px 58px rgba(0,0,0,.22);
        }

        .mission-card::after {
          content: "";
          position: absolute;
          inset: auto 20px 0 20px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(250,204,21,.44), transparent);
          opacity: .72;
        }

        .mission-card h3 {
          margin: 14px 0 10px;
          font-size: 24px;
          letter-spacing: -.035em;
        }

        .mission-card p {
          margin: 0;
          color: rgba(255,255,255,.70);
          line-height: 1.6;
          font-size: 15px;
        }

        .mission-values {
          list-style: none;
          padding: 0;
          margin: 18px 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .mission-values li {
          border-radius: 999px;
          border: 1px solid rgba(250,204,21,.18);
          background: rgba(250,204,21,.08);
          color: rgba(255,255,255,.82);
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 850;
        }

        .verticals-section {
          position: relative;
          overflow: hidden;
          border-radius: 34px;
          border: 1px solid rgba(250,204,21,.18);
          background:
            radial-gradient(circle at 78% 8%, rgba(250,204,21,.18), transparent 34%),
            radial-gradient(circle at 6% 18%, rgba(34,197,94,.12), transparent 32%),
            linear-gradient(135deg, rgba(15,23,42,.90), rgba(2,6,23,.94));
          padding: clamp(24px, 5vw, 46px);
          box-shadow: 0 30px 90px rgba(0,0,0,.30);
        }

        .verticals-section::before {
          content: "";
          position: absolute;
          inset: -52%;
          background: conic-gradient(from 140deg, transparent, rgba(250,204,21,.16), transparent, rgba(103,232,249,.12), transparent);
          animation: spin 24s linear infinite;
          opacity: .5;
          pointer-events: none;
        }

        .verticals-section > * {
          position: relative;
          z-index: 1;
        }

        .verticals-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: end;
          margin-bottom: 24px;
        }

        .verticals-header .section-heading {
          margin-bottom: 0;
        }

        .verticals-grid {
          display: grid;
          grid-template-columns: 1.1fr .95fr .95fr;
          gap: 14px;
        }

        .vertical-card {
          position: relative;
          min-height: 250px;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.055);
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 18px 46px rgba(0,0,0,.20);
        }

        .vertical-card.featured {
          border-color: rgba(250,204,21,.30);
          background:
            radial-gradient(circle at 72% 0%, rgba(250,204,21,.14), transparent 34%),
            rgba(255,255,255,.07);
        }

        .vertical-eyebrow {
          color: #86efac;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .vertical-card h3 {
          margin: 0 0 10px;
          font-size: 24px;
          letter-spacing: -.04em;
        }

        .vertical-card p {
          margin: 0;
          color: rgba(255,255,255,.68);
          line-height: 1.6;
          font-size: 14px;
        }

        .vertical-status {
          align-self: flex-start;
          margin-top: 20px;
          border-radius: 999px;
          border: 1px solid rgba(250,204,21,.22);
          background: rgba(250,204,21,.10);
          color: #fef3c7;
          font-size: 12px;
          font-weight: 900;
          padding: 8px 11px;
        }

        .section-heading {
          max-width: 860px;
          margin-bottom: 24px;
        }

        .section-heading > span {
          color: #facc15;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .16em;
        }

        .section-heading h2 {
          margin: 12px 0;
          font-size: clamp(30px, 5vw, 54px);
          line-height: 1.02;
          letter-spacing: -.055em;
        }

        .section-heading p {
          color: rgba(255,255,255,.72);
          line-height: 1.68;
          font-size: 17px;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .service-icon {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: #facc15;
          background: rgba(250,204,21,.10);
          border: 1px solid rgba(250,204,21,.18);
          margin-bottom: 16px;
        }

        .esg-section {
          display: grid;
          grid-template-columns: minmax(0, .9fr) minmax(320px, 1.1fr);
          gap: 28px;
          align-items: stretch;
          border-radius: 34px;
          border: 1px solid rgba(34,197,94,.20);
          background:
            radial-gradient(circle at 0% 0%, rgba(34,197,94,.16), transparent 32%),
            linear-gradient(135deg, rgba(6,78,59,.34), rgba(2,6,23,.92));
          padding: clamp(24px, 5vw, 46px);
          box-shadow: 0 28px 78px rgba(0,0,0,.26);
        }

        .esg-panel {
          display: grid;
          gap: 14px;
        }

        .esg-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(255,255,255,.07);
        }

        .esg-card .premium-mark {
          width: 30px;
          height: 30px;
        }

        .orkio-section {
          display: grid;
          grid-template-columns: minmax(0, .95fr) minmax(320px, 1.05fr);
          gap: 36px;
          align-items: center;
          border-radius: 34px;
          border: 1px solid rgba(255,255,255,.10);
          background: linear-gradient(135deg, rgba(15,23,42,.84), rgba(2,6,23,.92));
          padding: clamp(24px, 5vw, 46px);
        }

        .orkio-benefits {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .orkio-benefit {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          color: rgba(255,255,255,.82);
        }

        .contact-section {
          display: grid;
          grid-template-columns: minmax(0, .82fr) minmax(340px, 1.18fr);
          gap: clamp(24px, 5vw, 52px);
          align-items: start;
          border-radius: 34px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(circle at 0% 0%, rgba(250,204,21,.10), transparent 34%),
            linear-gradient(135deg, rgba(15,23,42,.88), rgba(2,6,23,.94));
          padding: clamp(24px, 5vw, 48px);
          box-shadow: 0 28px 78px rgba(0,0,0,.28);
        }

        .contact-intro {
          display: grid;
          gap: 20px;
          position: sticky;
          top: 112px;
        }

        .contact-whatsapp-card {
          display: grid;
          gap: 12px;
          border-radius: 24px;
          padding: 22px;
          border: 1px solid rgba(34,197,94,.24);
          background: rgba(34,197,94,.08);
        }

        .contact-whatsapp-card h3 {
          margin: 0;
          font-size: 20px;
        }

        .contact-whatsapp-card p {
          margin: 0;
          color: rgba(255,255,255,.70);
          line-height: 1.7;
        }

        .contact-form-card {
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.045);
          padding: clamp(20px, 4vw, 32px);
        }

        .contact-form-card h3 {
          margin: 0;
          font-size: clamp(24px, 3vw, 34px);
          letter-spacing: -.025em;
        }

        .contact-form-card > p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.68);
          line-height: 1.65;
        }

        .contact-form {
          display: grid;
          gap: 16px;
          margin-top: 24px;
        }

        .contact-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .contact-field {
          display: grid;
          gap: 8px;
        }

        .contact-field.full {
          grid-column: 1 / -1;
        }

        .contact-field label {
          font-size: 13px;
          font-weight: 850;
          color: rgba(255,255,255,.78);
        }

        .contact-input,
        .contact-select,
        .contact-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,.13);
          background: rgba(2,6,23,.72);
          color: #fff;
          border-radius: 16px;
          padding: 13px 14px;
          font: inherit;
          outline: none;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .contact-textarea {
          min-height: 142px;
          resize: vertical;
        }

        .contact-input:focus,
        .contact-select:focus,
        .contact-textarea:focus {
          border-color: rgba(250,204,21,.70);
          box-shadow: 0 0 0 4px rgba(250,204,21,.10);
          background: rgba(2,6,23,.90);
        }

        .contact-check {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: rgba(255,255,255,.70);
          font-size: 13px;
          line-height: 1.55;
          cursor: pointer;
        }

        .contact-check input {
          margin-top: 3px;
          accent-color: #facc15;
        }

        .contact-check a {
          color: #fde68a;
          font-weight: 800;
        }

        .contact-feedback {
          border-radius: 16px;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,.10);
          line-height: 1.55;
          font-size: 14px;
        }

        .contact-feedback.success {
          border-color: rgba(34,197,94,.28);
          background: rgba(34,197,94,.10);
          color: #bbf7d0;
        }

        .contact-feedback.error {
          border-color: rgba(248,113,113,.28);
          background: rgba(248,113,113,.10);
          color: #fecaca;
        }

        .contact-protocol {
          display: inline-flex;
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          color: #fff;
          font-weight: 900;
          word-break: break-all;
        }

        .contact-submit-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .whatsapp-floating {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 60;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 54px;
          padding: 0 18px;
          border-radius: 999px;
          color: #ecfdf5;
          background: linear-gradient(135deg, #16a34a, #15803d);
          border: 1px solid rgba(255,255,255,.20);
          box-shadow: 0 18px 44px rgba(0,0,0,.38);
          text-decoration: none;
          font-weight: 900;
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .whatsapp-floating:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 52px rgba(0,0,0,.44);
        }

        .whatsapp-floating svg {
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          fill: currentColor;
        }

        .patroai-footer {
          padding: 34px 0 46px;
          color: rgba(255,255,255,.58);
          font-size: 14px;
          border-top: 1px solid rgba(255,255,255,.08);
          margin-top: 42px;
        }

        .patroai-footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1100px) {
          .patroai-header-inner {
            grid-template-columns: auto 1fr;
          }

          .patroai-nav {
            display: none;
          }

          .patroai-actions {
            justify-self: end;
          }
        }

        @media (max-width: 980px) {
          .patroai-hero,
          .orkio-section,
          .esg-section,
          .verticals-header,
          .verticals-grid,
          .contact-section {
            grid-template-columns: 1fr;
          }

          .contact-intro {
            position: static;
          }

          .verticals-header {
            align-items: start;
          }

          .patroai-hero-orb {
            min-height: 320px;
            order: -1;
          }

          .process-grid,
          .services-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mission-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .patroai-shell {
            width: min(100% - 22px, 1180px);
          }

          .patroai-header-inner {
            min-height: 72px;
          }

          .patroai-actions .patroai-btn:not(.primary) {
            display: none;
          }

          .patroai-logo-text {
            display: none;
          }

          .patroai-hero {
            padding-top: 38px;
          }

          .process-grid,
          .services-grid,
          .verticals-grid,
          .orkio-benefits {
            grid-template-columns: 1fr;
          }

          .verticals-header .patroai-hero-cta {
            width: 100%;
          }

          .patroai-hero h1 {
            letter-spacing: -.055em;
          }

          .patroai-hero-orb {
            min-height: 260px;
            transform: translateY(0);
          }

          .patroai-hero-logo-shell {
            width: min(240px, 72vw);
            border-radius: 34px;
          }

          .contact-form-grid {
            grid-template-columns: 1fr;
          }

          .contact-field.full {
            grid-column: auto;
          }

          .contact-submit-row .patroai-btn {
            width: 100%;
          }

          .whatsapp-floating {
            right: 12px;
            bottom: 12px;
            min-height: 50px;
            padding: 0 15px;
          }

          .whatsapp-floating span {
            display: none;
          }
        }
      `}</style>

      <header className="patroai-header">
        <div className="patroai-shell patroai-header-inner">
          <button
            type="button"
            className="patroai-logo-button"
            onClick={() => navigateTo(`${ROUTES.patroai}?lang=${locale}`)}
            aria-label={copy.brandAria}
          >
            <PatroaiLogo />
          </button>

          <nav className="patroai-nav" aria-label={copy.navAria}>
            <a href="#solutions">{copy.nav.solutions}</a>
            <a href="#verticals">{copy.nav.verticals}</a>
            <a href="#orkio">{copy.nav.orkio}</a>
            <a href="#method">{copy.nav.resources}</a>
            <a href="#mission">{copy.nav.about}</a>
            <a href="#contact">{copy.nav.contact}</a>
          </nav>

          <div className="patroai-actions">
            <LandingLanguageSwitch value={locale} onChange={setLocale} compact inline />
          </div>
        </div>
      </header>

      <section className="patroai-shell patroai-hero" id="about">
        <div className="patroai-hero-main">
          <div className="patroai-kicker">
            <PremiumMark icon="✦" />
            {copy.hero.kicker}
          </div>

          <h1>
            {copy.hero.titleBefore} <span>{copy.hero.titleHighlight}</span>
          </h1>

          <p className="patroai-subtitle">{heroSubtitle}</p>

          <div className="patroai-hero-cta">
            <button className="patroai-btn primary" type="button" onClick={handleDemo}>
              {copy.hero.primary}
            </button>
            <button
              className="patroai-btn"
              type="button"
              onClick={() => document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" })}
            >
              {copy.hero.secondary}
            </button>
          </div>

          <div className="patroai-trust">
            <PremiumMark icon="✓" />
            {copy.hero.trust}
          </div>
        </div>

        <PatroaiHeroLogo />
      </section>

      <section className="patroai-shell patroai-section" id="method" aria-label={copy.processAria}>
        <div className="process-grid">
          {copy.processSteps.map((step) => (
            <article className="process-card" key={`${step.number}-${step.title}`}>
              <strong>{step.number}</strong>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="patroai-shell patroai-section mission-section" id="mission">
        <div className="section-heading mission-heading">
          <span>{copy.missionVision.label}</span>
          <h2>{copy.missionVision.title}</h2>
          <p>{copy.missionVision.text}</p>
        </div>

        <div className="mission-grid">
          {copy.missionVision.cards.map((item) => (
            <article className="mission-card" key={item.title}>
              <div className="service-icon">✦</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>

              {item.values ? (
                <ul className="mission-values">
                  {item.values.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="patroai-shell patroai-section" id="solutions">
        <div className="section-heading">
          <span>{copy.servicesIntro.label}</span>
          <h2>{copy.servicesIntro.title}</h2>
          <p>{copy.servicesIntro.text}</p>
        </div>

        <div className="services-grid">
          {copy.services.map((service) => (
            <article className="service-card" key={service.title}>
              <div className="service-icon">✦</div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="patroai-shell patroai-section" id="verticals">
        <div className="verticals-section">
          <div className="verticals-header">
            <div className="section-heading">
              <span>{copy.verticalsSection.label}</span>
              <h2>{copy.verticalsSection.title}</h2>
              <p>{copy.verticalsSection.text}</p>
            </div>

            <div className="patroai-hero-cta">
              <button className="patroai-btn primary" type="button" onClick={handleDemo}>
                {copy.verticalsSection.primary}
              </button>
              <button
                className="patroai-btn"
                type="button"
                onClick={() => document.getElementById("method")?.scrollIntoView({ behavior: "smooth" })}
              >
                {copy.verticalsSection.secondary}
              </button>
            </div>
          </div>

          <div className="verticals-grid">
            {copy.verticalsSection.cards.map((vertical) => (
              <article
                className={`vertical-card${vertical.featured ? " featured" : ""}`}
                key={vertical.title}
              >
                <div>
                  <div className="vertical-eyebrow">{vertical.eyebrow}</div>
                  <h3>{vertical.title}</h3>
                  <p>{vertical.text}</p>
                </div>
                <span className="vertical-status">{vertical.status}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="patroai-shell patroai-section" aria-label={copy.esgSection.label}>
        <div className="esg-section">
          <div className="section-heading">
            <span>{copy.esgSection.label}</span>
            <h2>{copy.esgSection.title}</h2>
            <p>{copy.esgSection.text}</p>
          </div>

          <div className="esg-panel">
            {copy.esgSection.items.map((item) => (
              <article className="esg-card" key={item}>
                <PremiumMark icon="✓" />
                <p>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="patroai-shell patroai-section" id="orkio">
        <div className="orkio-section">
          <div>
            <div className="section-heading">
              <span>{copy.orkioSection.label}</span>
              <h2>{copy.orkioSection.title}</h2>
              <p>{copy.orkioSection.text}</p>
            </div>

            <div className="patroai-hero-cta">
              <button
                className="patroai-btn primary"
                type="button"
                onClick={() => navigateTo(`${ROUTES.orkioOS}?lang=${locale}`)}
              >
                {copy.orkioSection.primary}
              </button>
              <button className="patroai-btn" type="button" onClick={handleStartAvatarJourney}>
                {copy.orkioSection.secondary}
              </button>
            </div>
          </div>

          <div className="orkio-benefits">
            {copy.orkioBenefits.map(([icon, label]) => (
              <div className="orkio-benefit" key={label}>
                <PremiumMark icon="✓" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="patroai-shell patroai-section" id="contact">
        <div className="contact-section">
          <div className="contact-intro">
            <div className="section-heading">
              <span>{copy.contact.label}</span>
              <h2>{copy.contact.title}</h2>
              <p>{copy.contact.text}</p>
            </div>

            <article className="contact-whatsapp-card">
              <PremiumMark icon="✓" />
              <h3>{copy.contact.whatsappTitle}</h3>
              <p>{copy.contact.whatsappText}</p>
              <a
                className="patroai-btn"
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.contact.whatsappButton}
              </a>
            </article>
          </div>

          <div className="contact-form-card">
            <h3>{copy.contact.formTitle}</h3>
            <p>{copy.contact.formText}</p>

            <form
              className="contact-form"
              onSubmit={handleContactSubmit}
              aria-busy={contactSending}
            >
              <div className="contact-form-grid">
                <div className="contact-field">
                  <label htmlFor="patroai-contact-name">{copy.contact.fields.name}</label>
                  <input
                    id="patroai-contact-name"
                    className="contact-input"
                    type="text"
                    autoComplete="name"
                    value={contactForm.full_name}
                    onChange={(event) => updateContactField("full_name", event.target.value)}
                    required
                    maxLength={200}
                  />
                </div>

                <div className="contact-field">
                  <label htmlFor="patroai-contact-email">{copy.contact.fields.email}</label>
                  <input
                    id="patroai-contact-email"
                    className="contact-input"
                    type="email"
                    autoComplete="email"
                    value={contactForm.email}
                    onChange={(event) => updateContactField("email", event.target.value)}
                    required
                  />
                </div>

                <div className="contact-field">
                  <label htmlFor="patroai-contact-whatsapp">
                    {copy.contact.fields.whatsapp}
                  </label>
                  <input
                    id="patroai-contact-whatsapp"
                    className="contact-input"
                    type="tel"
                    autoComplete="tel"
                    value={contactForm.whatsapp}
                    onChange={(event) => updateContactField("whatsapp", event.target.value)}
                    maxLength={40}
                  />
                </div>

                <div className="contact-field">
                  <label htmlFor="patroai-contact-subject">
                    {copy.contact.fields.subject}
                  </label>
                  <select
                    id="patroai-contact-subject"
                    className="contact-select"
                    value={contactForm.subject}
                    onChange={(event) => updateContactField("subject", event.target.value)}
                    required
                  >
                    {copy.contact.subjects.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="contact-field full">
                  <label htmlFor="patroai-contact-message">
                    {copy.contact.fields.message}
                  </label>
                  <textarea
                    id="patroai-contact-message"
                    className="contact-textarea"
                    value={contactForm.message}
                    onChange={(event) => updateContactField("message", event.target.value)}
                    required
                    minLength={3}
                    maxLength={5000}
                  />
                </div>
              </div>

              <label className="contact-check">
                <input
                  type="checkbox"
                  checked={contactForm.consent_terms}
                  onChange={(event) =>
                    updateContactField("consent_terms", event.target.checked)
                  }
                  required
                />
                <span>
                  {copy.contact.consent}{" "}
                  <a href="/legal/terms" target="_blank" rel="noopener noreferrer">
                    {locale === "en" ? "Terms" : "Termos"}
                  </a>
                  {" · "}
                  <a href="/legal/privacy" target="_blank" rel="noopener noreferrer">
                    {locale === "en" ? "Privacy" : "Privacidade"}
                  </a>
                </span>
              </label>

              <label className="contact-check">
                <input
                  type="checkbox"
                  checked={contactForm.consent_marketing}
                  onChange={(event) =>
                    updateContactField("consent_marketing", event.target.checked)
                  }
                />
                <span>{copy.contact.marketing}</span>
              </label>

              {contactReceipt ? (
                <div className="contact-feedback success" role="status">
                  <strong>{copy.contact.successTitle}</strong>
                  <div>{copy.contact.successText}</div>
                  <div>
                    {contactReceipt.emailStatus === "sent"
                      ? copy.contact.emailSent
                      : copy.contact.emailPending}
                  </div>
                  {contactReceipt.id ? (
                    <span className="contact-protocol">
                      {copy.contact.protocol}: {contactReceipt.id}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {contactError ? (
                <div className="contact-feedback error" role="alert">
                  {contactError}
                </div>
              ) : null}

              <div className="contact-submit-row">
                <button
                  className="patroai-btn primary"
                  type="submit"
                  disabled={contactSending}
                >
                  {contactSending ? copy.contact.sending : copy.contact.send}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer className="patroai-footer">
        <div className="patroai-shell patroai-footer-inner">
          <span>{copy.footer.text}</span>
          <span>{copy.footer.rights}</span>
        </div>
      </footer>

      <a
        className="whatsapp-floating"
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={copy.contact.floatingWhatsapp}
        title={copy.contact.floatingWhatsapp}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16.04 3C8.85 3 3 8.7 3 15.72c0 2.24.6 4.43 1.74 6.35L3 29l7.12-1.83a13.22 13.22 0 0 0 5.91 1.42h.01C23.23 28.59 29 22.89 29 15.86 29 8.83 23.23 3 16.04 3Zm0 23.43h-.01a11.06 11.06 0 0 1-5.64-1.55l-.4-.23-4.23 1.09 1.13-4.02-.26-.42a10.46 10.46 0 0 1-1.68-5.68c0-5.82 4.98-10.56 11.1-10.56 6.11 0 11.08 4.78 11.08 10.66 0 5.9-4.97 10.71-11.09 10.71Zm6.08-7.94c-.33-.16-1.96-.94-2.26-1.05-.3-.1-.52-.16-.74.16-.22.32-.85 1.05-1.04 1.26-.19.22-.38.24-.71.08-.33-.16-1.4-.5-2.66-1.6-.98-.85-1.64-1.9-1.84-2.23-.19-.32-.02-.49.14-.65.15-.14.33-.38.5-.57.16-.19.22-.32.33-.54.11-.22.05-.4-.03-.57-.08-.16-.74-1.74-1.01-2.38-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.58.08-.88.4-.3.32-1.15 1.1-1.15 2.67s1.18 3.1 1.34 3.31c.16.22 2.31 3.45 5.6 4.84.78.33 1.4.52 1.87.66.79.24 1.5.21 2.07.13.63-.09 1.96-.78 2.23-1.53.27-.76.27-1.4.19-1.53-.08-.13-.3-.21-.63-.38Z" />
        </svg>
        <span>WhatsApp</span>
      </a>

      <AvatarPrechatModal
        open={prechatOpen}
        isOpen={prechatOpen}
        locale={locale}
        ttsLocale={ttsLocale}
        introText={orkioSpeech}
        onClose={() => setPrechatOpen(false)}
        onContinue={handleContinueAfterPrechat}
      />
    </main>
  );
}
