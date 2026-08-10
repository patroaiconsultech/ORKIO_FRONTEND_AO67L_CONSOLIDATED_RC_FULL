import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { completeLogin, OidcError } from "../auth/oidc";

type CallbackState = "working" | "failed";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("working");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let active = true;
    completeLogin()
      .then((returnTo) => {
        if (active) navigate(returnTo, { replace: true });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const code = error instanceof OidcError ? error.code : "OIDC_CALLBACK_FAILED";
        setDetail(`Não foi possível concluir a autenticação (${code}).`);
        setState("failed");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main id="main-content" className="invite-shell">
      <h1>Autenticação ORKIO</h1>
      {state === "working" ? (
        <p role="status">Validando sua identidade.</p>
      ) : (
        <p role="alert">{detail}</p>
      )}
      <Link className="ghost-link" to="/">
        Voltar ao início
      </Link>
    </main>
  );
}
