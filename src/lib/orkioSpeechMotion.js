// CAMINHO REAL DO PROJETO:
// src/lib/orkioSpeechMotion.js

// COPIE O CONTEÚDO ABAIXO PARA ESSE ARQUIVO:
/**
 * AO-04C — Orkio speech motion runtime com boca digital
 *
 * Motion controller leve para sincronizar a presença visual dOrkio com áudio real.
 * - Quando há áudio de TTS, usa Web Audio API para medir energia da voz.
 * - Quando o navegador usa speechSynthesis, usa movimento sintético suave.
 * - Expõe variáveis de boca: abertura, mandíbula, arredondamento e largura.
 * - Não depende de backend novo e não cria rotas.
 */

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function getTargetElement(target) {
  if (!target) return null;
  if (typeof target === "function") return target();
  if (target.current) return target.current;
  return target;
}

function averageBand(data, start, end) {
  if (!data?.length) return 0;
  const safeStart = Math.max(0, Math.min(data.length - 1, start));
  const safeEnd = Math.max(safeStart + 1, Math.min(data.length, end));
  let sum = 0;

  for (let i = safeStart; i < safeEnd; i += 1) {
    sum += data[i] || 0;
  }

  return sum / Math.max(1, safeEnd - safeStart) / 255;
}

export function createOrkioSpeechMotion(target, options = {}) {
  const intensity = Number.isFinite(options.intensity) ? options.intensity : 1;
  const smoothing = Number.isFinite(options.smoothing) ? clamp(options.smoothing, 0.55, 0.94) : 0.78;

  let rafId = 0;
  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let running = false;
  let level = 0;
  let mouth = 0;
  let jaw = 0;
  let round = 0;
  let wide = 0;

  function setVars(next = {}) {
    const el = getTargetElement(target);
    if (!el) return;

    const voiceLevel = clamp(next.level ?? 0);
    const mouthOpen = clamp(next.mouth ?? voiceLevel);
    const jawDrop = clamp(next.jaw ?? mouthOpen);
    const mouthRound = clamp(next.round ?? voiceLevel * 0.5);
    const mouthWide = clamp(next.wide ?? 0.45 + voiceLevel * 0.35);
    const headTilt = Number.isFinite(next.tilt) ? next.tilt : 0;
    const breath = clamp(next.breath ?? 0);

    el.style.setProperty("--orkio-voice-level", voiceLevel.toFixed(3));
    el.style.setProperty("--orkio-mouth-open", mouthOpen.toFixed(3));
    el.style.setProperty("--orkio-jaw-drop", jawDrop.toFixed(3));
    el.style.setProperty("--orkio-mouth-round", mouthRound.toFixed(3));
    el.style.setProperty("--orkio-mouth-wide", mouthWide.toFixed(3));
    el.style.setProperty("--orkio-head-tilt", headTilt.toFixed(3));
    el.style.setProperty("--orkio-breath", breath.toFixed(3));
    el.style.setProperty("--orkio-voice-glow", clamp(voiceLevel * 1.35).toFixed(3));
  }

  function cancelFrame() {
    if (rafId && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafId);
    }
    rafId = 0;
  }

  function disconnectAudioGraph() {
    try {
      sourceNode?.disconnect?.();
    } catch {}

    try {
      analyser?.disconnect?.();
    } catch {}

    try {
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close?.();
      }
    } catch {}

    sourceNode = null;
    analyser = null;
    audioContext = null;
  }

  function stop({ reset = true } = {}) {
    running = false;
    cancelFrame();
    disconnectAudioGraph();
    level = 0;
    mouth = 0;
    jaw = 0;
    round = 0;
    wide = 0;

    if (reset) {
      setVars({
        level: 0,
        mouth: 0,
        jaw: 0,
        round: 0,
        wide: 0,
        tilt: 0,
        breath: 0,
      });
    }
  }

  function startSynthetic({ strength = 0.62 } = {}) {
    if (typeof window === "undefined") return false;

    stop({ reset: false });
    running = true;
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = () => {
      if (!running) return;

      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const t = (now - startedAt) / 1000;

      const phrasePulse =
        0.42 +
        0.22 * Math.sin(t * 7.2) +
        0.14 * Math.sin(t * 13.7 + 0.6) +
        0.08 * Math.sin(t * 23.0 + 1.2);

      const syllablePulse = clamp(
        0.50 +
          0.25 * Math.sin(t * 10.8) +
          0.15 * Math.sin(t * 19.2 + 0.8) +
          0.10 * Math.sin(t * 31.0 + 1.1),
        0,
        1
      );

      const nextLevel = clamp(phrasePulse * strength * intensity, 0.08, 0.82);
      const nextMouth = clamp(nextLevel * 0.82 + syllablePulse * 0.28, 0.08, 0.95);
      const breath = 0.5 + 0.5 * Math.sin(t * 1.35);
      const tilt = Math.sin(t * 1.45) * 0.72 + Math.sin(t * 0.67) * 0.36;

      setVars({
        level: nextLevel,
        mouth: nextMouth,
        jaw: clamp(nextMouth * 0.92, 0.04, 0.86),
        round: clamp(0.22 + syllablePulse * 0.58),
        wide: clamp(0.42 + (1 - syllablePulse) * 0.36 + nextLevel * 0.18),
        tilt,
        breath,
      });

      rafId = window.requestAnimationFrame(tick);
    };

    tick();
    return true;
  }

  async function startAudioElement(audio, { strength = 1 } = {}) {
    if (typeof window === "undefined" || !audio) return startSynthetic({ strength: 0.58 });

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return startSynthetic({ strength: 0.58 });

    stop({ reset: false });

    try {
      audioContext = new AudioContextCtor();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.66;

      sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const data = new Uint8Array(analyser.frequencyBinCount);
      running = true;
      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

      const tick = () => {
        if (!running || !analyser) return;

        analyser.getByteFrequencyData(data);

        const low = averageBand(data, 2, 14);
        const voice = averageBand(data, 14, 48);
        const air = averageBand(data, 48, 82);
        const highs = averageBand(data, 82, 118);
        const raw = clamp((low * 0.38 + voice * 0.92 + air * 0.26) * strength * intensity, 0, 1);

        level = level * smoothing + raw * (1 - smoothing);

        const articulation = clamp(voice * 1.45 + air * 0.62 - low * 0.18, 0, 1);
        const plosive = clamp(low * 0.72 + voice * 0.42, 0, 1);
        const sibilance = clamp(air * 0.84 + highs * 0.42, 0, 1);

        mouth = mouth * 0.58 + clamp(level * 1.45 + articulation * 0.32, 0.02, 1) * 0.42;
        jaw = jaw * 0.62 + clamp(plosive * 0.72 + mouth * 0.52, 0.02, 0.96) * 0.38;
        round = round * 0.68 + clamp(low * 0.54 + voice * 0.22, 0.08, 0.84) * 0.32;
        wide = wide * 0.66 + clamp(0.32 + sibilance * 0.42 + articulation * 0.25, 0.22, 0.92) * 0.34;

        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        const t = (now - startedAt) / 1000;
        const breath = 0.5 + 0.5 * Math.sin(t * 1.12);
        const tilt = Math.sin(t * 1.2) * 0.46 + level * 0.72;

        setVars({
          level,
          mouth,
          jaw,
          round,
          wide,
          tilt,
          breath,
        });

        rafId = window.requestAnimationFrame(tick);
      };

      tick();
      return true;
    } catch (err) {
      console.warn("ORKIO_SPEECH_MOTION_AUDIO_FAILED", err?.message || err);
      stop({ reset: false });
      return startSynthetic({ strength: 0.58 });
    }
  }

  return {
    startSynthetic,
    startAudioElement,
    stop,
    dispose: stop,
  };
}

