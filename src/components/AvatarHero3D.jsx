import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createOrkioSpeechMotion } from "../lib/orkioSpeechMotion.js";
import {
  cleanupAudioUrl,
  requestOrkioTtsBlob,
  speakWithOrkioBrowserVoice,
} from "../lib/orkioTts.js";
import OrkioVideoMedia from "./OrkioVideoMedia.jsx";

/**
 * AO-04K — Avatar com sincronização corretiva definitiva
 *
 * PRINCÍPIO: O ÁUDIO é a ÚNICA fonte de verdade do estado speaking.
 *
 * FLUXO CORRIGIDO:
 * 1. Clique → voiceLoading=true, speaking=false (vídeo permanece idle)
 * 2. TTS blob carrega → Audio preparado
 * 3. audio.play() chamado → aguarda evento "playing" do browser
 * 4. Evento "playing" dispara → speaking=true (vídeo troca INSTANTANEAMENTE)
 * 5. audio.onended → speaking=false (vídeo volta para idle INSTANTANEAMENTE)
 *
 * DIFERENÇA DO AO-04J:
 * - Removido qualquer seek/offset no vídeo
 * - Vídeo speaking roda continuamente em background (OrkioVideoMedia cuida)
 * - Troca visual é por opacidade instantânea (0ms)
 * - Não há mais SPEAKING_START_OFFSET_SECONDS
 * - speakingSyncKey removido (desnecessário com opacidade contínua)
 */

const AVATAR_SRC = "";

export default function AvatarHero3D({
  speech = "",
  onText,
  onDiagnosis,
  tenant = "public",
  token = "",
  locale = "pt-BR",
  copy = {},
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [voiceSlow, setVoiceSlow] = useState(false);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  const audioRef = useRef(null);
  const heroRef = useRef(null);
  const motionRef = useRef(null);
  const lockRef = useRef(false); // impede duplo-clique e garante que onended é respeitado
  const slowTimerRef = useRef(null);

  const effectiveLocale = String(locale || "pt-BR").toLowerCase().startsWith("en")
    ? "en-US"
    : "pt-BR";
  const isEnglish = effectiveLocale === "en-US";

  const avatarCopy = useMemo(() => {
    const defaults = isEnglish
      ? {
          defaultSpeech:
            "Hello. I am Orkio. I can help you turn scattered questions into diagnosis, operational clarity and next steps.",
          eyebrow: "Meet Orkio",
          titlePrefix: "Hello, I am",
          body:
            "I can help you turn scattered questions into diagnosis, operational clarity and next steps for your company's evolution.",
          preparing: "Preparing voice...",
          speaking: "Orkio is speaking...",
          speak: "Talk tOrkio",
          type: "Type a question",
          diagnosis: "Start business diagnosis",
          loadingStatus: "Preparing Orkio's voice.",
          slowStatus: "Voice is taking a little longer. You can continue by text.",
          fallbackStatus: "Using the safest available voice channel.",
          errorStatus: "Voice is temporarily unavailable. Continue by text.",
          speakingStatus: "Answering by voice.",
          idleStatus: "I answer by voice and by text.",
          continueText: "Continue by text",
        }
      : {
          defaultSpeech:
            "Olá. Eu sou Orkio. Posso ajudar você a transformar perguntas soltas em diagnóstico, clareza operacional e próximos passos.",
          eyebrow: "Conheça Orkio",
          titlePrefix: "Olá, eu sou",
          body:
            "Posso te ajudar a transformar perguntas soltas em diagnóstico, clareza operacional e próximos passos para evolução da sua empresa.",
          preparing: "Preparando voz...",
          speaking: "Orkio falando...",
          speak: "Falar com Orkio",
          type: "Digitar pergunta",
          diagnosis: "Iniciar diagnóstico empresarial",
          loadingStatus: "Preparando a voz de Orkio.",
          slowStatus: "A voz está levando um pouco mais. Você pode continuar por texto.",
          fallbackStatus: "Usando o canal de voz mais seguro disponível.",
          errorStatus: "A voz está temporariamente indisponível. Continue por texto.",
          speakingStatus: "Respondendo por voz.",
          idleStatus: "Respondo por voz e por texto.",
          continueText: "Continuar por texto",
        };

    return { ...defaults, ...(copy && typeof copy === "object" ? copy : {}) };
  }, [copy, isEnglish]);


  const effectiveSpeech = useMemo(() => {
    return typeof speech === "string" && speech.trim()
      ? speech.trim()
      : avatarCopy.defaultSpeech;
  }, [avatarCopy.defaultSpeech, speech]);

  const safeCallback = useCallback((fn) => {
    if (typeof fn === "function") fn();
  }, []);

  const getMotionController = useCallback(() => {
    if (!motionRef.current) {
      motionRef.current = createOrkioSpeechMotion(heroRef, {
        intensity: 1,
        smoothing: 0.76,
      });
    }
    return motionRef.current;
  }, []);

  const clearVoiceSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }, []);

  const startVoiceSlowTimer = useCallback(() => {
    clearVoiceSlowTimer();
    slowTimerRef.current = window.setTimeout(() => {
      if (lockRef.current) setVoiceSlow(true);
    }, 2800);
  }, [clearVoiceSlowTimer]);

  useEffect(() => {
    return () => {
      clearVoiceSlowTimer();
      motionRef.current?.dispose?.();
      try {
        audioRef.current?.pause?.();
      } catch {}
      try {
        cleanupAudioUrl(audioRef.current);
      } catch {}
    };
  }, [clearVoiceSlowTimer]);

  // Encerrar fala de forma segura — ÚNICO ponto que volta speaking para false
  const endSpeaking = useCallback(() => {
    lockRef.current = false;
    clearVoiceSlowTimer();
    setVoiceLoading(false);
    setVoiceSlow(false);
    setVoiceFallback(false);
    getMotionController().stop();
    setSpeaking(false);
  }, [clearVoiceSlowTimer, getMotionController]);

  function fallbackBrowserSpeech() {
    return speakWithOrkioBrowserVoice(effectiveSpeech, {
      locale: effectiveLocale,
      onStart: () => {
        // Browser speech disparou — AGORA sim ativamos o visual
        clearVoiceSlowTimer();
        setVoiceLoading(false);
        setVoiceSlow(false);
        setVoiceFallback(true);
        setVoiceError(false);
        setSpeaking(true);
        getMotionController().startSynthetic({ strength: 0.66 });
      },
      onEnd: () => {
        endSpeaking();
      },
      onError: () => {
        setVoiceError(true);
        endSpeaking();
      },
    });
  }

  const handleSpeak = useCallback(async () => {
    // Guard: não permite novo clique enquanto está carregando ou falando
    if (speaking || voiceLoading || lockRef.current) return;

    // FASE 1: Carregamento — vídeo permanece em IDLE
    lockRef.current = true;
    setVoiceLoading(true);
    setVoiceSlow(false);
    setVoiceFallback(false);
    setVoiceError(false);
    startVoiceSlowTimer();
    // speaking permanece FALSE aqui — o vídeo NÃO muda

    try {
      // Limpar áudio anterior se existir
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
        cleanupAudioUrl(audioRef.current);
        getMotionController().stop();
        audioRef.current = null;
      }

      // FASE 2: Buscar TTS blob
      const blob = await requestOrkioTtsBlob({
        text: effectiveSpeech,
        token,
        tenant,
        locale: effectiveLocale,
      });

      // Verificar se não foi cancelado durante o fetch
      if (!lockRef.current) return;

      // FASE 3: Preparar Audio element
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.dataset.blobUrl = url;
      audio.preload = "auto";
      audioRef.current = audio;

      // Flag para garantir que o visual só é ativado uma vez
      let visualActivated = false;

      // EVENTO CRÍTICO: "playing" — o áudio REALMENTE começou a ser audível
      const activateVisual = () => {
        if (visualActivated || !lockRef.current) return;
        visualActivated = true;
        clearVoiceSlowTimer();
        setVoiceLoading(false);
        setVoiceSlow(false);
        setVoiceError(false);
        setSpeaking(true); // ← ÚNICO momento que speaking vira true
        getMotionController().startSynthetic({ strength: 0.66 });
      };

      audio.addEventListener("playing", activateVisual, { once: true });

      // EVENTO FINAL: "ended" — o áudio terminou
      audio.onended = () => {
        cleanupAudioUrl(audio);
        endSpeaking(); // ← ÚNICO momento que speaking volta para false
      };

      audio.onerror = () => {
        cleanupAudioUrl(audio);
        setVoiceError(true);
        endSpeaking();
      };

      // FASE 4: Iniciar playback
      // O speaking ainda é FALSE aqui. O vídeo idle ainda está visível.
      // Somente quando o browser confirmar "playing" é que o visual muda.
      await audio.play();

      // Fallback: alguns browsers resolvem play() sem disparar "playing"
      if (!visualActivated && !audio.paused && lockRef.current) {
        activateVisual();
      }

    } catch (err) {
      console.warn("ORKIO_AVATAR_TTS_FAILED", err?.message || err);
      clearVoiceSlowTimer();
      setVoiceLoading(false);
      setVoiceSlow(false);
      setVoiceFallback(true);
      const browserFallbackOk = fallbackBrowserSpeech();
      if (!browserFallbackOk) {
        setVoiceFallback(false);
        setVoiceError(true);
        endSpeaking();
        safeCallback(onText);
      }
    }
  }, [effectiveSpeech, endSpeaking, getMotionController, onText, safeCallback, clearVoiceSlowTimer, speaking, startVoiceSlowTimer, tenant, token, voiceLoading]);

  return (
    <section
      ref={heroRef}
      className={`orkio-avatar-hero ${speaking ? "is-speaking" : ""} ${voiceLoading ? "is-loading" : ""} ${voiceError ? "is-voice-error" : ""}`}
      aria-label="Assistente Orkio"
      data-orkio-voice-state={voiceError ? "voice-error" : voiceLoading ? "voice-loading" : speaking ? "speaking" : "idle"}
    >
      <style>{`
        .orkio-avatar-hero {
          position: relative;
          min-height: 520px;
          border: 1px solid rgba(247,200,98,0.28);
          border-radius: 34px;
          overflow: hidden;
          background:
            radial-gradient(620px 380px at 16% 50%, rgba(247,200,98,0.14), transparent 60%),
            radial-gradient(520px 340px at 96% 10%, rgba(247,200,98,0.08), transparent 54%),
            linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.028)),
            rgba(2,6,11,0.82);
          box-shadow: 0 32px 90px rgba(0,0,0,0.42);
          isolation: isolate;
          --orkio-voice-level: 0;
          --orkio-mouth-open: 0;
          --orkio-jaw-drop: 0;
          --orkio-mouth-round: 0;
          --orkio-mouth-wide: 0;
          --orkio-head-tilt: 0;
          --orkio-breath: 0;
          --orkio-voice-glow: 0;
        }

        .orkio-avatar-hero,
        .orkio-avatar-hero * {
          box-sizing: border-box;
        }

        .orkio-avatar-hero::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 34%;
          pointer-events: none;
          background: linear-gradient(180deg, transparent, rgba(0,0,0,0.24));
          z-index: 0;
        }

        .orkio-avatar-hero__grid {
          position: relative;
          z-index: 1;
          min-height: 520px;
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          align-items: stretch;
        }

        .orkio-avatar-hero__copy {
          padding: 34px 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
          min-width: 0;
        }

        .orkio-avatar-hero__eyebrow {
          color: #f7c862;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .orkio-avatar-hero__copy h2 {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(34px, 4.2vw, 58px);
          line-height: 0.98;
          letter-spacing: -0.06em;
          overflow-wrap: anywhere;
        }

        .orkio-avatar-hero__copy h2 span {
          display: block;
          background: linear-gradient(135deg, #fff3ca, #f7c862 48%, #a76f19);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 38px rgba(247,200,98,0.18);
        }

        .orkio-avatar-hero__copy p {
          margin: 0;
          max-width: 390px;
          color: rgba(248,250,252,0.74);
          font-size: 15px;
          line-height: 1.68;
        }

        .orkio-avatar-hero__actions {
          display: grid;
          gap: 10px;
          max-width: 330px;
          margin-top: 4px;
        }

        .orkio-avatar-hero__action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-height: 48px;
          padding: 12px 15px;
          border-radius: 15px;
          border: 1px solid rgba(247,200,98,0.30);
          background: rgba(0,0,0,0.30);
          color: rgba(248,250,252,0.88);
          font-weight: 850;
          cursor: pointer;
          transition: transform 160ms ease, border-color 180ms ease, background 180ms ease;
        }

        .orkio-avatar-hero__action:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(247,200,98,0.58);
          background: rgba(247,200,98,0.10);
        }

        .orkio-avatar-hero__action:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .orkio-avatar-hero__action b {
          color: #f7c862;
          font-size: 18px;
        }

        .orkio-avatar-hero__status {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
          color: rgba(255,226,157,0.78);
          font-size: 12px;
          font-weight: 780;
        }

        .orkio-avatar-hero__pulse {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 1px solid rgba(247,200,98,0.48);
          background: radial-gradient(circle, #f7c862 0 20%, transparent 25%);
          box-shadow: 0 0 0 rgba(247,200,98,0);
        }

        .orkio-avatar-hero.is-speaking .orkio-avatar-hero__pulse,
        .orkio-avatar-hero.is-loading .orkio-avatar-hero__pulse {
          animation: orkioAvatarPulse 1.1s ease-in-out infinite;
        }

        .orkio-avatar-hero.is-voice-error .orkio-avatar-hero__pulse {
          border-color: rgba(251,146,60,0.58);
          background: radial-gradient(circle, #fb923c 0 20%, transparent 25%);
        }

        .orkio-avatar-hero__fallbackAction {
          appearance: none;
          border: 1px solid rgba(247,200,98,0.22);
          border-radius: 999px;
          background: rgba(247,200,98,0.08);
          color: rgba(255,226,157,0.92);
          font-size: 12px;
          font-weight: 850;
          padding: 7px 11px;
          cursor: pointer;
          transition: background 140ms ease, border-color 140ms ease;
        }

        .orkio-avatar-hero__fallbackAction:hover {
          background: rgba(247,200,98,0.15);
          border-color: rgba(247,200,98,0.42);
        }

        .orkio-avatar-hero__visual {
          position: relative;
          min-height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 26px 24px 14px;
          overflow: hidden;
        }

        .orkio-avatar-hero__visual::before {
          content: "";
          position: absolute;
          inset: 28px 28px 28px 12px;
          border-radius: 30px;
          background:
            radial-gradient(320px 220px at 50% 12%, rgba(247,200,98,0.10), transparent 58%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(247,200,98,0.12);
          opacity: 0.6;
          pointer-events: none;
        }

        .orkio-avatar-hero__portraitShell {
          position: relative;
          z-index: 2;
          width: min(360px, 90%);
          aspect-ratio: 0.75;
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(247,200,98,0.26);
          background:
            radial-gradient(circle at 50% 10%, rgba(247,200,98,0.13), transparent 32%),
            linear-gradient(180deg, rgba(7,12,22,0.98), rgba(4,8,15,0.96));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 20px 60px rgba(0,0,0,0.42),
            0 0 42px rgba(247,200,98,0.08);
          transform-origin: 50% 58%;
          transition: box-shadow 180ms ease;
          will-change: transform;
        }

        .orkio-avatar-hero.is-speaking .orkio-avatar-hero__portraitShell {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 20px 60px rgba(0,0,0,0.42),
            0 0 58px rgba(247,200,98,0.22);
        }

        .orkio-avatar-hero__voiceAura {
          position: absolute;
          inset: -12%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(247,200,98,0.12), transparent 58%);
          opacity: 0;
          transition: opacity 300ms ease;
          pointer-events: none;
        }

        .orkio-avatar-hero.is-speaking .orkio-avatar-hero__voiceAura {
          opacity: 1;
          animation: orkioAuraBreath 2s ease-in-out infinite;
        }

        @keyframes orkioAvatarPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(247,200,98,0); }
          50% { box-shadow: 0 0 0 8px rgba(247,200,98,0.14); }
        }

        @keyframes orkioAuraBreath {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.06); opacity: 1; }
        }

        @media (max-width: 960px) {
          .orkio-avatar-hero,
          .orkio-avatar-hero__grid,
          .orkio-avatar-hero__visual {
            min-height: auto;
          }

          .orkio-avatar-hero__grid {
            grid-template-columns: 1fr;
          }

          .orkio-avatar-hero__copy {
            padding: 28px 22px 8px;
          }

          .orkio-avatar-hero__visual {
            min-height: 380px;
            padding: 12px 18px 24px;
          }

          .orkio-avatar-hero__visual::before {
            inset: 12px 18px 18px;
          }

          .orkio-avatar-hero__portraitShell {
            width: min(360px, 92%);
          }
        }

        @media (max-width: 560px) {
          .orkio-avatar-hero {
            border-radius: 26px;
          }

          .orkio-avatar-hero__copy h2 {
            font-size: 38px;
          }

          .orkio-avatar-hero__visual {
            min-height: 320px;
          }

          .orkio-avatar-hero__portraitShell {
            width: min(300px, 92%);
            border-radius: 24px;
          }
        }
      `}</style>

      <div className="orkio-avatar-hero__grid">
        <div className="orkio-avatar-hero__copy">
          <span className="orkio-avatar-hero__eyebrow">{avatarCopy.eyebrow}</span>
          <h2>
            {avatarCopy.titlePrefix}
            <span>Orkio.</span>
          </h2>
          <p>{avatarCopy.body}</p>

          <div className="orkio-avatar-hero__actions">
            <button
              type="button"
              className="orkio-avatar-hero__action"
              onClick={handleSpeak}
              disabled={voiceLoading || speaking}
              aria-busy={voiceLoading ? "true" : "false"}
            >
              <span>{voiceLoading ? avatarCopy.preparing : speaking ? avatarCopy.speaking : avatarCopy.speak}</span>
              <b>≋</b>
            </button>
            <button type="button" className="orkio-avatar-hero__action" onClick={() => safeCallback(onText)}>
              <span>{avatarCopy.type}</span>
              <b>□</b>
            </button>
            <button type="button" className="orkio-avatar-hero__action" onClick={() => safeCallback(onDiagnosis)}>
              <span>{avatarCopy.diagnosis}</span>
              <b>✦</b>
            </button>
          </div>

          <div className="orkio-avatar-hero__status" aria-live="polite">
            <span className="orkio-avatar-hero__pulse" aria-hidden="true" />
            <span>
              {voiceError
                ? avatarCopy.errorStatus
                : voiceSlow
                  ? avatarCopy.slowStatus
                  : voiceFallback
                    ? avatarCopy.fallbackStatus
                    : voiceLoading
                      ? avatarCopy.loadingStatus
                      : speaking
                        ? avatarCopy.speakingStatus
                        : avatarCopy.idleStatus}
            </span>
            {(voiceSlow || voiceError) && (
              <button
                type="button"
                className="orkio-avatar-hero__fallbackAction"
                onClick={() => safeCallback(onText)}
              >
                {avatarCopy.continueText}
              </button>
            )}
          </div>
        </div>

        <div className="orkio-avatar-hero__visual" aria-hidden="true">
          <div className="orkio-avatar-hero__portraitShell">
            {videoAvailable ? (
              <OrkioVideoMedia
                speaking={speaking}
                borderRadius="28px"
                onVideoError={() => setVideoAvailable(false)}
              />
            ) : AVATAR_SRC && !avatarFailed ? (
              <img
                className="orkio-avatar-hero__avatar"
                src={AVATAR_SRC}
                alt=""
                loading="eager"
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "28px",
                }}
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "28px",
                background: "radial-gradient(circle at 42% 24%, rgba(245,196,81,0.34), transparent 30%), radial-gradient(circle at 50% 60%, rgba(129,140,248,0.18), transparent 44%), linear-gradient(180deg, rgba(11,18,32,0.96), rgba(3,7,18,1))",
                display: "grid",
                placeItems: "center",
                color: "#f8dfa3",
                fontSize: "42px",
                fontWeight: 950,
              }}>O</div>
            )}

            <div className="orkio-avatar-hero__voiceAura" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
