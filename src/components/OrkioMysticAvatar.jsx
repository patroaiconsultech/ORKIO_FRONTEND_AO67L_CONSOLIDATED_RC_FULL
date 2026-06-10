import React, { useState } from "react";
import OrkioVideoMedia from "./OrkioVideoMedia.jsx";

/**
 * AO-04K — OrkioMysticAvatar corretivo
 *
 * Simplificado: syncKey removido (desnecessário com a nova abordagem
 * de opacidade contínua nOrkioVideoMedia).
 *
 * O vídeo speaking roda continuamente em background.
 * Quando speaking=true, a opacidade do idle vai para 0 instantaneamente,
 * revelando o speaking por baixo.
 *
 * Mantém compatibilidade total com a API existente.
 * syncKey ainda é aceito como prop mas ignorado internamente.
 */

const AVATAR_SRC = "";

export default function OrkioMysticAvatar({
  size = 92,
  variant = "orb",
  speaking = false,
  syncKey = 0, // aceito para compatibilidade, não usado
  label = "Orkio — presença místico-tecnológica",
  onClick,
  useVideo = true,
}) {
  const [failed, setFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const isCard = variant === "card" || variant === "portrait";
  const dimension = typeof size === "number" ? `${size}px` : size;
  const Wrapper = onClick ? "button" : "div";

  const shouldUseVideo = useVideo && !videoFailed;

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={label}
      className={`orkio-mystic-avatar ${isCard ? "is-card" : "is-orb"} ${speaking ? "is-speaking" : ""}`}
      style={{
        "--orkio-avatar-size": dimension,
      }}
    >
      <style>{`
        .orkio-mystic-avatar {
          position: relative;
          width: var(--orkio-avatar-size);
          height: var(--orkio-avatar-size);
          display: grid;
          place-items: center;
          border: 0;
          padding: 0;
          color: inherit;
          background: transparent;
          cursor: ${onClick ? "pointer" : "default"};
          overflow: hidden;
          border-radius: 999px;
          transition: transform 180ms ease;
        }

        .orkio-mystic-avatar.is-card {
          border-radius: 30px;
          width: var(--orkio-avatar-size);
          height: auto;
          aspect-ratio: 0.75;
        }

        .orkio-mystic-avatar:hover {
          transform: ${onClick ? "scale(1.02)" : "none"};
        }

        .orkio-mystic-avatar__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
        }

        .orkio-mystic-avatar__placeholder {
          width: 100%;
          height: 100%;
          border-radius: inherit;
          background: radial-gradient(circle at 42% 24%, rgba(245,196,81,0.34), transparent 30%),
                      radial-gradient(circle at 50% 60%, rgba(129,140,248,0.18), transparent 44%),
                      linear-gradient(180deg, rgba(11,18,32,0.96), rgba(3,7,18,1));
          display: grid;
          place-items: center;
          color: #f8dfa3;
          font-size: 22px;
          font-weight: 950;
        }

        .orkio-mystic-avatar__voiceRing {
          position: absolute;
          inset: -6px;
          border-radius: inherit;
          border: 2px solid rgba(247,200,98,0.38);
          opacity: 0;
          transition: opacity 200ms ease;
          pointer-events: none;
        }

        .orkio-mystic-avatar.is-speaking .orkio-mystic-avatar__voiceRing {
          opacity: 1;
          animation: orkioMysticPulse 1.2s ease-in-out infinite;
        }

        @keyframes orkioMysticPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.06); opacity: 1; }
        }
      `}</style>

      {shouldUseVideo ? (
        <OrkioVideoMedia
          speaking={speaking}
          borderRadius={isCard ? "30px" : "999px"}
          onVideoError={() => setVideoFailed(true)}
        />
      ) : AVATAR_SRC && !failed ? (
        <img
          className="orkio-mystic-avatar__img"
          src={AVATAR_SRC}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="orkio-mystic-avatar__placeholder">O</div>
      )}

      <div className="orkio-mystic-avatar__voiceRing" aria-hidden="true" />
    </Wrapper>
  );
}

