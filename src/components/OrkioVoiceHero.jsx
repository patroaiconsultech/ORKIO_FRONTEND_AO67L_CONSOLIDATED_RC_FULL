import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OrkioMysticAvatar from "./OrkioMysticAvatar.jsx";
import { createOrkioSpeechMotion } from "../lib/orkioSpeechMotion.js";
import {
  cleanupAudioUrl,
  getOrkioTtsSpeed,
  getOrkioVoiceId,
  requestOrkioTtsBlob,
  speakWithOrkioBrowserVoice,
} from "../lib/orkioTts.js";

/**
 * AO-04K — OrkioVoiceHero com sincronização corretiva definitiva
 *
 * PRINCÍPIO: O ÁUDIO é a ÚNICA fonte de verdade do estado playing.
 *
 * FLUXO CORRIGIDO:
 * 1. Clique → voiceLoading=true, playing=false (vídeo permanece idle)
 * 2. TTS blob carrega → Audio preparado
 * 3. audio.play() chamado → aguarda evento "playing" do browser
 * 4. Evento "playing" dispara → playing=true (vídeo troca INSTANTANEAMENTE)
 * 5. audio.onended → playing=false (vídeo volta para idle INSTANTANEAMENTE)
 *
 * DIFERENÇA DO AO-04J:
 * - Removido qualquer seek/offset no vídeo
 * - Vídeo speaking roda continuamente em background
 * - Troca visual é por opacidade instantânea (0ms)
 * - syncKey removido (desnecessário com opacidade contínua)
 */

export default function OrkioVoiceHero({
  tenant,
  token,
  defaultLocale = "pt-BR",
  kicker = "PatroAI apresentOrkio",
  title = "Da concepção à execução cirúrgica.",
  subtitle = "Orkio é a Business Execution Engine da PatroAI: organiza tese, estrutura business plans sofisticados, coordena agentes e acompanha a execução com governança.",
  speech = "Olá. Eu sou Orkio. Através de mim, a PatroAI pode conceber novos negócios, estruturar business plans sofisticados e conduzir a execução com clareza, inteligência e governança.",
  primaryLabel = "Conhecer Orkio",
  secondaryLabel = "Entrar agora",
  tertiaryLabel = "Falar com a PatroAI",
  badgeLabel = "Voz ativa",
  quickTitle = "Começos rápidos",
  quickPrompts = [],
  onPrimaryAction,
  onSecondaryAction,
  onTertiaryAction,
  onFillPrompt,
}) {
  const [locale, setLocale] = useState(defaultLocale === "en-US" ? "en-US" : "pt-BR");
  const [playing, setPlaying] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceSlow, setVoiceSlow] = useState(false);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  const audioRef = useRef(null);
  const heroRef = useRef(null);
  const motionRef = useRef(null);
  const lockRef = useRef(false);
  const slowTimerRef = useRef(null);

  const isPt = locale === "pt-BR";

  useEffect(() => {
    const nextLocale = defaultLocale === "en-US" ? "en-US" : "pt-BR";
    setLocale(nextLocale);
  }, [defaultLocale]);

  const getMotionController = useCallback(() => {
    if (!motionRef.current) {
      motionRef.current = createOrkioSpeechMotion(heroRef, {
        intensity: 0.92,
        smoothing: 0.78,
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

  const effectiveSpeech = useMemo(() => {
    if (typeof speech === "string" && speech.trim()) return speech.trim();
    return isPt
      ? "Olá. Eu sou Orkio. Posso ajudar você a entender, organizar e executar com clareza."
      : "Hello. I am Orkio. I can help you understand, organize, and execute with clarity.";
  }, [isPt, speech]);

  const effectiveQuickPrompts = useMemo(() => {
    if (Array.isArray(quickPrompts) && quickPrompts.length) return quickPrompts;
    return isPt
      ? [
          "Estruture um novo negócio do zero.",
          "Monte um business plan sofisticado.",
          "Transforme a estratégia em execução cirúrgica.",
        ]
      : [
          "Structure a new business from zero.",
          "Build a sophisticated business plan.",
          "Turn strategy into disciplined execution.",
        ];
  }, [isPt, quickPrompts]);

  const resolvedVoice = useMemo(() => getOrkioVoiceId(), []);
  const resolvedTtsSpeed = useMemo(() => getOrkioTtsSpeed(), []);

  // Encerrar fala — ÚNICO ponto que volta playing para false
  const endPlaying = useCallback(() => {
    lockRef.current = false;
    clearVoiceSlowTimer();
    setVoiceLoading(false);
    setVoiceSlow(false);
    setVoiceFallback(false);
    getMotionController().stop();
    setPlaying(false);
  }, [clearVoiceSlowTimer, getMotionController]);

  function fallbackBrowserSpeech() {
    return speakWithOrkioBrowserVoice(effectiveSpeech, {
      locale,
      onStart: () => {
        // Browser speech disparou — AGORA sim ativamos o visual
        clearVoiceSlowTimer();
        setVoiceLoading(false);
        setVoiceSlow(false);
        setVoiceFallback(true);
        setVoiceError(false);
        lockRef.current = true;
        setPlaying(true);
        getMotionController().startSynthetic({ strength: 0.64 });
      },
      onEnd: () => {
        endPlaying();
      },
      onError: () => {
        setVoiceError(true);
        endPlaying();
      },
    });
  }

  async function speak() {
    // Guard: não permite novo clique enquanto está carregando ou falando
    if (playing || voiceLoading || lockRef.current) return;

    // FASE 1: Carregamento — vídeo permanece em IDLE
    lockRef.current = true;
    setVoiceLoading(true);
    setVoiceSlow(false);
    setVoiceFallback(false);
    setVoiceError(false);
    startVoiceSlowTimer();
    // playing permanece FALSE aqui — o vídeo NÃO muda

    try {
      // Limpar áudio anterior
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
        locale,
      });

      if (!lockRef.current) return;

      // FASE 3: Preparar Audio element
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.dataset.blobUrl = url;
      audio.preload = "auto";
      audioRef.current = audio;

      let visualActivated = false;

      // EVENTO CRÍTICO: "playing" — o áudio REALMENTE começou
      const activateVisual = () => {
        if (visualActivated || !lockRef.current) return;
        visualActivated = true;
        clearVoiceSlowTimer();
        setVoiceLoading(false);
        setVoiceSlow(false);
        setVoiceError(false);
        setPlaying(true); // ← ÚNICO momento que playing vira true
        getMotionController().startSynthetic({ strength: 0.64 });
      };

      audio.addEventListener("playing", activateVisual, { once: true });

      // EVENTO FINAL: "ended" — o áudio terminou
      audio.onended = () => {
        cleanupAudioUrl(audio);
        endPlaying(); // ← ÚNICO momento que playing volta para false
      };

      audio.onerror = () => {
        cleanupAudioUrl(audio);
        setVoiceError(true);
        endPlaying();
      };

      // FASE 4: Iniciar playback
      await audio.play();

      // Fallback: alguns browsers resolvem play() sem disparar "playing"
      if (!visualActivated && !audio.paused && lockRef.current) {
        activateVisual();
      }

    } catch (err) {
      console.warn("ORKIO_VOICE_HERO_TTS_FAILED", err?.message || err);
      clearVoiceSlowTimer();
      setVoiceLoading(false);
      setVoiceSlow(false);
      setVoiceFallback(true);
      const browserFallbackOk = fallbackBrowserSpeech();
      if (!browserFallbackOk) {
        setVoiceFallback(false);
        setVoiceError(true);
        endPlaying();
      }
    }
  }


  const voiceStatusText = useMemo(() => {
    if (voiceError) {
      return isPt
        ? "Voz temporariamente indisponível. Você pode seguir pelos botões abaixo."
        : "Voice is temporarily unavailable. You can continue with the actions below.";
    }

    if (voiceSlow) {
      return isPt
        ? "A voz está levando um pouco mais. Mantive Orkio pronta sem travar a página."
        : "Voice is taking a little longer. Orkio is still ready and the page is not blocked.";
    }

    if (voiceFallback) {
      return isPt
        ? "Usando o canal de voz mais seguro disponível."
        : "Using the safest available voice channel.";
    }

    if (voiceLoading) return isPt ? "Preparando voz..." : "Preparing voice...";
    if (playing) return isPt ? "Orkio falando" : "Orkio speaking";
    return badgeLabel;
  }, [badgeLabel, isPt, playing, voiceError, voiceFallback, voiceLoading, voiceSlow]);

  return (
    <section
      ref={heroRef}
      className={`orkio-voice-hero ${playing ? "is-playing" : ""} ${voiceLoading ? "is-loading" : ""} ${voiceError ? "is-voice-error" : ""}`}
      aria-label="Orkio — assistente de voz"
      data-orkio-voice-state={voiceError ? "voice-error" : voiceLoading ? "voice-loading" : playing ? "speaking" : "idle"}
    >
      <style>{`
        .orkio-voice-hero {
          position: relative;
          min-height: 520px;
          border: 1px solid rgba(247,200,98,0.22);
          border-radius: 38px;
          overflow: hidden;
          background:
            radial-gradient(620px 380px at 18% 50%, rgba(247,200,98,0.12), transparent 58%),
            radial-gradient(520px 340px at 92% 12%, rgba(247,200,98,0.06), transparent 50%),
            linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018)),
            rgba(2,6,11,0.88);
          box-shadow: 0 34px 96px rgba(0,0,0,0.46);
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

        .orkio-voice-hero,
        .orkio-voice-hero * {
          box-sizing: border-box;
        }

        .orkio-voice-hero::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 36%;
          pointer-events: none;
          background: linear-gradient(180deg, transparent, rgba(0,0,0,0.22));
          z-index: 0;
        }

        .orkio-voice-hero__grid {
          position: relative;
          z-index: 1;
          min-height: 520px;
          display: grid;
          grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
          align-items: stretch;
        }

        .orkio-voice-hero__copy {
          padding: 38px 32px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 16px;
          min-width: 0;
        }

        .orkio-voice-hero__kicker {
          color: #f7c862;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .orkio-voice-hero__copy h2 {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(30px, 3.6vw, 50px);
          line-height: 1.04;
          letter-spacing: -0.05em;
          overflow-wrap: anywhere;
        }

        .orkio-voice-hero__copy p {
          margin: 0;
          max-width: 410px;
          color: rgba(248,250,252,0.70);
          font-size: 14.5px;
          line-height: 1.72;
        }

        .orkio-voice-hero__ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 6px;
        }

        .orkio-voice-hero__cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 14px;
          border: 1px solid rgba(247,200,98,0.32);
          background: rgba(0,0,0,0.32);
          color: rgba(248,250,252,0.90);
          font-weight: 820;
          font-size: 14px;
          cursor: pointer;
          transition: transform 140ms ease, border-color 160ms ease, background 160ms ease;
        }

        .orkio-voice-hero__cta:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(247,200,98,0.56);
          background: rgba(247,200,98,0.08);
        }

        .orkio-voice-hero__cta:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .orkio-voice-hero__cta--primary {
          background: linear-gradient(135deg, rgba(247,200,98,0.22), rgba(247,200,98,0.08));
          border-color: rgba(247,200,98,0.48);
        }

        .orkio-voice-hero__badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(247,200,98,0.08);
          border: 1px solid rgba(247,200,98,0.22);
          color: rgba(255,226,157,0.82);
          font-size: 11.5px;
          font-weight: 780;
          width: fit-content;
        }

        .orkio-voice-hero__badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f7c862;
        }

        .orkio-voice-hero.is-playing .orkio-voice-hero__badge-dot,
        .orkio-voice-hero.is-loading .orkio-voice-hero__badge-dot {
          animation: orkioVoiceDotPulse 1s ease-in-out infinite;
        }

        .orkio-voice-hero.is-voice-error .orkio-voice-hero__badge-dot {
          background: #fb923c;
        }

        .orkio-voice-hero__notice {
          margin-top: 10px;
          max-width: 430px;
          color: rgba(255,226,157,0.72);
          font-size: 12.5px;
          line-height: 1.55;
        }

        .orkio-voice-hero__visual {
          position: relative;
          min-height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px 28px 28px 14px;
          overflow: hidden;
        }

        .orkio-voice-hero__portrait {
          position: relative;
          z-index: 2;
          width: min(320px, 88%);
        }

        .orkio-voice-hero__quickBox {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(247,200,98,0.14);
          background: rgba(0,0,0,0.22);
        }

        .orkio-voice-hero__quickTitle {
          color: rgba(255,226,157,0.68);
          font-size: 11px;
          font-weight: 820;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 8px;
        }

        .orkio-voice-hero__quickList {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .orkio-voice-hero__quickItem {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(247,200,98,0.12);
          background: rgba(247,200,98,0.04);
          color: rgba(248,250,252,0.78);
          font-size: 13px;
          cursor: pointer;
          transition: background 140ms ease, border-color 140ms ease;
        }

        .orkio-voice-hero__quickItem:hover {
          background: rgba(247,200,98,0.10);
          border-color: rgba(247,200,98,0.32);
        }

        .orkio-voice-hero__locale {
          position: absolute;
          top: 18px;
          right: 22px;
          z-index: 3;
          display: flex;
          gap: 4px;
        }

        .orkio-voice-hero__localeBtn {
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(247,200,98,0.18);
          background: transparent;
          color: rgba(248,250,252,0.56);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 120ms ease, color 120ms ease;
        }

        .orkio-voice-hero__localeBtn.is-active {
          background: rgba(247,200,98,0.14);
          color: #f7c862;
          border-color: rgba(247,200,98,0.38);
        }

        @keyframes orkioVoiceDotPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.4); opacity: 1; }
        }

        @media (max-width: 960px) {
          .orkio-voice-hero,
          .orkio-voice-hero__grid,
          .orkio-voice-hero__visual {
            min-height: auto;
          }

          .orkio-voice-hero__grid {
            grid-template-columns: 1fr;
          }

          .orkio-voice-hero__copy {
            padding: 28px 22px 8px;
          }

          .orkio-voice-hero__visual {
            min-height: 380px;
            padding: 14px 20px 28px;
          }
        }

        @media (max-width: 560px) {
          .orkio-voice-hero {
            border-radius: 28px;
          }

          .orkio-voice-hero__copy h2 {
            font-size: 32px;
          }

          .orkio-voice-hero__visual {
            min-height: 320px;
          }
        }
      `}</style>

      <div className="orkio-voice-hero__locale">
        <button
          type="button"
          className={`orkio-voice-hero__localeBtn ${isPt ? "is-active" : ""}`}
          onClick={() => setLocale("pt-BR")}
        >PT</button>
        <button
          type="button"
          className={`orkio-voice-hero__localeBtn ${!isPt ? "is-active" : ""}`}
          onClick={() => setLocale("en-US")}
        >EN</button>
      </div>

      <div className="orkio-voice-hero__grid">
        <div className="orkio-voice-hero__copy">
          <span className="orkio-voice-hero__kicker">{kicker}</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>

          <div className="orkio-voice-hero__ctas">
            <button
              type="button"
              className="orkio-voice-hero__cta orkio-voice-hero__cta--primary"
              onClick={speak}
              disabled={voiceLoading || playing}
              aria-busy={voiceLoading ? "true" : "false"}
            >
              {voiceLoading ? (isPt ? "Preparando..." : "Preparing...") : playing ? (isPt ? "Orkio falando..." : "Orkio speaking...") : (isPt ? "▶ Ouvir Orkio" : "▶ Hear Orkio")}
            </button>
            {onPrimaryAction && (
              <button type="button" className="orkio-voice-hero__cta" onClick={onPrimaryAction}>
                {primaryLabel}
              </button>
            )}
            {onSecondaryAction && (
              <button type="button" className="orkio-voice-hero__cta" onClick={onSecondaryAction}>
                {secondaryLabel}
              </button>
            )}
            {onTertiaryAction && (
              <button type="button" className="orkio-voice-hero__cta" onClick={onTertiaryAction}>
                {tertiaryLabel}
              </button>
            )}
          </div>

          <div className="orkio-voice-hero__badge" aria-live="polite">
            <span className="orkio-voice-hero__badge-dot" />
            <span>{voiceStatusText}</span>
          </div>

          {(voiceSlow || voiceError) && (
            <div className="orkio-voice-hero__notice">
              {isPt
                ? "A experiência continua por texto, diagnóstico ou demonstração, sem bloquear sua jornada."
                : "You can continue by text, diagnosis, or demo without blocking your journey."}
            </div>
          )}

          {effectiveQuickPrompts.length > 0 && (
            <div className="orkio-voice-hero__quickBox">
              <div className="orkio-voice-hero__quickTitle">{quickTitle}</div>
              <div className="orkio-voice-hero__quickList">
                {effectiveQuickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="orkio-voice-hero__quickItem"
                    onClick={() => typeof onFillPrompt === "function" && onFillPrompt(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="orkio-voice-hero__visual" aria-hidden="true">
          <div className="orkio-voice-hero__portrait">
            <OrkioMysticAvatar
              variant="card"
              size="100%"
              speaking={playing}
              useVideo={true}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
