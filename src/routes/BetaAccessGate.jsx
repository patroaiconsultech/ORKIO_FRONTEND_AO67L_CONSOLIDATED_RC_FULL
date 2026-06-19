import usePatroaiSeo from "../lib/usePatroaiSeo.js"; import React, { useMemo, useState } from "react";

const PUBLIC_CODE = "EFATAH777";
const STORAGE_KEY = "patroai_private_gate_passed";
const BETA_ACCESS_CODE_STORAGE_KEY = "patroai_private_access_code";

function normalize(value) {
  return String(value || "").replace(/\s+/g, "").trim().toUpperCase();
}

function getAllowedCodes() {
  const raw = import.meta.env.VITE_PATROAI_PRIVATE_ACCESS_CODES || PUBLIC_CODE;

  return String(raw || "")
    .split(/[;,\n]/g)
    .map(normalize)
    .filter(Boolean);
}

function isAllowed(value) {
  const safe = normalize(value);
  return !!safe && getAllowedCodes().includes(safe);
}

function apiUrl(path) {
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "";

  const cleanBase = String(base || "").replace(/\/+$/, "");
  const cleanPath = String(path || "").startsWith("/") ? path : `/${path}`;

  if (!cleanBase) return cleanPath;
  if (cleanBase.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${cleanBase}${cleanPath.slice(4)}`;
  }

  return `${cleanBase}${cleanPath}`;
}

export default function BetaAccessGate({ children = null }) { usePatroaiSeo();
  const urlAllowsInternal = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return params.get("internal") === "1";
    } catch {
      return false;
    }
  }, []);

  const [internalPassed, setInternalPassed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1" || urlAllowsInternal;
    } catch {
      return urlAllowsInternal;
    }
  });

  const [code, setCode] = useState("");
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    company: "",
    whatsapp: "",
    email: "",
    consent: false,
  });

  const internalCode = normalize(import.meta.env.VITE_PATROAI_INTERNAL_GATE_CODE);

  function unlockInternal() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setInternalPassed(true);
  }

  function submitCode(e) {
    e?.preventDefault?.();

    const safe = normalize(code);

    if (internalCode && safe === normalize(internalCode)) {
      unlockInternal();
      return;
    }

    if (!isAllowed(safe)) {
      setError("Acesso antecipado restrito. Verifique seu código de convite.");
      setWaitlistOpen(false);
      return;
    }

    try {
      sessionStorage.setItem(BETA_ACCESS_CODE_STORAGE_KEY, safe);
    } catch {}

    setError("");
    setWaitlistOpen(false);
    unlockInternal();
    return;
  }

  async function submitWaitlist(e) {
    e?.preventDefault?.();

    if (!form.name.trim() || !form.email.trim()) {
      setError("Informe nome e e-mail para entrar na Lista Prioritária.");
      return;
    }

    if (!form.consent) {
      setError("Autorize o contato para que possamos avisar você sobre a próxima fase.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch(apiUrl("/api/beta/waitlist"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          whatsapp: form.whatsapp,
          email: form.email,
          consent: form.consent,
          access_code: normalize(code) || getAllowedCodes()[0] || "EFATAH777",
          source: "patroai_private_access_gate",
        }),
      });

      if (!res.ok) {
        let msg = "Não foi possível registrar seu interesse agora.";
        try {
          const data = await res.json();
          msg = data?.detail || data?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      setSent(true);
    } catch (err) {
      setError(err?.message || "Não foi possível registrar seu interesse agora.");
    } finally {
      setBusy(false);
    }
  }

  if (internalPassed && children) return children;

  const shell = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 18% 12%, rgba(124,92,255,0.28), transparent 34%), radial-gradient(circle at 82% 0%, rgba(245,158,11,0.20), transparent 32%), #070914",
    color: "#fff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    display: "grid",
    placeItems: "center",
    padding: 18,
  };

  const card = {
    width: "min(780px, 100%)",
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(180deg, rgba(15,23,42,0.90), rgba(2,6,23,0.96))",
    boxShadow: "0 28px 90px rgba(0,0,0,0.42)",
    padding: "clamp(22px, 4vw, 42px)",
  };

  const field = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "#fff",
    padding: "14px 15px",
    outline: "none",
    fontSize: 15,
  };

  const button = {
    border: 0,
    borderRadius: 16,
    background: "linear-gradient(135deg, #f8fafc, #facc15)",
    color: "#111827",
    padding: "14px 18px",
    fontWeight: 950,
    cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.7 : 1,
  };

  return (
    <main style={shell}>
      <section style={card}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#facc15",
            fontWeight: 900,
          }}
        >
          Ambiente privado Grupo Patroai
        </div>

        <h1
          style={{
            margin: "12px 0 10px",
            fontSize: "clamp(30px, 6vw, 52px)",
            lineHeight: 1.02,
          }}
        >
          Programa de Evolução Controlada
        </h1>

        {!waitlistOpen && !sent ? (
          <>
            <p
              style={{
                color: "rgba(255,255,255,0.76)",
                lineHeight: 1.65,
                fontSize: 16,
                maxWidth: 640,
              }}
            >
              Estamos realizando melhorias estruturais em nosso ambiente privado de inteligência aplicada.
              Neste momento, o acesso antecipado está temporariamente restrito para
              garantir a melhor experiência possível.
            </p>

            <form onSubmit={submitCode} style={{ marginTop: 24, display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.78)", fontWeight: 800 }}>
                  Código de acesso
                </span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Digite seu código"
                  autoFocus
                  style={field}
                />
              </label>

              {error ? <div style={{ color: "#fca5a5", fontWeight: 800 }}>{error}</div> : null}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" style={button}>
                  Continuar
                </button>
              </div>
            </form>
          </>
        ) : null}

        {waitlistOpen && !sent ? (
          <>
            <div
              style={{
                marginTop: 22,
                borderRadius: 20,
                border: "1px solid rgba(250,204,21,0.26)",
                background: "rgba(250,204,21,0.08)",
                padding: 16,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ display: "block", color: "#fde68a", marginBottom: 8 }}>
                Acesso antecipado temporariamente restrito.
              </strong>
              Entre na Lista Prioritária pelo Programa de Evolução Controlada.
              Avisaremos você por e-mail assim que o acesso estiver disponível.
              <br />
              <br />
              Obrigado pela sua confiança. Estamos trabalhando para fazer algo realmente incrível.
            </div>

            <form onSubmit={submitWaitlist} style={{ marginTop: 22, display: "grid", gap: 12 }}>
              <input
                style={field}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome"
              />

              <input
                style={field}
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                placeholder="Empresa"
              />

              <input
                style={field}
                value={form.whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                placeholder="WhatsApp"
              />

              <input
                style={field}
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="E-mail"
                type="email"
              />

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  color: "rgba(255,255,255,0.76)",
                  lineHeight: 1.45,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
                  style={{ marginTop: 3 }}
                />
                <span>
                  Autorizo a equipe do Grupo Patroai a entrar em contato sobre atualizações do ambiente privado.
                </span>
              </label>

              {error ? <div style={{ color: "#fca5a5", fontWeight: 800 }}>{error}</div> : null}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={busy} style={button}>
                  {busy ? "Registrando..." : "Entrar na Lista Prioritária"}
                </button>
              </div>
            </form>
          </>
        ) : null}

        {sent ? (
          <div style={{ marginTop: 24, display: "grid", gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: 26 }}>Cadastro registrado com sucesso.</h2>
            <p style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.65 }}>
              Avisaremos você por e-mail assim que for possível acessar a próxima fase do ambiente privado.
              Obrigado pela sua confiança. Estamos trabalhando para fazer algo realmente incrível.
            </p>
            <div style={{ color: "#facc15", fontWeight: 900 }}>Equipe Grupo Patroai</div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
