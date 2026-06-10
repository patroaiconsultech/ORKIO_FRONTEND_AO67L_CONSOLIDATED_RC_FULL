import usePatroaiSeo from "../lib/usePatroaiSeo.js";
import React, { useMemo, useState } from "react";
import AvatarPrechatModal from "../components/AvatarPrechatModal.jsx";
import LandingLanguageSwitch from "../components/LandingLanguageSwitch.jsx";
import { useLandingLocale } from "../lib/landingLocale.js";

const ROUTES = {
  orkioOS: "/orkio",
  patroai: "/patroai",
  auth: "/auth",
  app: "/app",
  admin: "/admin",
};

const LOGO_PRIMARY = "/patroai-assets/logo-patroai-novo.png";
const LOGO_FALLBACK = "/patroai-assets/logo-patroai-novo.webp";

const PATROAI_PAGE_COPY = {
  pt: {
    navAria: "Navegação principal",
    brandAria: "Ir para PatroAI",
    nav: {
      solutions: "Soluções",
      verticals: "Verticais",
      orkio: "Orkio",
      resources: "ESG & Método",
      about: "Sobre",
    },
    actions: {
      admin: "Admin",
      login: "Login",
      demo: "Agendar demonstração →",
    },
    hero: {
      kicker: "Startups • Outsourcing • IA • Integrações • ESG",
      titleBefore: "Resolvemos as dores do seu negócio com",
      titleHighlight: "IA e ESG.",
      subtitle:
        "A PatroAI cria startups, produtos digitais, verticais inteligentes e agentes de IA para empresas em formação ou já consolidadas. Nosso foco é entender as dores reais do negócio, integrar sistemas e informações já existentes e transformar processos em operação inteligente com execução rápida, segura e eficiente e orientar um futuro sustentável com governança, rastreabilidade, visão ESG e continuidade para o negócio.",
      primary: "Agendar demonstração →",
      secondary: "Conhecer soluções",
      trust:
        "Projetos conduzidos de forma rápida, segura e eficiente — da dor real à operação inteligente, com estratégia, tecnologia, integrações, IA e governança.",
    },
    orkioSpeech:
      "Olá. Eu sou Orkio. Posso mostrar como a PatroAI resolve dores do negócio com inteligência artificial, integra sistemas, aproveita informações já existentes, estrutura startups e cria verticais sob demanda com governança, rastreabilidade, ESG e visão de continuidade para o negócio.",
    missionVision: {
      label: "Missão, visão e valores",
      title: "Tecnologia com propósito. IA aplicada à execução real.",
      text:
        "A PatroAI une estratégia, governança, criatividade e inteligência artificial para transformar desafios reais em soluções práticas, seguras, escaláveis e sustentáveis.",
      cards: [
        {
          title: "Missão",
          text:
            "Potencializar pessoas e empresas com inteligência artificial segura, estratégica e aplicada à execução real.",
        },
        {
          title: "Visão",
          text:
            "Ser referência em IA operacional governável, conectando tecnologia, negócios e propósito para transformar o futuro das organizações.",
        },
        {
          title: "Valores",
          text:
            "Construímos tecnologia com consciência, responsabilidade e foco em resultado sustentável.",
          values: [
            "Propósito",
            "Ética",
            "Segurança",
            "Execução",
            "Inovação",
            "Humanidade",
            "Prosperidade compartilhada",
            "Evolução contínua",
          ],
        },
      ],
    },
    processAria: "Como atuamos",
    processSteps: [
      {
        number: "01",
        title: "Diagnosticar",
        text: "Mapeamos dores, gargalos, riscos, processos, oportunidades e impacto esperado para o negócio.",
        icon: "search",
      },
      {
        number: "02",
        title: "Priorizar",
        text: "Separarmos sintoma de causa raiz e definimos o menor caminho entre problema, tecnologia, retorno e responsabilidade ESG.",
        icon: "plan",
      },
      {
        number: "03",
        title: "Construir",
        text: "Desenvolvemos plataformas, automações, agentes de IA, produtos digitais, integrações com sistemas existentes e operações sob medida com foco em velocidade, segurança e eficiência.",
        icon: "code",
      },
      {
        number: "04",
        title: "Implantar",
        text: "Colocamos a solução em funcionamento com implantação segura, documentação, governança, rastreabilidade, integrações bem definidas e clareza operacional.",
        icon: "rocket",
      },
      {
        number: "05",
        title: "Evoluir",
        text: "Acompanhamos a operação com consultores especializados, melhoria contínua, dados, continuidade operacional, sucessão e visão sustentável de longo prazo.",
        icon: "growth",
      },
    ],
    servicesIntro: {
      label: "O que fazemos",
      title:
        "Criamos startups, implantamos IA em empresas consolidadas, integramos sistemas e resolvemos dores do negócio com velocidade, segurança, eficiência e visão ESG.",
      text:
        "A PatroAI atua em duas frentes: criação de novos negócios digitais em modelo startup outsourcing e evolução de empresas já existentes com inteligência artificial aplicada. Elaboramos business plans, estudos de viabilidade econômico-financeira, arquitetura de produto, agentes personalizados, automações, SaaS, integrações com sistemas existentes, implantação, governança e acompanhamento consultivo. Nosso método prioriza execução rápida, segura e eficiente. ESG entra como critério de decisão: eficiência com responsabilidade, rastreabilidade, impacto, continuidade e clareza para stakeholders. Isso inclui aproveitar informações já existentes, apoiar processos sucessórios e planejar um futuro mais sustentável para o negócio.",
    },
    services: [
      {
        title: "Startup Outsourcing Premium",
        text:
          "Desenvolvemos startups, produtos digitais e novas operações desde a concepção estratégica até implantação, tecnologia, governança e operação assistida.",
        icon: "target",
      },
      {
        title: "IA para Empresas Consolidadas",
        text:
          "Apoiamos empresas que já possuem operação, equipe, clientes e processos, levando IA para atendimento, vendas, gestão, documentação, análise e tomada de decisão.",
        icon: "brain",
      },
      {
        title: "Dores do Negócio + ESG",
        text:
          "Mapeamos gargalos reais e priorizamos soluções com impacto operacional, integrações úteis, rastreabilidade, redução de desperdícios, governança e responsabilidade social e ambiental.",
        icon: "leaf",
      },
      {
        title: "Business Plan & Viabilidade",
        text:
          "Estruturamos modelos de negócio, projeções financeiras e estudos de viabilidade econômico-financeira para decisões mais seguras.",
        icon: "system",
      },
      {
        title: "Integrações, Dados & Sucessão",
        text:
          "Integramos a solução aos sistemas já utilizados pela empresa, aproveitando informações existentes para qualificar decisões, preservar contexto, apoiar continuidade operacional e dar suporte a jornadas de sucessão.",
        icon: "gear",
      },
      {
        title: "Tecnologia, SaaS & Agentes de IA",
        text:
          "Criamos plataformas, automações e agentes de IA personalizados, com possibilidade de comercialização da plataforma em modelo SaaS para empresas em operação.",
        icon: "gear",
      },
    ],
    verticalsSection: {
      label: "Verticais PatroAI",
      title: "Criamos verticais sob demanda a partir de dores reais de mercado.",
      text:
        "As verticais PatroAI são negócios digitais setoriais criados com método próprio: diagnóstico, business plan, arquitetura de produto, agentes de IA, integrações, governança e operação assistida. Desenvolvemos sob demanda quando existe dor clara, oportunidade validável e potencial de operação recorrente. Temos frentes em estudo e desenvolvimento, sempre com foco em velocidade, segurança, eficiência e sustentabilidade.",
      primary: "Desenvolver uma vertical com a PatroAI →",
      secondary: "Entender o método",
      cards: [
        {
          eyebrow: "Modelo sob demanda",
          title: "Da dor real ao produto setorial",
          text:
            "Transformamos problemas específicos de um setor em plataformas, agentes e operações digitais com tese, governança, métricas e roadmap.",
          status: "Sob demanda",
          featured: true,
        },
        {
          eyebrow: "Execução assistida",
          title: "Rápido, seguro e eficiente",
          text:
            "Priorizamos implantação enxuta, integrações úteis, documentação clara, proteção de dados e evolução por ciclos curtos de validação.",
          status: "Método PatroAI",
          featured: false,
        },
        {
          eyebrow: "Pipeline PatroAI",
          title: "Novas frentes em estruturação",
          text:
            "Novas verticais estão em estudo para setores com alta necessidade de IA, integração de dados, sucessão, governança, rastreabilidade e ESG.",
          status: "Em andamento",
          featured: false,
        },
      ],
    },
    esgSection: {
      label: "ESG aplicado ao negócio",
      title: "ESG não como discurso: como critério de decisão, eficiência e confiança.",
      text:
        "A PatroAI usa IA, integrações e governança para ajudar empresas a resolver problemas reais sem perder responsabilidade. Isso significa melhorar processos, reduzir desperdícios, integrar sistemas, organizar documentação, dar transparência às decisões, qualificar dados e criar operações mais conscientes para clientes, equipes, investidores e parceiros. Também significa preservar o conhecimento do negócio e apoiar sua continuidade e sucessão com mais clareza.",
      items: [
        "Eficiência operacional com redução de retrabalho, desperdício e perda de contexto",
        "Governança, documentação, integrações e rastreabilidade das decisões",
        "Tecnologia aplicada com responsabilidade, continuidade e clareza para stakeholders",
      ],
    },
    orkioSection: {
      label: "Conheça Orkio",
      title: "Conheça Orkio, a inteligência operacional da PatroAI.",
      text:
        "Orkio é nossa inteligência operacional para diagnóstico, clareza executiva e próximos passos. Ele apoia fundadores, empresas e consultores na leitura do contexto, na organização das decisões, na integração de informações já existentes e na evolução da operação com IA, governança, continuidade e visão ESG.",
      primary: "Explorar Orkio OS →",
      secondary: "Conversar com Orkio",
      avatarLabel: "Orkio — presença místico-tecnológica da PatroAI",
      avatarTitle: "Presença de Orkio",
      avatarText: "Olá, eu sou Orkio.",
    },
    orkioBenefits: [
      ["search", "Entende as dores do negócio"],
      ["voice", "Responde por voz e texto"],
      ["brain", "Gera insights e recomendações"],
      ["gear", "Acompanha evolução com governança e continuidade"],
    ],
    footer: {
      text:
        "PatroAI Consultech · Startups, outsourcing, IA para empresas, integrações, verticais inteligentes, ESG, governança e rastreabilidade.",
      rights: "© 2026 PatroAI. Todos os direitos reservados.",
    },
  },

  en: {
    navAria: "Main navigation",
    brandAria: "Go to PatroAI",
    nav: {
      solutions: "Solutions",
      verticals: "Verticals",
      orkio: "Orkio",
      resources: "ESG & Method",
      about: "About",
    },
    actions: {
      admin: "Admin",
      login: "Login",
      demo: "Schedule a demo →",
    },
    hero: {
      kicker: "Startups • Outsourcing • AI • Integrations • ESG",
      titleBefore: "We solve your business pains with",
      titleHighlight: "AI and ESG.",
      subtitle:
        "PatroAI creates startups, digital products, intelligent verticals and AI agents for companies that are being formed or already consolidated. Our focus is to understand real business pains, integrate existing systems and information, and transform processes into intelligent operations with fast, secure and efficient execution and guide a sustainable future with governance, traceability, an ESG perspective and business continuity.",
      primary: "Schedule a demo →",
      secondary: "Explore solutions",
      trust:
        "Projects conducted in a fast, secure and efficient way, with strategy, technology, integrations, AI and specialized consulting.",
    },
    orkioSpeech:
      "Hello. I am Orkio. I can show how PatroAI solves business pains with artificial intelligence, integrates systems, leverages existing information, structures startups and creates on-demand verticals with governance, traceability, ESG and a continuity perspective for the business.",
    missionVision: {
      label: "Mission, vision and values",
      title: "Technology with purpose. AI applied to real execution.",
      text:
        "PatroAI combines strategy, governance, creativity and artificial intelligence to transform real challenges into practical, secure, scalable and sustainable solutions.",
      cards: [
        {
          title: "Mission",
          text:
            "Empower people and companies with safe, strategic artificial intelligence applied to real execution.",
        },
        {
          title: "Vision",
          text:
            "Become a reference in governable operational AI, connecting technology, business and purpose to transform the future of organizations.",
        },
        {
          title: "Values",
          text:
            "We build technology with awareness, responsibility and focus on sustainable outcomes.",
          values: [
            "Purpose",
            "Ethics",
            "Security",
            "Execution",
            "Innovation",
            "Humanity",
            "Shared prosperity",
            "Continuous evolution",
          ],
        },
      ],
    },
    processAria: "How we work",
    processSteps: [
      {
        number: "01",
        title: "Diagnose",
        text: "We map pains, bottlenecks, risks, processes, opportunities and expected impact for the business.",
        icon: "search",
      },
      {
        number: "02",
        title: "Prioritize",
        text: "We separate symptom from root cause and define the shortest path between problem, technology, return and ESG responsibility.",
        icon: "plan",
      },
      {
        number: "03",
        title: "Build",
        text: "We develop platforms, automations, AI agents, digital products, integrations with existing systems and tailored operations with a focus on speed, security and efficiency.",
        icon: "code",
      },
      {
        number: "04",
        title: "Deploy",
        text: "We put the solution into operation with secure deployment, documentation, governance, traceability, well-defined integrations and operational clarity.",
        icon: "rocket",
      },
      {
        number: "05",
        title: "Evolve",
        text: "We support the operation with specialized consultants, continuous improvement, data, operational continuity, succession and a sustainable long-term vision.",
        icon: "growth",
      },
    ],
    servicesIntro: {
      label: "What we do",
      title:
        "We create startups, implement AI in established companies, integrate systems and solve business pains with speed, security, efficiency and an ESG perspective.",
      text:
        "PatroAI works on two fronts: creating new digital businesses through startup outsourcing and evolving existing companies with applied artificial intelligence. We build business plans, financial feasibility studies, product architecture, personalized agents, automations, SaaS, integrations with existing systems, deployment, governance and consultative support. Our method prioritizes fast, secure and efficient execution. ESG works as a decision criterion: efficiency with responsibility, traceability, impact, continuity and clarity for stakeholders. This includes leveraging existing information, supporting succession processes and planning a more sustainable future for the business.",
    },
    services: [
      {
        title: "Premium Startup Outsourcing",
        text:
          "We develop startups, digital products and new operations from strategic conception to deployment, technology, governance and assisted operations.",
        icon: "target",
      },
      {
        title: "AI for Established Companies",
        text:
          "We support companies that already have operations, teams, clients and processes, bringing AI into service, sales, management, documentation, analysis and decision-making.",
        icon: "brain",
      },
      {
        title: "Business Pains + ESG",
        text:
          "We map real bottlenecks and prioritize solutions with operational impact, useful integrations, traceability, waste reduction, governance and social and environmental responsibility.",
        icon: "leaf",
      },
      {
        title: "Business Plan & Feasibility",
        text:
          "We structure business models, financial projections and feasibility studies to support safer decisions.",
        icon: "system",
      },
      {
        title: "Integrations, Data & Succession",
        text:
          "We integrate the solution with the systems the company already uses, leveraging existing information to improve decisions, preserve context, support operational continuity and strengthen succession journeys.",
        icon: "gear",
      },
      {
        title: "Technology, SaaS & AI Agents",
        text:
          "We create platforms, automations and personalized AI agents, with the possibility of commercializing the platform as SaaS for companies already in operation.",
        icon: "gear",
      },
    ],
    verticalsSection: {
      label: "PatroAI Verticals",
      title: "We create on-demand verticals from real market pains.",
      text:
        "PatroAI verticals are sector-specific digital businesses created with our own method: diagnosis, business plan, product architecture, AI agents, integrations, governance and assisted operations. We develop them on demand when there is a clear pain, a validatable opportunity and recurring-operation potential. New fronts are under study and development, always focused on speed, security, efficiency and sustainability.",
      primary: "Build a vertical with PatroAI →",
      secondary: "Understand the method",
      cards: [
        {
          eyebrow: "On-demand model",
          title: "From real pain to sector product",
          text:
            "We turn sector-specific problems into platforms, agents and digital operations with thesis, governance, metrics and roadmap.",
          status: "On demand",
          featured: true,
        },
        {
          eyebrow: "Assisted execution",
          title: "Fast, secure and efficient",
          text:
            "We prioritize lean deployment, useful integrations, clear documentation, data protection and evolution through short validation cycles.",
          status: "PatroAI method",
          featured: false,
        },
        {
          eyebrow: "PatroAI pipeline",
          title: "New fronts in structuring",
          text:
            "New verticals are being studied for sectors with high demand for AI, data integration, succession, governance, traceability and ESG.",
          status: "In progress",
          featured: false,
        },
      ],
    },
    esgSection: {
      label: "ESG applied to business",
      title: "ESG not as discourse: as a criterion for decision, efficiency and trust.",
      text:
        "PatroAI uses AI, integrations and governance to help companies solve real problems without losing responsibility. This means improving processes, reducing waste, integrating systems, organizing documentation, bringing transparency to decisions, qualifying data and creating more conscious operations for clients, teams, investors and partners. It also means preserving business knowledge and supporting continuity and succession with greater clarity.",
      items: [
        "Operational efficiency with reduced rework, waste and loss of context",
        "Governance, documentation, integrations and traceability of decisions",
        "Responsible technology with continuity and stakeholder clarity",
      ],
    },
    orkioSection: {
      label: "Meet Orkio",
      title: "Meet Orkio, PatroAI's operational intelligence.",
      text:
        "Orkio is our operational intelligence for diagnosis, executive clarity and next steps. It supports founders, companies and consultants in understanding context, organizing decisions, integrating existing information and evolving operations with AI, governance, continuity and an ESG perspective.",
      primary: "Explore Orkio OS →",
      secondary: "Talk to Orkio",
      avatarLabel: "Orkio — PatroAI's mystic-technological presence",
      avatarTitle: "Orkio's presence",
      avatarText: "Hello, I am Orkio.",
    },
    orkioBenefits: [
      ["search", "Understands business pains"],
      ["voice", "Responds by voice and text"],
      ["brain", "Generates insights and recommendations"],
      ["gear", "Supports evolution with governance and continuity"],
    ],
    footer: {
      text:
        "PatroAI Consultech · Startups, outsourcing, AI for companies, integrations, intelligent verticals, ESG, governance and traceability.",
      rights: "© 2026 PatroAI. All rights reserved.",
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
        alt="PatroAI Consultech"
        className="patroai-logo-img"
        onError={() => {
          if (src !== LOGO_FALLBACK) setSrc(LOGO_FALLBACK);
        }}
      />
      {!compact ? (
        <div className="patroai-logo-text">
          <strong>PatroAI</strong>
          <span>Consultech</span>
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
  const { locale, setLocale, ttsLocale } = useLandingLocale();
  const copy = PATROAI_PAGE_COPY[locale] || PATROAI_PAGE_COPY.pt;

  const heroSubtitle = useMemo(() => copy.hero.subtitle, [copy.hero.subtitle]);
  const orkioSpeech = useMemo(() => copy.orkioSpeech, [copy.orkioSpeech]);

  function handleDemo() {
    safeNavigateToAuth({ mode: "register", source: "patroai_demo", lang: locale });
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
          .verticals-grid {
            grid-template-columns: 1fr;
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

      <footer className="patroai-footer">
        <div className="patroai-shell patroai-footer-inner">
          <span>{copy.footer.text}</span>
          <span>{copy.footer.rights}</span>
        </div>
      </footer>

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
