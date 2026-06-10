import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "orkio_prechat_context";
const TTL_MS = 15 * 60 * 1000;

const PRECHAT_COPY = {
  pt: {
    questions: [
      {
        id: "name",
        label: "Como posso te chamar?",
        placeholder: "Seu nome",
        type: "text",
      },
      {
        id: "challenge",
        label: "Qual é o principal desafio que você quer resolver hoje?",
        placeholder: "Ex.: organizar operação, vender mais, integrar sistemas...",
        type: "textarea",
      },
      {
        id: "goal",
        label: "Se Orkio te ajudasse muito bem, o que mudaria nos próximos 90 dias?",
        placeholder: "Ex.: ganhar velocidade, melhorar gestão, automatizar processos...",
        type: "textarea",
      },
    ],
    introSpeech:
      "Olá. Eu sou Orkio. Antes do seu cadastro, quero entender rapidamente o seu momento para iniciar uma jornada mais inteligente com você.",
    doneSpeech:
      "Perfeito. Já tenho um diagnóstico inicial. Agora vamos continuar sua jornada com o cadastro para que eu personalize a sua experiência.",
    diagnosisFallback: "Há sinal de busca por clareza estratégica, organização e execução assistida.",
    diagnosisIntegration: "Há sinal de necessidade de integração e ganho operacional com ativação guiada.",
    diagnosisSales: "Há sinal de foco em crescimento comercial e aceleração da operação.",
    eyebrow: "Jornada do Avatar",
    title: "Antes do cadastro, deixe Orkio te conhecer.",
    subtitle: "Vou te fazer algumas perguntas rápidas para começar com mais contexto, clareza e presença.",
    question: "Pergunta",
    of: "de",
    diagnosisTitle: "Diagnóstico inicial",
    close: "Fechar por agora",
    back: "Voltar",
    next: "Próxima pergunta",
    continue: "Continuar jornada",
  },
  en: {
    questions: [
      {
        id: "name",
        label: "What should I call you?",
        placeholder: "Your name",
        type: "text",
      },
      {
        id: "challenge",
        label: "What is the main challenge you want to solve today?",
        placeholder: "E.g.: organize operations, sell more, integrate systems...",
        type: "textarea",
      },
      {
        id: "goal",
        label: "If Orkio helped you very well, what would change in the next 90 days?",
        placeholder: "E.g.: gain speed, improve management, automate processes...",
        type: "textarea",
      },
    ],
    introSpeech:
      "Hello. I am Orkio. Before your registration, I want to quickly understand your current moment so we can start a smarter journey together.",
    doneSpeech:
      "Perfect. I already have an initial diagnosis. Now we will continue your journey with registration so I can personalize your experience.",
    diagnosisFallback: "There is a signal of strategic clarity, organization and assisted execution needs.",
    diagnosisIntegration: "There is a signal of integration needs and operational gains through guided activation.",
    diagnosisSales: "There is a signal of commercial growth focus and operational acceleration.",
    eyebrow: "Avatar journey",
    title: "Before signing up, let Orkio get to know you.",
    subtitle: "I will ask a few quick questions so we can start with more context, clarity and presence.",
    question: "Question",
    of: "of",
    diagnosisTitle: "Initial diagnosis",
    close: "Close for now",
    back: "Back",
    next: "Next question",
    continue: "Continue journey",
  },
};

function getCopy(locale) {
  return PRECHAT_COPY[locale === "en" ? "en" : "pt"];
}

function safeSpeak(text, enabled = true, locale = "pt") {
  if (!enabled) return;
  try {
    const synth = window?.speechSynthesis;
    if (!synth || typeof window?.SpeechSynthesisUtterance !== "function") return;
    synth.cancel?.();
    const utter = new window.SpeechSynthesisUtterance(String(text || ""));
    utter.lang = locale === "en" ? "en-US" : "pt-BR";
    utter.rate = 0.96;
    utter.pitch = 1.02;
    synth.speak(utter);
  } catch {}
}

function buildDiagnosis(answers, locale = "pt") {
  const copy = getCopy(locale);
  const challenge = String(answers?.challenge || "").trim();
  const goal = String(answers?.goal || "").trim();

  if (/integra|api|crm|erp|sistema|autom|integrat|system|automation/i.test(`${challenge} ${goal}`)) {
    return copy.diagnosisIntegration;
  }
  if (/venda|cliente|comercial|pipeline|receita|sales|customer|revenue/i.test(`${challenge} ${goal}`)) {
    return copy.diagnosisSales;
  }
  return copy.diagnosisFallback;
}

function persistPrechatContext(answers, locale = "pt") {
  const payload = {
    version: 2,
    source: "avatar_public_prechat",
    locale,
    created_at: Date.now(),
    expires_at: Date.now() + TTL_MS,
    trial_days: 7,
    answers,
    diagnosis: buildDiagnosis(answers, locale),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
  return payload;
}

export default function AvatarPrechatModal({
  open,
  onClose,
  onContinue,
  autoSpeak = true,
  locale = "pt",
}) {
  const copy = getCopy(locale);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    name: "",
    challenge: "",
    goal: "",
  });

  const activeQuestion = copy.questions[step] || copy.questions[0];
  const introSpokenRef = useRef(false);

  const completionPreview = useMemo(() => {
    return buildDiagnosis(answers, locale);
  }, [answers, locale]);

  useEffect(() => {
    if (!open) return;
    if (introSpokenRef.current) return;
    introSpokenRef.current = true;
    safeSpeak(copy.introSpeech, autoSpeak, locale);
  }, [open, autoSpeak, copy.introSpeech, locale]);

  useEffect(() => {
    if (!open) return;
    safeSpeak(activeQuestion?.label, autoSpeak, locale);
  }, [open, step, activeQuestion, autoSpeak, locale]);

  useEffect(() => {
    if (!open) {
      introSpokenRef.current = false;
      setStep(0);
    }
  }, [open]);

  if (!open) return null;

  const value = answers[activeQuestion.id] || "";
  const isLast = step === copy.questions.length - 1;

  function setField(nextValue) {
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: nextValue,
    }));
  }

  function handleNext() {
    if (!String(value || "").trim()) return;
    if (!isLast) {
      setStep((prev) => prev + 1);
      return;
    }
    const payload = persistPrechatContext(answers, locale);
    safeSpeak(copy.doneSpeech, autoSpeak, locale);
    onContinue?.(payload);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(5,8,18,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          borderRadius: 28,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(245,248,255,0.98) 0%, rgba(235,241,255,0.98) 100%)",
          boxShadow: "0 28px 80px rgba(15,23,42,0.26)",
          border: "1px solid rgba(148,163,184,0.25)",
        }}
      >
        <div
          style={{
            padding: "24px 24px 12px",
            background:
              "radial-gradient(circle at top left, rgba(191,219,254,0.95), rgba(255,255,255,0.98))",
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: "0.12em", fontWeight: 800, color: "#31508e", textTransform: "uppercase" }}>
            {copy.eyebrow}
          </div>
          <h2 style={{ margin: "10px 0 8px", fontSize: 30, lineHeight: 1.1, color: "#0f172a" }}>
            {copy.title}
          </h2>
          <p style={{ margin: 0, color: "#334155", fontSize: 15, lineHeight: 1.6 }}>
            {copy.subtitle}
          </p>
        </div>

        <div style={{ padding: 24, display: "grid", gap: 18 }}>
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: 18,
              borderRadius: 22,
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(148,163,184,0.22)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "#31508e" }}>
              {copy.question} {step + 1} {copy.of} {copy.questions.length}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{activeQuestion.label}</div>

            {activeQuestion.type === "textarea" ? (
              <textarea
                value={value}
                onChange={(e) => setField(e.target.value)}
                placeholder={activeQuestion.placeholder}
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0f172a",
                  padding: "14px 16px",
                  fontSize: 15,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <input
                value={value}
                onChange={(e) => setField(e.target.value)}
                placeholder={activeQuestion.placeholder}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0f172a",
                  padding: "14px 16px",
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 20,
              background: "rgba(15,23,42,0.04)",
              border: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#31508e", marginBottom: 8 }}>
              {copy.diagnosisTitle}
            </div>
            <div style={{ color: "#1e293b", fontSize: 14, lineHeight: 1.6 }}>
              {completionPreview}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid rgba(148,163,184,0.35)",
                background: "#fff",
                color: "#0f172a",
                borderRadius: 999,
                padding: "12px 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {copy.close}
            </button>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.max(0, prev - 1))}
                  style={{
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "#fff",
                    color: "#0f172a",
                    borderRadius: 999,
                    padding: "12px 18px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {copy.back}
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!String(value || "").trim()}
                style={{
                  border: "none",
                  background: !String(value || "").trim()
                    ? "linear-gradient(135deg, #94a3b8, #94a3b8)"
                    : "linear-gradient(135deg, #1d4ed8, #7c3aed)",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "12px 18px",
                  fontWeight: 800,
                  cursor: !String(value || "").trim() ? "not-allowed" : "pointer",
                }}
              >
                {isLast ? copy.continue : copy.next}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

