import React from "react";
import { Link } from "react-router-dom";
import PwaInstallButton from "../components/PwaInstallButton";
import { getToken } from "../api";
import { beginLogin, isOidcConfigured } from "../auth/oidc";

const CAPABILITIES = [
  {
    title: "Orquestração multiagente",
    text: "Contexto, autoria e governança preservados em cada turno.",
    icon: "◉",
  },
  {
    title: "Operação auditável",
    text: "Evidências, aprovação humana e rollback fazem parte do fluxo.",
    icon: "◇",
  },
  {
    title: "Colaboração segura",
    text: "Threads, participantes e decisões em uma experiência unificada.",
    icon: "✦",
  },
];



function PlatformEntry({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  const authenticated = Boolean(getToken());
  const oidcConfigured = isOidcConfigured();

  if (authenticated || !oidcConfigured) {
    return (
      <Link className={className} to="/app">
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => void beginLogin("/app")}
    >
      {label}
    </button>
  );
}

const TRUST_ITEMS = [
  "Identidade canônica em persistência, streaming e interface",
  "Isolamento de tenant como requisito estrutural",
  "Evolução governada por auditoria e aprovação humana",
  "Experiência instalável para Android, iPhone e iPad",
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <a className="brand-lockup" href="#top" aria-label="ORKIO início">
          <span className="brand-orb" aria-hidden="true" />
          <span>ORKIO™</span>
        </a>
        <nav className="landing-nav" aria-label="Navegação principal">
          <a href="#capacidades">Capacidades</a>
          <a href="#confianca">Confiança</a>
          <a href="#pwa">Aplicativo</a>
        </nav>
        <PlatformEntry className="header-cta" label="Abrir plataforma" />
      </header>

      <main id="main-content">
        <section id="top" className="hero section">
          <div className="hero__content">
            <span className="eyebrow">INTELIGÊNCIA ORQUESTRADA</span>
            <h1>
              Onde a inteligência
              <span> encontra harmonia.</span>
            </h1>
            <p className="hero__lead">
              Uma plataforma premium para reunir agentes, conhecimento,
              colaboração e governança em uma única experiência operacional.
            </p>
            <div className="hero__actions">
              <PlatformEntry
                className="primary-button primary-button--large"
                label="Entrar na ORKIO"
              />
              <PwaInstallButton />
            </div>
            <div className="hero__proof">
              <span>Android</span>
              <span>iPhone e iPad</span>
              <span>Web responsiva</span>
            </div>
          </div>

          <div className="hero-orbit" aria-hidden="true">
            <div className="hero-orbit__halo hero-orbit__halo--one" />
            <div className="hero-orbit__halo hero-orbit__halo--two" />
            <div className="hero-orbit__core" />
            <div className="hero-orbit__node hero-orbit__node--one" />
            <div className="hero-orbit__node hero-orbit__node--two" />
            <div className="hero-orbit__node hero-orbit__node--three" />
          </div>
        </section>

        <section id="capacidades" className="section section--panel">
          <div className="section-heading">
            <span className="eyebrow">CAPACIDADES</span>
            <h2>Uma central de inteligência para operar com clareza.</h2>
          </div>
          <div className="capability-grid">
            {CAPABILITIES.map((capability) => (
              <article className="capability-card" key={capability.title}>
                <span className="capability-card__icon" aria-hidden="true">
                  {capability.icon}
                </span>
                <h3>{capability.title}</h3>
                <p>{capability.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="confianca" className="section trust-section">
          <div className="trust-section__copy">
            <span className="eyebrow">CONFIANÇA POR ARQUITETURA</span>
            <h2>Premium não é aparência. É comportamento comprovável.</h2>
            <p>
              A ORKIO combina uma interface desejável com controles que
              preservam autoria, segurança, rastreabilidade e evolução
              responsável.
            </p>
          </div>
          <ul className="trust-list">
            {TRUST_ITEMS.map((item) => (
              <li key={item}>
                <span aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section id="pwa" className="section pwa-section">
          <div>
            <span className="eyebrow">ORKIO NO SEU DISPOSITIVO</span>
            <h2>Instale como aplicativo, sem perder a segurança da web.</h2>
            <p>
              No Android, use o botão de instalação quando o navegador
              disponibilizar. No iPhone ou iPad, abra o menu Compartilhar e
              escolha “Adicionar à Tela de Início”.
            </p>
          </div>
          <PwaInstallButton featured />
        </section>

        <section className="section final-cta">
          <span className="eyebrow">EFATÀ 777</span>
          <h2>Inteligência viva. Operação governada. Evolução contínua.</h2>
          <PlatformEntry
            className="primary-button primary-button--large"
            label="Conhecer a plataforma"
          />
        </section>
      </main>

      <footer className="landing-footer">
        <span>ORKIO™ · PatroAI Holding</span>
        <span>Orquestração · Transparência · Confiança</span>
      </footer>
    </div>
  );
}
