import React, { useEffect, useMemo, useState } from "react";
import usePatroaiSeo from "../lib/usePatroaiSeo.js";

const ORKIO_ENV =
  typeof window !== "undefined" && window.__ORKIO_ENV__
    ? window.__ORKIO_ENV__
    : {};

const DEFAULT_TENANT = String(
  ORKIO_ENV.VITE_DEFAULT_TENANT ||
    import.meta.env.VITE_DEFAULT_TENANT ||
    "public"
).trim() || "public";

function normalize(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

async function parseError(response, fallback) {
  try {
    const payload = await response.json();
    return payload?.detail || payload?.message || fallback;
  } catch {
    return fallback;
  }
}

async function getAccessGrantStatus() {
  const response = await fetch("/api/access-grants/status", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Org-Slug": DEFAULT_TENANT,
    },
  });
  if (!response.ok) return { granted: false };
  return response.json();
}

async function validateAccessCode(code) {
  const response = await fetch("/api/access-grants/validate", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Org-Slug": DEFAULT_TENANT,
    },
    body: JSON.stringify({
      code,
      purpose: "platform_beta",
    }),
  });

  if (!response.ok) {
    const message = await parseError(
      response,
      "Acesso antecipado restrito. Verifique seu código de convite."
    );
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export default function BetaAccessGate({ children = null }) {
  usePatroaiSeo();

  const [state, setState] = useState("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    whatsapp: "",
    email: "",
    consent: false,
  });

  useEffect(() => {
    let active = true;
    getAccessGrantStatus()
      .then((payload) => {
        if (!active) return;
        setState(payload?.granted ? "granted" : "denied");
      })
      .catch(() => {
        if (active) setState("denied");
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitCode(event) {
    event?.preventDefault?.();
    const safe = normalize(code);
    if (!safe) {
      setError("Informe o código de acesso.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = await validateAccessCode(safe);
      if (!payload?.granted) {
        throw new Error("Acesso não autorizado.");
      }
      setCode("");
      setState("granted");
    } catch (err) {
      if (err?.status === 429) {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        setError(
          err?.message ||
            "Acesso antecipado restrito. Verifique seu código de convite."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitWaitlist(event) {
    event?.preventDefault?.();

    if (!form.name.trim() || !form.email.trim()) {
      setError("Informe nome e e-mail para entrar na Lista Prioritária.");
      return;
    }
    if (!form.consent) {
      setError(
        "Autorize o contato para que possamos avisar você sobre a próxima fase."
      );
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/beta/waitlist", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Org-Slug": DEFAULT_TENANT,
        },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          whatsapp: form.whatsapp,
          email: form.email,
          consent: form.consent,
          source: "patroai_private_access_gate",
        }),
      });

      if (!response.ok) {
        throw new Error(
          await parseError(
            response,
            "Não foi possível registrar seu interesse agora."
          )
        );
      }
      setSent(true);
    } catch (err) {
      setError(
        err?.message || "Não foi possível registrar seu interesse agora."
      );
    } finally {
      setBusy(false);
    }
  }

  if (state === "granted" && children) return children;

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
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.90), rgba(2,6,23,0.96))",
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

        {state === "checking" ? (
          <p style={{ color: "rgba(255,255,255,0.76)", lineHeight: 1.65 }}>
            Validando sua autorização com segurança...
          </p>
        ) : null}

        {state !== "checking" && !waitlistOpen && !sent ? (
          <>
            <p
              style={{
                color: "rgba(255,255,255,0.76)",
                lineHeight: 1.65,
                fontSize: 16,
                maxWidth: 640,
              }}
            >
              O código é validado exclusivamente pelo servidor. Nenhum código
              privado é incorporado ao aplicativo público.
            </p>

            <form
              onSubmit={submitCode}
              style={{ marginTop: 24, display: "grid", gap: 12 }}
            >
              <label style={{ display: "grid", gap: 8 }}>
                <span
                  style={{
                    color: "rgba(255,255,255,0.78)",
                    fontWeight: 800,
                  }}
                >
                  Código de acesso
                </span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Digite seu código"
                  autoFocus
                  autoComplete="one-time-code"
                  style={field}
                />
              </label>

              {error ? (
                <div style={{ color: "#fca5a5", fontWeight: 800 }}>
                  {error}
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setWaitlistOpen(true);
                  }}
                  style={{
                    ...button,
                    background: "rgba(255,255,255,0.10)",
                    color: "#fff",
                  }}
                >
                  Lista Prioritária
                </button>
                <button type="submit" disabled={busy} style={button}>
                  {busy ? "Validando..." : "Continuar"}
                </button>
              </div>
            </form>
          </>
        ) : null}

        {waitlistOpen && !sent ? (
          <form
            onSubmit={submitWaitlist}
            style={{ marginTop: 22, display: "grid", gap: 12 }}
          >
            <input
              style={field}
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              placeholder="Nome"
            />
            <input
              style={field}
              value={form.company}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  company: event.target.value,
                }))
              }
              placeholder="Empresa"
            />
            <input
              style={field}
              value={form.whatsapp}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  whatsapp: event.target.value,
                }))
              }
              placeholder="WhatsApp"
            />
            <input
              style={field}
              value={form.email}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
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
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    consent: event.target.checked,
                  }))
                }
                style={{ marginTop: 3 }}
              />
              <span>
                Autorizo a equipe do Grupo Patroai a entrar em contato sobre
                atualizações do ambiente privado.
              </span>
            </label>

            {error ? (
              <div style={{ color: "#fca5a5", fontWeight: 800 }}>{error}</div>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setWaitlistOpen(false);
                }}
                style={{
                  ...button,
                  background: "rgba(255,255,255,0.10)",
                  color: "#fff",
                }}
              >
                Voltar
              </button>
              <button type="submit" disabled={busy} style={button}>
                {busy ? "Registrando..." : "Entrar na Lista Prioritária"}
              </button>
            </div>
          </form>
        ) : null}

        {sent ? (
          <div style={{ marginTop: 24, display: "grid", gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: 26 }}>
              Cadastro registrado com sucesso.
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.65,
              }}
            >
              Avisaremos você por e-mail quando a próxima fase estiver
              disponível.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
