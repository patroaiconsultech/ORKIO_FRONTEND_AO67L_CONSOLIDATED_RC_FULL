// RTB-07 — Realtime document context bridge
// Fetches authorized document context from the backend and sends it to an active
// Realtime session. AppConsole stays as a root/orchestrator.

function unwrapApiData(result) {
  if (result && typeof result === "object" && result.data && typeof result.data === "object") {
    return result.data;
  }
  return result || {};
}

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    const text = String(value ?? "").trim();
    if (text) search.set(key, text);
  });
  return search.toString();
}

export async function fetchThreadDocumentContext(apiFetch, { token, org, threadId, fileId, query } = {}) {
  const tid = String(threadId || "").trim();
  if (!tid || typeof apiFetch !== "function") {
    return { ok: false, context_available: false, reason: "missing_thread_or_api" };
  }

  const path = `/api/documents/thread-context?${qs({
    thread_id: tid,
    file_id: fileId || "",
    query: query || "documento anexado",
  })}`;

  const result = await apiFetch(path, { method: "GET", token, org });
  return unwrapApiData(result);
}

export function buildRealtimeDocumentContextMessage(documentContext = {}) {
  const block = String(
    documentContext.context_block ||
    documentContext.file_context_block ||
    ""
  ).trim();

  if (!block) return "";

  const files = Array.isArray(documentContext.files_used)
    ? documentContext.files_used.filter(Boolean).join(", ")
    : "";

  return [
    "CONTEXTO DOCUMENTAL AUTORIZADO DA THREAD:",
    files ? `Arquivos com evidência recuperada: ${files}` : "",
    block,
    "",
    "Instrução para Orkio:",
    "- Use o conteúdo acima como evidência da conversa atual.",
    "- Não diga que não consegue acessar o anexo enquanto este contexto estiver presente.",
    "- Se o usuário pedir uma seção específica, procure a seção no contexto e responda com o que estiver confirmado.",
    "- Se o trecho não for suficiente, diga exatamente o que falta."
  ].filter(Boolean).join("\n");
}

export async function bridgeRealtimeDocumentContext({
  apiFetch,
  token,
  org,
  threadId,
  fileId,
  query,
  dc,
  sendRealtimeClientEvent,
  queueRealtimeTelemetry,
  logRealtimeStep,
  reason = "document_context",
} = {}) {
  try {
    if (!dc || dc.readyState !== "open") {
      return { sent: false, context_available: false, reason: "datachannel_not_open" };
    }

    const documentContext = await fetchThreadDocumentContext(apiFetch, {
      token,
      org,
      threadId,
      fileId,
      query,
    });

    const contextText = buildRealtimeDocumentContextMessage(documentContext);
    if (!contextText) {
      queueRealtimeTelemetry?.("document_context_unavailable", {
        threadId,
        fileId: fileId || null,
        reason,
        fileCount: Array.isArray(documentContext?.file_ids) ? documentContext.file_ids.length : 0,
      });
      return {
        sent: false,
        context_available: false,
        reason: "empty_context",
        documentContext,
      };
    }

    const sent = sendRealtimeClientEvent?.(dc, {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: contextText }],
      },
    }, `rtb07:${reason}`);

    if (sent) {
      queueRealtimeTelemetry?.("document_context_attached", {
        threadId,
        fileId: fileId || null,
        reason,
        contextChars: contextText.length,
        filesUsed: documentContext?.files_used || [],
      });
      logRealtimeStep?.("rtb07:document_context_attached", {
        threadId,
        fileId: fileId || null,
        reason,
        contextChars: contextText.length,
        filesUsed: documentContext?.files_used || [],
      });
    }

    return {
      sent: Boolean(sent),
      context_available: Boolean(contextText),
      documentContext,
    };
  } catch (err) {
    logRealtimeStep?.("rtb07:document_context_bridge_failed", {
      threadId,
      fileId: fileId || null,
      reason,
      message: err?.message || null,
    });
    return {
      sent: false,
      context_available: false,
      reason: "exception",
      error: err?.message || String(err || ""),
    };
  }
}
