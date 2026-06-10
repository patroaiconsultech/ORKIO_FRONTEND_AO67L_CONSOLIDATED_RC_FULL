import React, { useEffect, useMemo, useRef, useState } from "react";
import { getTenant, getToken } from "../lib/auth.js";
import {
  cleanupAudioUrl,
  requestOrkioTtsBlob,
  speakWithOrkioBrowserVoice,
} from "../lib/orkioTts.js";

const USER_TYPES = [
  { value: "founder", label: "Fundador(a)" },
  { value: "investor", label: "Investidor(a)" },
  { value: "operator", label: "Operador(a)" },
  { value: "partner", label: "Parceiro(a)" },
  { value: "other", label: "Outro" },
];

const INTENTS = [
  { value: "explore", label: "Explorar a plataforma" },
  { value: "meeting", label: "Agendar uma conversa" },
  { value: "pilot", label: "Avaliar um piloto" },
  { value: "funding", label: "Discutir investimento" },
  // AO09: o backend atual rejeita intent="enterprise".
  // Mantemos a experiência Enterprise na UI, mas enviamos um intent compatível no POST.
  { value: "enterprise_request", label: "Enterprise / White Label / Integrações" },
  { value: "other", label: "Outro" },
];

const COUNTRIES = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "Estados Unidos" },
  { value: "ES", label: "Espanha" },
  { value: "PT", label: "Portugal" },
  { value: "AR", label: "Argentina" },
  { value: "MX", label: "México" },
  { value: "CO", label: "Colômbia" },
  { value: "CL", label: "Chile" },
  { value: "UY", label: "Uruguai" },
  { value: "OTHER", label: "Outro" },
];

const LANGUAGES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
  { value: "pt-PT", label: "Português (Portugal)" },
];

const DEFAULT_LANGUAGE_BY_COUNTRY = {
  BR: "pt-BR",
  PT: "pt-PT",
  ES: "es-ES",
  AR: "es-ES",
  MX: "es-ES",
  CO: "es-ES",
  CL: "es-ES",
  UY: "es-ES",
  US: "en-US",
  OTHER: "en-US",
};

function readPrechatContext() {
  try {
    const raw =
      localStorage.getItem("orkio_prechat_context") ||
      sessionStorage.getItem("orkio_prechat_context") ||
      "";
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeUserType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const aliases = {
    founder: "founder",
    investor: "investor",
    operator: "operator",
    enterprise: "operator",
    developer: "operator",
    partner: "partner",
    other: "other",
  };
  return aliases[raw] || "";
}

function normalizeIntent(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const aliases = {
    explore: "explore",
    exploring: "explore",
    curious: "explore",
    meeting: "meeting",
    partnership: "meeting",
    pilot: "pilot",
    company_eval: "pilot",
    funding: "funding",
    investment: "funding",
    // AO09: aliases de Enterprise viram sinal de interesse comercial,
    // mas o intent salvo no backend será normalizado para "pilot".
    enterprise: "enterprise_request",
    white_label: "enterprise_request",
    integrations: "enterprise_request",
    integration: "enterprise_request",
    enterprise_request: "enterprise_request",
    other: "other",
  };
  return aliases[raw] || "";
}

function normalizeWhatsapp(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function isEnterpriseIntent(value) {
  return String(value || "").trim().toLowerCase() === "enterprise_request";
}

function toBackendIntent(value) {
  const normalized = normalizeIntent(value);
  // AO09: /api/user/onboarding rejeita intent="enterprise".
  // "pilot" é o valor seguro e compatível para avaliação/implantação enterprise.
  if (isEnterpriseIntent(normalized)) return "pilot";
  return normalized || "explore";
}

function appendEnterpriseContext(notes) {
  const current = String(notes || "").trim();
  const marker = "Interesse Enterprise / White Label / Integrações: sim.";
  if (current.toLowerCase().includes("enterprise / white label")) return current;
  return [current, marker].filter(Boolean).join("\n");
}

function suggestLanguage(country) {
  const code = String(country || "").trim().toUpperCase();
  return DEFAULT_LANGUAGE_BY_COUNTRY[code] || "pt-BR";
}

function sanitizeOnboardingPayload(payload, prechat) {
  const answers = prechat?.answers || {};
  const country = String(payload?.country || "").trim().toUpperCase() || "BR";
  const diagnosis = String(prechat?.diagnosis || "").trim();
  const challenge = String(answers.challenge || "").trim();
  const segment = String(answers.segment || "").trim();
  const systems = String(answers.systems || "").trim();
  const goal = String(answers.goal || "").trim();

  const notesFromPrechat = [
    diagnosis ? `Diagnóstico inicial Orkio: ${diagnosis}` : "",
    challenge ? `Desafio principal: ${challenge}` : "",
    segment ? `Segmento: ${segment}` : "",
    systems ? `Sistemas/automações existentes: ${systems}` : "",
    goal ? `Objetivo 90 dias: ${goal}` : "",
    "Trial sugerido: 7 dias grátis.",
  ].filter(Boolean).join("\n");

  const enterpriseIntent = /erp|crm|integra|integrat|white\s*label|sistema|api|automação|automation/i.test(
    `${challenge} ${systems} ${goal}`
  );

  return {
    company: String(payload?.company || answers.company || "").trim(),
    role: String(payload?.role || payload?.profile_role || "").trim(),
    user_type: normalizeUserType(payload?.user_type) || "operator",
    intent: enterpriseIntent ? "enterprise_request" : (normalizeIntent(payload?.intent) || "explore"),
    country,
    language: String(payload?.language || "").trim() || suggestLanguage(country),
    whatsapp: normalizeWhatsapp(payload?.whatsapp || ""),
    notes: String(payload?.notes || notesFromPrechat || "").trim(),
  };
}

const ORKIO_ENV =
  typeof window !== "undefined" && window.__ORKIO_ENV__ ? window.__ORKIO_ENV__ : {};

function normalizeBase(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function resolveApiBase() {
  const envBase = normalizeBase(
    ORKIO_ENV.VITE_API_BASE_URL ||
    ORKIO_ENV.VITE_API_URL ||
    ORKIO_ENV.API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ""
  );

  if (envBase) return envBase;

  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeBase(window.location.origin);
  }
  return "";
}

function buildUrl(path) {
  const base = resolveApiBase();
  const cleanPath = String(path || "").startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) return `${base}${cleanPath.slice(4)}`;
  return `${base}${cleanPath}`;
}

function buildHeaders(token, org) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (org) headers["X-Org-Slug"] = org;
  return headers;
}

function formatMissingField(field) {
  const map = {
    company: "Empresa/projeto",
    profile_role: "Cargo",
    role: "Cargo",
    user_type: "Perfil",
    intent: "Objetivo principal",
    country: "País",
    language: "Idioma",
    whatsapp: "WhatsApp / telefone",
    whatsapp_number: "WhatsApp / telefone",
  };
  return map[String(field || "").trim()] || String(field || "").trim();
}

function formatErrorMessage(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (/invalid\s+intent/i.test(value)) {
      return "Não consegui salvar este objetivo no formato atual. Ajustei para avaliação enterprise/piloto; tente salvar novamente.";
    }
    return value;
  }
  if (value instanceof Error) return formatErrorMessage(value.message);

  if (Array.isArray(value)) {
    const fields = value
      .map((item) => item?.loc?.slice?.(-1)?.[0] || item?.field || item?.name || "")
      .filter(Boolean)
      .map(formatMissingField);
    if (fields.length) return `Revise os campos: ${Array.from(new Set(fields)).join(", ")}.`;
    return "Revise os campos do onboarding e tente novamente.";
  }

  if (typeof value === "object") {
    const missing = Array.isArray(value.missing_fields) ? value.missing_fields.map(formatMissingField) : [];
    if (missing.length) return `Preencha os campos obrigatórios: ${missing.join(", ")}.`;
    if (value.message) return formatErrorMessage(value.message);
    if (value.detail) return formatErrorMessage(value.detail);
    if (value.error) return formatErrorMessage(value.error);
    return "Não foi possível salvar o onboarding. Revise os campos obrigatórios e tente novamente.";
  }

  return String(value);
}

async function readErrorMessage(res) {
  try {
    const data = await res.json();
    return formatErrorMessage(data?.detail || data?.message || data);
  } catch {
    try {
      return formatErrorMessage(await res.text());
    } catch {
      return `${res.status} ${res.statusText}`;
    }
  }
}

async function saveOnboarding(payload, token, org) {
  const url = buildUrl("/api/user/onboarding");
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(token, org),
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new Error(msg || `Onboarding failed (${res.status})`);
  }

  try {
    return await res.json();
  } catch {
    return { status: "ok" };
  }
}

async function submitEnterpriseLead(payload, org) {
  try {
    const res = await fetch(buildUrl("/api/public/enterprise-lead"), {
      method: "POST",
      headers: buildHeaders(null, org),
      body: JSON.stringify(payload),
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  color: "#0f172a",
  fontWeight: 800,
  fontSize: 14,
};

const fieldStyle = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  padding: "14px 16px",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  WebkitTextFillColor: "#0f172a",
  boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
};

const optionStyle = {
  backgroundColor: "#ffffff",
  color: "#0f172a",
};

export default function OnboardingModal({ user, onComplete, onClose, entrySource = "standard", autoSpeak = false, allowSkip = true }) {
  const prechat = useMemo(() => readPrechatContext(), []);
  const [form, setForm] = useState(() => sanitizeOnboardingPayload(user, prechat));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fullName = useMemo(() => {
    const fromUser = (user?.name || "").trim();
    const fromPrechat = (prechat?.answers?.name || "").trim();
    return fromUser || fromPrechat;
  }, [user, prechat]);


  const hasPrechat = !!(prechat?.answers || prechat?.diagnosis);
  const trialDays = Number(prechat?.trial_days || 7);
  const isAvatarEntry = String(entrySource || "").trim().toLowerCase() === "avatar";
  const autoSpeakDoneRef = useRef(false);
  const onboardingAudioRef = useRef(null);

  useEffect(() => {
    if (!autoSpeak || autoSpeakDoneRef.current) return undefined;
    if (typeof window === "undefined") return undefined;

    let cancelled = false;

    const intro = isAvatarEntry
      ? "Olá. Eu sou Orkio. Vou conduzir seu onboarding inicial com a mesma voz do avatar, clareza e presença."
      : "Olá. Vamos concluir seu onboarding inicial para personalizar sua experiência nOrkio.";

    async function speakIntro() {
      autoSpeakDoneRef.current = true;

      try {
        try {
          onboardingAudioRef.current?.pause?.();
          cleanupAudioUrl(onboardingAudioRef.current);
        } catch {}

        const token = getToken();
        const tenant = getTenant() || "public";
        const blob = await requestOrkioTtsBlob({
          text: intro,
          token,
          tenant,
          locale: "pt-BR",
        });

        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.dataset.blobUrl = url;
        onboardingAudioRef.current = audio;

        audio.onended = () => cleanupAudioUrl(audio);
        audio.onerror = () => cleanupAudioUrl(audio);

        await audio.play();
      } catch (err) {
        console.warn("ORKIO_ONBOARDING_TTS_FAILED", err?.message || err);
        if (cancelled) return;
        speakWithOrkioBrowserVoice(intro, { locale: "pt-BR" });
      }
    }

    speakIntro();

    return () => {
      cancelled = true;
      try {
        onboardingAudioRef.current?.pause?.();
        cleanupAudioUrl(onboardingAudioRef.current);
        onboardingAudioRef.current = null;
      } catch {}
      try { window.speechSynthesis?.cancel?.(); } catch {}
    };
  }, [autoSpeak, isAvatarEntry]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();

    const enterpriseInterest = isEnterpriseIntent(form.intent);
    const backendIntent = toBackendIntent(form.intent);

    const payload = {
      company: String(form.company || "").trim(),
      // Mantemos role e profile_role para compatibilidade entre versões do backend.
      role: String(form.role || "").trim(),
      profile_role: String(form.role || "").trim(),
      user_type: form.user_type || "operator",
      // AO09: nunca enviar "enterprise" para /api/user/onboarding.
      intent: backendIntent,
      country: form.country || "BR",
      language: form.language || suggestLanguage(form.country || "BR"),
      preferred_language: form.language || suggestLanguage(form.country || "BR"),
      whatsapp: normalizeWhatsapp(form.whatsapp || ""),
      whatsapp_number: normalizeWhatsapp(form.whatsapp || ""),
      notes: enterpriseInterest ? appendEnterpriseContext(form.notes) : (form.notes || null),
      onboarding_completed: true,
    };

    setBusy(true);
    setError("");

    try {
      const token = getToken();
      const org = user?.org_slug || getTenant() || "public";

      const result = await saveOnboarding(payload, token, org);

      if (enterpriseInterest) {
        submitEnterpriseLead({
          name: fullName || user?.email || "",
          email: user?.email || "",
          company: payload.company || "",
          interest_type: "enterprise_white_label_integrations",
          message: payload.notes || "Solicitação Enterprise / White Label / Integrações via onboarding.",
          metadata: {
            prechat_context: prechat,
            onboarding: { ...payload, ui_intent: "enterprise_request" },
          },
          source: "onboarding_modal",
        }, org).catch(() => null);
      }

      const nextUser = result?.user
        ? { ...user, ...result.user, onboarding_completed: true }
        : {
            ...user,
            company: payload.company,
            profile_role: payload.role,
            user_type: payload.user_type,
            intent: payload.intent,
            country: payload.country,
            language: payload.language,
            whatsapp: payload.whatsapp,
            notes: payload.notes,
            onboarding_completed: true,
            trial_days: payload.trial_days,
            imported_prechat_context: payload.imported_prechat_context,
          };

      onComplete?.(nextUser);
    } catch (err) {
      setError(formatErrorMessage(err) || "Não foi possível salvar o onboarding.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(5,8,18,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 820,
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: 24,
          border: "1px solid rgba(15,23,42,0.08)",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          color: "#0f172a",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#475569",
              fontWeight: 800,
            }}
          >
            {isAvatarEntry ? "Avatar onboarding · Orkio OS" : "Orkio OS · 7 dias grátis"}
          </div>
          <h2 style={{ margin: "8px 0 6px", fontSize: 30, lineHeight: 1.1 }}>
            {fullName ? `Bem-vindo, ${fullName}` : (isAvatarEntry ? "Seu onboarding com avatar começa aqui" : "Complete seu onboarding")}
          </h2>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.55 }}>
            {hasPrechat
              ? "Importei o contexto da conversa inicial com Orkio. Revise os dados abaixo para continuarmos a experiência dentro da plataforma."
              : (isAvatarEntry ? "Recebi sua entrada pelo avatar de Orkio. Confirme seus dados para iniciarmos uma experiência guiada dentro da plataforma." : "Conte um pouco sobre seu contexto para personalizarmos sua primeira experiência dentro dOrkio OS.")}
          </p>
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: "1px solid #bfdbfe",
              background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.07))",
              color: "#1e3a8a",
              padding: "12px 14px",
              fontSize: 14,
              lineHeight: 1.5,
              fontWeight: 750,
            }}
          >
            Vou usar essas respostas para personalizar sua primeira conversa. Depois de salvar,
            Orkio mostrará o contexto recebido e sugerirá um próximo passo.
          </div>
        </div>

        {hasPrechat && (
          <div
            style={{
              marginBottom: 18,
              borderRadius: 18,
              border: "1px solid #bbf7d0",
              background: "linear-gradient(135deg, rgba(34,197,94,0.10), rgba(59,130,246,0.08))",
              padding: "14px 16px",
              color: "#334155",
              fontSize: 14,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            <strong style={{ display: "block", color: "#14532d", marginBottom: 6 }}>
              Diagnóstico inicial importado da landing
            </strong>
            {prechat?.diagnosis || "Orkio iniciou um primeiro mapa estratégico com base nas suas respostas."}
            <div style={{ marginTop: 10, color: "#166534", fontWeight: 800 }}>
              Trial ativo: {trialDays} dias gratuitos.
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <label>
            <span style={labelStyle}>Empresa</span>
            <input
              style={fieldStyle}
              value={form.company}
              onChange={(e) => setField("company", e.target.value)}
              placeholder="Nome da empresa ou projeto"
            />
          </label>

          <label>
            <span style={labelStyle}>Cargo</span>
            <input
              style={fieldStyle}
              value={form.role}
              onChange={(e) => setField("role", e.target.value)}
              placeholder="Founder, CEO, gestor, líder de produto..."
            />
          </label>

          <label>
            <span style={labelStyle}>Perfil</span>
            <select
              style={fieldStyle}
              value={form.user_type}
              onChange={(e) => setField("user_type", e.target.value)}
            >
              {USER_TYPES.map((item) => (
                <option key={item.value} value={item.value} style={optionStyle}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span style={labelStyle}>Objetivo principal</span>
            <select
              style={fieldStyle}
              value={form.intent}
              onChange={(e) => setField("intent", e.target.value)}
            >
              {INTENTS.map((item) => (
                <option key={item.value} value={item.value} style={optionStyle}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span style={labelStyle}>País</span>
            <select
              style={fieldStyle}
              value={form.country}
              onChange={(e) => {
                const nextCountry = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  country: nextCountry,
                  language: suggestLanguage(nextCountry),
                }));
              }}
            >
              {COUNTRIES.map((item) => (
                <option key={item.value} value={item.value} style={optionStyle}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span style={labelStyle}>Idioma</span>
            <select
              style={fieldStyle}
              value={form.language}
              onChange={(e) => setField("language", e.target.value)}
            >
              {LANGUAGES.map((item) => (
                <option key={item.value} value={item.value} style={optionStyle}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            <span style={labelStyle}>WhatsApp / telefone</span>
            <input
              style={fieldStyle}
              value={form.whatsapp}
              onChange={(e) => setField("whatsapp", e.target.value)}
              placeholder="+55..."
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Observações de contexto</span>
            <textarea
              style={{ ...fieldStyle, minHeight: 138, resize: "vertical", lineHeight: 1.5 }}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Conte o objetivo, desafio principal, prioridade dos próximos dias ou algo que Orkio deve lembrar no primeiro chat..."
            />
          </label>
        </div>

        {isEnterpriseIntent(form.intent) && (
          <div
            style={{
              marginTop: 16,
              borderRadius: 16,
              border: "1px solid #fde68a",
              background: "#fffbeb",
              color: "#92400e",
              padding: "12px 14px",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Solicitações Enterprise, White Label, integrações e personalizações serão registradas
            para a equipe PatroAI avaliar escopo, prioridade e proposta.
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px 14px",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 20,
            flexWrap: "wrap",
          }}
        >
          {allowSkip ? (
            <button
              type="button"
              onClick={() => onClose?.()}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 14,
                background: "#ffffff",
                color: "#0f172a",
                padding: "14px 18px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Fechar por agora
            </button>
          ) : (
            <div style={{ alignSelf: "center", color: "#475569", fontSize: 13, fontWeight: 700, marginRight: "auto" }}>
              Salve o contexto para liberar a primeira conversa.
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            style={{
              border: 0,
              borderRadius: 14,
              background: busy
                ? "#94a3b8"
                : "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)",
              color: "#ffffff",
              padding: "14px 20px",
              fontWeight: 900,
              cursor: busy ? "not-allowed" : "pointer",
              boxShadow: "0 12px 28px rgba(37,99,235,0.22)",
            }}
          >
            {busy ? "Salvando..." : "Salvar contexto e entrar nOrkio"}
          </button>
        </div>
      </form>
    </div>
  );
}
