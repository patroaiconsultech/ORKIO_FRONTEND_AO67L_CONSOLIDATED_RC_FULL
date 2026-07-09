import React from "react";

// AO69C-HF1_SMART_ACTIONS_INTERACTION_GOVERNANCE
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

function readRoutingHints(message) {
  return (
    message?.runtime_hints?.routing ||
    message?.metadata?.routing ||
    message?.done_payload?.runtime_hints?.routing ||
    message?.done_payload?.metadata?.routing ||
    {}
  );
}

function commercialCtaAllowedForMessage(message) {
  const routing = readRoutingHints(message);
  return Boolean(
    message?.commercial_cta_allowed === true ||
    message?.allow_commercial_cta === true ||
    message?.metadata?.commercial_cta_allowed === true ||
    routing?.commercial_cta_allowed === true ||
    routing?.human_help_intent === true
  );
}

function hasCommercialCtaSignature(value) {
  const lower = String(value || "").toLowerCase();
  return [
    "pronto para transformar isso em projeto guiado",
    "ready to turn this into a guided project",
    "a equipe patroai/orkio pode mapear",
    "the patroai/orkio team can map",
    "desenhar os agentes certos",
    "design the right agents",
    "orientar o próximo passo",
    "orientar o proximo passo",
    "talk to the team on whatsapp",
    "falar com a equipe no whatsapp",
    "atendimento humano • orkio/patroai",
    "human support • orkio/patroai"
  ].some((marker) => lower.includes(marker));
}

function stripUnrequestedCommercialCta(value, message) {
  const text = String(value || "");
  if (!text || commercialCtaAllowedForMessage(message)) return text;
  if (!hasCommercialCtaSignature(text)) return text;

  const lines = text.split(/\r?\n/);
  const firstCtaLine = lines.findIndex((line) => hasCommercialCtaSignature(line));
  if (firstCtaLine >= 0) {
    return lines.slice(0, firstCtaLine).join("\n").replace(/\n{3,}$/g, "\n\n").trimEnd();
  }

  return text
    .replace(/(?:^|\n)+.*pronto para transformar isso em projeto guiado[\s\S]*$/i, "")
    .replace(/(?:^|\n)+.*ready to turn this into a guided project[\s\S]*$/i, "")
    .trimEnd();
}

function shouldShowSmartNextActions(value) {
  const text = String(value || "").trim();
  if (!text || text.length < 80) return false;
  const lower = text.toLowerCase();

  const executiveMarkers = [
    "diagnostico breve", "diagnóstico breve", "proximo passo sugerido",
    "próximo passo sugerido", "sinal de alerta", "sinais de alerta",
    "acao recomendada", "ação recomendada", "trade-offs", "kpis recomendados",
    "dashboard executivo", "framework de decisão", "framework de decisao",
    "plano de contingência", "plano de contingencia"
  ];
  if (executiveMarkers.some((marker) => lower.includes(marker))) return false;
  if (hasCommercialCtaSignature(text)) return false;

  const safePublicMarkers = [
    "patroai", "orkio", "amcham", "whatsapp", "implantação", "implementation",
    "site institucional", "official patroai website"
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

function suppressCommercialActionsForMessage(message, visibleText) {
  const routing = readRoutingHints(message);
  if (commercialCtaAllowedForMessage(message)) return false;
  if (routing?.commercial_cta_suppressed === true) return true;
  if (String(routing?.execution_trace_priority || "") === "secondary_collapsed") return true;

  const text = String(visibleText || "").toLowerCase();
  if (hasCommercialCtaSignature(text)) return true;

  return [
    "diagnostico breve", "diagnóstico breve", "proximo passo sugerido",
    "próximo passo sugerido", "sinal de alerta", "sinais de alerta",
    "acao recomendada", "ação recomendada", "kpis recomendados",
    "dashboard executivo", "framework de decisão", "framework de decisao",
    "plano de contingência", "plano de contingencia"
  ].some((marker) => text.includes(marker));
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

  const push = (id, label, prompt, options = {}) => {
    if (actions.some((item) => item.id === id)) return;
    actions.push({
      id,
      label,
      prompt,
      behavior: options.behavior || "send-prompt",
      tone: options.tone || (actions.length === 0 ? "primary" : "secondary"),
      pendingLabel: options.pendingLabel || (english ? "Sending…" : "Enviando…"),
      completedLabel: options.completedLabel || (english ? "Sent" : "Enviado"),
    });
  };

  if (english) {
    if (!isImplementationContext) push("implementation", "See implementation", "How does implementation work?");
    if (!isContactContext) push("contact", "Talk to the team", "Can I have your WhatsApp?");
    if (!isSiteContext) push("site", "Visit website", "What is the Patroai website?");
    if (isAmchamContext) {
      push("amcham-use", "AMCHAM use cases", "What can AMCHAM members use Orkio for?");
    } else {
      push(
        "test-case",
        "Test another use case",
        "",
        {
          behavior: "focus-composer",
          tone: "neutral",
          pendingLabel: "Opening…",
          completedLabel: "Composer ready",
        }
      );
    }
  } else {
    if (!isImplementationContext) push("implementation", "Ver implantação", "Como funciona a implantação?");
    if (!isContactContext) push("contact", "Falar com a equipe", "Quero falar com alguém.");
    if (!isSiteContext) push("site", "Conhecer o site", "Qual é o site da Patroai?");
    if (isAmchamContext) {
      push("amcham-use", "Casos AMCHAM", "O que associados da AMCHAM podem testar com o Orkio?");
    } else {
      push(
        "test-case",
        "Testar outro caso",
        "",
        {
          behavior: "focus-composer",
          tone: "neutral",
          pendingLabel: "Abrindo…",
          completedLabel: "Campo pronto",
        }
      );
    }
  }

  return actions.slice(0, 4);
}

export function isSmartNextActionsEligible(value) {
  return buildSmartNextActions(value).length > 0;
}

function SmartNextActions({
  actions,
  onAction,
  disabled = false,
  selectedActionId = "",
  interactionPhase = "idle",
}) {
  if (!Array.isArray(actions) || !actions.length || typeof onAction !== "function") return null;

  const selectedId = String(selectedActionId || "");
  const consumed = interactionPhase === "consumed" && selectedId;
  const visibleActions = consumed
    ? actions.filter((action) => action.id === selectedId)
    : actions;

  return (
    <div
      aria-label="Próximas ações sugeridas"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {visibleActions.map((action) => {
        const isSelected = action.id === selectedId;
        const isSending = isSelected && interactionPhase === "sending";
        const isConsumed = isSelected && interactionPhase === "consumed";
        const isDisabled = Boolean(disabled || isSending || isConsumed);
        const isPrimary = action.tone === "primary";
        const isNeutral = action.tone === "neutral";
        const buttonLabel = isSending
          ? action.pendingLabel
          : isConsumed
            ? action.completedLabel
            : action.label;

        return (
          <button
            key={action.id}
            type="button"
            data-smart-next-action={action.id}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            aria-busy={isSending}
            aria-pressed={isSelected}
            aria-label={action.prompt ? `${action.label}. ${action.prompt}` : action.label}
            onClick={(event) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              if (isDisabled) return;
              onAction(action);
            }}
            title={action.prompt || action.label}
            style={{
              border: isPrimary
                ? "1px solid rgba(125,211,252,0.48)"
                : "1px solid rgba(148,163,184,0.28)",
              borderRadius: 999,
              padding: isPrimary ? "8px 12px" : "7px 10px",
              background: isPrimary
                ? "linear-gradient(135deg, rgba(14,116,144,0.88), rgba(30,64,175,0.78))"
                : isNeutral
                  ? "rgba(255,255,255,0.035)"
                  : "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(30,41,59,0.72))",
              color: "rgba(240,249,255,0.96)",
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled && !isSelected ? 0.48 : 1,
              fontSize: 12,
              fontWeight: isPrimary ? 950 : 850,
              letterSpacing: "0.01em",
              boxShadow: isPrimary
                ? "0 12px 28px rgba(2,132,199,0.20)"
                : "0 10px 24px rgba(0,0,0,0.16)",
              transition: "transform 140ms ease, opacity 140ms ease, border-color 140ms ease",
            }}
          >
            {buttonLabel}
          </button>
        );
      })}
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
  smartNextActionsActive = false,
  smartNextActionsDisabled = false,
  smartNextActionState = null,
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

          const visibleSanitized = !isUser && !isSystem
            ? stripUnrequestedCommercialCta(visible, m)
            : visible;

          const visibleForActions = visibleSanitized || "";

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
                    {renderMessageContentPremium?.(visibleForActions, {
                      message: m,
                      commercialCtaAllowed: commercialCtaAllowedForMessage(m),
                    }) ?? visibleForActions}
                  </div>

                  {!isUser && !isSystem && smartNextActionsActive && visibleForActions && !suppressCommercialActionsForMessage(m, visibleForActions) && (
                    <SmartNextActions
                      actions={buildSmartNextActions(visibleForActions)}
                      disabled={smartNextActionsDisabled}
                      selectedActionId={
                        String(smartNextActionState?.messageId || "") === String(m.id || m.message_id || "")
                          ? smartNextActionState?.actionId
                          : ""
                      }
                      interactionPhase={
                        String(smartNextActionState?.messageId || "") === String(m.id || m.message_id || "")
                          ? smartNextActionState?.phase
                          : "idle"
                      }
                      onAction={(action) => onSmartNextAction?.(action, {
                        messageId: String(m.id || m.message_id || ""),
                      })}
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
