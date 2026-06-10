import React from "react";

/**
 * AO64D-HF6E_PUBLIC_BETA_RENDER_SAFE
 *
 * DESTINO:
 * orkio-web-PATCHD-patroai-integrated/src/components/chat/MessageBubble.jsx
 *
 * MODO:
 * PATCH_MINIMUM / frontend-only
 *
 * Objetivo:
 * - Restaurar MessageBubble como componente React completo.
 * - Usar displayMessage sanitizado como fonte visual e TTS.
 * - Impedir que conteúdo bruto com nomes internos volte a aparecer no balão.
 * - Não fazer fetch, stream, realtime ou chamada backend direta neste componente.
 */
export default function MessageBubble({
  message,
  styles,
  meName,
  lastAgentInfo,
  tryParseEvent,
  stripEventMarker,
  normalizeMessageSpeaker,
  resolveAssistantDisplayName,
  formatDateTime,
  formatTs,
  humanizeConsoleStatusMessage,
  normalizeUserFacingRuntimeMessage,
  renderMessageContentPremium,
  playTts,
  stopTts,
  ttsPlaying,
  ttsPlayingMessageId,
  extractPatchGovernanceMeta,
  openPatchApprovalModal,
  extractPatchApprovalMeta,
  executeApprovedPatchFromMessage,
  canAccessAdmin,
}) {
  const m = message || {};
  const role = String(m.role || "").toLowerCase();
  const isUser = role === "user";
  const isSystem = role === "system";
  const isAssistant = role === "assistant" || role === "agent";

  const rowStyle = {
    ...(styles?.messageRow || {}),
    justifyContent: isUser ? "flex-end" : "flex-start",
    alignItems: "flex-start",
    gap: 10,
  };

  const bubbleStyle = {
    ...(styles?.messageBubble || {}),
    ...(isUser ? (styles?.userBubble || {}) : isSystem ? (styles?.systemBubble || {}) : (styles?.agentBubble || {})),
  };

  const avatarUrl = isAssistant ? String(lastAgentInfo?.avatar_url || "").trim() : "";

  return (
    <div style={rowStyle}>
      {/* PATCH0100_14: Agent avatar */}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt=""
          onError={(e) => {
            try { e.currentTarget.style.display = "none"; } catch {}
          }}
          style={{
            width: 34,
            height: 34,
            borderRadius: "999px",
            objectFit: "cover",
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
            flex: "0 0 auto",
          }}
        />
      )}

      <div style={bubbleStyle}>
        {(() => {
          const evt = tryParseEvent?.(m.content);
          const visibleRaw = stripEventMarker?.(m.content) ?? m.content;

          const displayMessage = !isUser && !isSystem
            ? normalizeMessageSpeaker?.({
                ...m,
                content: visibleRaw || m.content || "",
                text: visibleRaw || m.text || m.content || "",
              }) || m
            : m;

          const visibleSource = !isUser && !isSystem
            ? (
                displayMessage?.content ||
                displayMessage?.final_text ||
                displayMessage?.text ||
                visibleRaw ||
                m.content ||
                ""
              )
            : (visibleRaw || m.content || "");

          const visible = humanizeConsoleStatusMessage?.(
            normalizeUserFacingRuntimeMessage?.(visibleSource)
          ) ?? String(visibleSource || "");

          const visibleForActions = visible || visibleSource || "";

          const name = isUser
            ? (m.user_name || meName)
            : (isSystem ? "Sistema" : resolveAssistantDisplayName?.(displayMessage, "Orkio") || "Orkio");

          const nameTone = isUser
            ? (styles?.nameUser || {})
            : isSystem
              ? (styles?.nameSystem || {})
              : (styles?.nameAgent || {});

          const created = formatDateTime?.(m.created_at);

          return (
            <>
              <div style={styles?.bubbleHeaderRow || { display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ ...(styles?.bubbleHeaderName || {}), ...nameTone }}>{name}</div>
                {created ? (
                  <div style={styles?.bubbleHeaderTime || { opacity: 0.7, fontSize: 12 }}>{created}</div>
                ) : null}
              </div>

              {evt && evt.type === "file_upload" ? (
                <div style={styles?.messageContent || { whiteSpace: "pre-wrap" }}>
                  <div style={{ fontWeight: 900, marginBottom: 4 }}>Upload registrado</div>
                  <div>{evt.filename || "arquivo"}</div>
                  <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                    {evt.text || `por ${evt.uploader_name || evt.uploader_email || "Usuário"} • ${formatTs?.(evt.ts || evt.created_at) || ""}`}
                  </div>
                </div>
              ) : (
                <>
                  <div style={styles?.messageContent || { whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                    {renderMessageContentPremium?.(visibleForActions) ?? visibleForActions}
                  </div>

                  {!isUser && !isSystem && visibleForActions && (() => {
                    // AO65A-HF6/HF7: if any classic TTS is active, the next click must stop it immediately.
                    // Do not depend on ttsPlayingMessageId === m.id because the active id can be normalized/null/manual.
                    const isAnyTtsPlaying = Boolean(ttsPlaying || ttsPlayingMessageId);
                    const isThisTtsPlaying = isAnyTtsPlaying;

                    const handleTtsClick = (event) => {
                      event?.preventDefault?.();
                      event?.stopPropagation?.();

                      if (isAnyTtsPlaying) {
                        stopTts?.("user_toggle");
                        return;
                      }

                      playTts?.(visibleForActions, (m.agent_id || null), {
                        messageId: m.id || null,
                        userInitiated: true,
                        // AO65A-HF7: do not pass message/agent voice as override; AppConsole resolves
                        // the same source used by Realtime/classic TTS policy.
                        voiceOverride: null,
                      });
                    };

                    return (
                      <button
                        type="button"
                        onClick={handleTtsClick}
                        title={isThisTtsPlaying ? "Parar áudio" : "Ouvir esta mensagem"}
                        aria-label={isThisTtsPlaying ? "Parar áudio" : "Ouvir esta mensagem"}
                        style={{
                          marginTop: 10,
                          border: "1px solid rgba(255,255,255,0.16)",
                          borderRadius: 999,
                          padding: "6px 10px",
                          background: "rgba(255,255,255,0.06)",
                          color: "#e5f7ff",
                          cursor: "pointer",
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        {isThisTtsPlaying ? "⏹️" : "🔊"}
                      </button>
                    );
                  })()}

                  {canAccessAdmin && !isUser && !isSystem && extractPatchGovernanceMeta?.(visibleForActions)?.can_approve && (
                    <button
                      type="button"
                      onClick={() => openPatchApprovalModal?.(m)}
                      style={{
                        marginTop: 10,
                        marginLeft: 8,
                        border: "1px solid rgba(16,185,129,0.45)",
                        borderRadius: 999,
                        padding: "8px 12px",
                        background: "rgba(16,185,129,0.12)",
                        color: "#d1fae5",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                      title="Aprovar este patch com confirmação por senha"
                    >
                      Aprovar patch com senha
                    </button>
                  )}

                  {canAccessAdmin && !isUser && !isSystem && extractPatchApprovalMeta?.(visibleForActions)?.can_execute && (
                    <button
                      type="button"
                      onClick={() => executeApprovedPatchFromMessage?.(m)}
                      style={{
                        marginTop: 10,
                        marginLeft: 8,
                        border: "1px solid rgba(59,130,246,0.55)",
                        borderRadius: 999,
                        padding: "8px 12px",
                        background: "rgba(59,130,246,0.14)",
                        color: "#dbeafe",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                      title="Executar o fluxo governado aprovado sem passar pelo chat"
                    >
                      Executar patch aprovado
                    </button>
                  )}
                </>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
