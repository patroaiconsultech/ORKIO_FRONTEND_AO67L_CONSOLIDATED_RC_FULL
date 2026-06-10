// AO67H — Admin Agent Room API client
//
// Overlay only. These endpoints are proposed for the consolidated backend.
// Do not import into AdminConsole until backend routes are audited.

import { apiFetch } from "../../ui/api.js";

export async function previewAdminAgentRoom(payload, options = {}) {
  return apiFetch("/api/admin/agent-room/preview", {
    method: "POST",
    body: payload,
    ...options,
  });
}

export async function sendAdminAgentRoomMessage(payload, options = {}) {
  return apiFetch("/api/admin/agent-room/message", {
    method: "POST",
    body: payload,
    ...options,
  });
}

export async function startAdminAgentRoomRealtime(payload, options = {}) {
  return apiFetch("/api/admin/agent-room/realtime/start", {
    method: "POST",
    body: payload,
    ...options,
  });
}
