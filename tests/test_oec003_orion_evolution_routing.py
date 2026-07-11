from __future__ import annotations

try:
    from app.runtime.orion_evolution_routing import (
        ORION_EVOLUTION_ROUTING_VERSION,
        classify_orion_evolution_intent,
        resolve_orion_evolution_route,
    )
except ModuleNotFoundError:
    from runtime.orion_evolution_routing import (
        ORION_EVOLUTION_ROUTING_VERSION,
        classify_orion_evolution_intent,
        resolve_orion_evolution_route,
    )


ANALYSIS_PROMPT = """
Orion, faça uma leitura do estado atual da evolução da ORKIO,
identifique as capacidades envolvidas, relacione-as ao Master Evolution Plan
e gere apenas uma proposta governada. Não execute escrita, branch, PR,
merge ou deploy.
"""


def test_orion_analysis_bypasses_legacy_ao20j() -> None:
    decision = resolve_orion_evolution_route(
        ANALYSIS_PROMPT,
        requested_agent="orion",
    )
    assert ORION_EVOLUTION_ROUTING_VERSION == "OEC003_ORION_EVOLUTION_ROUTING_V1"
    assert decision.intent == "analysis"
    assert decision.route_family == "orion_evolution_analysis"
    assert decision.bypass_legacy_ao20j is True
    assert decision.ownership_locked is True


def test_explicit_registration_uses_proposal_registration() -> None:
    prompt = (
        "Orion, registre esta análise como proposta. "
        "analysis_id=analysis_123456 patch_plan=plan_123456"
    )
    decision = resolve_orion_evolution_route(prompt, requested_agent="orion")
    assert decision.intent == "proposal_registration"
    assert decision.route_family == "evolution_proposal_registration"
    assert decision.bypass_legacy_ao20j is False


def test_execution_requires_proposal_reference() -> None:
    prompt = "Orion, execute o dry run da proposta evo_70dd0e1c771c."
    decision = resolve_orion_evolution_route(prompt, requested_agent="orion")
    assert decision.intent == "governed_execution"
    assert decision.route_family == "governed_evolution_execution"
    assert decision.bypass_legacy_ao20j is False


def test_non_orion_request_does_not_bypass_legacy_pipeline() -> None:
    decision = resolve_orion_evolution_route(
        ANALYSIS_PROMPT,
        requested_agent="orkio",
    )
    assert decision.intent == "not_orion_evolution"
    assert decision.bypass_legacy_ao20j is False
