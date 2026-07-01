import React, { useEffect, useState } from "react";
import { apiFetch } from "../ui/api.js";
import { getTenant, getToken } from "../lib/auth.js";

const CARD = "rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur";

function Bar({ label, value, summary }) {
  const pct = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-white">{label}</span>
        <span className="font-mono text-sm text-white/75">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white/70" style={{ width: `${pct}%` }} />
      </div>
      {summary ? <p className="mt-2 text-xs leading-relaxed text-white/50">{summary}</p> : null}
    </div>
  );
}

export default function EOSHealthPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const payload = await apiFetch("/api/admin/eos/health", {
          token: getToken(),
          org: getTenant() || "public",
        });
        if (alive) setData(payload?.data || payload);
      } catch (err) {
        if (alive) setError(err?.message || "EOS Health indisponível.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const scores = data?.scores || {};
  const summary = data?.summary || {};

  return (
    <section className={CARD}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200/70">ORKIO EOS</p>
          <h2 className="mt-1 text-2xl font-black text-white">Engineering Health</h2>
          <p className="mt-2 text-sm text-white/60">
            Primeiro painel readonly de saúde institucional da plataforma.
          </p>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
          {data?.status || (loading ? "loading" : "unavailable")}
        </div>
      </div>

      {loading ? <p className="text-sm text-white/60">Carregando EOS Health...</p> : null}
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Bar label="Platform" value={scores.platform} summary={summary.platform} />
            <Bar label="Knowledge" value={scores.knowledge} summary={summary.knowledge} />
            <Bar label="Architecture" value={scores.architecture} summary={summary.architecture} />
            <Bar label="Governance" value={scores.governance} summary={summary.governance} />
            <Bar label="Product" value={scores.product} summary={summary.product} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/45">
            <span>version: {data.version || "-"}</span>
            <span>readonly: {String(data.readonly === true)}</span>
            <span>write_executed: {String(data.write_executed === true)}</span>
          </div>
        </>
      ) : null}
    </section>
  );
}
