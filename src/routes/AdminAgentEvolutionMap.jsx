import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../ui/api.js";
import { getTenant, getToken, getUser, hasAdminConsoleAccess, isAdmin, isMasterAdmin } from "../lib/auth.js";
import { AGENT_EVOLUTION_MAP_UI_VERSION, fetchAgentEvolutionMap } from "../evolution/agentMapApi.js";

const CARD = "rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur";

function pct(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

function tone(status) {
  if (status === "green") return "text-emerald-300";
  if (status === "red") return "text-rose-300";
  return "text-amber-200";
}

export default function AdminAgentEvolutionMap() {
  const nav = useNavigate();
  const token = getToken();
  const tenant = getTenant() || "public";
  const user = getUser();
  const allowed = Boolean(token && (isAdmin(user) || isMasterAdmin(user) || hasAdminConsoleAccess(user)));
  const [payload, setPayload] = useState({ items: [], aggregate: {} });
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!allowed) return;
    if (!silent) setLoading(true);
    try {
      const data = await fetchAgentEvolutionMap(apiFetch, { token, org: tenant });
      setPayload(data || { items: [], aggregate: {} });
      setSelectedId((current) => current || data?.items?.[0]?.agent?.agent_id || "");
      setUpdatedAt(new Date().toLocaleString("pt-BR"));
      setError("");
    } catch (err) {
      setError(err?.message || "Falha ao carregar o mapa evolutivo.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [allowed, tenant, token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!allowed) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [allowed, load]);

  const selected = useMemo(
    () => payload.items?.find((item) => item.agent?.agent_id === selectedId) || null,
    [payload.items, selectedId],
  );

  if (!allowed) {
    return <main className="min-h-screen bg-slate-950 p-8 text-white"><div className={CARD}><h1 className="text-2xl font-black">Acesso administrativo necessário</h1><button className="mt-4 rounded-xl bg-violet-500 px-4 py-2" onClick={() => nav("/auth")}>Entrar</button></div></main>;
  }

  const a = payload.aggregate || {};
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300/75">{AGENT_EVOLUTION_MAP_UI_VERSION}</p>
            <h1 className="mt-2 text-3xl font-black">Agent Evolution Map</h1>
            <p className="mt-2 text-white/60">Estado cognitivo auditável, read-only e tenant-aware.</p>
          </div>
          <div className="text-right text-xs text-white/45">Tenant: {tenant}<br/>Atualizado: {updatedAt || "—"}</div>
        </header>

        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">{error}</div> : null}
        {loading ? <div className="text-white/55">Carregando mapa evolutivo…</div> : null}

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Agentes", a.agent_count],
            ["Maturidade média", pct(a.average_maturity_percent)],
            ["Confiança média", pct(a.average_confidence_percent)],
            ["Gaps", a.total_gaps],
          ].map(([label, value]) => <div key={label} className={CARD}><div className="text-xs uppercase tracking-widest text-white/40">{label}</div><div className="mt-2 text-3xl font-black">{value ?? "—"}</div></div>)}
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className={`${CARD} space-y-2`}>
            <h2 className="mb-4 text-lg font-black">Agentes</h2>
            {(payload.items || []).map((item) => (
              <button key={item.agent.agent_id} onClick={() => setSelectedId(item.agent.agent_id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === item.agent.agent_id ? "border-violet-400/50 bg-violet-400/15" : "border-white/10 bg-black/10 hover:bg-white/5"}`}>
                <div className="font-bold">{item.agent.display_name}</div>
                <div className="mt-1 flex justify-between text-xs text-white/50"><span>{item.agent.role}</span><span className={tone(item.health.status)}>{pct(item.health.maturity_percent)}</span></div>
              </button>
            ))}
          </aside>

          <section className={CARD}>
            {!selected ? <div className="text-white/50">Selecione um agente.</div> : <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-2xl font-black">{selected.agent.display_name}</h2><p className="mt-1 text-white/55">{selected.agent.description || selected.agent.role}</p></div>
                <div className={`text-sm font-bold uppercase tracking-widest ${tone(selected.health.status)}`}>{selected.health.status}</div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[["Maturidade", selected.health.maturity_percent],["Confiança", selected.health.confidence_percent],["Cobertura", selected.health.coverage_percent]].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="text-xs uppercase tracking-widest text-white/40">{label}</div><div className="mt-2 text-2xl font-black">{pct(value)}</div></div>
                ))}
              </div>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div><h3 className="font-black">Capabilities ({selected.capabilities.length})</h3><div className="mt-3 space-y-2">{selected.capabilities.slice(0, 12).map((c) => <div key={c.code} className="rounded-xl border border-white/10 p-3"><div className="font-mono text-sm">{c.code}</div><div className="mt-1 text-xs text-white/45">{c.purpose || c.risk_level}</div></div>)}</div></div>
                <div><h3 className="font-black">Gaps ({selected.gaps.length})</h3><div className="mt-3 space-y-2">{selected.gaps.length ? selected.gaps.map((g) => <div key={g.code} className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3"><div className="font-semibold">{g.code}</div><div className="mt-1 text-xs text-white/50">{g.description}</div></div>) : <div className="text-sm text-white/45">Nenhum gap reportado.</div>}</div>
                  <h3 className="mt-6 font-black">Governança</h3><pre className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">{JSON.stringify(selected.governance, null, 2)}</pre>
                  <div className="mt-4 break-all text-[10px] text-white/30">snapshot: {selected.snapshot_fingerprint}</div>
                </div>
              </div>
            </>}
          </section>
        </section>
      </div>
    </main>
  );
}
