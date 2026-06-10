// AO67H — Realtime Boundary Policy
//
// Public AMCHAM users:
//   Orkio only, audio+text, no internal agent ids.
//
// Admin/founder:
//   direct agent / room mode may be enabled by separate admin UI.

export const REALTIME_PUBLIC_MODE = "public_orkio_only";
export const REALTIME_ADMIN_DIRECT_MODE = "admin_direct_agent_realtime";
export const REALTIME_ADMIN_ROOM_MODE = "admin_meeting_room_realtime";

export function buildPublicOrkioRealtimeStartBody({
  threadId = null,
  voice = "cedar",
  model = "gpt-realtime-mini",
  languageProfile = "pt-BR",
} = {}) {
  return {
    agent_id: null,
    thread_id: threadId || null,
    voice,
    model,
    mode: REALTIME_PUBLIC_MODE,
    response_profile: "amcham_public_orkio_realtime",
    language_profile: languageProfile,
    modalities: ["audio", "text"],
  };
}

export function isPublicRealtimeOrkioOnly(body = {}) {
  return (
    body &&
    body.mode === REALTIME_PUBLIC_MODE &&
    (body.agent_id === null || body.agent_id === undefined || body.agent_id === "") &&
    Array.isArray(body.modalities) &&
    body.modalities.includes("audio") &&
    body.modalities.includes("text")
  );
}
