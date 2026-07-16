import usePatroaiSeo from "../lib/usePatroaiSeo.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch, createPublicCheckout } from "../ui/api.js";
import {
  setTenant,
  savePendingOtpContext,
  getPendingOtpContext,
  completeOtpLogin,
  getToken,
  getUser,
  isApproved,
  isAdmin,
  getPendingTermsAccepted,
  clearPendingTermsAccepted,
  getAcceptedTermsVersion,
} from "../lib/auth.js";
import { consumeReturnTo, DEFAULT_AFTER_LOGIN_PATH } from "../lib/authReturn";

const palette = {
  ink: "#f8fafc",
  muted: "rgba(248,250,252,0.68)",
  faint: "rgba(248,250,252,0.46)",
  line: "rgba(255,255,255,0.12)",
  lineGold: "rgba(247,200,98,0.24)",
  gold: "#f7c862",
  goldSoft: "#ffe29c",
  goldDeep: "#8a5a12",
  card: "rgba(7,10,18,0.74)",
  cardStrong: "rgba(9,13,24,0.92)",
  input: "rgba(255,255,255,0.07)",
  inputBorder: "rgba(255,255,255,0.13)",
  success: "#88f3a0",
};

const shell = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 20,
  color: palette.ink,
  background:
    "radial-gradient(900px 580px at 12% 0%, rgba(247,200,98,0.16), transparent 58%), radial-gradient(760px 500px at 88% 10%, rgba(111,132,255,0.16), transparent 48%), linear-gradient(180deg, #02050a 0%, #050914 48%, #02050a 100%)",
};

const pageGrid = {
  width: "100%",
  maxWidth: 1180,
  display: "grid",
  gridTemplateColumns: "minmax(300px, 0.92fr) minmax(320px, 1fr)",
  gap: 24,
  alignItems: "stretch",
};

const card = {
  width: "100%",
  borderRadius: 34,
  border: `1px solid ${palette.line}`,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.095), rgba(255,255,255,0.045))",
  color: palette.ink,
  boxShadow: "0 30px 100px rgba(0,0,0,0.45)",
  padding: 28,
  boxSizing: "border-box",
  backdropFilter: "blur(20px)",
};

const label = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 850,
  color: "rgba(248,250,252,0.78)",
};

const input = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 18,
  border: `1px solid ${palette.inputBorder}`,
  background: palette.input,
  color: palette.ink,
  outline: "none",
  fontSize: 15,
  boxSizing: "border-box",
};

const btn = {
  width: "100%",
  border: 0,
  borderRadius: 20,
  padding: "15px 18px",
  fontWeight: 950,
  fontSize: 15,
  cursor: "pointer",
  background: "linear-gradient(135deg, #fff1cb 0%, #f7c862 48%, #a66f16 100%)",
  color: "#05070d",
  boxShadow: "0 22px 52px rgba(247,200,98,0.22)",
};

const secondaryBtn = {
  width: "100%",
  border: `1px solid ${palette.line}`,
  borderRadius: 20,
  padding: "15px 18px",
  fontWeight: 850,
  fontSize: 15,
  cursor: "pointer",
  background: "rgba(255,255,255,0.055)",
  color: "rgba(248,250,252,0.86)",
};

const linkBtn = {
  border: 0,
  background: "transparent",
  padding: 0,
  margin: 0,
  color: palette.goldSoft,
  fontWeight: 850,
  cursor: "pointer",
  textAlign: "left",
};

const muted = { color: palette.muted, fontSize: 14, lineHeight: 1.62 };

const adminChip = {
  border: `1px solid ${palette.lineGold}`,
  background: "rgba(247,200,98,0.08)",
  color: palette.goldSoft,
  fontSize: 12,
  padding: "7px 11px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
};

const eyeBtn = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  border: 0,
  background: "transparent",
  color: palette.goldSoft,
  cursor: "pointer",
  fontWeight: 850,
};

const sidePanel = {
  width: "100%",
  borderRadius: 34,
  border: `1px solid ${palette.line}`,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))",
  color: palette.ink,
  boxShadow: "0 30px 100px rgba(0,0,0,0.38)",
  padding: 28,
  boxSizing: "border-box",
  backdropFilter: "blur(20px)",
  overflow: "hidden",
  position: "relative",
};

const sideChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 999,
  border: `1px solid ${palette.lineGold}`,
  background: "rgba(247,200,98,0.06)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: palette.goldSoft,
};

const planPill = {
  borderRadius: 22,
  border: `1px solid ${palette.line}`,
  background: "rgba(255,255,255,0.045)",
  padding: "14px 16px",
};

const statusBox = {
  marginTop: 16,
  borderRadius: 20,
  border: `1px solid ${palette.lineGold}`,
  background: "rgba(247,200,98,0.08)",
  color: palette.goldSoft,
  padding: "12px 14px",
  fontSize: 14,
  lineHeight: 1.55,
};

const AUTH_REQUEST_TIMEOUT_MS = 20000;
const POST_LOGIN_REDIRECT_FALLBACK_MS = 900;
const PRECHAT_KEY = "orkio_prechat_context";
const PRECHAT_LEGACY_KEY = "orkio_prechat_context_v1";
const PRECHAT_IMPORT_KEY = "orkio_prechat_import_pending_v1";
const PENDING_CHECKOUT_CTX_KEY = "orkio_pending_checkout_ctx";
const ADMIN_ALLOWED_EMAILS = new Set(["daniel@patroai.com", "daniel@patroai.com.br"]);

function normalizeIdentityEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isAuthorizedAdminEmail(value) {
  return ADMIN_ALLOWED_EMAILS.has(normalizeIdentityEmail(value));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAccessCode(value) {
  return String(value || "").replace(/\s+/g, "").trim().toUpperCase();
}

function hasInviteAccessCode(value) {
  return Boolean(normalizeAccessCode(value));
}

function readPrechatContext() {
  try {
    const raw =
      window.localStorage?.getItem(PRECHAT_KEY) ||
      window.sessionStorage?.getItem(PRECHAT_KEY) ||
      window.localStorage?.getItem(PRECHAT_LEGACY_KEY) ||
      window.sessionStorage?.getItem(PRECHAT_LEGACY_KEY) ||
      "";
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function stagePrechatImport(extra = {}) {
  try {
    const ctx = readPrechatContext();
    if (!ctx) return;
    window.localStorage?.setItem(
      PRECHAT_IMPORT_KEY,
      JSON.stringify({
        ...ctx,
        ...extra,
        staged_at: new Date().toISOString(),
      })
    );
  } catch {}
}

function saveCheckoutCtx(ctx) {
  try {
    localStorage.setItem(PENDING_CHECKOUT_CTX_KEY, JSON.stringify(ctx));
  } catch {}
}

function readCheckoutCtx() {
  try {
    const raw = localStorage.getItem(PENDING_CHECKOUT_CTX_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearCheckoutCtx() {
  try {
    localStorage.removeItem(PENDING_CHECKOUT_CTX_KEY);
  } catch {}
}


function readAuthJourneyContext(search = "") {
  try {
    const params = new URLSearchParams(search || window.location.search || "");
    const source = String(params.get("source") || "").trim();
    const entry = String(params.get("entry") || "").trim();
    const mode = String(params.get("mode") || "").trim();
    const onboarding = params.get("onboarding") === "1";
    const prechat = params.get("prechat") === "1";
    const beta = params.get("beta") === "1";
    const returnTo = String(params.get("returnTo") || params.get("next") || "").trim();

    return {
      source,
      entry,
      mode,
      onboarding,
      prechat,
      beta,
      returnTo,
      fromAvatar: entry === "avatar" || prechat,
      fromDemo: source.includes("demo"),
      fromPatroai: source.includes("patroai"),
      fromOrkio: source.includes("orkio"),
    };
  } catch {
    return {
      source: "",
      entry: "",
      mode: "",
      onboarding: false,
      prechat: false,
      beta: false,
      returnTo: "",
      fromAvatar: false,
      fromDemo: false,
      fromPatroai: false,
      fromOrkio: false,
    };
  }
}

function getAuthPresentation({ mode, otpMode, journey }) {
  const safeMode = otpMode ? "otp" : mode || "login";
  const fromAvatar = !!journey?.fromAvatar;
  const fromDemo = !!journey?.fromDemo;
  const fromPatroai = !!journey?.fromPatroai;
  const fromOrkio = !!journey?.fromOrkio;
  const onboarding = !!journey?.onboarding;

  if (safeMode === "otp") {
    return {
      badge: "Acesso seguro",
      title: "Confirme seu acesso",
      subtitle:
        "Digite o código enviado para seu e-mail. Essa etapa protege sua sessão e preserva a continuidade da jornada.",
      panelTitle: "Validação com segurança",
      panelBody:
        "A Patroai mantém o contexto preparado enquanto você conclui a verificação. Depois disso, seguimos para o ambiente certo.",
      steps: ["Código por e-mail", "Sessão validada", "Continuidade preservada"],
    };
  }

  if (safeMode === "forgot") {
    return {
      badge: "Recuperação",
      title: "Recupere seu acesso",
      subtitle: "Informe seu e-mail para receber instruções de recuperação de senha.",
      panelTitle: "Sem perder o caminho",
      panelBody:
        "A recuperação foi desenhada para ser simples: você confirma o e-mail, redefine a senha e volta para a jornada original.",
      steps: ["E-mail confirmado", "Senha redefinida", "Retorno seguro"],
    };
  }

  if (safeMode === "reset") {
    return {
      badge: "Nova senha",
      title: "Defina sua nova senha",
      subtitle: "Crie uma nova senha para recuperar seu acesso à plataforma.",
      panelTitle: "Acesso restaurado",
      panelBody:
        "Após atualizar a senha, você poderá entrar novamente e continuar no ambiente Patroai.",
      steps: ["Nova senha", "Conta protegida", "Login liberado"],
    };
  }

  if (safeMode === "register") {
    if (fromAvatar) {
      return {
        badge: "Patroai iniciou o contexto",
        title: "Preserve sua conversa com a Patroai",
        subtitle:
          "Crie seu acesso para salvar o diagnóstico iniciado, manter memória contextual e continuar a jornada com a sobriedade de um copiloto que sabe reparar falhas.",
        panelTitle: "Sua conversa não precisa recomeçar",
        panelBody:
          "A Patroai reconhece de onde você veio. Agora o cadastro cria uma sessão segura para transformar conversa em diagnóstico, plano e execução — com continuidade, polidez e reparação quando algo falhar.",
        steps: ["Contexto recebido", "Conta criada", "Diagnóstico continuado"],
      };
    }

    if (fromDemo) {
      return {
        badge: "Demonstração Patroai",
        title: "Prepare sua demonstração",
        subtitle:
          "Crie seu acesso para organizar o diagnóstico inicial e chegar à demonstração com mais clareza sobre sua operação.",
        panelTitle: "Demonstração com contexto",
        panelBody:
          "Em vez de uma reunião genérica, a Patroai conduz uma entrada com contexto, intenção e próximos passos.",
        steps: ["Perfil criado", "Objetivo registrado", "Demonstração preparada"],
      };
    }

    if (fromPatroai || fromOrkio || onboarding) {
      return {
        badge: "Patroai Consultech",
        title: "Crie seu acesso inteligente",
        subtitle:
          "Entre na plataforma para iniciar diagnóstico, preservar contexto e transformar intenção em plano de evolução com clareza, elegância e continuidade.",
        panelTitle: "Uma entrada com continuidade",
        panelBody:
          "A jornada começa antes do formulário: origem, intenção e próximo passo acompanham o usuário até o app. Se algo se perder, a plataforma deve reconhecer, pedir perdão e reorganizar o caminho.",
        steps: ["Cadastro simples", "Diagnóstico inicial", "Acesso ao app"],
      };
    }

    return {
      badge: "Novo acesso",
      title: "Crie sua conta",
      subtitle:
        "Crie seu acesso para conhecer a Patroai: uma plataforma que organiza, conduz com calma e preserva a dignidade da conversa.",
      panelTitle: "Comece com clareza",
      panelBody:
        "A criação da conta prepara seu espaço para conversas, diagnósticos e evolução operacional — com memória, gentileza firme e próximos passos claros.",
      steps: ["Conta criada", "Contexto inicial", "Ambiente liberado"],
    };
  }

  return {
    badge: "Bem-vindo de volta",
    title: "Continue de onde parou",
    subtitle:
      "Entre com e-mail e senha. Se a governança exigir, o código OTP será solicitado na próxima etapa.",
    panelTitle: "Memória e continuidade",
    panelBody:
      "O login não é só uma porta de entrada. Ele deve recuperar sua sessão, seu contexto e o próximo passo da jornada — sem recomeçar quando há história.",
    steps: ["Sessão recuperada", "Contexto preservado", "Próximo passo retomado"],
  };
}

function normalizeAuthErrorMessage(err, fallbackMessage) {
  if (!err) return fallbackMessage;
  if (err?.name === "AbortError" || err?.code === "AUTH_REQUEST_TIMEOUT") {
    return "Peço perdão. A solicitação demorou demais. Tente novamente em instantes.";
  }
  if ([502, 503, 504].includes(Number(err?.status || 0)) || err?.code === "TEMPORARY_SERVICE_UNAVAILABLE") {
    return "Peço perdão. A autenticação está temporariamente indisponível. Tente novamente em instantes.";
  }
  const raw = String(err?.message || fallbackMessage || "Falha no acesso.").trim();
  if (!raw || raw === "[object Object]") return fallbackMessage || "Falha no acesso.";
  if (/failed to fetch|network|load failed/i.test(raw)) return "Não consegui conectar ao servidor de autenticação. Tente novamente em instantes.";
  if (/invalid session payload/i.test(raw)) return "O servidor respondeu, mas a sessão não veio completa. Tente novamente.";
  return raw;
}

function makeAuthRequestId(prefix = "auth") {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {}
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function apiFetchWithTimeout(path, options = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? window.setTimeout(() => {
        try {
          controller.abort();
        } catch {}
      }, Math.max(1000, Number(timeoutMs || AUTH_REQUEST_TIMEOUT_MS)))
    : null;

  try {
    return await apiFetch(path, {
      ...options,
      signal: controller?.signal,
    });
  } catch (err) {
    if (controller?.signal?.aborted) {
      const timeoutErr = new Error("Authentication request timed out.");
      timeoutErr.name = "AbortError";
      timeoutErr.code = "AUTH_REQUEST_TIMEOUT";
      throw timeoutErr;
    }
    throw err;
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

function PasswordField({ labelText, placeholder, value, onChange, show, onToggle, autoComplete }) {
  return (
    <div>
      <label style={label}>{labelText}</label>
      <div style={{ position: "relative" }}>
        <input
          style={{ ...input, paddingRight: 64 }}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete || "current-password"}
        />
        <button
          type="button"
          onClick={onToggle}
          style={eyeBtn}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}

export default function AuthPage() { usePatroaiSeo();
  const nav = useNavigate();
  const location = useLocation();
  const [tenant] = useState("public");

  const initialMode = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("mode");
      if (["register", "login", "forgot", "reset"].includes(raw || "")) return raw;

      const entry = String(params.get("entry") || "").toLowerCase();
      const source = String(params.get("source") || "").toLowerCase();
      const onboarding = params.get("onboarding");
      const prechat = params.get("prechat");

      if (entry === "avatar" || onboarding === "1" || prechat === "1" || source.includes("demo")) {
        return "register";
      }

      return "login";
    } catch {
      return "login";
    }
  })();

  const [mode, setMode] = useState(initialMode);
  const [otpMode, setOtpMode] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("free_trial");
  const normalizedAccessCodeForUi = normalizeAccessCode(accessCode);
  const hasServerValidatedInvite = hasInviteAccessCode(normalizedAccessCodeForUi);

  const [otpCode, setOtpCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const loginWatchdogRef = useRef(null);
  const redirectedAfterLoginRef = useRef(false);

  const journey = useMemo(() => readAuthJourneyContext(location.search), [location.search]);
  const presentation = useMemo(
    () => getAuthPresentation({ mode, otpMode, journey }),
    [mode, otpMode, journey]
  );

  const token = getToken();
  const currentUser = getUser();
  const showAdminShortcut =
    !!token &&
    !!currentUser &&
    isApproved(currentUser) &&
    isAdmin(currentUser) &&
    isAuthorizedAdminEmail(currentUser?.email);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      const urlToken = params.get("token");

      if (["register", "login", "forgot", "reset"].includes(urlMode || "")) {
        setMode(urlMode);
      }

      if (urlMode === "reset" && urlToken) {
        setResetToken(urlToken);
      }

      const checkout = readCheckoutCtx();
      if (checkout?.email) setEmail((prev) => prev || checkout.email);
      if (checkout?.name) setName((prev) => prev || checkout.name);
      if (checkout?.password) setPassword((prev) => prev || checkout.password);
      if (checkout?.selectedPlan) setSelectedPlan(checkout.selectedPlan);
      if (checkout?.acceptTerms) setAcceptTerms(true);
    } catch {}
  }, []);

  useEffect(() => {
    const existingToken = getToken();
    const user = getUser();

    if (existingToken && user && isApproved(user) && !redirectedAfterLoginRef.current) {
      const redirect = sessionStorage.getItem("post_auth_redirect");
      const next =
        consumeReturnTo(location) ||
        (isAdmin(user) && isAuthorizedAdminEmail(user?.email)
          ? "/admin"
          : redirect || DEFAULT_AFTER_LOGIN_PATH || "/app");

      sessionStorage.removeItem("post_auth_redirect");
      nav(next, { replace: true });
    }
  }, [location, nav]);

  useEffect(() => {
    return () => {
      try {
        if (loginWatchdogRef.current) window.clearTimeout(loginWatchdogRef.current);
      } catch {}
    };
  }, []);

  const title = presentation.title;
  const subtitle = presentation.subtitle;

  function setAuthMode(nextMode) {
    setMode(nextMode);
    setOtpMode(false);
    setOtpCode("");
    setStatus("");

    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    if (nextMode !== "reset") {
      url.searchParams.delete("token");
      setResetToken("");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  function goToAdminDirect() {
    nav("/admin");
  }

  async function fetchCurrentTermsVersion() {
    try {
      const { data } = await apiFetch("/api/public/legal/terms-version", {
        method: "GET",
        org: tenant,
        skipAuthRedirect: true,
      });
      return data?.terms_version || data?.version || getAcceptedTermsVersion() || null;
    } catch {
      return getAcceptedTermsVersion() || null;
    }
  }

  async function finalizeSession(data, resolvedTenant) {
    const nextTenant = resolvedTenant || tenant || "public";
    setTenant(nextTenant);

    if (!data?.access_token || !data?.user) {
      throw new Error("Invalid session payload.");
    }

    completeOtpLogin({ ...data, tenant: nextTenant });
    clearCheckoutCtx();

    const pendingTerms = getPendingTermsAccepted();
    if (pendingTerms?.accepted) {
      try {
        const currentTermsVersion = await fetchCurrentTermsVersion();
        await apiFetchWithTimeout(
          "/api/me/accept-terms",
          {
            method: "POST",
            token: getToken(),
            org: nextTenant,
            skipAuthRedirect: true,
            body: {
              accepted: true,
              terms_version:
                pendingTerms.terms_version || currentTermsVersion || getAcceptedTermsVersion(),
            },
          },
          20000
        );
        clearPendingTermsAccepted();
      } catch (err) {
        console.warn("terms acceptance sync failed", err);
      }
    }

    const storedUser = getUser();
    const redirect = sessionStorage.getItem("post_auth_redirect");
    const next =
      consumeReturnTo(location) ||
      (isAdmin(storedUser) && isAuthorizedAdminEmail(storedUser?.email)
        ? "/admin"
        : redirect || DEFAULT_AFTER_LOGIN_PATH || "/app");

    sessionStorage.removeItem("post_auth_redirect");
    redirectedAfterLoginRef.current = true;
    setStatus("Acesso validado. Redirecionando com segurança...");

    try {
      if (loginWatchdogRef.current) window.clearTimeout(loginWatchdogRef.current);
    } catch {}

    loginWatchdogRef.current = window.setTimeout(() => {
      try {
        if (window.location.pathname !== next) {
          window.location.assign(next);
        }
      } catch {}
    }, POST_LOGIN_REDIRECT_FALLBACK_MS);

    nav(next, { replace: true });
  }

  async function completeRegistration({ nameValue, emailValue, passwordValue, accessCodeValue = "" }) {
    const registerRequestId = makeAuthRequestId("auth_register");
    const loginRequestId = makeAuthRequestId("auth_login_after_register");
    const registerPayload = {
      tenant,
      email: emailValue,
      name: nameValue,
      password: passwordValue,
      access_code: accessCodeValue || undefined,
      accept_terms: acceptTerms,
      marketing_consent: false,
    };

    const hasInvite = hasInviteAccessCode(accessCodeValue);

    stagePrechatImport({
      email: emailValue,
      name: nameValue,
      trial_days: hasInvite ? 0 : 7,
      source: hasInvite ? "server_validated_access_code" : "auth-register",
      signup_code_label: undefined,
    });

    await apiFetch("/api/auth/register", {
      method: "POST",
      org: tenant,
      headers: { "X-Request-Id": registerRequestId },
      body: registerPayload,
    });

    setStatus("Conta criada. Verificando necessidade de código...");
    savePendingOtpContext({
      email: emailValue,
      tenant,
      name: nameValue,
      accessCode: accessCodeValue || "",
    });
    setPendingEmail(emailValue);
    setOtpMode(true);

    const { data: loginData } = await apiFetchWithTimeout(
      "/api/auth/login",
      {
        method: "POST",
        org: tenant,
        skipAuthRedirect: true,
        headers: { "X-Request-Id": loginRequestId },
        body: { tenant, email: emailValue, password: passwordValue },
      },
      AUTH_REQUEST_TIMEOUT_MS
    );

    if (loginData?.pending_otp) {
      savePendingOtpContext({
        email: loginData.email || emailValue,
        tenant,
        name: nameValue,
        accessCode: accessCodeValue || "",
      });
      setPendingEmail(loginData.email || emailValue);
      setStatus(loginData.message || "Código enviado. Verifique seu e-mail para entrar.");
      return;
    }

    if (loginData?.access_token && loginData?.user) {
      await finalizeSession(loginData, tenant);
      return;
    }

    setStatus(loginData?.message || "Conta criada, mas a validação não foi concluída corretamente.");
  }

  async function startPaidCheckout({ nameValue, emailValue }) {
    saveCheckoutCtx({
      tenant,
      name: nameValue,
      email: emailValue,
      password,
      selectedPlan,
      acceptTerms,
    });

    const { data } = await createPublicCheckout({
      org: tenant,
      item_code: selectedPlan,
      full_name: nameValue,
      email: emailValue,
    });

    if (data?.already_active) {
      await completeRegistration({
        nameValue,
        emailValue,
        passwordValue: password,
        accessCodeValue: "",
      });
      return;
    }

    if (!data?.checkout_url) {
      throw new Error("Checkout link not available.");
    }

    window.location.href = data.checkout_url;
  }

  async function doRegister() {
    if (busy) return;

    if (password !== passwordConfirm) {
      setStatus("As senhas não conferem.");
      return;
    }
    if (!acceptTerms) {
      setStatus("Você precisa aceitar os termos para continuar.");
      return;
    }

    const nameNormalized = String(name || "").trim();
    const emailNormalized = normalizeEmail(email);
    const normalizedAccessCode = normalizeAccessCode(accessCode);

    if (!nameNormalized) {
      setStatus("Informe seu nome completo.");
      return;
    }

    if (!emailNormalized || !password) {
      setStatus("Preencha nome, e-mail e senha.");
      return;
    }

    setBusy(true);
    setStatus("Criando sua conta e preparando a continuidade da jornada...");

    try {
      if (!hasServerValidatedInvite && selectedPlan && selectedPlan !== "free_trial") {
        await startPaidCheckout({
          nameValue: nameNormalized,
          emailValue: emailNormalized,
        });
        return;
      }

      await completeRegistration({
        nameValue: nameNormalized,
        emailValue: emailNormalized,
        passwordValue: password,
        accessCodeValue: normalizedAccessCode,
      });
    } catch (err) {
      if (err?.status === 409) {
        setAuthMode("login");
        setEmail(emailNormalized);
        setStatus("Este e-mail já possui cadastro. Entre com sua senha para continuar.");
      } else {
        setStatus(err?.message || "Não foi possível criar a conta.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function doLogin() {
    if (busy) return;

    const emailNormalized = normalizeEmail(email);

    if (!emailNormalized || !password) {
      setStatus("Informe e-mail e senha.");
      return;
    }

    const loginRequestId = makeAuthRequestId("auth_login");
    setBusy(true);
    setStatus("Validando acesso e recuperando contexto...");
    try {
      console.info("AUTH_LOGIN_START", {
        request_id: loginRequestId,
        tenant_present: !!tenant,
        email_present: !!emailNormalized,
      });
    } catch {}

    try {
      const { data } = await apiFetchWithTimeout(
        "/api/auth/login",
        {
          method: "POST",
          org: tenant,
          skipAuthRedirect: true,
          headers: { "X-Request-Id": loginRequestId },
          body: {
            tenant,
            email: emailNormalized,
            password,
          },
        },
        AUTH_REQUEST_TIMEOUT_MS
      );

      try {
        console.info("AUTH_LOGIN_RESPONSE", {
          request_id: loginRequestId,
          pending_otp: !!data?.pending_otp,
          has_token: !!data?.access_token,
          has_user: !!data?.user,
        });
      } catch {}
    if (data?.pending_otp) {
        savePendingOtpContext({
          email: data.email || emailNormalized,
          tenant,
        });
        setPendingEmail(data.email || emailNormalized);
        setOtpMode(true);
        setStatus(data?.message || "OTP sent. Check your email.");
        return;
      }

      if (data?.access_token && data?.user) {
        try { console.info("AUTH_LOGIN_SUCCESS", { request_id: loginRequestId, tenant_present: !!tenant }); } catch {}
      await finalizeSession(data, tenant);
        return;
      }

      setStatus(data?.message || "Unable to complete sign in.");
    } catch (err) {
      try {
        console.error("AUTH_LOGIN_ERROR", {
          request_id: loginRequestId,
          status: err?.status || null,
          code: err?.code || null,
          temporary: !!err?.isTemporaryUnavailable,
        });
      } catch {}
      setStatus(normalizeAuthErrorMessage(err, "Não foi possível entrar agora."));
    } finally {
      setBusy(false);
    }
  }

  async function doForgotPassword() {
    if (busy) return;
    const emailNormalized = normalizeEmail(email);
    if (!emailNormalized) {
      setStatus("Please enter your email.");
      return;
    }

    setBusy(true);
    setStatus("Sending reset link...");
    try {
      const { data } = await apiFetchWithTimeout(
        "/api/auth/forgot-password",
        {
          method: "POST",
          org: tenant,
          skipAuthRedirect: true,
          body: {
            tenant,
            email: emailNormalized,
          },
        },
        20000
      );
      setStatus(data?.message || "If the account exists, a reset link has been sent.");
    } catch (err) {
      setStatus(normalizeAuthErrorMessage(err, "Unable to request password reset."));
    } finally {
      setBusy(false);
    }
  }

  async function doResetPassword() {
    if (busy) return;

    if (!resetToken) {
      setStatus("Missing reset token.");
      return;
    }
    if (password !== passwordConfirm) {
      setStatus("As senhas não conferem.");
      return;
    }
    if (!password || !passwordConfirm) {
      setStatus("Please fill both password fields.");
      return;
    }

    setBusy(true);
    setStatus("Updating your password...");
    try {
      const { data } = await apiFetchWithTimeout(
        "/api/auth/reset-password",
        {
          method: "POST",
          org: tenant,
          skipAuthRedirect: true,
          body: {
            tenant,
            token: resetToken,
            password,
            password_confirm: passwordConfirm,
          },
        },
        20000
      );
      setStatus(data?.message || "Password updated. You can sign in now.");
      setPassword("");
      setPasswordConfirm("");
      setAuthMode("login");
    } catch (err) {
      setStatus(normalizeAuthErrorMessage(err, "Unable to reset password."));
    } finally {
      setBusy(false);
    }
  }

  async function doVerifyOtp() {
    if (busy) return;

    const ctx = getPendingOtpContext();
    const resolvedTenant = ctx?.tenant || tenant;
    const emailNormalized = normalizeEmail(ctx?.email || pendingEmail || email);
    const code = String(otpCode || "").trim();

    if (!emailNormalized || !code) {
      setStatus("Please enter the OTP sent by email.");
      return;
    }

    setBusy(true);
    setStatus("Verifying code...");

    try {
      const { data } = await apiFetchWithTimeout(
        "/api/auth/login/verify-otp",
        {
          method: "POST",
          org: resolvedTenant,
          skipAuthRedirect: true,
          body: {
            tenant: resolvedTenant,
            email: emailNormalized,
            code,
          },
        },
        AUTH_REQUEST_TIMEOUT_MS
      );

      if (!data?.access_token || !data?.user) {
        setStatus(data?.message || "Invalid code or session not finalized.");
        return;
      }

      await finalizeSession(data, resolvedTenant);
    } catch (err) {
      setStatus(normalizeAuthErrorMessage(err, "OTP validation failed."));
    } finally {
      setBusy(false);
    }
  }

  function renderModeTabs() {
    if (otpMode) return null;

    const tabBase = {
      ...secondaryBtn,
      padding: "13px 16px",
      borderRadius: 18,
      boxShadow: "none",
    };

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={() => setAuthMode("login")}
          style={{
            ...tabBase,
            background: mode === "login" ? "rgba(247,200,98,0.14)" : "rgba(255,255,255,0.045)",
            borderColor: mode === "login" ? "rgba(247,200,98,0.46)" : palette.line,
            color: mode === "login" ? palette.goldSoft : "rgba(248,250,252,0.70)",
          }}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setAuthMode("register")}
          style={{
            ...tabBase,
            background: mode === "register" ? "rgba(247,200,98,0.14)" : "rgba(255,255,255,0.045)",
            borderColor: mode === "register" ? "rgba(247,200,98,0.46)" : palette.line,
            color: mode === "register" ? palette.goldSoft : "rgba(248,250,252,0.70)",
          }}
        >
          Criar conta
        </button>
      </div>
    );
  }

  function renderOtpForm() {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          doVerifyOtp();
        }}
        style={{ display: "grid", gap: 14, marginTop: 22 }}
      >
        <div>
          <label style={label}>Código OTP</label>
          <input
            style={input}
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value)}
            placeholder="Código de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>
        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.65 : 1 }}>
          {busy ? "Validando..." : "Validar e continuar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOtpMode(false);
            setOtpCode("");
            setStatus("");
          }}
          style={secondaryBtn}
        >
          Voltar
        </button>
      </form>
    );
  }

  function renderLoginForm() {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          doLogin();
        }}
        style={{ display: "grid", gap: 14, marginTop: 22 }}
      >
        <div>
          <label style={label}>E-mail</label>
          <input
            style={input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@empresa.com"
          />
        </div>

        <PasswordField
          labelText="Senha"
          placeholder="Sua senha"
          value={password}
          show={showLoginPassword}
          onToggle={() => setShowLoginPassword((prev) => !prev)}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />

        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.65 : 1 }}>
          {busy ? "Entrando..." : "Entrar e continuar"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <button type="button" style={linkBtn} onClick={() => setAuthMode("forgot")}>
            Esqueci minha senha
          </button>
          <button type="button" style={linkBtn} onClick={() => setAuthMode("register")}>
            Criar conta
          </button>
        </div>

        {showAdminShortcut ? (
          <button type="button" style={adminChip} onClick={goToAdminDirect}>
            Ir para Admin
          </button>
        ) : null}
      </form>
    );
  }

  function renderRegisterForm() {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          doRegister();
        }}
        style={{ display: "grid", gap: 14, marginTop: 22 }}
      >
        <div>
          <label style={label}>Nome completo</label>
          <input
            style={input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
          />
        </div>

        <div>
          <label style={label}>E-mail</label>
          <input
            style={input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@empresa.com"
          />
        </div>

        <PasswordField
          labelText="Senha"
          placeholder="Crie uma senha"
          value={password}
          show={showPassword}
          onToggle={() => setShowPassword((prev) => !prev)}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />

        <PasswordField
          labelText="Confirmar senha"
          placeholder="Repita a senha"
          value={passwordConfirm}
          show={showPasswordConfirm}
          onToggle={() => setShowPasswordConfirm((prev) => !prev)}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          autoComplete="new-password"
        />

        <div>
          <label style={label}>Código promocional, convite ou acesso interno</label>
          <input
            style={input}
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="Opcional"
            autoComplete="off"
          />
          {hasServerValidatedInvite ? (
            <div style={{ ...muted, marginTop: 8, color: palette.goldSoft, fontWeight: 800 }}>
              O código será validado pelo backend ao criar a conta.
            </div>
          ) : null}
        </div>

        <div>
          <label style={label}>Tipo de acesso</label>
          {hasServerValidatedInvite ? (
            <div
              style={{
                ...input,
                display: "flex",
                alignItems: "center",
                minHeight: 46,
                color: "#0f172a",
                background: "rgba(247,200,98,0.12)",
                borderColor: "rgba(247,200,98,0.55)",
                fontWeight: 800,
              }}
            >
              Acesso por convite
            </div>
          ) : (
            <select
              style={input}
              value={selectedPlan}
              onChange={(event) => setSelectedPlan(event.target.value)}
            >
              <option value="free_trial">Diagnóstico inicial</option>
              <option value="founder_access">Founder Access</option>
              <option value="pro_access">Pro Access</option>
              <option value="team_access">Team Access</option>
            </select>
          )}
        </div>

        <label style={{ ...muted, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>Aceito os termos de uso, política de privacidade e tratamento seguro dos dados pela PatroAI.</span>
        </label>

        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.65 : 1 }}>
          {busy ? "Preparando acesso..." : "Criar conta e continuar"}
        </button>

        <button type="button" style={linkBtn} onClick={() => setAuthMode("login")}>
          Já tenho conta. Entrar.
        </button>
      </form>
    );
  }

  function renderForgotForm() {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          doForgotPassword();
        }}
        style={{ display: "grid", gap: 14, marginTop: 22 }}
      >
        <div>
          <label style={label}>E-mail</label>
          <input
            style={input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@empresa.com"
          />
        </div>

        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.65 : 1 }}>
          {busy ? "Enviando..." : "Enviar instruções"}
        </button>

        <button type="button" style={secondaryBtn} onClick={() => setAuthMode("login")}>
          Voltar para login
        </button>
      </form>
    );
  }

  function renderResetForm() {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          doResetPassword();
        }}
        style={{ display: "grid", gap: 14, marginTop: 22 }}
      >
        <PasswordField
          labelText="Nova senha"
          placeholder="Nova senha"
          value={password}
          show={showResetPassword}
          onToggle={() => setShowResetPassword((prev) => !prev)}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />

        <PasswordField
          labelText="Confirmar nova senha"
          placeholder="Repita a nova senha"
          value={passwordConfirm}
          show={showResetPasswordConfirm}
          onToggle={() => setShowResetPasswordConfirm((prev) => !prev)}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          autoComplete="new-password"
        />

        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.65 : 1 }}>
          {busy ? "Atualizando..." : "Atualizar senha"}
        </button>

        <button type="button" style={secondaryBtn} onClick={() => setAuthMode("login")}>
          Voltar para login
        </button>
      </form>
    );
  }

  function renderActiveForm() {
    if (otpMode) return renderOtpForm();
    if (mode === "forgot") return renderForgotForm();
    if (mode === "reset") return renderResetForm();
    if (mode === "register") return renderRegisterForm();
    return renderLoginForm();
  }

  return (
    <div style={shell}>
      <style>
        {`
          @media (max-width: 920px) {
            .auth-premium-grid {
              grid-template-columns: 1fr !important;
            }
            .auth-premium-side {
              order: 2;
            }
            .auth-premium-card {
              order: 1;
            }
          }

          input::placeholder {
            color: rgba(248,250,252,0.36);
          }

          select option {
            color: #0f172a;
            background: #ffffff;
          }
        `}
      </style>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.08,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="auth-premium-grid" style={pageGrid}>
        <div className="auth-premium-side" style={sidePanel}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: -120,
              top: -120,
              width: 300,
              height: 300,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at center, rgba(247,200,98,0.24), transparent 66%)",
              filter: "blur(8px)",
            }}
          />

          <div style={{ position: "relative" }}>
            <div style={sideChip}>
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "radial-gradient(circle at center, rgba(247,200,98,1), rgba(247,200,98,0.55))",
                  boxShadow: "0 0 12px rgba(247,200,98,0.35)",
                  flex: "0 0 auto",
                }}
              />
              {presentation.badge}
            </div>

            <div
              style={{
                marginTop: 26,
                display: "grid",
                gap: 10,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: palette.faint,
                  fontWeight: 950,
                }}
              >
                Patroai Console
              </div>
              <div style={{ fontSize: 30, lineHeight: 1.04, fontWeight: 950, maxWidth: 420 }}>
                {presentation.panelTitle}
              </div>
            </div>

            <p style={{ marginTop: 18, color: palette.muted, lineHeight: 1.72 }}>
              {presentation.panelBody}
            </p>

            <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
              {presentation.steps.map((step, index) => (
                <div key={step} style={planPill}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        border: `1px solid ${palette.lineGold}`,
                        background: "rgba(247,200,98,0.08)",
                        color: palette.goldSoft,
                        fontSize: 12,
                        fontWeight: 950,
                      }}
                    >
                      {index + 1}
                    </span>
                    <strong>{step}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 24,
                borderRadius: 24,
                border: `1px solid ${palette.line}`,
                background: "rgba(0,0,0,0.20)",
                padding: 16,
              }}
            >
              <div style={{ color: palette.goldSoft, fontSize: 12, fontWeight: 950, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Continuidade de contexto
              </div>
              <p style={{ margin: "8px 0 0", color: palette.muted, lineHeight: 1.6, fontSize: 13 }}>
                Origem, intenção, retorno pós-login e diagnóstico iniciado são preservados sem criar rotas novas.
              </p>
            </div>
          </div>
        </div>

        <div className="auth-premium-card" style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: palette.goldSoft,
                  fontWeight: 950,
                }}
              >
                Acesso Patroai
              </div>
              <h1 style={{ margin: "8px 0 0", fontSize: 38, lineHeight: 1, color: palette.ink }}>
                {title}
              </h1>
            </div>

            {showAdminShortcut ? (
              <button type="button" style={adminChip} onClick={goToAdminDirect}>
                Admin
              </button>
            ) : null}
          </div>

          <p style={{ ...muted, marginTop: 14 }}>{subtitle}</p>

          {journey?.fromAvatar || journey?.fromDemo || journey?.fromPatroai || journey?.fromOrkio ? (
            <div
              style={{
                marginTop: 16,
                borderRadius: 22,
                border: `1px solid ${palette.lineGold}`,
                background: "rgba(247,200,98,0.07)",
                padding: 14,
                color: "rgba(248,250,252,0.76)",
                fontSize: 13,
                lineHeight: 1.58,
              }}
            >
              <strong style={{ color: palette.goldSoft }}>Origem reconhecida:</strong>{" "}
              {journey.fromAvatar
                ? "avatar Patroai / pré-chat"
                : journey.fromDemo
                ? "demonstração Patroai"
                : journey.fromPatroai
                ? "landing Patroai"
                : "landing Patroai"}
              . Vamos manter essa intenção durante o acesso, com continuidade e cuidado.
            </div>
          ) : null}

          {renderModeTabs()}
          {renderActiveForm()}

          {status ? <div style={statusBox}>{status}</div> : null}

          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap", color: palette.faint, fontSize: 12 }}>
            <span>Privacidade por design</span>
            <span>•</span>
            <span>Continuidade com graça</span>
            <span>•</span>
            <span>Retorno seguro para /app</span>
          </div>
        </div>
      </div>
    </div>
  );
}
