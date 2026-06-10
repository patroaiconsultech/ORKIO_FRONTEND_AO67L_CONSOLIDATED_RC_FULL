// Central voice registry for Orkio (Admin + App must stay consistent)
// AO65V-FE8 — canonical voice lock.
//
// id: the value sent to the realtime and TTS APIs.
// Realtime/TTS voices supported in current Orkio environment:
// alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar

export const ORKIO_CANONICAL_VOICE_ID = "cedar";
export const ORKIO_DEFAULT_VOICE_ID = ORKIO_CANONICAL_VOICE_ID;
export const ORKIO_DEFAULT_TTS_SPEED = 0.9;

// Curadoria de experiência:
// - cedar: voz oficial/canônica do Orkio neste ciclo;
// - shimmer: mantida como opção suportada, mas não deve ser fallback local do Orkio;
// - marin/coral/sage: alternativas naturais;
// - echo/alloy/ash/verse/ballad: opções complementares.
export const ORKIO_VOICES = [
  { id: "cedar", label: "Cedar (Orkio, voz oficial)" },
  { id: "shimmer", label: "Shimmer (suave e acolhedora)" },
  { id: "marin", label: "Marin (natural, suave)" },
  { id: "coral", label: "Coral (clara, próxima)" },
  { id: "sage", label: "Sage (calma, consultiva)" },
  { id: "verse", label: "Verse (expressiva)" },
  { id: "ballad", label: "Ballad (narrativa)" },
  { id: "alloy", label: "Alloy (neutra)" },
  { id: "ash", label: "Ash" },
  { id: "echo", label: "Echo (masculina)" },
];

// Backward-compatible aliases (legacy -> supported)
const VOICE_ALIASES = {
  nova: "shimmer",
  onyx: "echo",
  fable: "sage",
  marine: "marin",
};

export const ORKIO_VOICE_IDS = new Set(ORKIO_VOICES.map((v) => v.id));

export function coerceVoiceId(value, fallback = ORKIO_DEFAULT_VOICE_ID) {
  const safeFallback = (fallback || ORKIO_CANONICAL_VOICE_ID || "cedar").toString().trim().toLowerCase();
  const v0 = (value || "").toString().trim().toLowerCase();
  const v = VOICE_ALIASES[v0] || v0;
  if (ORKIO_VOICE_IDS.has(v)) return v;
  return ORKIO_VOICE_IDS.has(safeFallback) ? safeFallback : ORKIO_CANONICAL_VOICE_ID;
}

export function coerceTtsSpeed(value, fallback = ORKIO_DEFAULT_TTS_SPEED) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0.75, Math.min(1.12, n));
}
