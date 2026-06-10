import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../ui/api.js";
import { runEvolutionDryRun } from "../lib/adminEvolutionDryRun.js";
import {
  getTenant,
  getToken,
  getUser,
  hasAdminConsoleAccess,
  isAdmin,
  isMasterAdmin,
} from "../lib/auth.js";

const CARD = "rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur";
const BTN = "rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const INPUT = "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35";
const TEXTAREA = "w-full min-h-[92px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35";

const BUILD_SIGNATURE = "AO-17C-AO18A-apply-revert-restore-point";

function nowLabel() {
  try {
    return new Date().toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

function ts(v) {
  if (!v) return "-";
  try {
    if (typeof v === "string" && v.includes("T")) return new Date(v).toLocaleString("pt-BR");
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return new Date((n > 10_000_000_000 ? n : n * 1000)).toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

function pretty(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

function extractError(err) {
  const detail = err?.data?.detail || err?.data?.message;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    return detail.reason || detail.message || JSON.stringify(detail);
  }
  return err?.message || "Falha na operação.";
}

function unwrapPayload(data) {
  if (!data) return null;
  if (data.data && data.data !== data) return data.data;
  return data;
}

function normalizeList(raw) {
  const d = unwrapPayload(raw);
  const source =
    Array.isArray(d) ? d :
    Array.isArray(d?.items) ? d.items :
    Array.isArray(d?.proposals) ? d.proposals :
    Array.isArray(d?.data?.items) ? d.data.items :
    [];
  return source.map(normalizeProposal).filter(Boolean);
}

function normalizeProposal(raw) {
  const p = raw?.item || raw?.proposal || raw;
  if (!p || typeof p !== "object") return null;
  const id = p.proposal_id || p.id || p.uuid || p.key;
  if (!id) return null;

  return {
    ...p,
    proposal_id: id,
    title: p.title || p.titulo || p.name || "Proposta de evolução controlada",
    status: p.status || p.proposal_status || "pending_approval",
    risk: p.risk || p.risk_band || p.risco || "baixo_medio",
    summary: p.summary || p.resumo || p.description || p.objective || "",
    rollback_plan: p.rollback_plan || p.rollback || p.rollbackPlan || "",
    validation_checklist: p.validation_checklist || p.checklist || p.validation || [],
    created_at: p.created_at || p.createdAt || p.created_ts || p.created,
    updated_at: p.updated_at || p.updatedAt || p.updated_ts || p.updated,
    execution_status: p.execution_status || p.executionStatus || "not_started",
    can_dry_run: p.can_dry_run === true || p.canDryRun === true,
    can_execute_real: p.can_execute_real === true || p.canExecuteReal === true,
    dry_run_endpoint: p.dry_run_endpoint || p.dryRunEndpoint || "",
    execution_enabled: p.execution_enabled === true ? true : false,
  };
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (["approved", "completed"].includes(s)) return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
  if (["rejected", "failed", "rolled_back"].includes(s)) return "border-rose-400/25 bg-rose-400/10 text-rose-100";
  if (["running"].includes(s)) return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  return "border-sky-400/25 bg-sky-400/10 text-sky-100";
}

function riskTone(risk) {
  const r = String(risk || "").toLowerCase();
  if (r.includes("alto") || r.includes("high") || r.includes("critical")) return "border-rose-400/25 bg-rose-400/10 text-rose-100";
  if (r.includes("medio") || r.includes("médio") || r.includes("medium")) return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
}

function Pill({ children, className = "" }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div className="mb-4">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200/70">{eyebrow}</p> : null}
      <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
      {children ? <p className="mt-2 text-sm leading-relaxed text-white/62">{children}</p> : null}
    </div>
  );
}

function KeyValue({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className={`mt-1 text-sm text-white/85 ${mono ? "font-mono" : ""}`}>{pretty(value)}</div>
    </div>
  );
}

export default function AdminEvolutionCenter() {
  const nav = useNavigate();
  const token = getToken();
  const tenant = getTenant() || "public";
  const user = getUser();
  const allowed = Boolean(token && (isAdmin(user) || isMasterAdmin(user) || hasAdminConsoleAccess(user)));

  useEffect(() => {
    try {
      window.__ORKIO_ADMIN_EVOLUTION_BUILD__ = BUILD_SIGNATURE;
      document.documentElement.setAttribute("data-orkio-admin-evolution-build", BUILD_SIGNATURE);
      console.info(`[${BUILD_SIGNATURE}] AdminEvolutionCenter mounted`, {
        href: window.location.href,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Diagnóstico não bloqueante.
    }
  }, []);


  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [plan, setPlan] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectReason, setRejectReason] = useState("Rejeitado pelo Admin após revisão.");
  const [lastRefresh, setLastRefresh] = useState("");
  const [dryRunResult, setDryRunResult] = useState(null);
  const [branchPrPlan, setBranchPrPlan] = useState(null);
  const [branchCreateResult, setBranchCreateResult] = useState(null);
  const [branchPatchResult, setBranchPatchResult] = useState(null);
  const [branchRevertResult, setBranchRevertResult] = useState(null);

  const selected = useMemo(() => {
    const found = items.find(x => String(x.proposal_id) === String(selectedId));
    return detail || found || null;
  }, [items, selectedId, detail]);

  const loadList = useCallback(async () => {
    if (!allowed) return;
    const data = await apiFetch("/api/admin/evolution/proposals", { token, org: tenant });
    const next = normalizeList(data);
    setItems(next);
    if (!selectedId && next[0]?.proposal_id) setSelectedId(next[0].proposal_id);
    return next;
  }, [allowed, selectedId, tenant, token]);

  const loadExecutions = useCallback(async () => {
    if (!allowed) return;
    try {
      const data = await apiFetch("/api/admin/evolution/executions", { token, org: tenant });
      const payload = unwrapPayload(data);
      const arr = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.executions) ? payload.executions : [];
      setExecutions(arr);
    } catch (err) {
      // Execuções podem ainda não existir; não derruba o console.
      setExecutions([]);
    }
  }, [allowed, tenant, token]);

  const loadDetail = useCallback(async (id) => {
    if (!allowed || !id) return null;
    const data = await apiFetch(`/api/admin/evolution/proposals/${encodeURIComponent(id)}`, { token, org: tenant });
    const payload = unwrapPayload(data);
    const normalized = normalizeProposal(payload?.item || payload?.proposal || payload);
    setDetail(normalized);
    return normalized;
  }, [allowed, tenant, token]);

  const loadPlan = useCallback(async (id) => {
    if (!allowed || !id) return null;
    const data = await apiFetch(`/api/admin/evolution/proposals/${encodeURIComponent(id)}/execution-plan`, { token, org: tenant });
    const payload = unwrapPayload(data);
    setPlan(payload);
    setBranchPrPlan(payload?.branch_pr_plan || payload?.plan?.branch_pr_plan || null);
    return payload;
  }, [allowed, tenant, token]);

  const loadBranchPrPlan = useCallback(async (id) => {
    if (!allowed || !id) return null;
    const data = await apiFetch(`/api/admin/evolution/proposals/${encodeURIComponent(id)}/branch-pr-plan`, { token, org: tenant });
    const payload = unwrapPayload(data);
    const planPayload = payload?.plan || payload?.branch_pr_plan || payload;
    setBranchPrPlan(planPayload);
    return planPayload;
  }, [allowed, tenant, token]);

  const refreshAll = useCallback(async () => {
    if (!allowed) return;
    setBusy(true);
    setError("");
    setNotice("");
    setDryRunResult(null);
    setBranchPrPlan(null);
    setBranchCreateResult(null);
      setBranchPatchResult(null);
      setBranchRevertResult(null);
    try {
      const next = await loadList();
      const id = selectedId || next?.[0]?.proposal_id;
      if (id) {
        await loadDetail(id);
        await loadPlan(id);
      }
      await loadExecutions();
      setLastRefresh(nowLabel());
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }, [allowed, loadDetail, loadExecutions, loadList, loadPlan, selectedId]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!selectedId || !allowed) return;
    setError("");
    setNotice("");
    setPlan(null);
    setDryRunResult(null);
    setBranchPrPlan(null);
    setBranchCreateResult(null);
    loadDetail(selectedId)
      .then(() => loadPlan(selectedId))
      .catch(err => setError(extractError(err)));
  }, [allowed, loadDetail, loadPlan, selectedId]);

  async function approve(id) {
    if (!id) return;
    setActionBusy(`approve:${id}`);
    setError("");
    setNotice("");
    try {
      const data = await apiFetch(`/api/admin/evolution/proposals/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        token,
        org: tenant,
      });
      const payload = unwrapPayload(data);
      const next = normalizeProposal(payload?.item || payload?.proposal || payload);
      if (next) setDetail(next);
      setNotice("Proposta aprovada. Execução continua desabilitada até o próximo ciclo controlado.");
      await refreshAll();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionBusy("");
    }
  }

  async function reject(id) {
    if (!id) return;
    setActionBusy(`reject:${id}`);
    setError("");
    setNotice("");
    try {
      const data = await apiFetch(`/api/admin/evolution/proposals/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        token,
        org: tenant,
        body: { reason: rejectReason || "Rejeitado pelo Admin." },
      });
      const payload = unwrapPayload(data);
      const next = normalizeProposal(payload?.item || payload?.proposal || payload);
      if (next) setDetail(next);
      setNotice("Proposta rejeitada. Nenhuma execução foi iniciada.");
      await refreshAll();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionBusy("");
    }
  }

  async function runDryRun(id) {
    if (!id) return;
    setActionBusy(`dry-run:${id}`);
    setError("");
    setNotice("");
    setDryRunResult(null);
    try {
      const data = await runEvolutionDryRun(id, { token, org: tenant });
      const payload = unwrapPayload(data);
      setDryRunResult(payload);
      setNotice(`Dry-run governado concluído: ${payload?.execution_id || "execution_id retornado pelo backend"}. Execução real permaneceu bloqueada.`);
      await loadDetail(id);
      await loadPlan(id);
      await loadBranchPrPlan(id);
      await loadExecutions();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionBusy("");
    }
  }

  async function createTemporaryBranch(id) {
    if (!id) return;
    setActionBusy(`create-branch:${id}`);
    setError("");
    setNotice("");
    setBranchCreateResult(null);
    try {
      // AO-17B_UI_ALLOW_SAFE_AO02B_BRANCH_CREATION
      // Para propostas frontend-only, criar branch apenas no repo web.
      // Mantém backend untouched no teste AO-02B.
      const activeProposal = String(selected?.proposal_id || "") === String(id || "")
        ? selected
        : items.find((x) => String(x?.proposal_id || "") === String(id || ""));
      const activeTargetFiles = Array.isArray(activeProposal?.target_files)
        ? activeProposal.target_files
        : Array.isArray(activeProposal?.targetFiles)
        ? activeProposal.targetFiles
        : [];
      const frontendOnly = activeTargetFiles.length > 0 && activeTargetFiles.every((item) => {
        const value = String(item || "").trim().toLowerCase();
        return (
          value.startsWith("src/") ||
          value.startsWith("public/") ||
          value.endsWith(".jsx") ||
          value.endsWith(".tsx") ||
          value.endsWith(".css") ||
          value.endsWith(".html")
        );
      });
      const repoTarget = frontendOnly ? "frontend" : "both";

      const data = await apiFetch(`/api/admin/evolution/proposals/${encodeURIComponent(id)}/create-branch`, {
        method: "POST",
        token,
        org: tenant,
        body: { repo_target: repoTarget },
      });
      const payload = unwrapPayload(data);
      setBranchCreateResult(payload);
      const branch = payload?.branch || payload?.branch_name || "branch temporária";
      const execution = payload?.execution_id ? ` • ${payload.execution_id}` : "";
      setNotice(`AO-17B: branch governada criada/confirmada (${branch})${execution}. Nenhum arquivo, commit, PR, merge, deploy ou migration foi executado.`);
      await loadDetail(id);
      await loadPlan(id);
      await loadBranchPrPlan(id);
      await loadExecutions();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionBusy("");
    }
  }


  async function applyBranchPatch(id) {
    if (!id) return;
    const targetBranch = effectiveBranchPrPlan?.target_branch || effectiveBranchPrPlan?.suggested_branch || "ao-17/evo_0c29e7b01d21";
    setActionBusy(`apply-branch-patch:${id}`);
    setError("");
    setNotice("");
    setBranchPatchResult(null);
    setBranchRevertResult(null);
    try {
      const data = await apiFetch(`/api/admin/evolution/proposals/${encodeURIComponent(id)}/apply-branch-patch`, {
        method: "POST",
        token,
        org: tenant,
        body: {
          branch: targetBranch,
          repo_target: "both",
          confirm_restore_point: true,
        },
      });
      const payload = unwrapPayload(data);
      setBranchPatchResult(payload);
      const restorePoint = payload?.restore_point_id ? ` • restore_point=${payload.restore_point_id}` : "";
      const execution = payload?.execution_id ? ` • ${payload.execution_id}` : "";
      const pending = payload?.verification_pending ? " com verificação pendente" : "";
      setNotice(`AO-17C/AO-18A: patch aceito${pending} na branch ${payload?.target_branch || targetBranch}${restorePoint}${execution}. Reversão disponível. Main/PR/deploy/migration seguem bloqueados.`);
      await loadDetail(id);
      await loadPlan(id);
      await loadBranchPrPlan(id);
      await loadExecutions();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionBusy("");
    }
  }

  async function revertBranchPatch(id) {
    if (!id) return;
    const statusesWithRestore = new Set([
      "branch_patch_applied",
      "branch_patch_verification_pending",
      "branch_patch_failed",
    ]);
    const latestApplied = executions.find(x => {
      const status = String(x?.status || "").trim();
      if (String(x?.proposal_id || "") !== String(id || "")) return false;
      if (!statusesWithRestore.has(status)) return false;
      const result = x?.result || {};
      const receipts = Array.isArray(result?.file_receipts) ? result.file_receipts : [];
      const hasBranchWrite = receipts.some(item => Boolean(item?.commit_sha || item?.write_accepted || item?.raw_result?.commit_sha || item?.raw_result?.write_accepted));
      return status !== "branch_patch_failed" || hasBranchWrite;
    });
    const restorePointId = branchPatchResult?.restore_point_id || latestApplied?.result?.restore_point_id || "";
    const executionId = branchPatchResult?.execution_id || latestApplied?.execution_id || "";
    setActionBusy(`revert-branch-patch:${id}`);
    setError("");
    setNotice("");
    setBranchRevertResult(null);
    try {
      const data = await apiFetch(`/api/admin/evolution/proposals/${encodeURIComponent(id)}/revert-branch-patch`, {
        method: "POST",
        token,
        org: tenant,
        body: {
          restore_point_id: restorePointId,
          execution_id: executionId,
          repo_target: "both",
        },
      });
      const payload = unwrapPayload(data);
      setBranchRevertResult(payload);
      const restorePoint = payload?.restore_point_id ? ` • restore_point=${payload.restore_point_id}` : "";
      const execution = payload?.execution_id ? ` • ${payload.execution_id}` : "";
      setNotice(`AO-18A: reversão aplicada na branch ${payload?.target_branch || payload?.branch || ""}${restorePoint}${execution}. Main permaneceu intacta.`);
      await loadDetail(id);
      await loadPlan(id);
      await loadBranchPrPlan(id);
      await loadExecutions();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionBusy("");
    }
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[#070711] px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className={CARD}>
            <SectionTitle eyebrow="Acesso restrito" title="Evolution Console">
              Faça login com uma conta Admin para governar propostas de evolução.
            </SectionTitle>
            <button onClick={() => nav("/auth")} className={`${BTN} bg-white text-black hover:bg-white/90`}>
              Ir para login
            </button>
          </div>
        </div>
      </main>
    );
  }

  const proposalCount = items.length;
  const pendingCount = items.filter(x => String(x.status).toLowerCase().includes("pending")).length;
  const approvedCount = items.filter(x => String(x.status).toLowerCase() === "approved").length;
  const rejectedCount = items.filter(x => String(x.status).toLowerCase() === "rejected").length;
  const planExecutionEnabled = plan?.execution_enabled === true || selected?.execution_enabled === true;
  const selectedStatus = String(selected?.status || selected?.proposal_status || "").trim().toLowerCase();
  const selectedExecutionStatus = String(plan?.execution_status || selected?.execution_status || "not_started").trim().toLowerCase();
  const selectedDryRunAvailable = Boolean(
    plan?.can_dry_run === true ||
    selected?.can_dry_run === true ||
    plan?.dry_run_endpoint ||
    selected?.dry_run_endpoint
  );
  const selectedBlocksRealExecution = Boolean(
    planExecutionEnabled === false &&
    plan?.can_execute_real !== true &&
    selected?.can_execute_real !== true
  );
  const selectedCanDryRun = Boolean(
    selected &&
    selectedStatus === "approved" &&
    selectedDryRunAvailable &&
    selectedExecutionStatus !== "dry_run_completed" &&
    selectedBlocksRealExecution
  );
  const selectedIsPending = selectedStatus.includes("pending");
  const selectedIsRejected = selectedStatus === "rejected";
  const selectedIsDryRunCompleted = selectedExecutionStatus === "dry_run_completed";
  const effectiveBranchPrPlan = branchPrPlan || plan?.branch_pr_plan || null;
  const effectiveBranchPrPlanStage = String(effectiveBranchPrPlan?.stage || "").trim().toUpperCase();
  const effectiveBranchPrPlanMode = String(effectiveBranchPrPlan?.mode || "").trim();
  const selectedTitle = String(selected?.title || "").toLowerCase();

  // AO-23B_DYNAMIC_NEXT_STAGE_UI
  // Render the post-dry-run plan card according to the actual backend plan.
  const selectedIsAo23bFrontendPushProposal = Boolean(
    selectedTitle.includes("ao-23b") ||
    effectiveBranchPrPlanStage === "AO-23B" ||
    effectiveBranchPrPlanMode === "governed_frontend_push_plan_readonly"
  );

  const selectedIsAo23PublicationProposal = Boolean(
    !selectedIsAo23bFrontendPushProposal &&
    (
      selectedTitle.includes("ao-23") ||
      effectiveBranchPrPlanStage === "AO-23" ||
      effectiveBranchPrPlanMode === "governed_frontend_publication_plan_readonly"
    )
  );

  const selectedIsAo22MergeProposal = Boolean(
    !selectedIsAo23bFrontendPushProposal &&
    !selectedIsAo23PublicationProposal &&
    (
      selectedTitle.includes("ao-22") ||
      effectiveBranchPrPlanStage === "AO-22" ||
      effectiveBranchPrPlanMode === "governed_merge_plan_readonly"
    )
  );

  const canPreparePushPlan = Boolean(
    effectiveBranchPrPlan?.can_prepare_push ||
    (
      (selectedIsAo23bFrontendPushProposal || selectedIsAo23PublicationProposal) &&
      selectedIsDryRunCompleted &&
      selectedBlocksRealExecution
    )
  );

  const canPrepareMergePlan = Boolean(
    !selectedIsAo23bFrontendPushProposal &&
    !selectedIsAo23PublicationProposal &&
    (
      effectiveBranchPrPlan?.can_prepare_merge ||
      (selectedIsAo22MergeProposal && selectedIsDryRunCompleted && selectedBlocksRealExecution)
    )
  );

  const canPrepareBranchPr = Boolean(
    !selectedIsAo23bFrontendPushProposal &&
    !selectedIsAo23PublicationProposal &&
    !selectedIsAo22MergeProposal &&
    (
      effectiveBranchPrPlan?.can_prepare_branch_pr ||
      (selectedIsDryRunCompleted && selectedBlocksRealExecution)
    )
  );

  const branchPrPlanCapabilityReady = selectedIsAo23bFrontendPushProposal
    ? canPreparePushPlan
    : selectedIsAo23PublicationProposal
    ? canPreparePushPlan
    : selectedIsAo22MergeProposal
    ? canPrepareMergePlan
    : canPrepareBranchPr;

  const branchPrPlanCapabilityLabel = selectedIsAo23bFrontendPushProposal
    ? `can_prepare_push=${String(Boolean(canPreparePushPlan))}`
    : selectedIsAo23PublicationProposal
    ? `can_prepare_push=${String(Boolean(canPreparePushPlan))}`
    : selectedIsAo22MergeProposal
    ? `can_prepare_merge=${String(Boolean(canPrepareMergePlan))}`
    : `can_prepare_branch_pr=${String(Boolean(canPrepareBranchPr))}`;

  const branchPrPlanCardTitle = selectedIsAo23bFrontendPushProposal
    ? "AO-23B — Plano Read-only de Push Governado do Frontend"
    : selectedIsAo23PublicationProposal
    ? "AO-23 — Plano Read-only de Publicação do Frontend"
    : selectedIsAo22MergeProposal
    ? "AO-22 — Plano Read-only de Merge Governado"
    : "AO-17A — Branch/PR Runner Governado";

  const branchPrPlanCardDescription = selectedIsAo23bFrontendPushProposal
    ? "Prepara a revisão do push governado dos commits 6ea230c e 7c65e6d. Esta etapa ainda é read-only: não faz push adicional, não faz deploy manual, não executa migration e não altera API."
    : selectedIsAo23PublicationProposal
    ? "Prepara a revisão do push governado do commit 6ea230c. Esta etapa ainda é read-only: não faz push, não faz deploy, não executa migration e não altera API."
    : selectedIsAo22MergeProposal
    ? "Prepara a revisão do merge futuro do PR #6. Esta etapa ainda é read-only: não faz merge, não faz deploy, não executa migration e não escreve diretamente em main."
    : "Transforma o dry-run aprovado em contrato de execução futura em branch/PR. Esta etapa ainda é read-only: não cria branch, não escreve no repositório, não cria commit, não abre PR, não faz merge, deploy ou migration.";

  const branchPrPlanReadyLabel = selectedIsAo23bFrontendPushProposal
    ? "Dry-run concluído. AO-23B pode ser revisado."
    : selectedIsAo23PublicationProposal
    ? "Dry-run concluído. AO-23 pode ser revisado."
    : selectedIsAo22MergeProposal
    ? "Dry-run concluído. AO-22 pode ser revisado."
    : "Dry-run concluído. AO-17A pode ser revisado.";

  const branchPrPlanNextSafeText = selectedIsAo23bFrontendPushProposal
    ? "O próximo GO seguro é AO-23C: execução governada do push/publicação, com validação de build e observação de deploy automático se disparar."
    : selectedIsAo23PublicationProposal
    ? "O próximo GO seguro é preparar AO-23B: push governado do commit 6ea230c, com validação de build e observação de deploy automático se disparar."
    : selectedIsAo22MergeProposal
    ? "O próximo GO seguro é preparar merge governado do PR #6, com preflight obrigatório e aprovação Admin antes de qualquer merge real."
    : "O próximo GO seguro é preparar branch/PR, com rollback_plan obrigatório e aprovação Admin antes de qualquer escrita real.";

  const branchPrPlanButtonLabel = selectedIsAo23bFrontendPushProposal
    ? "Carregar plano AO-23B"
    : selectedIsAo23PublicationProposal
    ? "Carregar plano AO-23"
    : selectedIsAo22MergeProposal
    ? "Carregar plano AO-22"
    : "Carregar plano AO-17A";

  const dryRunPlanTitle = selectedIsAo23bFrontendPushProposal
    ? "Dry-run governado AO-23B"
    : selectedIsAo23PublicationProposal
    ? "Dry-run governado AO-23"
    : selectedIsAo22MergeProposal
    ? "Dry-run governado AO-22"
    : "Dry-run governado AO-16D";

  const dryRunPlanDescription = selectedIsAo23bFrontendPushProposal
    ? "Após aprovação Admin, o console simula o push governado do frontend e registra diff, smoke e rollback sem executar deploy manual ou migration."
    : selectedIsAo23PublicationProposal
    ? "Após aprovação Admin, o console simula a publicação governada do frontend e registra diff, smoke e rollback sem executar push, deploy ou migration."
    : "Após aprovação Admin, o console pode simular a execução e registrar diff, smoke e rollback sem aplicar mudanças reais.";

  const selectedTargetFiles = Array.isArray(selected?.target_files)
    ? selected.target_files
    : Array.isArray(selected?.targetFiles)
    ? selected.targetFiles
    : [];
  const selectedIsAo17bBranchProposal = selectedTitle.includes("ao-17b") && (
    selectedTitle.includes("branch") ||
    String(selected?.summary || "").toLowerCase().includes("branch tempor")
  );
  const selectedIsAo02bSafeTermsProposal = Boolean(
    selectedTitle.includes("ao-02b") &&
    selectedTargetFiles.some((item) => String(item || "").trim() === "src/routes/legal/Terms.jsx")
  );
  const canCreateTemporaryBranch = Boolean(
    selected?.proposal_id &&
    (selectedIsAo17bBranchProposal || selectedIsAo02bSafeTermsProposal) &&
    selectedIsDryRunCompleted &&
    canPrepareBranchPr &&
    selectedBlocksRealExecution
  );
  const selectedIsAo17cRestorePointProposal = Boolean(
    String(effectiveBranchPrPlan?.stage || "").includes("AO-17C") ||
    selectedTitle.includes("ao-17c") ||
    selectedTitle.includes("ao-18a") ||
    String(selected?.summary || "").toLowerCase().includes("restore point")
  );
  const targetBranchLabel = effectiveBranchPrPlan?.target_branch || effectiveBranchPrPlan?.suggested_branch || "";
  const canApplyBranchPatch = Boolean(
    selected?.proposal_id &&
    selectedIsAo17cRestorePointProposal &&
    selectedIsDryRunCompleted &&
    targetBranchLabel &&
    (effectiveBranchPrPlan?.can_apply_branch_patch || effectiveBranchPrPlan?.can_prepare_branch_patch)
  );
  const branchPatchStatusesWithRestore = new Set([
    "branch_patch_applied",
    "branch_patch_verification_pending",
    "branch_patch_failed",
  ]);
  const latestBranchPatchExecution = executions.find(x => {
    const status = String(x?.status || "").trim();
    if (String(x?.proposal_id || "") !== String(selected?.proposal_id || "")) return false;
    if (!branchPatchStatusesWithRestore.has(status)) return false;
    const result = x?.result || {};
    const receipts = Array.isArray(result?.file_receipts) ? result.file_receipts : [];
    const hasBranchWrite = receipts.some(item => Boolean(item?.commit_sha || item?.write_accepted || item?.raw_result?.commit_sha || item?.raw_result?.write_accepted));
    return status !== "branch_patch_failed" || hasBranchWrite;
  });
  const latestRestorePointId = branchPatchResult?.restore_point_id || latestBranchPatchExecution?.result?.restore_point_id || "";
  const canRevertBranchPatch = Boolean(
    selected?.proposal_id &&
    selectedIsAo17cRestorePointProposal &&
    latestRestorePointId
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.30),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_34%),#070711] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-black/25 p-5 shadow-2xl shadow-black/30 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/70">PTE • Admin Controlled Evolution</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Evolution Console</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/62">
              Governança visual para propostas criadas pelo Orion. Esta tela aprova ou rejeita propostas, mas não executa patches, commits, deploys ou migrations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => nav("/admin")} className={`${BTN} border border-white/10 bg-white/5 text-white/80 hover:bg-white/10`}>
              Admin
            </button>
            <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">{BUILD_SIGNATURE}</Pill>
            <button onClick={refreshAll} disabled={busy} className={`${BTN} bg-violet-400 text-black hover:bg-violet-300`}>
              {busy ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <div className={CARD}>
            <div className="text-3xl font-black">{proposalCount}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">propostas</div>
          </div>
          <div className={CARD}>
            <div className="text-3xl font-black text-sky-100">{pendingCount}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">pendentes</div>
          </div>
          <div className={CARD}>
            <div className="text-3xl font-black text-emerald-100">{approvedCount}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">aprovadas</div>
          </div>
          <div className={CARD}>
            <div className="text-3xl font-black text-rose-100">{rejectedCount}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">rejeitadas</div>
          </div>
        </section>

        <section className={`${CARD} border-amber-400/20 bg-amber-400/5`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-100">Guarda operacional ativa</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-50/70">
                O console conecta o Admin ao dry-run governado. O fluxo permite simulação auditável após aprovação, mantendo execução real, push, commit, deploy e migrations bloqueados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">execution_enabled=false</Pill>
              <Pill className="border-violet-400/25 bg-violet-400/10 text-violet-100">proposal_only</Pill>
              <Pill className="border-white/10 bg-white/5 text-white/70">última atualização: {lastRefresh || "-"}</Pill>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-3xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-50">
            <strong>Erro:</strong> {error}
          </section>
        ) : null}

        {notice ? (
          <section className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-50">
            {notice}
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <div className={CARD}>
            <SectionTitle eyebrow="Fila de governança" title="Propostas">
              Propostas criadas via <span className="font-mono">@Orion proposal_only</span>.
            </SectionTitle>

            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-black/15 p-5 text-sm text-white/60">
                Nenhuma proposta encontrada. No chat, peça: <br />
                <span className="mt-2 block rounded-2xl bg-black/30 p-3 font-mono text-xs text-white/80">
                  @Orion gere uma proposta de evolução controlada proposal_only para o ciclo Admin aprovar antes de qualquer execução.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(item => {
                  const active = String(item.proposal_id) === String(selectedId);
                  return (
                    <button
                      key={item.proposal_id}
                      onClick={() => setSelectedId(item.proposal_id)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        active ? "border-violet-300/40 bg-violet-300/10" : "border-white/10 bg-black/15 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{item.title}</p>
                          <p className="mt-1 font-mono text-[11px] text-white/45">{item.proposal_id}</p>
                        </div>
                        <Pill className={statusTone(item.status)}>{item.status}</Pill>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill className={riskTone(item.risk)}>risco: {item.risk}</Pill>
                        <Pill className="border-white/10 bg-white/5 text-white/55">{ts(item.created_at)}</Pill>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className={CARD}>
              <SectionTitle eyebrow="Detalhe governado" title={selected?.title || "Selecione uma proposta"}>
                Revise status, risco, rollback e plano antes de aprovar ou rejeitar.
              </SectionTitle>

              {selected ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <KeyValue label="proposal_id" value={selected.proposal_id} mono />
                    <KeyValue label="status" value={selected.status} />
                    <KeyValue label="risco" value={selected.risk} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <KeyValue label="criada em" value={ts(selected.created_at)} />
                    <KeyValue label="atualizada em" value={ts(selected.updated_at)} />
                  </div>

                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/15 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">Resumo</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{selected.summary || "Sem resumo retornado."}</p>
                  </div>

                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/15 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">Rollback plan</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{selected.rollback_plan || "Rollback não informado."}</p>
                  </div>

                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/15 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">Checklist de validação</div>
                    {Array.isArray(selected.validation_checklist) && selected.validation_checklist.length ? (
                      <ul className="mt-2 space-y-2 text-sm text-white/75">
                        {selected.validation_checklist.map((x, idx) => <li key={idx}>• {String(x)}</li>)}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-white/55">Checklist não informado pelo endpoint.</p>
                    )}
                  </div>

                  {selectedIsPending ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                      <input
                        className={INPUT}
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Motivo de rejeição"
                      />
                      <button
                        onClick={() => approve(selected.proposal_id)}
                        disabled={Boolean(actionBusy)}
                        className={`${BTN} bg-emerald-400 text-black hover:bg-emerald-300`}
                      >
                        {actionBusy === `approve:${selected.proposal_id}` ? "Aprovando..." : "Aprovar"}
                      </button>
                      <button
                        onClick={() => reject(selected.proposal_id)}
                        disabled={Boolean(actionBusy)}
                        className={`${BTN} bg-rose-400 text-black hover:bg-rose-300`}
                      >
                        {actionBusy === `reject:${selected.proposal_id}` ? "Rejeitando..." : "Rejeitar"}
                      </button>
                    </div>
                  ) : selectedCanDryRun ? (
                    <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <div className="text-sm font-semibold text-emerald-50">Proposta aprovada. Dry-run governado disponível.</div>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-50/70">
                        Esta ação chama somente o endpoint de dry-run. Não há escrita em repositório, commit, deploy ou migration.
                      </p>
                      <button
                        onClick={() => runDryRun(selected.proposal_id)}
                        disabled={Boolean(actionBusy)}
                        className={`${BTN} mt-3 bg-emerald-300 text-black hover:bg-emerald-200`}
                      >
                        {actionBusy === `dry-run:${selected.proposal_id}` ? "Executando dry-run..." : "Executar dry-run governado"}
                      </button>
                    </div>
                  ) : selectedIsDryRunCompleted ? (
                    <div className="mt-5 rounded-3xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-50">
                      Dry-run já concluído para esta proposta. Consulte a seção de execuções.
                    </div>
                  ) : selectedIsRejected ? (
                    <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-50">
                      Proposta rejeitada. Nenhuma ação operacional disponível.
                    </div>
                  ) : (
                    <div className="mt-5 rounded-3xl border border-white/10 bg-black/15 p-4 text-sm text-white/55">
                      Nenhuma ação disponível para o status atual.
                      <div className="mt-2 font-mono text-xs text-white/40">
                        status={selectedStatus || "-"} • can_dry_run={String(Boolean(selectedDryRunAvailable))} • execution_status={selectedExecutionStatus || "-"}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/15 bg-black/15 p-6 text-sm text-white/60">
                  Nenhum detalhe selecionado.
                </div>
              )}
            </div>

            <div className={CARD}>
              {/* AO-23_DRYRUN_SECTION_TITLE_DYNAMIC */}
              <SectionTitle eyebrow="Plano de execução" title={dryRunPlanTitle}>
                {dryRunPlanDescription}
              </SectionTitle>

              <div className="mb-4 flex flex-wrap gap-2">
                <Pill className={planExecutionEnabled ? "border-rose-400/25 bg-rose-400/10 text-rose-100" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"}>
                  execution_enabled={String(Boolean(planExecutionEnabled))}
                </Pill>
                <Pill className="border-white/10 bg-white/5 text-white/65">
                  next_stage={plan?.next_stage || "controlled_dry_run"}
                </Pill>
                <Pill className="border-white/10 bg-white/5 text-white/65">
                  requires_admin_approval={String(plan?.requires_admin_approval !== false)}
                </Pill>
                <Pill className={selectedDryRunAvailable ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/65"}>
                  can_dry_run={String(Boolean(selectedDryRunAvailable))}
                </Pill>
              </div>

              <textarea
                className={TEXTAREA}
                readOnly
                value={plan ? JSON.stringify(unwrapPayload(plan), null, 2) : "Plano ainda não carregado."}
              />

              {selectedCanDryRun ? (
                <div className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-50">
                  <div className="font-semibold">Dry-run liberado para esta proposta.</div>
                  <button
                    onClick={() => runDryRun(selected.proposal_id)}
                    disabled={Boolean(actionBusy)}
                    className={`${BTN} mt-3 bg-emerald-300 text-black hover:bg-emerald-200`}
                  >
                    {actionBusy === `dry-run:${selected.proposal_id}` ? "Executando dry-run..." : "Executar dry-run governado"}
                  </button>
                </div>
              ) : null}

              {dryRunResult ? (
                <div className="mt-3 rounded-2xl border border-sky-400/25 bg-sky-400/10 p-3 text-sm text-sky-50">
                  <div className="font-semibold">Último dry-run retornado</div>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-xs text-sky-50/85">
                    {JSON.stringify(dryRunResult, null, 2)}
                  </pre>
                </div>
              ) : null}

              {planExecutionEnabled ? (
                <div className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-50">
                  Bloqueador: o plano retornou execution_enabled=true. Não avance para dry-run até corrigir a governança.
                </div>
              ) : null}
            </div>

            <div className={`${CARD} border-indigo-300/20 bg-indigo-300/5`}>
              <SectionTitle eyebrow="Próxima etapa" title={branchPrPlanCardTitle}>
                {branchPrPlanCardDescription}
              </SectionTitle>

              <div className="mb-4 flex flex-wrap gap-2">
                <Pill className={branchPrPlanCapabilityReady ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/65"}>
                  {branchPrPlanCapabilityLabel}
                </Pill>
                <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">
                  main_write=false
                </Pill>
                <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">
                  deploy_auto=false
                </Pill>
                <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">
                  migration_auto=false
                </Pill>
              </div>

              {selectedIsDryRunCompleted ? (
                <div className="rounded-2xl border border-indigo-300/20 bg-black/15 p-4 text-sm text-indigo-50/85">
                  <div className="font-semibold text-indigo-50">{branchPrPlanReadyLabel}</div>
                  <p className="mt-2 text-indigo-50/70">
                    {branchPrPlanNextSafeText}
                  </p>
                  <button
                    onClick={() => loadBranchPrPlan(selected?.proposal_id)}
                    disabled={Boolean(actionBusy) || !selected?.proposal_id}
                    className={`${BTN} mt-3 border border-indigo-200/20 bg-indigo-300/15 text-indigo-50 hover:bg-indigo-300/20`}
                  >
                    {branchPrPlanButtonLabel}
                  </button>

                  {canCreateTemporaryBranch ? (
                    <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4">
                      <div className="font-semibold text-amber-50">AO-17B — criação governada de branch temporária</div>
                      <p className="mt-2 text-xs leading-relaxed text-amber-50/75">
                        Esta ação cria somente a branch temporária sugerida. Não escreve arquivos, não cria commit,
                        não abre PR, não faz merge, deploy ou migration.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">files=false</Pill>
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">commit=false</Pill>
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">pr=false</Pill>
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">deploy=false</Pill>
                      </div>
                      <button
                        onClick={() => createTemporaryBranch(selected?.proposal_id)}
                        disabled={Boolean(actionBusy) || !selected?.proposal_id}
                        className={`${BTN} mt-3 bg-amber-300 text-black hover:bg-amber-200`}
                      >
                        {actionBusy === `create-branch:${selected?.proposal_id}` ? "Criando branch..." : "Criar branch temporária"}
                      </button>
                    </div>
                  ) : null}

                  {canApplyBranchPatch ? (
                    <div className="mt-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
                      <div className="font-semibold text-cyan-50">AO-17C/AO-18A — patch na branch com restore point permanente</div>
                      <p className="mt-2 text-xs leading-relaxed text-cyan-50/75">
                        Esta ação aplica um patch governado somente na branch existente <span className="font-mono">{targetBranchLabel}</span>.
                        Antes da escrita, o backend captura snapshot anterior e registra restore_point_id. Main, PR, merge, deploy e migration permanecem bloqueados.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">restore_point=true</Pill>
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">main=false</Pill>
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">pr=false</Pill>
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">deploy=false</Pill>
                        <Pill className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">migration=false</Pill>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => applyBranchPatch(selected?.proposal_id)}
                          disabled={Boolean(actionBusy) || !selected?.proposal_id}
                          className={`${BTN} bg-cyan-300 text-black hover:bg-cyan-200`}
                        >
                          {actionBusy === `apply-branch-patch:${selected?.proposal_id}` ? "Aplicando patch..." : "Aplicar patch na branch"}
                        </button>
                        <button
                          onClick={() => revertBranchPatch(selected?.proposal_id)}
                          disabled={Boolean(actionBusy) || !canRevertBranchPatch}
                          className={`${BTN} border border-cyan-200/25 bg-black/20 text-cyan-50 hover:bg-cyan-300/10`}
                        >
                          {actionBusy === `revert-branch-patch:${selected?.proposal_id}` ? "Revertendo..." : "Reverter patch da branch"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-white/55">
                  AO-17A permanece bloqueado até o dry-run retornar <span className="font-mono">execution_status=dry_run_completed</span>.
                </div>
              )}

              {effectiveBranchPrPlan ? (
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-indigo-50/80">
                  {JSON.stringify(effectiveBranchPrPlan, null, 2)}
                </pre>
              ) : null}

              {branchCreateResult ? (
                <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-50">
                  <div className="font-semibold">Último receipt AO-17B</div>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-xs text-amber-50/85">
                    {JSON.stringify(branchCreateResult, null, 2)}
                  </pre>
                </div>
              ) : null}

              {branchPatchResult ? (
                <div className="mt-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm text-cyan-50">
                  <div className="font-semibold">Último receipt AO-17C/AO-18A</div>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-xs text-cyan-50/85">
                    {JSON.stringify(branchPatchResult, null, 2)}
                  </pre>
                </div>
              ) : null}

              {branchRevertResult ? (
                <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm text-emerald-50">
                  <div className="font-semibold">Último receipt AO-18A — reversão</div>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-xs text-emerald-50/85">
                    {JSON.stringify(branchRevertResult, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>

            <div className={CARD}>
              <SectionTitle eyebrow="Execuções" title="Dry-runs governados">
                Lista execuções simuladas criadas pelo Admin. Execução real permanece bloqueada.
              </SectionTitle>
              {executions.length ? (
                <div className="space-y-2">
                  {executions.map((x, idx) => (
                    <div key={x.execution_id || x.id || idx} className="rounded-2xl border border-white/10 bg-black/15 p-3 text-sm text-white/70">
                      <div className="font-mono text-xs text-white/55">{x.execution_id || x.id || `execution_${idx + 1}`}</div>
                      <div className="mt-1">{x.status || x.execution_status || "status desconhecido"}</div>
                      {x.proposal_id ? <div className="mt-1 text-xs text-white/45">proposal_id: {x.proposal_id}</div> : null}
                      {x.diff_preview ? (
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-2 text-xs text-white/65">
                          {typeof x.diff_preview === "string" ? x.diff_preview : JSON.stringify(x.diff_preview, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3 text-sm text-white/55">
                  Nenhuma execução registrada. Após clicar em “Executar dry-run governado”, uma execution_id deve aparecer aqui.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
