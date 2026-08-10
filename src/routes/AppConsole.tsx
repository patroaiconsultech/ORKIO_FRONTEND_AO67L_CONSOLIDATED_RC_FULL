import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AUTH_REQUIRED_EVENT,
  ApiError,
  AgentDefinition,
  ChatMessage,
  Thread,
  createInvite,
  createThread,
  getToken,
  isApiBaseConfigured,
  listAgents,
  listMessages,
  listThreads,
  streamMessage,
  technicalAgentTarget,
  uploadAttachment,
} from "../api";
import PwaInstallButton from "../components/PwaInstallButton";
import { beginLogin, isOidcConfigured, logout } from "../auth/oidc";

const AGENT = "Orkio";

/** Traduz códigos do backend em mensagens compreensíveis. */
function describe(error: unknown): string {
  const code = error instanceof ApiError ? error.code : String(error ?? "");
  const table: Record<string, string> = {
    API_BASE_URL_NOT_CONFIGURED:
      "A URL da API não está configurada nesta implantação.",
    LLM_NOT_CONFIGURED:
      "A integração de linguagem ainda não está configurada no servidor.",
    LLM_UPSTREAM_ERROR: "O provedor de linguagem falhou. Tente novamente.",
    LLM_EMPTY_RESPONSE: "O provedor devolveu resposta vazia.",
    AUTH_PROVIDER_REQUIRED: "É necessário autenticar-se para continuar.",
    BEARER_TOKEN_REQUIRED: "Sessão ausente ou expirada.",
    TOKEN_INACTIVE: "Sessão expirada. Autentique-se novamente.",
    TOKEN_ISSUER_INVALID: "O emissor da sessão não é reconhecido.",
    TOKEN_AUDIENCE_INVALID: "A sessão não foi emitida para esta plataforma.",
    IDENTITY_PROVIDER_UNAVAILABLE:
      "O provedor de identidade está temporariamente indisponível.",
    PRINCIPAL_NOT_PROVISIONED:
      "Sua identidade ainda não está provisionada nesta organização.",
    THREAD_NOT_FOUND: "Conversa não encontrada.",
    THREAD_ACCESS_DENIED: "Você não participa desta conversa.",
    THREAD_READ_ONLY: "Seu perfil nesta conversa é somente leitura.",
    INVITE_ROLE_REQUIRED:
      "Apenas o proprietário ou um moderador pode convidar participantes.",
    AGENT_NOT_FOUND: "O agente selecionado não está disponível.",
    ARTIFACTS_DISABLED: "O envio de anexos está desabilitado no servidor.",
    UPLOAD_PERMISSION_REQUIRED: "Você não tem permissão para enviar arquivos.",
    FILE_TOO_LARGE: "Arquivo acima do tamanho máximo permitido.",
    MIME_TYPE_NOT_ALLOWED: "Tipo de arquivo não permitido.",
    REALTIME_STREAMING_DISABLED: "O tempo real está desabilitado no servidor.",
    PERSISTENCE_FAILED: "A resposta não pôde ser gravada.",
    NETWORK_ERROR: "Falha de rede. Verifique sua conexão.",
  };
  if (table[code]) return table[code];
  if (error instanceof ApiError && error.status === 401)
    return "Sessão ausente ou expirada.";
  return code ? `Não foi possível concluir a ação (${code}).` : "Erro inesperado.";
}

export default function AppConsole() {
  const [message, setMessage] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string>(
    () => new URLSearchParams(window.location.search).get("thread") || "",
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(() => Boolean(getToken()));
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [showAgents, setShowAgents] = useState(false);
  const [agentsBusy, setAgentsBusy] = useState(false);
  const [agentsError, setAgentsError] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const configured = isApiBaseConfigured();
  const authConfigured = isOidcConfigured();

  const selectThread = useCallback((id: string) => {
    setThreadId(id);
    setMessages([]);
    setStreamingText("");
    setError("");
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("thread", id);
    else url.searchParams.delete("thread");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!configured || !authenticated) return;
    try {
      const data = await listThreads();
      setThreads(data.items);
    } catch (err) {
      setError(describe(err));
    }
  }, [authenticated, configured]);

  const refreshMessages = useCallback(async () => {
    if (!configured || !authenticated || !threadId) return;
    setLoading(true);
    try {
      setMessages(await listMessages(threadId));
    } catch (err) {
      setError(describe(err));
    } finally {
      setLoading(false);
    }
  }, [authenticated, configured, threadId]);

  const refreshAgents = useCallback(async () => {
    if (!configured || !authenticated) return;
    setAgentsBusy(true);
    setAgentsError("");
    try {
      const catalog = await listAgents();
      setAgents(catalog);
      setSelectedAgent((current) => {
        if (current) {
          return catalog.find((agent) => agent.slug === current.slug) ?? null;
        }
        return (
          catalog.find((agent) => agent.slug.toLowerCase() === "orkio") ??
          catalog[0] ??
          null
        );
      });
    } catch (err) {
      setAgents([]);
      setSelectedAgent(null);
      setAgentsError(describe(err));
    } finally {
      setAgentsBusy(false);
    }
  }, [authenticated, configured]);

  useEffect(() => {
    void refreshAgents();
  }, [refreshAgents]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const handleAuthRequired = () => setAuthenticated(Boolean(getToken()));
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () =>
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, []);

  function requireAuthenticated(): boolean {
    if (authenticated) return true;
    setError(
      authConfigured
        ? "Autentique-se para continuar."
        : "A autenticação OIDC ainda não está configurada nesta implantação.",
    );
    return false;
  }

  async function handleNewThread() {
    if (!requireAuthenticated()) return;
    if (!configured) {
      setError(describe("API_BASE_URL_NOT_CONFIGURED"));
      return;
    }
    setError("");
    try {
      const created = await createThread();
      await refreshThreads();
      selectThread(created.id);
      setNotice("Conversa criada.");
    } catch (err) {
      setError(describe(err));
    }
  }

  async function handleSend() {
    const content = message.trim();
    if (!content || sending) return;
    if (!requireAuthenticated()) return;
    if (!threadId) {
      setError("Crie ou selecione uma conversa antes de enviar.");
      return;
    }

    setError("");
    setNotice("");
    setSending(true);
    setStreamingText("");
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      author_type: "user",
      agent_name: null,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setMessage("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamMessage(
        threadId,
        content,
        selectedAgent ? technicalAgentTarget(selectedAgent.slug) : "Josué",
        {
          onChunk: (text) => setStreamingText((current) => current + text),
          onError: (code) => setError(describe(new ApiError(0, code))),
          onDone: () => {
            setStreamingText("");
            void refreshMessages();
          },
        },
        controller.signal,
      );
    } catch (err) {
      setError(describe(err));
    } finally {
      abortRef.current = null;
      setSending(false);
      setStreamingText("");
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!requireAuthenticated()) return;
    if (!threadId) {
      setError("Crie ou selecione uma conversa antes de anexar.");
      return;
    }
    setError("");
    setNotice("");
    try {
      const uploaded = await uploadAttachment(threadId, file);
      setNotice(`Anexo enviado: ${uploaded.filename}`);
    } catch (err) {
      setError(describe(err));
    }
  }

  async function invite() {
    if (!requireAuthenticated()) {
      setInviteError(
        authConfigured
          ? "Autentique-se para convidar participantes."
          : "A autenticação OIDC ainda não está configurada.",
      );
      return;
    }
    if (!threadId) {
      setInviteError("Crie ou selecione uma conversa antes de convidar.");
      return;
    }
    setInviteError("");
    setInviteUrl("");
    setInviteBusy(true);
    try {
      const out = await createInvite(threadId, {
        email,
        role: "participant",
        history_access: "from_join",
      });
      setInviteUrl(out.invitation_url);
    } catch (err) {
      setInviteError(describe(err));
    } finally {
      setInviteBusy(false);
    }
  }

  return (
    <div className="console-shell">
      <aside className="console-sidebar" aria-label="Navegação do console">
        <Link className="brand-lockup brand-lockup--compact" to="/">
          <span className="brand-orb" aria-hidden="true" />
          <span>ORKIO™</span>
        </Link>
        <button
          type="button"
          className="primary-button"
          onClick={handleNewThread}
          disabled={!authenticated || !configured}
        >
          + Nova conversa
        </button>
        <nav className="conversation-nav" aria-label="Conversas">
          <strong>Conversas</strong>
          {threads.length === 0 ? (
            <span>Nenhuma conversa selecionada</span>
          ) : (
            <ul className="conversation-list">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    className={
                      thread.id === threadId
                        ? "conversation-item conversation-item--active"
                        : "conversation-item"
                    }
                    aria-current={thread.id === threadId ? "true" : undefined}
                    onClick={() => selectThread(thread.id)}
                  >
                    {thread.title || "Nova conversa"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <PwaInstallButton compact />
      </aside>

      <main id="main-content" className="console-main">
        <header className="console-header">
          <div>
            <b>ORKIO Command Center</b>
            <small>Collaborative Intelligence</small>
          </div>
          <div className="console-header__actions">
            <Link className="ghost-link" to="/">
              Início
            </Link>
            {authConfigured ? (
              authenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setAuthenticated(false);
                  }}
                >
                  Sair
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    void beginLogin(
                      `${window.location.pathname}${window.location.search}`,
                    )
                  }
                >
                  Entrar
                </button>
              )
            ) : null}
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              disabled={!authenticated}
            >
              + Convidar
            </button>
          </div>
        </header>

        {!authenticated ? (
          <div className="console-alert" role="alert">
            <span>
              {authConfigured
                ? "Autentique-se para usar conversas, anexos e convites."
                : "A autenticação OIDC ainda não está configurada nesta implantação."}
            </span>
            {authConfigured ? (
              <button type="button" onClick={() => void beginLogin("/app")}>
                Entrar
              </button>
            ) : null}
          </div>
        ) : null}
        {!configured ? (
          <p className="console-alert" role="alert">
            A URL da API não está configurada nesta implantação.
          </p>
        ) : null}
        {error ? (
          <p className="console-alert" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="console-notice" role="status">
            {notice}
          </p>
        ) : null}

        <section className="thread" aria-label="Conversa" aria-busy={loading}>
          {messages.length === 0 && !streamingText ? (
            <article className="message agent">
              <b>Orkio</b>
              <p>Onde a inteligência encontra harmonia.</p>
            </article>
          ) : (
            messages.map((item) => (
              <article
                key={item.id}
                className={item.author_type === "agent" ? "message agent" : "message user"}
              >
                <b>{item.author_type === "agent" ? item.agent_name || AGENT : "Você"}</b>
                <p>{item.content}</p>
              </article>
            ))
          )}
          {streamingText ? (
            <article className="message agent" aria-live="polite">
              <b>{selectedAgent?.display_name || AGENT}</b>
              <p>{streamingText}</p>
            </article>
          ) : null}
        </section>

        <footer className="composer">
          <label className="icon-button" aria-label="Anexar arquivo">
            <span aria-hidden="true">📎</span>
            <input
              type="file"
              hidden
              ref={fileRef}
              onChange={handleFile}
              disabled={!authenticated || sending}
            />
          </label>
          <button
            type="button"
            className="agent-trigger"
            onClick={() => setShowAgents(true)}
            aria-label="Selecionar agente"
            aria-haspopup="dialog"
            disabled={!authenticated}
            title="Selecionar agente"
          >
            <span aria-hidden="true">👥</span>
            <span className="agent-trigger__label">
              {selectedAgent?.display_name || "Agentes"}
            </span>
          </button>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Digite sua mensagem."
            aria-label="Mensagem"
            disabled={sending || !authenticated}
          />
          <button
            type="button"
            className="icon-button"
            aria-label="Voz"
            title="Voz ainda não habilitada"
            disabled
          >
            🎙
          </button>
          <button
            type="button"
            className="primary-button composer__send"
            onClick={handleSend}
            disabled={
              sending || !message.trim() || !authenticated || !configured
            }
          >
            {sending ? "Enviando." : "Enviar"}
          </button>
        </footer>
      </main>



      {showAgents ? (
        <div className="modal" role="presentation">
          <section
            className="modal-card agent-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-picker-title"
          >
            <div className="agent-picker__heading">
              <div>
                <h2 id="agent-picker-title">Inteligência colaborativa</h2>
                <p>Escolha o especialista que será solicitado para o próximo turno.</p>
              </div>
              <button type="button" onClick={() => setShowAgents(false)} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="agent-mode" aria-label="Modo de execução">
              <button type="button" className="agent-mode__active" aria-pressed="true">
                Individual
              </button>
              <button
                type="button"
                disabled
                title="Modo Team depende do contrato backend governado."
              >
                Team · em breve
              </button>
            </div>

            {agentsBusy ? <p role="status">Carregando Agent Registry…</p> : null}
            {agentsError ? (
              <div className="console-alert" role="alert">
                <span>{agentsError}</span>
                <button type="button" onClick={() => void refreshAgents()}>
                  Tentar novamente
                </button>
              </div>
            ) : null}
            {!agentsBusy && !agentsError && agents.length === 0 ? (
              <p className="agent-picker__empty">Nenhum agente disponível no Registry.</p>
            ) : null}

            <div className="agent-grid" role="list" aria-label="Agentes disponíveis">
              {agents.map((agent) => {
                const active = selectedAgent?.slug === agent.slug;
                return (
                  <button
                    type="button"
                    role="listitem"
                    key={agent.slug}
                    className={active ? "agent-card agent-card--active" : "agent-card"}
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setShowAgents(false);
                      setNotice(`Agente selecionado: ${agent.display_name}`);
                    }}
                  >
                    <span className="agent-card__avatar" aria-hidden="true">
                      {agent.display_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{agent.display_name}</strong>
                      <small>{agent.target_kind === "agent" ? "Agente especializado" : agent.target_kind}</small>
                    </span>
                    <span className="agent-card__status">{active ? "Ativo" : "Disponível"}</span>
                  </button>
                );
              })}
            </div>

            <p className="agent-picker__governance">
              O executor real é resolvido pelo backend. A interface não substitui a identidade de execução.
            </p>
          </section>
        </div>
      ) : null}
      {showInvite ? (
        <div className="modal" role="presentation">
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
          >
            <h2 id="invite-title">Convidar participante</h2>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@empresa.com"
              />
            </label>
            <p>
              Função: Participante · Histórico: a partir da entrada · Validade: 72
              horas
            </p>
            {inviteError ? (
              <p className="console-alert" role="alert">
                {inviteError}
              </p>
            ) : null}
            {inviteUrl ? <output>{inviteUrl}</output> : null}
            <div className="modal-card__actions">
              <button type="button" onClick={() => setShowInvite(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={invite}
                disabled={inviteBusy || !authenticated}
              >
                {inviteBusy ? "Gerando." : "Gerar convite"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
