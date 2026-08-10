import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, acceptInvite, getToken, isApiBaseConfigured } from "../api";
import { beginLogin, isOidcConfigured } from "../auth/oidc";

type State = "idle" | "working" | "accepted" | "failed";

/**
 * Destino dos links de convite. Antes desta rota, um convite gerado caía
 * no catch-all e era redirecionado para a landing sem explicação.
 */
export default function InviteAccept() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("idle");
  const [detail, setDetail] = useState("");

  const configured = isApiBaseConfigured();
  const authenticated = Boolean(getToken());
  const authConfigured = isOidcConfigured();

  useEffect(() => {
    if (!configured || !authenticated || !token || state !== "idle") return;
    let active = true;
    setState("working");
    acceptInvite(token)
      .then((result) => {
        if (!active) return;
        setState("accepted");
        navigate(`/app?thread=${encodeURIComponent(result.thread_id)}`, {
          replace: true,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const code = error instanceof ApiError ? error.code : "ERRO";
        const table: Record<string, string> = {
          INVITATION_NOT_FOUND: "Convite inválido ou inexistente.",
          INVITATION_EXPIRED: "Este convite expirou.",
          INVITATION_ALREADY_USED: "Este convite já foi utilizado.",
          INVITATION_EMAIL_MISMATCH:
            "Este convite foi emitido para outro endereço de e-mail.",
          PRINCIPAL_NOT_PROVISIONED:
            "Sua identidade ainda não está provisionada nesta organização.",
        };
        setDetail(table[code] || `Não foi possível aceitar o convite (${code}).`);
        setState("failed");
      });
    return () => {
      active = false;
    };
  }, [authenticated, configured, navigate, state, token]);

  return (
    <main id="main-content" className="invite-shell">
      <h1>Convite para conversa</h1>
      {!configured ? (
        <p role="alert">A URL da API não está configurada nesta implantação.</p>
      ) : !token ? (
        <p role="alert">Link de convite incompleto.</p>
      ) : !authenticated ? (
        <div role="alert">
          <p>
            {authConfigured
              ? "Autentique-se para aceitar este convite. O link permanece válido até a data de expiração."
              : "A autenticação OIDC ainda não está configurada nesta implantação."}
          </p>
          {authConfigured ? (
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                void beginLogin(`/invite/${encodeURIComponent(token)}`)
              }
            >
              Entrar para aceitar
            </button>
          ) : null}
        </div>
      ) : state === "working" ? (
        <p role="status">Validando o convite.</p>
      ) : state === "failed" ? (
        <p role="alert">{detail}</p>
      ) : (
        <p role="status">Convite aceito. Redirecionando.</p>
      )}
      <Link className="ghost-link" to="/">
        Voltar ao início
      </Link>
    </main>
  );
}
