import React from "react";

// AO69B-HF2_SMART_NEXT_ACTIONS_AMCHAM_EN_I18N
// AO69B-HF1_SMART_NEXT_ACTIONS_PREMIUM

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

function isLikelyEnglishSmartActionContent(value) {
  const text = String(value || "").toLowerCase();
  if (!text.trim()) return false;

  const markerScore = (markers) => (
    markers.filter((marker) => text.includes(marker)).length
  );

  const tokenScore = (tokens) => (
    tokens.reduce((score, token) => {
      const pattern = new RegExp(`\\b${token}\\b`, "g");
      return score + (text.match(pattern)?.length || 0);
    }, 0)
  );

  const englishHits =
    markerScore([
      "who is", "what is", "how does", "implementation", "human support",
      "talk to the team", "website", "amcham companies", "amcham members",
      "member company", "can test orkio", "ready to turn", "guided project",
      "next step", "patroai/orkio team", "professional development",
      "skill mapping", "new business creation"
    ]) +
    tokenScore([
      "the", "is", "are", "can", "with", "through", "members", "company",
      "website", "implementation", "support", "talk", "ready", "next",
      "this", "its", "from", "your"
    ]);

  const portugueseHits =
    markerScore([
      "quem é", "o que é", "como funciona", "implantação", "suporte humano",
      "falar com", "site institucional", "empresas da amcham",
      "associados da amcham", "empresa membro", "pode testar o orkio",
      "pronto para transformar", "projeto guiado", "próximo passo",
      "desenvolvimento profissional", "mapeamento de skills",
      "criação de novos negócios"
    ]) +
    tokenScore([
      "é", "são", "pode", "com", "por", "associados", "empresa",
      "implantação", "suporte", "falar", "pronto", "próximo",
      "nesse", "sua", "seu", "para"
    ]);

  return englishHits > portugueseHits;
}

function shouldShowSmartNextActions(value) {
  const text = String(value || "").trim();
  if (!text || text.length < 80) return false;
  const lower = text.toLowerCase();

  const safePublicMarkers = [
    "patroai", "orkio", "amcham", "whatsapp", "implantação", "implementation",
    "guided project", "projeto guiado", "site institucional", "official patroai website"
  ];
  if (!safePublicMarkers.some((marker) => lower.includes(marker))) return false;

  const blockedMarkers = [
    "patch approval", "aprovar patch", "executar patch", "audit_receipt",
    "trace_id", "runtime/", "src/routes/", "main.py", "@orion", "@chris",
    "governance/approve-patch", "terminal guard", "stack trace"
  ];
  if (blockedMarkers.some((marker) => lower.includes(marker))) return false;

  return true;
}

function buildSmartNextActions(value) {
  const text = String(value || "");
  if (!shouldShowSmartNextActions(text)) return [];

  const lower = text.toLowerCase();
  const english = isLikelyEnglishSmartActionContent(text);
  const isContactContext = (
    lower.includes("whatsapp") ||
    lower.includes("talk to the team") ||
    lower.includes("falar com a equipe") ||
    lower.includes("atendimento humano") ||
    lower.includes("human support")
  );
  const isSiteContext = (
    lower.includes("www.patroai.com") ||
    lower.includes("official patroai website") ||
    lower.includes("site institucional")
  );
  const isImplementationContext = (
    lower.includes("implementation") ||
    lower.includes("implantação") ||
    lower.includes("guided implementation") ||
    lower.includes("jornada consultiva")
  );
  const isAmchamContext = lower.includes("amcham");

  const actions = [];

  const push = (id, label, prompt) => {
    if (!actions.some((item) => item.id === id)) actions.push({ id, label, prompt });
  };

  if (english) {
    if (!isImplementationContext) push("implementation", "See implementation", "How does implementation work?");
    if (!isContactContext) push("contact", "Talk to the team", "Can I have your WhatsApp?");
    if (!isSiteContext) push("site", "Visit website", "What is the Patroai website?");
    if (isAmchamContext) {
      push("amcham-use", "AMCHAM use cases", "What can AMCHAM members use Orkio for?");
    } else {
      push("test-case", "Test another use case", "Show me one practical way my company could test Orkio.");
    }
  } else {
    if (!isImplementationContext) push("implementation", "Ver implantação", "Como funciona a implantação?");
    if (!isContactContext) push("contact", "Falar com a equipe", "Quero falar com alguém.");
    if (!isSiteContext) push("site", "Conhecer o site", "Qual é o site da Patroai?");
    if (isAmchamContext) {
      push("amcham-use", "Casos AMCHAM", "O que associados da AMCHAM podem testar com o Orkio?");
    } else {
      push("test-case", "Testar outro caso", "Me dê um exemplo prático de como minha empresa pode testar o Orkio.");
    }
  }

  return actions.slice(0, 4);
}

function SmartNextActions({ actions, onAction }) {
  if (!Array.isArray(actions) || !actions.length || typeof onAction !== "function") return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={(event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            onAction(action.prompt);
          }}
          title={action.prompt}
          style={{
            border: "1px solid rgba(148,163,184,0.28)",
            borderRadius: 999,
            padding: "7px 10px",
            background: "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(30,41,59,0.72))",
            color: "rgba(226,232,240,0.94)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.01em",
            boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}


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
  onSmartNextAction,
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

                  {!isUser && !isSystem && visibleForActions && (
                    <SmartNextActions
                      actions={buildSmartNextActions(visibleForActions)}
                      onAction={onSmartNextAction}
                    />
                  )}

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
