from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

ORION_EVOLUTION_ROUTING_VERSION = "OEC003_ORION_EVOLUTION_ROUTING_V1"

OrionEvolutionIntent = Literal[
    "analysis",
    "proposal_registration",
    "governed_execution",
    "not_orion_evolution",
]


def _normalize(text: str) -> str:
    raw = unicodedata.normalize("NFKD", str(text or ""))
    raw = "".join(ch for ch in raw if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", raw.lower()).strip()


def classify_orion_evolution_intent(
    text: str,
    *,
    requested_agent: str | None,
) -> OrionEvolutionIntent:
    """
    Separate Orion advisory analysis from proposal registration and execution.

    Negative constraints such as "não execute" never count as execution intent.
    """
    if _normalize(requested_agent or "") != "orion":
        return "not_orion_evolution"

    raw = _normalize(text)
    if not raw:
        return "not_orion_evolution"

    has_evolution_scope = any(
        marker in raw
        for marker in (
            "evolucao",
            "autoevolucao",
            "master evolution plan",
            "master plan",
            "capability atlas",
            "capabilities",
            "capacidades",
            "arquitetura",
            "architecture",
            "proposta",
            "proposal",
            "dry run",
            "dry-run",
            "patch",
        )
    )
    if not has_evolution_scope:
        return "not_orion_evolution"

    has_proposal_id = bool(
        re.search(r"\b(?:evo[-_][a-z0-9]{6,}|proposal[-_][a-z0-9]{6,})\b", raw)
    )

    negative_execution = any(
        marker in raw
        for marker in (
            "nao execute",
            "nao executar",
            "sem executar",
            "nao aplique",
            "nao aplicar",
            "nao crie branch",
            "nao abra pr",
            "nao fazer merge",
            "nao faca merge",
            "nao faça merge",
            "nao fazer deploy",
            "nao faca deploy",
            "nao faça deploy",
        )
    )
    positive_execution = any(
        marker in raw
        for marker in (
            "execute o dry run",
            "execute dry run",
            "executar o dry run",
            "executar dry run",
            "aplique o patch",
            "aplicar o patch",
            "crie a branch",
            "criar a branch",
            "abra o pr",
            "abrir o pr",
            "open pr",
            "faca o merge",
            "faça o merge",
            "fazer o merge",
            "execute o deploy",
            "executar o deploy",
        )
    )
    if has_proposal_id and positive_execution and not negative_execution:
        return "governed_execution"

    explicit_registration = any(
        marker in raw
        for marker in (
            "registre esta analise como proposta",
            "registre essa analise como proposta",
            "registre o plano como proposta",
            "converta esta analise em proposta",
            "crie a proposta a partir da analise",
            "persistir esta proposta",
            "registrar esta proposta",
        )
    )
    has_analysis_reference = any(
        marker in raw
        for marker in (
            "analysis_id",
            "analysis id",
            "patch_plan",
            "patch plan",
            "objective_id",
            "objective id",
            "capability_ids",
            "capability ids",
        )
    )
    if explicit_registration and (has_analysis_reference or has_proposal_id):
        return "proposal_registration"

    analysis_markers = any(
        marker in raw
        for marker in (
            "faca uma leitura",
            "analise",
            "audite",
            "identifique",
            "relacione",
            "capability atlas",
            "master evolution plan",
            "master plan",
            "estado atual",
            "recomende",
            "gere apenas uma proposta governada",
        )
    )
    if analysis_markers or negative_execution:
        return "analysis"

    return "analysis"


@dataclass(frozen=True)
class OrionEvolutionRouteDecision:
    intent: OrionEvolutionIntent
    bypass_legacy_ao20j: bool
    route_family: str
    ownership_locked: bool
    version: str = ORION_EVOLUTION_ROUTING_VERSION


def resolve_orion_evolution_route(
    text: str,
    *,
    requested_agent: str | None,
) -> OrionEvolutionRouteDecision:
    intent = classify_orion_evolution_intent(
        text,
        requested_agent=requested_agent,
    )

    if intent == "analysis":
        return OrionEvolutionRouteDecision(
            intent=intent,
            bypass_legacy_ao20j=True,
            route_family="orion_evolution_analysis",
            ownership_locked=True,
        )
    if intent == "proposal_registration":
        return OrionEvolutionRouteDecision(
            intent=intent,
            bypass_legacy_ao20j=False,
            route_family="evolution_proposal_registration",
            ownership_locked=True,
        )
    if intent == "governed_execution":
        return OrionEvolutionRouteDecision(
            intent=intent,
            bypass_legacy_ao20j=False,
            route_family="governed_evolution_execution",
            ownership_locked=True,
        )
    return OrionEvolutionRouteDecision(
        intent=intent,
        bypass_legacy_ao20j=False,
        route_family="default",
        ownership_locked=False,
    )
