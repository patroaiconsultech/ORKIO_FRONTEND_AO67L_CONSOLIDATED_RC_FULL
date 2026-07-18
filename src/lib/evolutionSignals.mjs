export const EVOLUTION_SIGNAL_GRAPH_VERSION = "EVOLUTION_SIGNAL_GRAPH_V2_1";

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.agents)) return value.agents;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.data?.agents)) return value.data.agents;
  return [];
}

export function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeSampleCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number);
}

function agentLabel(agent) {
  return String(
    agent?.name ||
      agent?.agent_name ||
      agent?.display_name ||
      agent?.slug ||
      agent?.id ||
      "Agente",
  ).trim();
}

function configurationBaseline(agent) {
  const fields = [
    agent?.description,
    agent?.system_prompt,
    agent?.persona,
    agent?.role,
    agent?.model,
    agent?.voice_id,
    agent?.capabilities,
    agent?.tools,
  ];

  let score = 18;
  fields.forEach((value) => {
    if (Array.isArray(value) && value.length) score += Math.min(18, value.length * 4);
    else if (value && String(value).trim().length > 24) score += 12;
    else if (value) score += 6;
  });
  return clampScore(score);
}

function explicitAgentMeasurement(agent) {
  const sampleCount = normalizeSampleCount(
    agent?.evaluation_sample_count ??
      agent?.eval_sample_count ??
      agent?.knowledge_sample_count ??
      agent?.sample_count,
  );
  const rawScore =
    agent?.evaluation_score ??
    agent?.eval_score ??
    agent?.knowledge_score ??
    agent?.measured_score;

  if (!sampleCount || !Number.isFinite(Number(rawScore))) return null;

  return {
    score: clampScore(rawScore),
    sample_count: sampleCount,
  };
}

function errorKeys(sourceErrors) {
  const text = Array.isArray(sourceErrors)
    ? sourceErrors.join(" ")
    : String(sourceErrors || "");
  const known = ["proposals", "executions", "agents", "health", "capabilities"];
  return new Set(known.filter((key) => text.toLowerCase().includes(`${key}:`)));
}

function sampleConfidence({ sampleCount, availableSources, requestedSources }) {
  if (!sampleCount) return 0;
  const sourceCoverage = requestedSources
    ? availableSources / requestedSources
    : 0;
  const sampleFactor = Math.min(1, Math.log2(sampleCount + 1) / 5);
  return Math.max(
    0,
    Math.min(0.95, Number((0.1 + sourceCoverage * 0.65 + sampleFactor * 0.2).toFixed(2))),
  );
}

function buildMetric({
  key,
  label,
  score,
  evidence,
  formulaVersion,
  sourceKeys,
  sampleCount,
  sourceStatus,
}) {
  const normalizedSample = normalizeSampleCount(sampleCount);
  const missingSources = sourceKeys.filter((sourceKey) => sourceStatus[sourceKey] !== true);
  const availableSources = sourceKeys.length - missingSources.length;

  if (!normalizedSample) {
    return {
      key,
      label,
      score: null,
      evidence,
      confidence: 0,
      sample_count: 0,
      signal_status: "insufficient_evidence",
      time_window: "current_admin_snapshot",
      formula_version: formulaVersion,
      source: sourceKeys.join(", "),
      missing_sources: missingSources,
    };
  }

  const confidence = sampleConfidence({
    sampleCount: normalizedSample,
    availableSources,
    requestedSources: sourceKeys.length,
  });

  return {
    key,
    label,
    score: clampScore(score),
    evidence,
    confidence,
    sample_count: normalizedSample,
    signal_status: missingSources.length
      ? "partial_signals_estimated"
      : "live_signals_estimated",
    time_window: "current_admin_snapshot",
    formula_version: formulaVersion,
    source: sourceKeys.join(", "),
    missing_sources: missingSources,
  };
}

export function signalStatusLabel(status) {
  const labels = {
    insufficient_evidence: "Evidência insuficiente",
    partial_signals_estimated: "Estimativa parcial",
    live_signals_estimated: "Estimativa com sinais atuais",
    configuration_only: "Configuração detectada",
  };
  return labels[status] || String(status || "desconhecido");
}

export function scoreLabel(score) {
  if (score === null || score === undefined || score === "") return "—";
  return Number.isFinite(Number(score)) ? String(clampScore(score)) : "—";
}

export function radarPoints(fronts, radius = 44, center = 50) {
  const items = Array.isArray(fronts) ? fronts : [];
  if (!items.length) return "";

  return items
    .map((item, index) => {
      const angle = (-90 + (360 / items.length) * index) * (Math.PI / 180);
      const normalized = item?.score !== null && item?.score !== undefined && Number.isFinite(Number(item.score)) ? clampScore(item.score) : 0;
      const currentRadius = radius * (normalized / 100);
      const x = center + Math.cos(angle) * currentRadius;
      const y = center + Math.sin(angle) * currentRadius;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function computeEvolutionSignals({
  items,
  executions,
  agents,
  health,
  capabilities,
  lastRefresh,
  sourceErrors = "",
}) {
  const proposals = Array.isArray(items) ? items : [];
  const executionList = Array.isArray(executions) ? executions : [];
  const agentList = asArray(agents);
  const errors = errorKeys(sourceErrors);

  const sourceStatus = {
    proposals: !errors.has("proposals") && Array.isArray(items),
    executions: !errors.has("executions") && Array.isArray(executions),
    agents: !errors.has("agents") && Array.isArray(agentList),
    health: !errors.has("health") && Boolean(health),
    capabilities: !errors.has("capabilities") && capabilities !== null && capabilities !== undefined,
  };

  const missingSources = Object.entries(sourceStatus)
    .filter(([, available]) => !available)
    .map(([key]) => key);
  const sourceCount = Object.values(sourceStatus).filter(Boolean).length;

  const capabilityPayload = capabilities?.data || capabilities || {};
  const capabilityCount = Array.isArray(capabilityPayload)
    ? capabilityPayload.length
    : Object.keys(capabilityPayload || {}).length;

  const executionEnabled =
    proposals.some((item) => item?.execution_enabled === true) ||
    executionList.some((item) => item?.execution_enabled === true);

  const dryRunCount = executionList.filter((item) =>
    String(item?.status || "").toLowerCase().includes("dry_run"),
  ).length;
  const completedCount = executionList.filter((item) =>
    /completed|success|dry_run_completed/i.test(String(item?.status || "")),
  ).length;
  const failedCount = executionList.filter((item) =>
    /failed|error/i.test(String(item?.status || "")),
  ).length;
  const approvedCount = proposals.filter(
    (item) => String(item?.status || "").toLowerCase() === "approved",
  ).length;
  const pendingCount = proposals.filter((item) =>
    String(item?.status || "").toLowerCase().includes("pending"),
  ).length;
  const rejectedCount = proposals.filter(
    (item) => String(item?.status || "").toLowerCase() === "rejected",
  ).length;

  const agentSignals = agentList
    .map((agent) => {
      const measurement = explicitAgentMeasurement(agent);
      return {
        id: String(agent?.slug || agent?.id || agentLabel(agent)).toLowerCase(),
        label: agentLabel(agent),
        score: measurement?.score ?? null,
        sample_count: measurement?.sample_count ?? 0,
        confidence: measurement
          ? sampleConfidence({
              sampleCount: measurement.sample_count,
              availableSources: 1,
              requestedSources: 1,
            })
          : 0,
        signal_status: measurement ? "live_signals_estimated" : "configuration_only",
        configuration_baseline: configurationBaseline(agent),
      };
    })
    .filter((item) => item.label)
    .sort((left, right) => {
      const leftScore = Number.isFinite(Number(left.score)) ? Number(left.score) : -1;
      const rightScore = Number.isFinite(Number(right.score)) ? Number(right.score) : -1;
      return rightScore - leftScore || left.label.localeCompare(right.label);
    })
    .slice(0, 6);

  const measuredAgentSignals = agentSignals.filter(
    (agent) => agent.sample_count > 0 && Number.isFinite(Number(agent.score)),
  );
  const measuredAgentSamples = measuredAgentSignals.reduce(
    (sum, agent) => sum + agent.sample_count,
    0,
  );
  const measuredAgentAverage = measuredAgentSignals.length
    ? measuredAgentSignals.reduce((sum, agent) => sum + Number(agent.score), 0) /
      measuredAgentSignals.length
    : null;

  const securityScore = clampScore(
    42 +
      (health ? 12 : 0) +
      (executionEnabled ? -35 : 18) +
      (rejectedCount >= 0 ? 8 : 0) +
      (failedCount ? -Math.min(18, failedCount * 4) : 8),
  );
  const modulesScore = clampScore(
    25 +
      Math.min(25, proposals.length * 3) +
      Math.min(20, executionList.length * 4) +
      Math.min(20, capabilityCount * 2),
  );
  const evolutionScore = clampScore(
    25 +
      Math.min(20, proposals.length * 4) +
      Math.min(20, approvedCount * 7) +
      Math.min(20, dryRunCount * 10) +
      (executionEnabled ? -30 : 12),
  );
  const evidenceScore = clampScore(
    22 +
      (lastRefresh ? 12 : 0) +
      (health ? 10 : 0) +
      Math.min(24, executionList.length * 5) +
      Math.min(
        16,
        proposals.filter(
          (item) => item?.rollback_plan || item?.validation_checklist?.length,
        ).length * 4,
      ),
  );
  const experienceScore = clampScore(
    35 +
      (capabilityCount ? 14 : 0) +
      Math.min(20, agentSignals.length * 4) +
      (failedCount ? -8 : 8),
  );
  const operationalReliabilityScore = clampScore(
    38 +
      (health ? 18 : -10) +
      (executionList.length ? 8 : 0) +
      (completedCount ? Math.min(18, completedCount * 4) : 0) -
      Math.min(26, failedCount * 9),
  );

  const fronts = [
    buildMetric({
      key: "security",
      label: "Segurança e governança",
      score: securityScore,
      evidence: executionEnabled ? "execução real detectada" : "execução real bloqueada",
      formulaVersion: "security_current_estimate_v2",
      sourceKeys: ["health", "proposals", "executions"],
      sampleCount: proposals.length + executionList.length,
      sourceStatus,
    }),
    buildMetric({
      key: "operational_reliability",
      label: "Confiabilidade operacional",
      score: operationalReliabilityScore,
      evidence: executionList.length
        ? `${completedCount} sucesso(s), ${failedCount} falha(s)`
        : "Sem amostra operacional",
      formulaVersion: "ops_reliability_current_estimate_v2",
      sourceKeys: ["health", "executions"],
      sampleCount: executionList.length,
      sourceStatus,
    }),
    buildMetric({
      key: "self_evolution",
      label: "Autoevolução governada",
      score: evolutionScore,
      evidence: `${proposals.length} proposta(s), ${dryRunCount} dry-run(s)`,
      formulaVersion: "self_evolution_current_estimate_v2",
      sourceKeys: ["proposals", "executions"],
      sampleCount: proposals.length + executionList.length,
      sourceStatus,
    }),
    buildMetric({
      key: "agent_knowledge",
      label: "Conhecimento dos agentes",
      score: measuredAgentAverage,
      evidence: measuredAgentSignals.length
        ? `${measuredAgentSignals.length} agente(s) com avaliação`
        : `${agentSignals.length} agente(s) apenas com sinal de configuração`,
      formulaVersion: "agent_knowledge_evaluated_v2",
      sourceKeys: ["agents", "capabilities"],
      sampleCount: measuredAgentSamples,
      sourceStatus,
    }),
    buildMetric({
      key: "modules",
      label: "Módulos principais",
      score: modulesScore,
      evidence: `${capabilityCount || "sem"} capability signal`,
      formulaVersion: "modules_current_estimate_v2",
      sourceKeys: ["capabilities", "proposals"],
      sampleCount: capabilityCount + proposals.length,
      sourceStatus,
    }),
    buildMetric({
      key: "evidence",
      label: "Evidência e observabilidade",
      score: evidenceScore,
      evidence: executionList.length
        ? `${executionList.length} execução(ões) observadas`
        : "Sem execuções observadas",
      formulaVersion: "evidence_current_estimate_v2",
      sourceKeys: ["executions", "health"],
      sampleCount: executionList.length,
      sourceStatus,
    }),
    buildMetric({
      key: "experience",
      label: "Experiência premium",
      score: experienceScore,
      evidence: "derivado de agentes/capabilities",
      formulaVersion: "premium_experience_estimate_v2",
      sourceKeys: ["agents", "capabilities"],
      sampleCount: measuredAgentSamples + capabilityCount,
      sourceStatus,
    }),
  ];

  const scoredFronts = fronts.filter(
    (item) =>
      item.score !== null &&
      item.score !== undefined &&
      Number.isFinite(Number(item.score)),
  );
  const totalFrontCount = fronts.length;
  const measuredFrontCount = scoredFronts.length;
  const unsampledFronts = fronts
    .filter((item) => item.sample_count <= 0)
    .map((item) => item.key);
  const coverageRatio = totalFrontCount
    ? Number((measuredFrontCount / totalFrontCount).toFixed(2))
    : 0;
  const overall = scoredFronts.length
    ? clampScore(
        scoredFronts.reduce((sum, item) => sum + Number(item.score), 0) /
          scoredFronts.length,
      )
    : null;
  const totalSamples = fronts.reduce((sum, item) => sum + item.sample_count, 0);
  const confidence = totalSamples
    ? Number(
        (
          fronts.reduce(
            (sum, item) => sum + item.confidence * Math.max(1, item.sample_count),
            0,
          ) /
          fronts.reduce((sum, item) => sum + Math.max(1, item.sample_count), 0)
        ).toFixed(2),
      )
    : 0;

  const reliability =
    sourceCount === 0 || scoredFronts.length === 0
      ? "insufficient_evidence"
      : missingSources.length
        ? "partial_signals_estimated"
        : "live_signals_estimated";

  return {
    version: EVOLUTION_SIGNAL_GRAPH_VERSION,
    snapshot_kind: "estimated_current_snapshot",
    historical_trend: false,
    overall,
    fronts,
    agentSignals,
    counts: {
      proposals: proposals.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      executions: executionList.length,
      failed: failedCount,
    },
    updatedAt: lastRefresh || "-",
    reliability,
    confidence,
    sourceStatus,
    missingSources,
    coverage: {
      measured: measuredFrontCount,
      total: totalFrontCount,
      ratio: coverageRatio,
    },
    unsampledFronts,
  };
}
