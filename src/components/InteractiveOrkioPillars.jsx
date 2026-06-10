import React, { useMemo, useState } from "react";
import OrkioMysticAvatar from "./OrkioMysticAvatar.jsx";

const PILLARS_COPY = {
  pt: [
    {
      key: "estrategia",
      title: "Estratégia",
      example: "Transforma uma ideia solta em tese, prioridades e plano de ação.",
      metric: "clareza",
    },
    {
      key: "processos",
      title: "Processos",
      example: "Mapeia etapas, gargalos e responsáveis para reduzir retrabalho.",
      metric: "fluxo",
    },
    {
      key: "dados",
      title: "Dados",
      example: "Organiza sinais da operação para apoiar decisões e acompanhamento.",
      metric: "leitura",
    },
    {
      key: "automacao",
      title: "Automação",
      example: "Sugere agentes, rotinas e automações para acelerar a execução.",
      metric: "velocidade",
    },
    {
      key: "integracoes",
      title: "Integrações",
      example: "Conecta sistemas, equipes e informações sem perder governança.",
      metric: "conexão",
    },
  ],
  en: [
    {
      key: "estrategia",
      title: "Strategy",
      example: "Turns an early idea into a thesis, priorities and an action plan.",
      metric: "clarity",
    },
    {
      key: "processos",
      title: "Processes",
      example: "Maps steps, bottlenecks and owners to reduce operational rework.",
      metric: "flow",
    },
    {
      key: "dados",
      title: "Data",
      example: "Organizes operational signals to support decisions and follow-up.",
      metric: "reading",
    },
    {
      key: "automacao",
      title: "Automation",
      example: "Suggests agents, routines and automations to accelerate execution.",
      metric: "speed",
    },
    {
      key: "integracoes",
      title: "Integrations",
      example: "Connects systems, teams and information without losing governance.",
      metric: "connection",
    },
  ],
};

export default function InteractiveOrkioPillars({ locale = "pt" }) {
  const [activeKey, setActiveKey] = useState("estrategia");
  const pillars = PILLARS_COPY[locale === "en" ? "en" : "pt"];
  const clickHint = locale === "en" ? "Click to see an example." : "Clique para ver um exemplo.";

  const active = useMemo(() => {
    return pillars.find((item) => item.key === activeKey) || pillars[0];
  }, [activeKey, pillars]);

  return (
    <section className="orkio-pillars" aria-label={locale === "en" ? "Orkio interactive pillars" : "Pilares interativos dOrkio"}>
      <style>{`
        .orkio-pillars {
          position: relative;
          min-height: 520px;
          display: grid;
          grid-template-rows: minmax(210px, auto) auto auto;
          gap: 14px;
          padding: 18px;
          border-radius: 34px;
          border: 1px solid rgba(245,185,56,0.16);
          background:
            radial-gradient(circle at center, rgba(84,213,104,0.12), rgba(67,213,255,0.045) 34%, transparent 64%),
            linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
          box-shadow: 0 28px 90px rgba(0,0,0,0.22);
          overflow: hidden;
          isolation: isolate;
        }

        .orkio-pillars::before {
          content: "";
          position: absolute;
          inset: 10%;
          border-radius: 999px;
          border: 1px solid rgba(245,185,56,0.16);
          animation: orkioPillarsSpin 58s linear infinite;
          pointer-events: none;
          z-index: 0;
        }

        .orkio-pillars::after {
          content: "";
          position: absolute;
          left: -22%;
          right: -22%;
          top: 39%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245,185,56,0.20), transparent);
          transform: rotate(-7deg);
          opacity: 0.65;
          pointer-events: none;
          z-index: 0;
        }

        .orkio-pillars__center {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          min-height: 230px;
        }

        .orkio-pillars__core {
          position: relative;
          width: min(260px, 68vw);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(136,243,160,0.22);
          background:
            radial-gradient(circle at 38% 26%, rgba(136,243,160,0.14), transparent 38%),
            radial-gradient(circle at 68% 70%, rgba(67,213,255,0.12), transparent 42%),
            rgba(4,8,14,0.64);
          box-shadow:
            inset 0 0 80px rgba(84,213,104,0.08),
            0 0 90px rgba(67,213,255,0.09),
            0 0 80px rgba(245,185,56,0.10);
        }

        .orkio-pillars__core::before,
        .orkio-pillars__core::after {
          content: "";
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
        }

        .orkio-pillars__core::before {
          inset: -18%;
          border: 1px solid rgba(245,185,56,0.12);
        }

        .orkio-pillars__core::after {
          inset: 14%;
          border: 1px solid rgba(67,213,255,0.10);
        }

        .orkio-pillars__buttons {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .orkio-pillars__button {
          text-align: left;
          display: grid;
          gap: 4px;
          min-height: 86px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 18px;
          padding: 13px 14px;
          background: rgba(0,0,0,0.30);
          color: rgba(255,255,255,0.84);
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }

        .orkio-pillars__button:hover {
          transform: translateY(-1px);
          border-color: rgba(136,243,160,0.26);
        }

        .orkio-pillars__button.is-active {
          border-color: rgba(245,185,56,0.42);
          background: rgba(245,185,56,0.11);
          box-shadow: 0 0 28px rgba(245,185,56,0.10);
        }

        .orkio-pillars__button.is-integration {
          border-color: rgba(84,213,104,0.22);
        }

        .orkio-pillars__button strong {
          color: #fff;
          font-size: 14px;
        }

        .orkio-pillars__button small {
          color: rgba(255,255,255,0.58);
          line-height: 1.35;
        }

        .orkio-pillars__detail {
          position: relative;
          z-index: 3;
          border: 1px solid rgba(245,185,56,0.18);
          border-radius: 22px;
          padding: 16px;
          background: rgba(0,0,0,0.42);
          backdrop-filter: blur(14px);
        }

        .orkio-pillars__detail span {
          display: inline-flex;
          margin-bottom: 8px;
          color: #9cffae;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .orkio-pillars__detail strong {
          display: block;
          color: #f8dfa3;
          font-size: 20px;
          margin-bottom: 6px;
        }

        .orkio-pillars__detail p {
          margin: 0;
          color: rgba(255,255,255,0.72);
          font-size: 14px;
          line-height: 1.58;
        }

        @keyframes orkioPillarsSpin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1280px) {
          .orkio-pillars {
            max-width: 760px;
            width: 100%;
          }
        }

        @media (min-width: 560px) {
          .orkio-pillars__button:last-child:nth-child(odd) {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 560px) {
          .orkio-pillars {
            min-height: auto;
            border-radius: 28px;
            padding: 14px;
            grid-template-rows: auto auto auto;
          }

          .orkio-pillars__buttons {
            grid-template-columns: 1fr;
          }

          .orkio-pillars__center {
            min-height: 220px;
          }

          .orkio-pillars__core {
            width: min(230px, 76vw);
          }
        }
      `}</style>

      <div className="orkio-pillars__center" aria-hidden="true">
        <div className="orkio-pillars__core">
          <OrkioMysticAvatar size="min(220px, 58vw)" speaking={activeKey === "integracoes"} />
        </div>
      </div>

      <div className="orkio-pillars__buttons">
        {pillars.map((pillar) => (
          <button
            key={pillar.key}
            type="button"
            className={`orkio-pillars__button ${activeKey === pillar.key ? "is-active" : ""} ${pillar.key === "integracoes" ? "is-integration" : ""}`}
            onClick={() => setActiveKey(pillar.key)}
          >
            <strong>{pillar.title}</strong>
            <small>{clickHint}</small>
          </button>
        ))}
      </div>

      <div className="orkio-pillars__detail" aria-live="polite">
        <span>{active.metric}</span>
        <strong>{active.title}</strong>
        <p>{active.example}</p>
      </div>
    </section>
  );
}

