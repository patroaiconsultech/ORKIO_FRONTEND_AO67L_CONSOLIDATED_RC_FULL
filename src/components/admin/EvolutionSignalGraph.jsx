import React from "react";
import {
  radarPoints,
  scoreLabel,
  signalStatusLabel,
} from "../../lib/evolutionSignals.mjs";

function SignalPill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function reliabilityTone(status) {
  if (status === "live_signals_estimated") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
  }
  if (status === "insufficient_evidence") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-100";
  }
  return "border-amber-400/25 bg-amber-400/10 text-amber-100";
}

function scoreWidth(score) {
  if (score === null || score === undefined || score === "") return "0%";
  return Number.isFinite(Number(score))
    ? `${Math.max(0, Math.min(100, Number(score)))}%`
    : "0%";
}

export default function EvolutionSignalGraph({ signal }) {
  if (!signal) return null;
  const points = radarPoints(signal.fronts);

  return (
    <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/5 p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/60">
            {signal.version}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100/70">
            snapshot atual estimado • não representa tendência histórica
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">Mapa vivo da evolução</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/62">
            Este mapa é somente leitura e não libera execuções. As ações administrativas
            abaixo podem alterar o estado das propostas.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-4xl font-black text-cyan-100">
              {scoreLabel(signal.overall)}
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
              overall medido
            </div>
          </div>
          <svg viewBox="0 0 100 100" className="h-24 w-24" role="img" aria-label="Radar dos sinais atuais">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.10)" />
            <circle cx="50" cy="50" r="29" fill="none" stroke="rgba(255,255,255,0.08)" />
            <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.06)" />
            {points ? (
              <polygon
                points={points}
                fill="rgba(103,232,249,0.18)"
                stroke="rgba(103,232,249,0.85)"
                strokeWidth="2"
              />
            ) : null}
            <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.75)" />
          </svg>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {(signal.fronts || []).map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-white/10 bg-black/15 p-3"
            title={`status=${item.signal_status}; fonte=${item.source}; janela=${item.time_window}; confiança=${Math.round((item.confidence || 0) * 100)}%; amostra=${item.sample_count}; fórmula=${item.formula_version}; faltando=${item.missing_sources?.join(", ") || "nenhuma"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white/88">{item.label}</div>
                <div className="mt-1 text-[11px] text-white/42">{item.evidence}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                  {signalStatusLabel(item.signal_status)} • confiança{" "}
                  {Math.round((item.confidence || 0) * 100)}% • amostra {item.sample_count}
                </div>
              </div>
              <div className="font-mono text-sm font-black text-cyan-100">
                {scoreLabel(item.score)}
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: scoreWidth(item.score) }}
              />
            </div>
          </div>
        ))}
      </div>

      {signal.agentSignals?.length ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Conhecimento por agente
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {signal.agentSignals.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-white/70">{agent.label}</span>
                {agent.sample_count > 0 ? (
                  <span className="font-mono text-violet-100">{scoreLabel(agent.score)}</span>
                ) : (
                  <span
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/45"
                    title={`baseline de configuração=${agent.configuration_baseline}; não exibido como conhecimento medido`}
                  >
                    configuração detectada
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <SignalPill className={reliabilityTone(signal.reliability)}>
          {signalStatusLabel(signal.reliability)}
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          confiança={Math.round((signal.confidence || 0) * 100)}%
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          atualizado={signal.updatedAt}
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          faltando={signal.missingSources?.length ? signal.missingSources.join(",") : "nenhum"}
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          proposals={signal.counts.proposals}
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          executions={signal.counts.executions}
        </SignalPill>
      </div>
    </section>
  );
}
