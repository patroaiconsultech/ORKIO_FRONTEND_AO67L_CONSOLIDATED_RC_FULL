import usePatroaiSeo from "../lib/usePatroaiSeo.js"; import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import OrkioVoiceHero from "../components/OrkioVoiceHero.jsx";
import InteractiveOrkioPillars from "../components/InteractiveOrkioPillars.jsx";
import LegalFooter from "../components/LegalFooter.jsx";
import OrkioMysticAvatar from "../components/OrkioMysticAvatar.jsx";
import LandingLanguageSwitch from "../components/LandingLanguageSwitch.jsx";
import { useLandingLocale } from "../lib/landingLocale.js";

/**
 * ORKIO OS — LANDING DE PRODUTO
 *
 * Rota esperada atual: /orkio
 * Link institucional Patroai: /patroai
 * Login/cadastro: /auth
 *
 * AO-05 — Internacionalização PT/EN:
 * - Adiciona seleção visível de idioma no header.
 * - Mantém português como padrão.
 * - Sincroniza copy da landing com voz/TTS de Orkio.
 */

const ROUTES = {
  orkioOS: "/orkio",
  patroai: "/patroai",
  auth: "/auth",
  contact: "/contact",
};

const LOGO_PRIMARY = "/patroai-assets/logo-patroai-novo.png";
const LOGO_FALLBACK = "/patroai-assets/logo-patroai-novo.webp";


const ORKIO_PAGE_COPY = {
  pt: {
    logoTagline: "Sistema Operacional de Inteligência Empresarial",
    headerAria: "Ir parOrkio OS",
    navAria: "Navegação principal",
    nav: {
      resources: "Recursos",
      how: "Como funciona",
      integrations: "Integrações",
      assistant: "Assistente",
      patroai: "Patroai Consultech",
    },
    hero: {
      kicker: "Orkio OS • Inteligência contínua para sua empresa",
      titleBefore: "Seu negócio operando com",
      titleHighlight: "inteligência contínua.",
      subtitle:
        "Orkio OS conecta estratégia, dados, automação, agentes inteligentes e execução em uma plataforma viva que entende o contexto da empresa e conduz próximos passos com clareza.",
      primary: "Iniciar diagnóstico inteligente →",
      secondary: "Ver Orkio em ação",
    },
    dashboard: {
      headerTitle: "Orkio OS",
      status: "Online",
      metricsTitle: "Indicadores estratégicos",
      updated: "Atualizado agora",
      metrics: [
        ["Processos ativos", "128", "+18%"],
        ["Tarefas em andamento", "342", "+22%"],
        ["Riscos monitorados", "27", "-8%"],
        ["Oportunidades", "19", "+15%"],
      ],
      flowTitle: "Fluxo de operações",
      live: "Ao vivo",
      flowItems: ["Planejamento", "Execução", "Monitoramento", "Ajustes", "Resultados"],
      activityTitle: "Atividade em tempo real",
      seeAll: "Ver todas",
      events: [
        "Novo processo mapeado em Operações",
        "Indicador de desempenho atualizado",
        "Risco operacional identificado",
        "Agente de Atendimento concluiu análise",
      ],
      minutesAgo: (value) => `há ${value} min`,
      whereStopped: "Onde paramos",
      planExecution: "do plano em execução",
      nextStep: "Próximo passo recomendado",
      recommendation: "Revisar gargalos no fluxo de aprovação de pedidos.",
      seeRecommendation: "Ver recomendação →",
    },
    capabilitiesAria: "Recursos de Orkio OS",
    capabilities: [
      {
        number: "01",
        title: "Memória Contextual",
        text: "Preserva histórico, decisões, etapas e próximos passos para evitar repetição e perda de contexto.",
        icon: "✺",
      },
      {
        number: "02",
        title: "Agentes Especializados",
        text: "Permite criar agentes para áreas, processos, equipes, clientes ou operações específicas.",
        icon: "◌",
      },
      {
        number: "03",
        title: "Execução Assistida",
        text: "Ajuda a transformar planejamento em ação, com acompanhamento contínuo e recomendações práticas.",
        icon: "↗",
      },
      {
        number: "04",
        title: "Painel Vivo",
        text: "Mostra indicadores, status, tarefas, riscos e oportunidades em tempo real.",
        icon: "▤",
      },
      {
        number: "05",
        title: "Governança e Segurança",
        text: "Organiza permissões, registros, rastreabilidade e controle operacional.",
        icon: "⌂",
      },
      {
        number: "06",
        title: "Voz e Texto",
        text: "Permite interação natural com Orkio por conversa escrita ou falada.",
        icon: "≋",
      },
    ],
    howAria: "Como funciona",
    flow: [
      ["Entender", "Capturamos contexto, dados e objetivos."],
      ["Organizar", "Estruturamos informações, processos e prioridades."],
      ["Automatizar", "Criamos fluxos, regras e ações inteligentes."],
      ["Executar", "Acompanhamos a execução com clareza e foco."],
      ["Aprender", "Aprendemos com a operação e sugerimos melhorias."],
    ],
    assistant: {
      titleBefore: "Olá, eu sou",
      titleHighlight: "Orkio.",
      text:
        "Gostaria de falar comigo?",
      voice: "≋ Falar com Orkio",
      textButton: "□ Digitar mensagem",
      diagnosis: "✦ Começar diagnóstico",
      statuses: [
        "● Ouvindo...",
        "● Pensando...",
        "● Respondendo...",
        "● Registrando contexto...",
        "● Próximo passo sugerido...",
      ],
    },
    voiceHero: {
      kicker: "Orkio OS • Voz e texto",
      title: "Uma interface viva para entender, organizar e executar.",
      subtitle:
        "Orkio conversa, registra contexto, entende prioridades e ajuda a conduzir a evolução da empresa com agentes inteligentes e governança.",
      speech:
        "Olá. Eu sou Orkio. Posso conversar por voz ou texto, entender o contexto da sua empresa e iniciar um diagnóstico operacional em poucos minutos.",
      primaryLabel: "Iniciar diagnóstico",
      secondaryLabel: "Conhecer a Patroai",
      tertiaryLabel: "Falar com especialista",
      quickTitle: "Perguntas que Orkio pode responder",
      quickPrompts: [
        "Como organizar melhor meus processos internos?",
        "Quais agentes de IA fazem sentido para minha empresa?",
        "Como transformar estratégia em execução acompanhada?",
      ],
    },
    integrationsAria: "Integrações e governança",
    integrations: [
      ["Sistemas internos", "Conecte processos, dados e fluxos já existentes."],
      ["Equipes e áreas", "Crie agentes para times, rotinas e objetivos específicos."],
      ["Governança", "Mantenha rastreabilidade, permissões e histórico de decisões."],
      ["Relatórios vivos", "Acompanhe indicadores, aprendizados e próximos passos."],
      ["Evolução contínua", "A plataforma aprende com a operação e melhora com o tempo."],
    ],
    footer: {
      platform: "Plataforma criada pela Patroai Consultech.",
      rights: "© 2026 Patroai. Todos os direitos reservados.",
    },
  },
  en: {
    logoTagline: "Business Intelligence Operating System",
    headerAria: "Go tOrkio OS",
    navAria: "Main navigation",
    nav: {
      resources: "Features",
      how: "How it works",
      integrations: "Integrations",
      assistant: "Assistant",
      patroai: "Patroai Consultech",
    },
    hero: {
      kicker: "Orkio OS • Continuous intelligence for your company",
      titleBefore: "Your business operating with",
      titleHighlight: "continuous intelligence.",
      subtitle:
        "Orkio OS connects strategy, data, automation, intelligent agents and execution in a living platform that understands the company context and guides next steps with clarity.",
      primary: "Start intelligent diagnosis →",
      secondary: "See Orkio in action",
    },
    dashboard: {
      headerTitle: "Orkio OS",
      status: "Online",
      metricsTitle: "Strategic indicators",
      updated: "Updated now",
      metrics: [
        ["Active processes", "128", "+18%"],
        ["Tasks in progress", "342", "+22%"],
        ["Risks monitored", "27", "-8%"],
        ["Opportunities", "19", "+15%"],
      ],
      flowTitle: "Operations flow",
      live: "Live",
      flowItems: ["Planning", "Execution", "Monitoring", "Adjustments", "Results"],
      activityTitle: "Real-time activity",
      seeAll: "See all",
      events: [
        "New process mapped in Operations",
        "Performance indicator updated",
        "Operational risk identified",
        "Support Agent completed analysis",
      ],
      minutesAgo: (value) => `${value} min ago`,
      whereStopped: "Where we stopped",
      planExecution: "of the plan in execution",
      nextStep: "Recommended next step",
      recommendation: "Review bottlenecks in the order approval flow.",
      seeRecommendation: "See recommendation →",
    },
    capabilitiesAria: "Orkio OS features",
    capabilities: [
      {
        number: "01",
        title: "Contextual Memory",
        text: "Preserves history, decisions, stages and next steps to avoid repetition and context loss.",
        icon: "✺",
      },
      {
        number: "02",
        title: "Specialized Agents",
        text: "Allows you to create agents for areas, processes, teams, clients or specific operations.",
        icon: "◌",
      },
      {
        number: "03",
        title: "Assisted Execution",
        text: "Helps turn planning into action with continuous follow-up and practical recommendations.",
        icon: "↗",
      },
      {
        number: "04",
        title: "Living Dashboard",
        text: "Shows indicators, status, tasks, risks and opportunities in real time.",
        icon: "▤",
      },
      {
        number: "05",
        title: "Governance and Security",
        text: "Organizes permissions, records, traceability and operational control.",
        icon: "⌂",
      },
      {
        number: "06",
        title: "Voice and Text",
        text: "Enables natural interaction with Orkio through written or spoken conversation.",
        icon: "≋",
      },
    ],
    howAria: "How it works",
    flow: [
      ["Understand", "We capture context, data and goals."],
      ["Organize", "We structure information, processes and priorities."],
      ["Automate", "We create intelligent flows, rules and actions."],
      ["Execute", "We follow execution with clarity and focus."],
      ["Learn", "We learn from operations and suggest improvements."],
    ],
    assistant: {
      titleBefore: "Hello, I am",
      titleHighlight: "Orkio.",
      text:
        "I can talk by voice or text, understand your company context and start an operational diagnosis in a few minutes. My role is to preserve continuity, reduce repetition and guide next steps with clarity.",
      voice: "≋ Talk tOrkio",
      textButton: "□ Type a message",
      diagnosis: "✦ Start diagnosis",
      statuses: [
        "● Listening...",
        "● Thinking...",
        "● Responding...",
        "● Saving context...",
        "● Suggested next step...",
      ],
    },
    voiceHero: {
      kicker: "Orkio OS • Voice and text",
      title: "A living interface to understand, organize and execute.",
      subtitle:
        "Orkio talks, records context, understands priorities and helps guide company evolution with intelligent agents and governance.",
      speech:
        "Hello. I am Orkio. I can talk by voice or text, understand your company context and start an operational diagnosis in just a few minutes.",
      primaryLabel: "Start diagnosis",
      secondaryLabel: "Meet Patroai",
      tertiaryLabel: "Talk to a specialist",
      quickTitle: "Questions Orkio can answer",
      quickPrompts: [
        "How can I better organize my internal processes?",
        "Which AI agents make sense for my company?",
        "How can I turn strategy into tracked execution?",
      ],
    },
    integrationsAria: "Integrations and governance",
    integrations: [
      ["Internal systems", "Connect existing processes, data and flows."],
      ["Teams and departments", "Create agents for teams, routines and specific goals."],
      ["Governance", "Keep traceability, permissions and decision history."],
      ["Living reports", "Track indicators, learnings and next steps."],
      ["Continuous evolution", "The platform learns from operations and improves over time."],
    ],
    footer: {
      platform: "Platform created by Patroai Consultech.",
      rights: "© 2026 Patroai. All rights reserved.",
    },
  },
};


function ProductLogo({ tagline = ORKIO_PAGE_COPY.pt.logoTagline }) {
  const [src, setSrc] = useState(LOGO_PRIMARY);

  return (
    <div className="orkio-logo">
      <img
        src={src}
        alt="Orkio OS"
        onError={() => {
          if (src !== LOGO_FALLBACK) setSrc(LOGO_FALLBACK);
        }}
      />
      <div>
        <strong>ORKIO OS</strong>
        <span>{tagline}</span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, delta }) {
  return (
    <article className="orkio-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
    </article>
  );
}

function LiveDashboard({ copy = ORKIO_PAGE_COPY.pt.dashboard }) {
  return (
    <aside className="orkio-dashboard" aria-label="Painel Orkio OS">
      <div className="orkio-dashboard__header">
        <div>
          <strong>{copy.headerTitle}</strong>
          <span>{copy.status}</span>
        </div>
        <i />
      </div>

      <section className="orkio-dashboard__block">
        <div className="orkio-dashboard__title">
          <strong>{copy.metricsTitle}</strong>
          <span>{copy.updated}</span>
        </div>

        <div className="orkio-metrics">
          {copy.metrics.map(([label, value, delta]) => (
            <MiniMetric key={label} label={label} value={value} delta={delta} />
          ))}
        </div>
      </section>

      <section className="orkio-dashboard__block">
        <div className="orkio-dashboard__title">
          <strong>{copy.flowTitle}</strong>
          <span>{copy.live}</span>
        </div>

        <div className="orkio-flowline">
          {copy.flowItems.map((item) => (
            <div key={item}>
              <b>✓</b>
              <small>{item}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="orkio-dashboard__split">
        <section className="orkio-dashboard__block">
          <div className="orkio-dashboard__title">
            <strong>{copy.activityTitle}</strong>
            <span>{copy.seeAll}</span>
          </div>

          <ul className="orkio-live-list">
            {copy.events.map((event, index) => (
              <li key={event}>
                <span>{event}</span>
                <small>{copy.minutesAgo(index + 2)}</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="orkio-dashboard__block orkio-progress-card">
          <strong>{copy.whereStopped}</strong>
          <div className="orkio-progress">
            <b>72%</b>
          </div>
          <span>{copy.planExecution}</span>
        </section>
      </div>

      <section className="orkio-dashboard__recommendation">
        <div>
          <strong>{copy.nextStep}</strong>
          <span>{copy.recommendation}</span>
        </div>
        <button type="button">{copy.seeRecommendation}</button>
      </section>
    </aside>
  );
}

export default function Landing() { usePatroaiSeo();
  const nav = useNavigate();
  const { locale, setLocale, ttsLocale } = useLandingLocale();
  const copy = ORKIO_PAGE_COPY[locale] || ORKIO_PAGE_COPY.pt;

  const heroSubtitle = useMemo(() => copy.hero.subtitle, [copy.hero.subtitle]);

  function goToAuth(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === "") return;
      query.set(key, String(value));
    });

    nav(`${ROUTES.auth}${query.toString() ? `?${query.toString()}` : ""}`);
  }

  return (
    <div className="orkio-page">
      <LandingLanguageSwitch locale={locale} onChange={setLocale} />
      <style>{`
        .orkio-page {
          min-height: 100vh;
          overflow: hidden;
          color: #fff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(900px 560px at 10% 0%, rgba(80,255,130,0.10), transparent 56%),
            radial-gradient(760px 500px at 84% 8%, rgba(90,176,255,0.14), transparent 50%),
            radial-gradient(900px 560px at 54% 18%, rgba(245,185,56,0.10), transparent 60%),
            linear-gradient(180deg, #02060b 0%, #07121c 56%, #02060b 100%);
        }

        .orkio-page * {
          box-sizing: border-box;
        }

        .orkio-shell {
          width: min(1480px, calc(100% - 36px));
          margin: 0 auto;
        }

        .orkio-header {
          position: sticky;
          top: 0;
          z-index: 20;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(2,6,11,0.78);
          backdrop-filter: blur(22px);
        }

        .orkio-header__inner {
          min-height: 92px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .orkio-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          color: #fff;
          text-decoration: none;
        }

        .orkio-logo img {
          width: 75px;
          height: 75px;
          border-radius: 999px;
          object-fit: cover;
          border: 1px solid rgba(136,243,160,0.30);
          box-shadow: 0 0 28px rgba(77,216,116,0.20), 0 0 28px rgba(245,185,56,0.14);
          background: #05070b;
        }

        .orkio-logo strong {
          display: block;
          color: #f5c451;
          font-size: 34px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.02em;
        }

        .orkio-logo span {
          display: block;
          max-width: 290px;
          margin-top: 5px;
          color: rgba(255,255,255,0.65);
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .orkio-nav {
          display: flex;
          align-items: center;
          gap: 34px;
          color: rgba(255,255,255,0.76);
          font-size: 14px;
          font-weight: 650;
        }

        .orkio-nav a,
        .orkio-actions a {
          color: inherit;
          text-decoration: none;
          transition: color 0.2s ease, border-color 0.2s ease;
        }

        .orkio-nav a:hover,
        .orkio-actions a:hover {
          color: #8ff4a8;
        }

        .orkio-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .orkio-button {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 0;
          border-radius: 16px;
          padding: 0 20px;
          color: #061108;
          background: linear-gradient(135deg, #abff8f 0%, #54d568 48%, #177a35 100%);
          box-shadow: 0 18px 46px rgba(84,213,104,0.18);
          font-size: 14px;
          font-weight: 950;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .orkio-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 54px rgba(84,213,104,0.24);
        }

        .orkio-button--gold {
          color: #080807;
          background: linear-gradient(135deg, #f8dfa3 0%, #f2bf42 48%, #a76b14 100%);
          box-shadow: 0 18px 46px rgba(245,185,56,0.16);
        }

        .orkio-button--ghost {
          color: rgba(255,255,255,0.86);
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: none;
        }

        .orkio-button--ghost:hover {
          border-color: rgba(136,243,160,0.42);
          box-shadow: none;
        }

        .orkio-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.88fr) minmax(420px, 0.72fr) minmax(430px, 0.88fr);
          gap: 38px;
          align-items: center;
          padding: 58px 0 42px;
        }

        .orkio-kicker {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid rgba(136,243,160,0.30);
          background: rgba(77,216,116,0.065);
          color: #9cffae;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .orkio-hero h1 {
          margin: 0;
          max-width: 720px;
          color: #fff;
          font-size: clamp(44px, 5.2vw, 74px);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 950;
        }

        .orkio-gradient-text {
          color: transparent;
          background: linear-gradient(90deg, #9cffae, #43d5ff 55%, #f5c451);
          -webkit-background-clip: text;
          background-clip: text;
        }

        .orkio-hero p {
          margin: 24px 0 0;
          max-width: 640px;
          color: rgba(255,255,255,0.68);
          font-size: 16px;
          line-height: 1.78;
        }

        .orkio-hero__cta {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 32px;
        }

        .orkio-orb {
          position: relative;
          display: grid;
          place-items: center;
          aspect-ratio: 1;
          min-height: 440px;
        }

        .orkio-orb::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(circle at center, rgba(84,213,104,0.20), rgba(67,213,255,0.09) 36%, transparent 66%);
          filter: blur(18px);
        }

        .orkio-orb__ring {
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(245,185,56,0.24);
          inset: 10%;
          animation: orkio-spin 42s linear infinite;
        }

        .orkio-orb__core {
          position: relative;
          width: 62%;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 1px solid rgba(136,243,160,0.28);
          background:
            radial-gradient(circle at 38% 26%, rgba(136,243,160,0.18), transparent 36%),
            radial-gradient(circle at 68% 70%, rgba(67,213,255,0.16), transparent 42%),
            rgba(4,8,14,0.62);
          box-shadow:
            inset 0 0 80px rgba(84,213,104,0.09),
            0 0 90px rgba(67,213,255,0.12),
            0 0 80px rgba(245,185,56,0.10);
        }

        .orkio-orb__core strong {
          position: relative;
          z-index: 2;
          color: #f5c451;
          font-size: clamp(36px, 4vw, 58px);
          font-weight: 950;
          letter-spacing: -0.04em;
          text-shadow: 0 0 28px rgba(245,196,81,0.45);
        }

        .orkio-orb__core span {
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(136,243,160,0.20);
        }

        .orkio-orb__core span:nth-child(1) {
          inset: 18%;
        }

        .orkio-orb__core span:nth-child(2) {
          inset: 30%;
          border-color: rgba(67,213,255,0.22);
        }

        .orkio-orb__label {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid rgba(245,185,56,0.24);
          background: rgba(0,0,0,0.42);
          color: rgba(255,255,255,0.84);
          font-size: 13px;
          font-weight: 800;
          backdrop-filter: blur(14px);
        }

        .orkio-orb__label:nth-of-type(1) { top: 10%; left: 42%; }
        .orkio-orb__label:nth-of-type(2) { top: 28%; left: 8%; }
        .orkio-orb__label:nth-of-type(3) { top: 30%; right: 6%; }
        .orkio-orb__label:nth-of-type(4) { bottom: 28%; left: 7%; }
        .orkio-orb__label:nth-of-type(5) { bottom: 28%; right: 8%; }
        .orkio-orb__label:nth-of-type(6) { bottom: 7%; left: 38%; }

        .orkio-dashboard {
          border-radius: 34px;
          border: 1px solid rgba(245,185,56,0.18);
          background: rgba(255,255,255,0.04);
          box-shadow: 0 30px 120px rgba(0,0,0,0.38);
          backdrop-filter: blur(18px);
          padding: 20px;
        }

        .orkio-dashboard__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .orkio-dashboard__header strong {
          display: block;
          color: #fff;
          font-size: 28px;
          letter-spacing: -0.03em;
        }

        .orkio-dashboard__header span {
          display: block;
          margin-top: 4px;
          color: #8ff4a8;
          font-size: 12px;
          font-weight: 800;
        }

        .orkio-dashboard__header i {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #42e87f;
          box-shadow: 0 0 16px rgba(66,232,127,0.9);
        }

        .orkio-dashboard__block,
        .orkio-dashboard__recommendation {
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 22px;
          background: rgba(0,0,0,0.22);
          padding: 16px;
        }

        .orkio-dashboard__block + .orkio-dashboard__block,
        .orkio-dashboard__split,
        .orkio-dashboard__recommendation {
          margin-top: 12px;
        }

        .orkio-dashboard__title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .orkio-dashboard__title strong {
          color: rgba(255,255,255,0.88);
          font-size: 13px;
        }

        .orkio-dashboard__title span {
          color: #8ff4a8;
          font-size: 11px;
          font-weight: 800;
        }

        .orkio-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .orkio-metric {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.075);
          background: rgba(255,255,255,0.025);
          padding: 12px;
        }

        .orkio-metric span,
        .orkio-metric small {
          display: block;
          color: rgba(255,255,255,0.54);
          font-size: 10px;
          line-height: 1.3;
        }

        .orkio-metric strong {
          display: block;
          margin: 7px 0;
          color: #fff;
          font-size: 24px;
        }

        .orkio-metric small {
          color: #8ff4a8;
          font-weight: 850;
        }

        .orkio-flowline {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          align-items: start;
        }

        .orkio-flowline div {
          position: relative;
          display: grid;
          justify-items: center;
          gap: 7px;
        }

        .orkio-flowline div:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 14px;
          left: calc(50% + 18px);
          right: calc(-50% + 18px);
          height: 1px;
          background: linear-gradient(90deg, rgba(245,185,56,0.8), rgba(84,213,104,0.45));
        }

        .orkio-flowline b {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid rgba(245,185,56,0.35);
          color: #f5c451;
          background: #07111a;
          font-size: 12px;
        }

        .orkio-flowline small {
          color: rgba(255,255,255,0.55);
          font-size: 10px;
          text-align: center;
        }

        .orkio-dashboard__split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 150px;
          gap: 12px;
        }

        .orkio-live-list {
          display: grid;
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .orkio-live-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: rgba(255,255,255,0.64);
          font-size: 12px;
        }

        .orkio-live-list small {
          flex: 0 0 auto;
          color: rgba(255,255,255,0.38);
        }

        .orkio-progress-card {
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 10px;
          text-align: center;
        }

        .orkio-progress-card > strong {
          color: rgba(255,255,255,0.84);
          font-size: 13px;
        }

        .orkio-progress-card > span {
          color: rgba(255,255,255,0.50);
          font-size: 11px;
        }

        .orkio-progress {
          display: grid;
          place-items: center;
          width: 86px;
          height: 86px;
          border-radius: 999px;
          background:
            radial-gradient(circle at center, #07111a 54%, transparent 56%),
            conic-gradient(#8ff4a8 0 72%, rgba(245,185,56,0.32) 72% 100%);
        }

        .orkio-progress b {
          color: #fff;
          font-size: 22px;
        }

        .orkio-dashboard__recommendation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-color: rgba(245,185,56,0.24);
        }

        .orkio-dashboard__recommendation strong,
        .orkio-dashboard__recommendation span {
          display: block;
        }

        .orkio-dashboard__recommendation strong {
          color: #f5c451;
          font-size: 13px;
        }

        .orkio-dashboard__recommendation span {
          margin-top: 5px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .orkio-dashboard__recommendation button {
          flex: 0 0 auto;
          border: 1px solid rgba(245,185,56,0.26);
          border-radius: 14px;
          padding: 10px 12px;
          color: #f5c451;
          background: rgba(245,185,56,0.08);
          font-weight: 850;
          cursor: pointer;
        }

        .orkio-capabilities {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 32px;
          background: rgba(255,255,255,0.035);
          backdrop-filter: blur(16px);
          padding: 14px;
        }

        .orkio-capability,
        .orkio-flow-card,
        .orkio-assistant-card {
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.085);
          background: rgba(0,0,0,0.22);
          padding: 18px;
        }

        .orkio-capability b {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          margin-bottom: 18px;
          border-radius: 16px;
          border: 1px solid rgba(245,185,56,0.24);
          color: #f5c451;
          background: rgba(245,185,56,0.08);
          font-size: 18px;
        }

        .orkio-capability small {
          color: rgba(245,196,81,0.82);
          font-weight: 950;
        }

        .orkio-capability h3 {
          margin: 8px 0 0;
          color: #fff;
          font-size: 18px;
          line-height: 1.14;
        }

        .orkio-capability p {
          margin: 12px 0 0;
          color: rgba(255,255,255,0.56);
          font-size: 13px;
          line-height: 1.6;
        }

        .orkio-flow {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
          border: 1px solid rgba(136,243,160,0.16);
          border-radius: 32px;
          background: linear-gradient(90deg, rgba(77,216,116,0.08), rgba(67,213,255,0.055), rgba(245,185,56,0.05));
          padding: 14px;
        }

        .orkio-flow-card {
          display: grid;
          align-content: start;
          min-height: 124px;
        }

        .orkio-flow-card strong {
          color: #fff;
          font-size: 18px;
        }

        .orkio-flow-card p {
          margin: 8px 0 0;
          color: rgba(255,255,255,0.56);
          font-size: 12px;
          line-height: 1.55;
        }

        .orkio-assistant-section {
          display: grid;
          grid-template-columns: minmax(0, 0.98fr) minmax(0, 1.02fr);
          gap: 18px;
          margin-top: 24px;
          align-items: stretch;
        }

        .orkio-assistant-card {
          position: relative;
          overflow: hidden;
          min-height: 360px;
          border-color: rgba(245,185,56,0.18);
          background:
            radial-gradient(circle at 85% 15%, rgba(245,185,56,0.13), transparent 42%),
            rgba(255,255,255,0.035);
        }

        .orkio-assistant-card__grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
          gap: 20px;
          align-items: center;
        }

        .orkio-assistant-card__visual {
          display: grid;
          place-items: center;
          min-height: 260px;
        }

        .orkio-assistant-card__content {
          min-width: 0;
        }

        .orkio-assistant-card h2 {
          margin: 0;
          color: #fff;
          font-size: clamp(32px, 3vw, 46px);
          letter-spacing: -0.05em;
        }

        .orkio-assistant-card h2 span {
          color: #54d568;
        }

        .orkio-assistant-card p {
          max-width: 560px;
          margin: 18px 0 0;
          color: rgba(255,255,255,0.65);
          font-size: 16px;
          line-height: 1.72;
        }

        .orkio-assistant-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .orkio-status-row {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 30px;
        }

        .orkio-status-row span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 8px 11px;
          color: rgba(255,255,255,0.62);
          background: rgba(0,0,0,0.22);
          font-size: 12px;
        }

        .orkio-footer {
          margin-top: 70px;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.18);
        }

        .orkio-footer__inner {
          min-height: 92px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
        }

        @keyframes orkio-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1280px) {
          .orkio-hero {
            grid-template-columns: 1fr;
          }

          .orkio-orb {
            order: -1;
            min-height: 360px;
          }

          .orkio-dashboard {
            max-width: 760px;
          }

          .orkio-capabilities {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 920px) {
          .orkio-nav {
            display: none;
          }

          .orkio-actions {
            display: none;
          }

          .orkio-logo strong {
            font-size: 24px;
          }

          .orkio-logo span {
            max-width: 220px;
            font-size: 10px;
          }

          .orkio-capabilities,
          .orkio-flow,
          .orkio-assistant-section,
          .orkio-assistant-card__grid {
            grid-template-columns: 1fr;
          }

          .orkio-assistant-card__visual {
            min-height: 220px;
            order: -1;
          }

          .orkio-dashboard__split {
            grid-template-columns: 1fr;
          }

          .orkio-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .orkio-orb {
            display: none;
          }

          .orkio-footer__inner {
            align-items: flex-start;
            flex-direction: column;
            padding: 24px 0;
          }
        }

        @media (max-width: 560px) {
          .orkio-shell {
            width: min(100% - 24px, 1480px);
          }

          .orkio-header__inner {
            min-height: 82px;
          }

          .orkio-logo img {
            width: 60px;
            height: 60px;
          }

          .orkio-logo span {
            display: none;
          }

          .orkio-actions {
            width: 100%;
          }

          .orkio-actions .orkio-button {
            flex: 1;
          }

          .orkio-hero h1 {
            font-size: 42px;
          }

          .orkio-button {
            width: 100%;
          }

          .orkio-dashboard,
          .orkio-assistant-card {
            border-radius: 28px;
            padding: 18px;
          }

          .orkio-metrics,
          .orkio-flowline {
            grid-template-columns: 1fr;
          }

          .orkio-flowline div:not(:last-child)::after {
            display: none;
          }
        }
      `}</style>

      <header className="orkio-header">
        <div className="orkio-shell orkio-header__inner">
          <Link to={ROUTES.orkioOS} aria-label={copy.headerAria}>
            <ProductLogo tagline={copy.logoTagline} />
          </Link>

          <nav className="orkio-nav" aria-label={copy.navAria}>
            <a href="#recursos">{copy.nav.resources}</a>
            <a href="#como-funciona">{copy.nav.how}</a>
            <a href="#integracoes">{copy.nav.integrations}</a>
            <a href="#assistente">{copy.nav.assistant}</a>
          </nav>

          <div className="orkio-actions">
<Link to={ROUTES.patroai}>{copy.nav.patroai}</Link>
          </div>
        </div>
      </header>

      <main className="orkio-shell">
        <section className="orkio-hero">
          <div>
            <div className="orkio-kicker">{copy.hero.kicker}</div>

            <h1>
              {copy.hero.titleBefore} <span className="orkio-gradient-text">{copy.hero.titleHighlight}</span>
            </h1>

            <p>{heroSubtitle}</p>

            <div className="orkio-hero__cta">
              <button type="button" className="orkio-button" onClick={() => goToAuth({ entry: "diagnosis", mode: "register", lang: locale })}>
                {copy.hero.primary}
              </button>
              <button type="button" className="orkio-button orkio-button--ghost" onClick={() => document.getElementById("assistente")?.scrollIntoView({ behavior: "smooth" })}>
                {copy.hero.secondary}
              </button>
            </div>
          </div>

          <InteractiveOrkioPillars locale={locale} />

          <LiveDashboard copy={copy.dashboard} />
        </section>

        <section id="recursos" className="orkio-capabilities" aria-label={copy.capabilitiesAria}>
          {copy.capabilities.map((capability) => (
            <article key={capability.title} className="orkio-capability">
              <b>{capability.icon}</b>
              <small>{capability.number}</small>
              <h3>{capability.title}</h3>
              <p>{capability.text}</p>
            </article>
          ))}
        </section>

        <section id="como-funciona" className="orkio-flow" aria-label={copy.howAria}>
          {copy.flow.map(([title, text]) => (
            <article key={title} className="orkio-flow-card">
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section id="assistente" className="orkio-assistant-section">
          <div className="orkio-assistant-card">
            <div className="orkio-assistant-card__grid">
              <div className="orkio-assistant-card__content">
                <h2>
                  {copy.assistant.titleBefore} <span>{copy.assistant.titleHighlight}</span>
                </h2>

                <p>{copy.assistant.text}</p>

                <div className="orkio-assistant-actions">
                  <button type="button" className="orkio-button orkio-button--gold" onClick={() => goToAuth({ entry: "voice", mode: "register", lang: locale })}>
                    {copy.assistant.voice}
                  </button>
                  <button type="button" className="orkio-button orkio-button--ghost" onClick={() => goToAuth({ entry: "text", mode: "register", lang: locale })}>
                    {copy.assistant.textButton}
                  </button>
                  <button type="button" className="orkio-button" onClick={() => goToAuth({ entry: "diagnosis", mode: "register", lang: locale })}>
                    {copy.assistant.diagnosis}
                  </button>
                </div>

                <div className="orkio-status-row">
                  {copy.assistant.statuses.map((status) => (
                    <span key={status}>{status}</span>
                  ))}
                </div>
              </div>

              <div className="orkio-assistant-card__visual" aria-hidden="true">
                <OrkioMysticAvatar size="min(260px, 72vw)" variant="portrait" />
              </div>
            </div>
          </div>

          <OrkioVoiceHero
            tenant="public"
            defaultLocale={ttsLocale}
            kicker={copy.voiceHero.kicker}
            title={copy.voiceHero.title}
            subtitle={copy.voiceHero.subtitle}
            speech={copy.voiceHero.speech}
            primaryLabel={copy.voiceHero.primaryLabel}
            secondaryLabel={copy.voiceHero.secondaryLabel}
            tertiaryLabel={copy.voiceHero.tertiaryLabel}
            quickTitle={copy.voiceHero.quickTitle}
            quickPrompts={copy.voiceHero.quickPrompts}
            onPrimaryAction={() => goToAuth({ entry: "voice_hero", mode: "register", lang: locale })}
            onSecondaryAction={() => nav(`${ROUTES.patroai}?lang=${locale}`)}
            onTertiaryAction={() => nav(ROUTES.contact)}
          />
        </section>

        <section id="integracoes" className="orkio-flow" aria-label={copy.integrationsAria}>
          {copy.integrations.map(([title, text]) => (
            <article key={title} className="orkio-flow-card">
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </section>
      </main>

      <LegalFooter locale={locale} />

      <footer className="orkio-footer">
        <div className="orkio-shell orkio-footer__inner">
          <ProductLogo tagline={copy.logoTagline} />
          <span>{copy.footer.platform}</span>
          <span>{copy.footer.rights}</span>
        </div>
      </footer>
    </div>
  );
}
