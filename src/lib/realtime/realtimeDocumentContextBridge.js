// RTB-08 — Realtime document context bridge
// Fetches authorized document context from the backend and sends it to an active
// Realtime session. Strict file mode prevents a newly uploaded PDF from being
// answered using an older DOCX attached to the same thread.

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

export async function fetchThreadDocumentContext(apiFetch, { token, org, threadId, fileId, query, strictFileId } = {}) {
  const tid = String(threadId || "").trim();
  if (!tid || typeof apiFetch !== "function") {
    return { ok: false, context_available: false, reason: "missing_thread_or_api" };
  }

  const strict = Boolean(fileId || strictFileId);

  const path = `/api/documents/thread-context?${qs({
    thread_id: tid,
    file_id: fileId || "",
    strict_file_id: strict ? "1" : "",
    query: query || "documento anexado",
  })}`;

  const result = await apiFetch(path, { method: "GET", token, org });
  return unwrapApiData(result);
}

function normalizeName(value = "") {
  return String(value || "").trim().toLowerCase();
}

function contextMatchesRequestedFile(documentContext = {}, fileId = "") {
  const requested = String(fileId || "").trim();
  if (!requested) return true;

  const preferred = String(documentContext.preferred_file_id || "").trim();
  if (preferred && preferred !== requested) return false;

  const diag = documentContext.preferred_file_diagnostic || {};
  const hasText = Boolean(diag.has_file_text) || Number(diag.file_text_chars || 0) > 0;
  const available = Boolean(documentContext.context_available || documentContext.context_block || documentContext.file_context_block);

  if (!available || !hasText) return false;

  const citations = Array.isArray(documentContext.citations) ? documentContext.citations : [];
  if (citations.length) {
    return citations.some((item) => String(item?.file_id || "").trim() === requested);
  }

  const ids = Array.isArray(documentContext.file_ids) ? documentContext.file_ids.map((x) => String(x || "").trim()) : [];
  return ids.includes(requested);
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
    "- Se o usuário perguntar se a resposta veio do PDF/DOCX atual, responda com honestidade usando o nome do arquivo recuperado.",
    "- Não use documento antigo para responder como se fosse o arquivo recém-anexado.",
    "- Não diga que não consegue acessar o anexo enquanto este contexto específico estiver presente.",
    "- Se o trecho não for suficiente, diga exatamente o que falta."
  ].filter(Boolean).join("\n");
}

function buildStrictFileUnavailableMessage(documentContext = {}, fileId = "", query = "") {
  const diag = documentContext?.preferred_file_diagnostic || {};
  const filename = diag.filename || documentContext?.preferred_filename || "o arquivo recém-anexado";
  const mime = diag.mime_type || "";
  const failed = Boolean(diag.extraction_failed);
  const chars = Number(diag.file_text_chars || 0);

  return [
    "STATUS DOCUMENTAL DO ARQUIVO RECÉM-ANEXADO:",
    `Arquivo solicitado: ${filename}`,
    fileId ? `file_id: ${fileId}` : "",
    mime ? `mime_type: ${mime}` : "",
    `texto_extraido_disponivel: ${chars > 0 ? "sim" : "não"}`,
    failed ? "status_extração: falhou ou retornou vazio" : "status_extração: ainda sem texto recuperado",
    "",
    "Instrução para Orkio:",
    "- O usuário está perguntando especificamente sobre o arquivo recém-anexado.",
    "- Não responda usando documentos anteriores da thread como se fossem este arquivo.",
    "- Não mencione 'ponte documental'.",
    "- Diga de forma simples que o conteúdo deste PDF/arquivo ainda não ficou disponível para leitura, se for o caso.",
    "- Se o usuário aceitar, peça para reenviar em DOCX/TXT ou aguardar a correção da extração."
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

    const strictFileId = Boolean(fileId);

    const documentContext = await fetchThreadDocumentContext(apiFetch, {
      token,
      org,
      threadId,
      fileId,
      query,
      strictFileId,
    });

    const strictMatch = contextMatchesRequestedFile(documentContext, fileId);
    const contextText = strictMatch ? buildRealtimeDocumentContextMessage(documentContext) : "";

    if (!contextText) {
      const unavailableText = strictFileId
        ? buildStrictFileUnavailableMessage(documentContext, fileId, query)
        : "";

      let unavailableSent = false;
      if (unavailableText) {
        unavailableSent = Boolean(sendRealtimeClientEvent?.(dc, {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: unavailableText }],
          },
        }, `rtb08:${reason}:strict_file_unavailable`));
      }

      queueRealtimeTelemetry?.("document_context_unavailable", {
        threadId,
        fileId: fileId || null,
        reason,
        strictFileId,
        strictMatch,
        unavailableSent,
        fileCount: Array.isArray(documentContext?.file_ids) ? documentContext.file_ids.length : 0,
        preferredDiagnostic: documentContext?.preferred_file_diagnostic || null,
      });
      logRealtimeStep?.("rtb08:document_context_unavailable", {
        threadId,
        fileId: fileId || null,
        reason,
        strictFileId,
        strictMatch,
        unavailableSent,
        preferredDiagnostic: documentContext?.preferred_file_diagnostic || null,
      });

      return {
        sent: unavailableSent,
        context_available: false,
        reason: strictFileId ? "strict_file_context_unavailable" : "empty_context",
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
    }, `rtb08:${reason}`);

    if (sent) {
      queueRealtimeTelemetry?.("document_context_attached", {
        threadId,
        fileId: fileId || null,
        reason,
        strictFileId,
        contextChars: contextText.length,
        filesUsed: documentContext?.files_used || [],
      });
      logRealtimeStep?.("rtb08:document_context_attached", {
        threadId,
        fileId: fileId || null,
        reason,
        strictFileId,
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
    logRealtimeStep?.("rtb08:document_context_bridge_failed", {
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
