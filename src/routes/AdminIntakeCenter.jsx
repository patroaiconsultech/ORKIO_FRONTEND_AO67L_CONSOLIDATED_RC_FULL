import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listStrategicIntakeSubmissions,
  updateStrategicIntakeSubmission,
} from "../ui/api.js";

const STATUS_OPTIONS = [
  ["", "Todos"],
  ["under_review", "Em análise"],
  ["qualified", "Qualificado"],
  ["meeting_requested", "Reunião solicitada"],
  ["approved_for_private_access", "Aprovado para convite privado"],
  ["rejected", "Rejeitado"],
  ["archived", "Arquivado"],
];

const TYPE_OPTIONS = [
  ["", "Todos os perfis"],
  ["company", "Empresas"],
  ["investor", "Investidores"],
  ["consultant", "Consultores"],
];

const STATUS_LABELS = {
  under_review: "Em análise",
  qualified: "Qualificado",
  meeting_requested: "Reunião solicitada",
  approved_for_private_access: "Aprovado para convite privado",
  rejected: "Rejeitado",
  archived: "Arquivado",
};

function formatDate(ts) {
  if (!ts) return "—";
  try {
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function typeLabel(value) {
  if (value === "company") return "Empresa";
  if (value === "investor") return "Investidor";
  if (value === "consultant") return "Consultor";
  return value || "—";
}

function compact(value) {
  const text = String(value || "").trim();
  return text || "—";
}

function boolLabel(value) {
  return value === true || value === "true" || value === 1 || value === "1" ? "Sim" : "Não";
}

function getSubmitted(item) {
  const submitted = item?.payload?.submitted;
  return submitted && typeof submitted === "object" ? submitted : {};
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold leading-6 text-white/78">{compact(value)}</div>
    </div>
  );
}

function IntakeCard({ item, onUpdate, busy }) {
  const submitted = getSubmitted(item);
  const requestInfo = item?.payload?.request && typeof item.payload.request === "object" ? item.payload.request : {};
  const message =
    submitted.challenge ||
    submitted.message ||
    submitted.ai_experience ||
    submitted.esg_focus ||
    "";
  const flags = Array.isArray(item.flags) ? item.flags : [];

  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100">
              {typeLabel(item.intake_type)}
            </span>
            <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/48">
              {STATUS_LABELS[item.status] || item.status || "—"}
            </span>
            <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
              Score {item.score ?? "—"} / {item.tier || "—"}
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-white">
            {compact(item.full_name)}
          </h2>
          <p className="mt-1 text-sm font-semibold text-white/56">
            {compact(item.role)} {item.company ? `• ${item.company}` : ""}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/34">
            Recebido em {formatDate(item.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["qualified", "meeting_requested", "approved_for_private_access", "rejected", "archived"].map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy}
              onClick={() => onUpdate(item.id, status)}
              className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/62 transition hover:border-emerald-300/35 hover:text-white disabled:cursor-wait disabled:opacity-50"
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <DetailRow label="E-mail" value={item.email} />
        <DetailRow label="WhatsApp" value={item.whatsapp} />
        <DetailRow label="LinkedIn" value={item.linkedin} />
        <DetailRow label="Local" value={[item.city, item.state, item.country].filter(Boolean).join(" / ")} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <DetailRow label="Área / setor" value={submitted.interest_area || submitted.segment || submitted.sectors || submitted.expertise} />
        <DetailRow label="Pessoa / entidade" value={submitted.person_type} />
        <DetailRow label="Modelo de atuação" value={submitted.engagement_model} />
        <DetailRow label="ESG / sustentabilidade" value={submitted.esg_focus} />
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/18 p-4">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">Mensagem / desafio</div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/72">{compact(message)}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/10 p-4">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-50/54">Consentimentos registrados</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <DetailRow label="Termos e privacidade" value={boolLabel(submitted.consent_terms)} />
          <DetailRow label="Análise de dados" value={boolLabel(submitted.consent_data_review)} />
          <DetailRow label="Contato institucional" value={boolLabel(submitted.consent_contact)} />
          <DetailRow label="Marketing / novidades" value={boolLabel(submitted.consent_marketing)} />
          <DetailRow label="Versão dos termos" value={requestInfo.terms_version} />
        </div>
        <p className="mt-3 text-xs font-semibold leading-6 text-emerald-50/60">
          Estes registros indicam os consentimentos declarados no pré-onboarding público. O cadastro permanece em análise manual e não libera acesso automaticamente.
        </p>
      </div>

      {flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {flags.map((flag) => (
            <span key={flag} className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-100">
              {flag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/10 p-4 text-xs font-semibold leading-6 text-emerald-50/72">
        Cadastro não libera plataforma. Para liberar acesso, o fluxo correto continua sendo aprovação manual e emissão separada de código/convite privado.
      </div>
    </article>
  );
}

export default function AdminIntakeCenter() {
  const [status, setStatus] = useState("");
  const [intakeType, setIntakeType] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await listStrategicIntakeSubmissions({
        status,
        intake_type: intakeType,
        limit: 200,
      });
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      setError(err?.message || "Não foi possível carregar os cadastros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, intakeType]);

  async function updateStatus(id, nextStatus) {
    setBusyId(id);
    setError("");
    try {
      await updateStrategicIntakeSubmission(id, {
        status: nextStatus,
        reviewer_action: "status_update",
        internal_notes: "",
      });
      await load();
    } catch (err) {
      setError(err?.message || "Não foi possível atualizar o cadastro.");
    } finally {
      setBusyId("");
    }
  }

  const counters = useMemo(() => {
    const result = { total: items.length, company: 0, investor: 0, consultant: 0 };
    items.forEach((item) => {
      if (result[item.intake_type] !== undefined) result[item.intake_type] += 1;
    });
    return result;
  }, [items]);

  return (
    <main className="min-h-screen bg-[#060813] px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link to="/admin" className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70 hover:text-emerald-100">
              ← Admin
            </Link>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-6xl">
              Cadastros estratégicos
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/58">
              Empresas, investidores e consultores entram aqui como pré-onboarding qualificado. Esta tela não cria usuários, não libera plataforma e não gera convite automaticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-2xl border border-white/12 bg-white/[0.055] px-5 py-3 text-sm font-black text-white/76 transition hover:border-emerald-300/35 hover:text-white"
          >
            Atualizar
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <DetailRow label="Total filtrado" value={counters.total} />
          <DetailRow label="Empresas" value={counters.company} />
          <DetailRow label="Investidores" value={counters.investor} />
          <DetailRow label="Consultores" value={counters.consultant} />
        </div>

        <div className="mt-6 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/42">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/45"
            >
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/42">Perfil</span>
            <select
              value={intakeType}
              onChange={(e) => setIntakeType(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/45"
            >
              {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-bold text-white/55">
            Carregando cadastros...
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-bold text-white/55">
            Nenhum cadastro encontrado para este filtro.
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {items.map((item) => (
              <IntakeCard
                key={item.id}
                item={item}
                onUpdate={updateStatus}
                busy={busyId === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
