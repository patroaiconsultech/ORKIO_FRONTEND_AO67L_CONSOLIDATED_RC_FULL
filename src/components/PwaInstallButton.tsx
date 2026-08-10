import React, { useState } from "react";
import { usePwaInstall } from "../hooks/usePwaInstall";

type Props = {
  compact?: boolean;
  featured?: boolean;
};

export default function PwaInstallButton({
  compact = false,
  featured = false,
}: Props) {
  const {
    installed,
    instructionsOpen,
    platform,
    requestInstall,
    closeInstructions,
  } = usePwaInstall();
  const [status, setStatus] = useState("");

  async function install() {
    const outcome = await requestInstall();
    if (outcome === "accepted") {
      setStatus("Instalação iniciada.");
    } else if (outcome === "dismissed") {
      setStatus("Instalação cancelada.");
    } else if (outcome === "already-installed") {
      setStatus("A ORKIO já está instalada.");
    }
  }

  if (installed) {
    return compact ? (
      <span className="installed-badge">Aplicativo instalado</span>
    ) : null;
  }

  return (
    <>
      <button
        type="button"
        className={[
          compact ? "install-button install-button--compact" : "install-button",
          featured ? "install-button--featured" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={install}
      >
        <span aria-hidden="true">↓</span>
        {platform === "ios" ? "Instalar no iPhone/iPad" : "Instalar aplicativo"}
      </button>
      {status ? (
        <span className="sr-only" role="status">
          {status}
        </span>
      ) : null}
      {instructionsOpen ? (
        <div className="modal" role="presentation">
          <section
            className="modal-card install-guide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-guide-title"
          >
            <span className="install-guide__icon" aria-hidden="true">
              ◉
            </span>
            <h2 id="install-guide-title">
              {platform === "ios"
                ? "Instalar no iPhone ou iPad"
                : "Instalar a ORKIO"}
            </h2>
            {platform === "ios" ? (
              <ol>
                <li>Abra esta página no Safari.</li>
                <li>
                  Toque em <strong>Compartilhar</strong>.
                </li>
                <li>
                  Selecione <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>Confirme em “Adicionar”.</li>
              </ol>
            ) : (
              <p>
                Abra o menu do navegador e escolha “Instalar aplicativo” ou
                “Adicionar à tela inicial”. A promoção automática depende do
                suporte e dos critérios do navegador.
              </p>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={closeInstructions}
            >
              Entendi
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
