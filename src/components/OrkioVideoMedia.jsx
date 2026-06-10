import React, { useEffect, useRef, useState } from "react";

/**
 * AO-UX08H — Orkio Stable Mindpulse Video
 *
 * Princípio UX:
 * - o vídeo masculino é a presença visual principal;
 * - não há lip-sync falso;
 * - não há poster/fallback antigo por cima do vídeo;
 * - no mobile, o vídeo não deve cortar o rosto;
 * - se autoplay falhar, tentamos novamente em interação do usuário.
 */

const VIDEO_SRC = "/patroai-assets/orkio-mindpulse-male.mp4?v=ao-ux08h";

function normalizeSize(size) {
  if (typeof size === "number") return `${size}px`;
  return size || "100%";
}

export default function OrkioVideoMedia({
  speaking = false,
  syncKey = 0, // mantido por compatibilidade
  className = "",
  style = {},
  size = "100%",
  borderRadius = "28px",
  onError,
  onVideoError,
  onReady,
}) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    let cancelled = false;

    const markReady = () => {
      if (cancelled) return;
      setReady(true);
      setLoadError(false);
      if (typeof onReady === "function") onReady();
    };

    const tryPlay = async () => {
      try {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        const promise = video.play();
        if (promise && typeof promise.then === "function") await promise;
      } catch {
        // Não derruba para fallback visual. Em alguns browsers o play só libera após interação.
      }
    };

    const handleInteraction = () => {
      void tryPlay();
    };

    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("playing", markReady);

    window.addEventListener("pointerdown", handleInteraction, { passive: true });
    window.addEventListener("touchstart", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction);

    const timer = window.setTimeout(() => {
      void tryPlay();
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("playing", markReady);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [syncKey, onReady]);

  function handleVideoError() {
    setLoadError(true);
    if (typeof onVideoError === "function") onVideoError();
    if (typeof onError === "function") onError();
  }

  const containerStyle = {
    position: "relative",
    width: normalizeSize(size),
    height: "100%",
    minHeight: "260px",
    borderRadius,
    overflow: "hidden",
    background:
      "radial-gradient(circle at 50% 18%, rgba(247,200,98,0.14), transparent 34%), linear-gradient(180deg, rgba(4,8,15,0.98), rgba(2,6,11,1))",
    boxShadow: speaking
      ? "0 0 80px rgba(245,185,56,0.24), inset 0 0 80px rgba(245,185,56,0.08)"
      : "0 0 44px rgba(0,0,0,0.36)",
    transition: "box-shadow 420ms ease, filter 420ms ease",
    ...style,
  };

  const mediaStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "78% center",
    transform: "scale(1.01)",
    borderRadius,
    pointerEvents: "none",
    opacity: loadError ? 0 : 1,
    filter: speaking ? "saturate(1.08) contrast(1.04)" : "saturate(0.98) contrast(1)",
    transition: "filter 420ms ease, opacity 420ms ease, transform 420ms ease",
  };

  return (
    <div
      className={`orkio-mindpulse-media ${speaking ? "is-speaking" : ""} ${className}`}
      style={containerStyle}
      aria-label="Orkio — presença digital"
      data-orkio-mindpulse="true"
    >
      <style>{mindpulseCss}</style>

      <video
        key={VIDEO_SRC}
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onError={handleVideoError}
        className="orkio-mindpulse-video"
        style={mediaStyle}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {!ready && !loadError && <div className="orkio-mindpulse-loading" aria-hidden="true" />}
      {loadError && <div className="orkio-mindpulse-soft-fallback" aria-hidden="true" />}

      <div className="orkio-mindpulse-vignette" />
      {speaking && <MindpulseOverlay />}
    </div>
  );
}

function MindpulseOverlay() {
  return (
    <>
      <div className="orkio-mindpulse-aura" />
      <div className="orkio-mindpulse-ring ring-one" />
      <div className="orkio-mindpulse-ring ring-two" />
      <div className="orkio-mindpulse-core" />
      <div className="orkio-mindpulse-eq" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="orkio-mindpulse-caption">transmitindo presença</div>
    </>
  );
}

const mindpulseCss = `




/* AO-UX11D_FACE_REFRAME — foco facial ajustado para o asset horizontal atual */
.orkio-mindpulse-video {
  object-fit: cover !important;
  object-position: 78% center !important;
  transform: scale(1.01) !important;
}

@media (max-width: 768px) {
  .orkio-mindpulse-video {
    object-position: 78% center !important;
    transform: scale(1.00) !important;
  }
}

/* AO-UX11C_FACE_CENTER_CROP — foco facial com presença cheia */
.orkio-mindpulse-video {
  object-fit: cover !important;
  object-position: 78% center !important;
  transform: scale(1.01) !important;
}

@media (max-width: 768px) {
  .orkio-mindpulse-video {
    object-position: 78% center !important;
    transform: scale(1.01) !important;
  }
}

/* AO-UX11A_FRAME_FIX — enquadramento perceptivo do vídeOrkio */
@media (max-width: 768px) {
  .orkio-mindpulse-video {
    object-position: 78% center !important;
    transform: scale(1.01) !important;
  }
}

@media (min-width: 769px) {
  .orkio-mindpulse-video {
    object-position: 78% center !important;
    transform: scale(1.01) !important;
  }
}


.orkio-mindpulse-video {
  object-fit: cover !important;
  object-position: 78% center !important;
  transform: scale(1.01);
}

@media (max-width: 768px) {
  .orkio-mindpulse-video {
    transform: scale(1.01);
  }
}

@media (min-width: 1280px) {
  .orkio-mindpulse-video {
    transform: scale(1.01);
  }
}

.orkio-mindpulse-loading,
.orkio-mindpulse-soft-fallback {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 36%, rgba(247,200,98,0.16), transparent 24%),
    linear-gradient(180deg, rgba(4,8,15,0.98), rgba(2,6,11,1));
}

.orkio-mindpulse-loading::after,
.orkio-mindpulse-soft-fallback::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 84px;
  height: 84px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 1px solid rgba(247, 200, 98, 0.22);
  box-shadow: 0 0 38px rgba(247, 200, 98, 0.14), inset 0 0 24px rgba(247, 200, 98, 0.08);
  animation: orkioMindAura 2.6s ease-in-out infinite;
}

.orkio-mindpulse-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 22%, transparent 0%, transparent 42%, rgba(0,0,0,0.26) 100%),
    linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.26));
}

.orkio-mindpulse-aura {
  position: absolute;
  inset: 8%;
  border-radius: 999px;
  pointer-events: none;
  border: 1px solid rgba(247, 200, 98, 0.22);
  box-shadow:
    0 0 38px rgba(247, 200, 98, 0.18),
    inset 0 0 42px rgba(247, 200, 98, 0.08);
  animation: orkioMindAura 2.6s ease-in-out infinite;
}

.orkio-mindpulse-ring {
  position: absolute;
  left: 50%;
  top: 44%;
  width: 42%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 1px solid rgba(247, 200, 98, 0.24);
  pointer-events: none;
  opacity: 0;
}

.orkio-mindpulse-ring.ring-one {
  animation: orkioMindRing 2.2s ease-out infinite;
}

.orkio-mindpulse-ring.ring-two {
  animation: orkioMindRing 2.2s ease-out infinite;
  animation-delay: 1.1s;
}

.orkio-mindpulse-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 9%;
  min-width: 34px;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255,240,180,0.86), rgba(247,200,98,0.34) 38%, transparent 72%);
  filter: blur(0.4px);
  animation: orkioMindCore 1.4s ease-in-out infinite;
}

.orkio-mindpulse-eq {
  position: absolute;
  left: 50%;
  bottom: 8%;
  transform: translateX(-50%);
  display: flex;
  align-items: end;
  gap: 5px;
  height: 28px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(2, 6, 11, 0.42);
  border: 1px solid rgba(247, 200, 98, 0.18);
  backdrop-filter: blur(10px);
}

.orkio-mindpulse-eq span {
  display: block;
  width: 3px;
  height: 8px;
  border-radius: 999px;
  background: rgba(247, 200, 98, 0.82);
  box-shadow: 0 0 10px rgba(247, 200, 98, 0.45);
  animation: orkioMindEq 0.82s ease-in-out infinite;
}

.orkio-mindpulse-eq span:nth-child(2) { animation-delay: 0.08s; }
.orkio-mindpulse-eq span:nth-child(3) { animation-delay: 0.16s; }
.orkio-mindpulse-eq span:nth-child(4) { animation-delay: 0.24s; }
.orkio-mindpulse-eq span:nth-child(5) { animation-delay: 0.32s; }

.orkio-mindpulse-caption {
  position: absolute;
  right: 16px;
  bottom: 14px;
  max-width: calc(100% - 32px);
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 235, 180, 0.84);
  background: rgba(2, 6, 11, 0.42);
  border: 1px solid rgba(247, 200, 98, 0.16);
  backdrop-filter: blur(10px);
}

@keyframes orkioMindAura {
  0%, 100% {
    opacity: 0.48;
    transform: scale(0.985);
  }
  50% {
    opacity: 1;
    transform: scale(1.018);
  }
}

@keyframes orkioMindRing {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.68);
  }
  18% {
    opacity: 0.52;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.72);
  }
}

@keyframes orkioMindCore {
  0%, 100% {
    opacity: 0.48;
    transform: translate(-50%, -50%) scale(0.92);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.18);
  }
}

@keyframes orkioMindEq {
  0%, 100% { height: 7px; opacity: 0.52; }
  50% { height: 24px; opacity: 1; }
}
`;
