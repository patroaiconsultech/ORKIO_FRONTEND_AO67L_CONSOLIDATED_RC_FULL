/**
 * orkioTts — runtime único de voz dOrkio
 *
 * Responsabilidades:
 * - centralizar a voz padrão dOrkio;
 * - chamar o TTS público/autenticado com fallback de endpoint;
 * - manter fallback do navegador com curadoria de voz masculina/neutral em PT-BR;
 * - limpar URLs blob sem vazamento de memória.
 */

const ORKIO_VOICE_ID = "";
const ORKIO_TTS_SPEED = 0.92;

export function getOrkioVoiceId() {
  return ORKIO_VOICE_ID;
}

export function getOrkioTtsSpeed() {
  return ORKIO_TTS_SPEED;
}

export function cleanupAudioUrl(audio) {
  try {
    audio?.pause?.();
  } catch {}

  try {
    const blobUrl = audio?.dataset?.blobUrl;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  } catch {}
}

function getApiRoot() {
  const runtimeEnv =
    typeof window !== "undefined" && window.__ORKIO_ENV__ && typeof window.__ORKIO_ENV__ === "object"
      ? window.__ORKIO_ENV__
      : {};

  const raw =
    runtimeEnv.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "";

  const base = String(raw || "").trim().replace(/\/$/, "");

  if (!base) return "";
  return base.endsWith("/api") ? base.slice(0, -4) : base;
}

function makeHeaders({ token, tenant } = {}) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenant ? { "X-Org-Slug": tenant } : {}),
  };
}

function base64ToBlob(base64, mime = "audio/mpeg") {
  const clean = String(base64 || "").replace(/^data:[^;]+;base64,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

async function responseToAudioBlob(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();

    const directUrl = data?.audio_url || data?.audioUrl || data?.url;
    if (directUrl) {
      const audioResponse = await fetch(directUrl);
      if (!audioResponse.ok) {
        throw new Error(`audio_url ${audioResponse.status}`);
      }
      return audioResponse.blob();
    }

    const base64 = data?.audio_base64 || data?.audioBase64 || data?.audio;
    if (base64) {
      return base64ToBlob(base64, data?.mime_type || data?.mimeType || "audio/mpeg");
    }

    throw new Error("TTS_JSON_WITHOUT_AUDIO");
  }

  return response.blob();
}

async function requestEndpoint(endpoint, payload, options = {}) {
  const response = await fetch(`${getApiRoot()}${endpoint}`, {
    method: "POST",
    headers: makeHeaders(options),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`${endpoint} ${response.status}`);
  }

  return responseToAudioBlob(response);
}

export async function requestOrkioTtsBlob({
  text,
  token = "",
  tenant = "public",
  locale = "pt-BR",
  voice = ORKIO_VOICE_ID,
  speed = ORKIO_TTS_SPEED,
} = {}) {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw new Error("TTS_EMPTY_TEXT");
  }

  const payload = {
    text: cleanText,
    voice,
    speed,
    locale,
    language: locale,
  };

  const endpoints = token
    ? ["/api/tts", "/api/public/tts", "/api/tts/public"]
    : ["/api/public/tts", "/api/tts/public", "/api/tts"];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      return await requestEndpoint(endpoint, payload, { token, tenant });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("TTS_REQUEST_FAILED");
}

function voiceScore(voice, locale) {
  const name = String(voice?.name || "").toLowerCase();
  const lang = String(voice?.lang || "").toLowerCase();
  const target = String(locale || "pt-BR").toLowerCase();

  let score = 0;

  if (lang === target) score += 80;
  if (lang.startsWith(target.slice(0, 2))) score += 38;

  const positiveVoiceNames = target.startsWith("en")
    ? [
        "female",
        "samantha",
        "victoria",
        "karen",
        "moira",
        "tessa",
        "zira",
        "google us english",
        "google uk english female",
        "english female",
      ]
    : [
        "female",
        "feminina",
        "mulher",
        "maria",
        "francisca",
        "helena",
        "luciana",
        "google português",
        "portuguese brazil",
        "brasil",
        "brazil",
      ];

  positiveVoiceNames.forEach((needle) => {
    if (name.includes(needle)) score += 15;
  });

  ["male", "masculina", "homem", "daniel", "joão", "paulo"].forEach((needle) => {
    if (name.includes(needle)) score -= 18;
  });

  return score;
}

function pickBrowserVoice(locale = "pt-BR") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices?.() || [];

  if (!voices.length) return null;

  return voices
    .slice()
    .sort((a, b) => voiceScore(b, locale) - voiceScore(a, locale))[0];
}

export function speakWithOrkioBrowserVoice(text, {
  locale = "pt-BR",
  onStart,
  onEnd,
  onError,
} = {}) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window)
  ) {
    return false;
  }

  const cleanText = String(text || "").trim();

  if (!cleanText) return false;

  try {
    window.speechSynthesis.cancel();

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = pickBrowserVoice(locale);

      if (voice) utterance.voice = voice;

      utterance.lang = locale;
      utterance.rate = ORKIO_TTS_SPEED;
      utterance.pitch = 0.92;
      utterance.volume = 1;

      utterance.onstart = () => {
        if (typeof onStart === "function") onStart();
      };

      utterance.onend = () => {
        if (typeof onEnd === "function") onEnd();
      };

      utterance.onerror = (event) => {
        if (typeof onError === "function") onError(event);
      };

      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices?.() || [];

    if (!voices.length && "onvoiceschanged" in window.speechSynthesis) {
      const previous = window.speechSynthesis.onvoiceschanged;
      window.speechSynthesis.onvoiceschanged = (...args) => {
        if (typeof previous === "function") previous.apply(window.speechSynthesis, args);
        window.speechSynthesis.onvoiceschanged = previous || null;
        speak();
      };

      window.setTimeout(speak, 350);
    } else {
      speak();
    }

    return true;
  } catch (error) {
    if (typeof onError === "function") onError(error);
    return false;
  }
}

