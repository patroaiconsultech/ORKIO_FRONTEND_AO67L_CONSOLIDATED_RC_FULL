\
export const AO70_EXECUTIVE_PROMPT_DETECTOR_VERSION = "AO70_EXECUTIVE_PROMPT_DETECTOR_V1";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const EXECUTIVE_TERMS = [
  "ceo", "cfo", "cto", "executivo", "executiva", "diretoria", "board",
  "investidor", "investidores", "captacao", "captação", "valuation",
  "runway", "burn", "mrr", "arr", "churn", "cac", "ltv", "ebitda",
  "roi", "tir", "vpl", "margem", "lucro", "receita", "custos", "opex",
  "roadmap", "go-to-market", "go to market", "30-60-90", "due diligence",
  "compliance", "risco", "riscos", "restricao", "restrição"
];

const DELIVERABLE_TERMS = [
  "calcule", "calcular", "analise", "análise", "diagnostico", "diagnóstico",
  "plano", "roadmap", "priorize", "recomendacoes", "recomendações",
  "estrategia", "estratégia", "cenario", "cenário", "projecao", "projeção",
  "simule", "simulação"
];

function countHits(text, terms) {
  return terms.reduce((acc, term) => acc + (text.includes(normalizeText(term)) ? 1 : 0), 0);
}

function countNumericSignals(text) {
  const matches = text.match(/\d+[\d.,]*\s*(%|k|m|mi|mil|milhoes|milhões|r\$|usd|us\$|meses|dias|anos)?/gi);
  return matches ? matches.length : 0;
}

export function isStructuredExecutivePrompt(message) {
  const text = normalizeText(message);
  if (!text || text.length < 60) return false;

  const executiveHits = countHits(text, EXECUTIVE_TERMS);
  const deliverableHits = countHits(text, DELIVERABLE_TERMS);
  const numericSignals = countNumericSignals(text);

  return (
    (executiveHits >= 2 && (numericSignals >= 2 || deliverableHits >= 2)) ||
    (executiveHits >= 1 && numericSignals >= 3 && deliverableHits >= 1)
  );
}

export function resolveExecutiveResponseControl(message, currentValue = null) {
  const current = String(currentValue || "").trim();
  if (current) return current;
  return isStructuredExecutivePrompt(message)
    ? "structured_executive_direct_answer"
    : currentValue;
}
