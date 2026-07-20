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

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function MetricInfoPopover({ metric }) {
  const unavailable = metric.missing_sources?.length
    ? metric.missing_sources.join(", ")
    : "nenhuma";
  const available = metric.available_sources?.length
    ? metric.available_sources.join(", ")
    : "nenhuma";

  return (
    <details className="relative shrink-0">
      <summary
        className="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-bold text-white/55 transition hover:border-cyan-300/30 hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 [&::-webkit-details-marker]:hidden"
        aria-label={`Detalhes técnicos de ${metric.label}`}
      >
        i
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-72 max-w-[80vw] rounded-2xl border border-cyan-300/20 bg-[#0b111d] p-3 text-left shadow-2xl shadow-black/60">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px] leading-relaxed">
          <dt className="text-white/40">Status</dt>
          <dd className="text-white/75">{signalStatusLabel(metric.signal_status)}</dd>
          <dt className="text-white/40">Fonte</dt>
          <dd className="break-words text-white/75">{metric.source}</dd>
          <dt className="text-white/40">Fontes OK</dt>
          <dd className="break-words text-white/75">{available}</dd>
          <dt className="text-white/40">Cobertura</dt>
          <dd className="text-white/75">{percent(metric.source_coverage)}</dd>
          <dt className="text-white/40">Janela</dt>
          <dd className="break-words text-white/75">{metric.time_window}</dd>
          <dt className="text-white/40">Confiança</dt>
          <dd className="text-white/75">{percent(metric.confidence)}</dd>
          <dt className="text-white/40">Amostra</dt>
          <dd className="text-white/75">{metric.sample_count}</dd>
          <dt className="text-white/40">Score bruto</dt>
          <dd className="text-white/75">{scoreLabel(metric.raw_score)}</dd>
          <dt className="text-white/40">Score confiavel</dt>
          <dd className="text-white/75">{scoreLabel(metric.trusted_score)}</dd>
          <dt className="text-white/40">Fórmula</dt>
          <dd className="break-all font-mono text-[10px] text-white/65">{metric.formula_version}</dd>
          <dt className="text-white/40">Fontes indisponíveis</dt>
          <dd className="break-words text-white/75">{unavailable}</dd>
        </dl>
      </div>
    </details>
  );
}

export default function EvolutionSignalGraph({ signal }) {
  if (!signal) return null;

  const points = radarPoints(signal.fronts);
  const coverage = signal.coverage || { measured: 0, total: 0, ratio: 0 };
  const unavailableCount = signal.missingSources?.length || 0;
  const unsampledCount = signal.unsampledFronts?.length || 0;

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
              {scoreLabel(signal.trusted_overall ?? signal.overall)}
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
              indice confiavel
            </div>
            <div className="mt-1 text-[10px] text-white/45">
              {coverage.measured}/{coverage.total} frentes • cobertura {percent(coverage.ratio)}
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
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white/88">{item.label}</div>
                <div className="mt-1 text-[11px] text-white/42">{item.evidence}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
                  {signalStatusLabel(item.signal_status)} • confiança{" "}
                  {percent(item.confidence)} • amostra {item.sample_count}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-mono text-sm font-black text-cyan-100">
                    {scoreLabel(item.trusted_score ?? item.score)}
                  </div>
                  <div className="font-mono text-[10px] text-white/35">
                    bruto {scoreLabel(item.raw_score ?? item.score)}
                  </div>
                </div>
                <MetricInfoPopover metric={item} />
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: scoreWidth(item.trusted_score ?? item.score) }}
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
                    aria-label={`Configuração detectada; baseline ${agent.configuration_baseline}; conhecimento ainda não medido`}
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
          confiança={percent(signal.confidence)}
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          cobertura={coverage.measured}/{coverage.total}
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          atualizado={signal.updatedAt}
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          fontes indisponíveis={unavailableCount}
        </SignalPill>
        <SignalPill className="border-white/10 bg-white/5 text-white/60">
          frentes sem amostra={unsampledCount}
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
