import React, { useMemo, useState } from "react";

const COLORS = {
  surface: "linear-gradient(180deg, rgba(12, 19, 34, 0.98) 0%, rgba(7, 11, 21, 1) 100%)",
  border: "rgba(148, 163, 184, 0.16)",
  text: "#f8fafc",
  muted: "#94a3b8",
  subtle: "#64748b",
  accent: "#7c3aed",
  accent2: "#2563eb",
  success: "#22c55e",
  warning: "#f59e0b",
};

const AGENTS = [
  {
    id: "orkio",
    name: "Orkio",
    title: "Copiloto central",
    description: "Organiza a conversa, preserva contexto e transforma intenção em plano, análise ou roteiro.",
    prompt: "Orkio, me ajuda a transformar meu contexto em um plano prático para hoje.",
  },
  {
    id: "chris",
    name: "Chris",
    title: "Estratégia e negócios",
    description: "Ajuda com produto, narrativa, posicionamento, clareza comercial e decisões executivas.",
    prompt: "Chris, analisa minha proposta e sugere o posicionamento mais claro para o beta.",
  },
  {
    id: "orion",
    name: "Orion",
    title: "Engenharia e auditoria técnica",
    description: "Cuida de arquitetura, frontend, backend, runtime, governança, patches e deploy.",
    prompt: "Orion, revisa a plataforma e monta um checklist técnico de validação.",
  },
  {
    id: "team",
    name: "Team",
    title: "Visão integrada",
    description: "Coordena múltiplos agentes quando a tarefa pede leitura técnica, produto e operação.",
    prompt: "Team, me entreguem um plano integrado com prioridade, risco e próximo passo.",
  },
];

const SUGGESTIONS = [
  "Orkio, me ajuda a montar um plano de testes para liberar a plataforma para 5 usuários beta?",
  "Chris, como explico a proposta dOrkio em 30 segundos?",
  "Orion, quais riscos técnicos eu devo validar antes de ampliar o beta?",
];

const FEEDBACK_OPTIONS = [
  { id: "worked", label: "Funcionou bem", prompt: "Feedback beta: funcionou bem. O que funcionou foi: " },
  { id: "weak", label: "Resposta fraca", prompt: "Feedback beta: resposta fraca. O que faltou foi: " },
  { id: "visual", label: "Erro visual", prompt: "Feedback beta: erro visual. Onde aconteceu: " },
  { id: "stuck", label: "Travou", prompt: "Feedback beta: travou. O fluxo, tela ou mensagem foi: " },
  { id: "idea", label: "Sugestão", prompt: "Feedback beta: sugestão. Minha ideia é: " },
];

const USER_TYPE_LABELS = {
  founder: "Fundador(a)",
  investor: "Investidor(a)",
  operator: "Operador(a)",
  partner: "Parceiro(a)",
  other: "Outro",
};

const INTENT_LABELS = {
  explore: "Explorar a plataforma",
  meeting: "Agendar conversa",
  pilot: "Avaliar piloto",
  funding: "Discutir investimento",
  enterprise: "Enterprise / integrações",
  other: "Outro",
};

function callMaybe(fn, ...args) {
  if (typeof fn === "function") fn(...args);
}

function clean(value) {
  return String(value || "").trim();
}

function truncate(value, max = 120) {
  const raw = clean(value);
  if (!raw) return "";
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

function resolveContextRows(user) {
  const rows = [
    ["Nome", clean(user?.name || user?.full_name || user?.email)],
    ["Empresa/projeto", clean(user?.company || user?.organization || user?.company_name)],
    ["Papel", clean(user?.role || user?.profile_role || user?.title)],
    ["Perfil", USER_TYPE_LABELS[clean(user?.user_type)] || clean(user?.user_type)],
    ["Objetivo", INTENT_LABELS[clean(user?.intent)] || clean(user?.intent)],
    ["País/idioma", [clean(user?.country), clean(user?.language)].filter(Boolean).join(" · ")],
    ["Notas", truncate(user?.notes || user?.onboarding_notes || user?.context_notes, 160)],
  ].filter(([, value]) => clean(value));

  return rows.length
    ? rows
    : [["Contexto", "Recebi seu acesso. Complete o onboarding para personalizar ainda mais a conversa."]];
}

export default function EmptyStatePremium({
  user,
  onStart,
  onPrimaryAction,
  onSecondaryAction,
  onTertiaryAction,
  onFillPrompt,
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const contextRows = useMemo(() => resolveContextRows(user), [user]);
  const firstName = clean(user?.name || user?.full_name || user?.email || "Founder")
    .split("@")[0]
    .split(" ")[0]
    .trim();

  const handleAction = (id) => {
    if (id === "primary") {
      if (typeof onPrimaryAction === "function") return onPrimaryAction();
      return callMaybe(onStart);
    }
    if (id === "secondary") return callMaybe(onSecondaryAction);
    if (id === "tertiary") return callMaybe(onTertiaryAction);
  };

  const fillPrompt = (value) => {
    if (typeof onFillPrompt === "function") onFillPrompt(value);
  };

  return (
    <div
      style={{
        width: "100%",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 34,
        padding: 30,
        boxShadow: "0 34px 90px rgba(2, 6, 23, 0.42)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top left, rgba(124, 58, 237, 0.26), transparent 34%), radial-gradient(circle at top right, rgba(37, 99, 235, 0.18), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0))",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 999,
              padding: "10px 14px",
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.22)",
              color: "#bbf7d0",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: COLORS.success,
                boxShadow: "0 0 0 6px rgba(34, 197, 94, 0.16)",
              }}
            />
            Beta controlado · contexto recebido
          </div>

          <button
            type="button"
            onClick={() => setFeedbackOpen((value) => !value)}
            style={{
              border: `1px solid ${COLORS.border}`,
              background: "rgba(255,255,255,0.06)",
              color: COLORS.text,
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Reportar feedback beta
          </button>
        </div>

        {feedbackOpen ? (
          <div
            style={{
              marginBottom: 20,
              borderRadius: 22,
              border: "1px solid rgba(245, 158, 11, 0.22)",
              background: "rgba(245, 158, 11, 0.08)",
              padding: 14,
            }}
          >
            <div style={{ color: "#fde68a", fontWeight: 950, marginBottom: 10 }}>
              O que você quer reportar?
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FEEDBACK_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => fillPrompt(item.prompt)}
                  style={{
                    border: "1px solid rgba(253, 230, 138, 0.20)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fffbeb",
                    borderRadius: 999,
                    padding: "9px 11px",
                    fontSize: 12,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div style={{ color: "#fef3c7", opacity: 0.78, marginTop: 10, fontSize: 12, lineHeight: 1.45 }}>
              A opção escolhida preenche o campo de mensagem. Revise, complete e envie.
            </div>
          </div>
        ) : null}

        <div style={{ maxWidth: 920 }}>
          <h1
            style={{
              margin: 0,
              color: COLORS.text,
              fontSize: "clamp(34px, 5vw, 52px)",
              lineHeight: 1.02,
              letterSpacing: "-0.045em",
            }}
          >
            {firstName ? `${firstName}, seu Orkio está pronto.` : "Seu Orkio está pronto."}
          </h1>

          <p
            style={{
              marginTop: 16,
              marginBottom: 0,
              color: COLORS.muted,
              fontSize: 18,
              lineHeight: 1.72,
              maxWidth: 860,
            }}
          >
            Você chegou, seu contexto foi recebido e a equipe de agentes está organizada para
            transformar a primeira conversa em plano, análise ou roteiro de teste.
          </p>
        </div>

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              border: `1px solid ${COLORS.border}`,
              background: "rgba(15, 23, 42, 0.56)",
              padding: 16,
            }}
          >
            <div style={{ color: "#bfdbfe", fontSize: 12, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Contexto recebido
            </div>
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              {contextRows.map(([label, value]) => (
                <div key={`${label}-${value}`} style={{ display: "grid", gap: 2 }}>
                  <div style={{ color: COLORS.subtle, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {label}
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.45, fontWeight: 760 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => fillPrompt(agent.prompt)}
              style={{
                textAlign: "left",
                borderRadius: 24,
                border: `1px solid ${COLORS.border}`,
                background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
                padding: 16,
                color: COLORS.text,
                cursor: "pointer",
                boxShadow: "0 18px 44px rgba(2,6,23,0.18)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950 }}>{agent.name}</div>
              <div style={{ color: "#bfdbfe", marginTop: 4, fontSize: 13, fontWeight: 900 }}>{agent.title}</div>
              <div style={{ color: COLORS.muted, marginTop: 9, fontSize: 13, lineHeight: 1.5 }}>
                {agent.description}
              </div>
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => fillPrompt(suggestion)}
              style={{
                textAlign: "left",
                borderRadius: 20,
                border: "1px solid rgba(37, 99, 235, 0.22)",
                background: "rgba(37, 99, 235, 0.10)",
                color: "#dbeafe",
                padding: "13px 14px",
                fontWeight: 850,
                cursor: "pointer",
                lineHeight: 1.42,
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={() => handleAction("primary")}
            style={{
              border: 0,
              borderRadius: 18,
              padding: "14px 18px",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "#ffffff",
              fontWeight: 950,
              cursor: "pointer",
              boxShadow: "0 18px 42px rgba(37, 99, 235, 0.22)",
            }}
          >
            Começar com uma leitura executiva
          </button>

          <button
            type="button"
            onClick={() => handleAction("secondary")}
            style={{
              border: `1px solid ${COLORS.border}`,
              borderRadius: 18,
              padding: "14px 18px",
              background: "rgba(255,255,255,0.06)",
              color: COLORS.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Acionar Team
          </button>

          <button
            type="button"
            onClick={() => handleAction("tertiary")}
            style={{
              border: `1px solid ${COLORS.border}`,
              borderRadius: 18,
              padding: "14px 18px",
              background: "rgba(255,255,255,0.035)",
              color: COLORS.muted,
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Preencher próximo passo
          </button>
        </div>
      </div>
    </div>
  );
}
