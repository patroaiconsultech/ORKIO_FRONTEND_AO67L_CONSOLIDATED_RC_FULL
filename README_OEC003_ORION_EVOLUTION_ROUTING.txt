ORKIO — OEC-003 ORION EVOLUTION ROUTING

ARQUIVOS ALTERADOS
- main.py

ARQUIVOS NOVOS
- runtime/orion_evolution_routing.py
- tests/test_oec003_orion_evolution_routing.py
- docs/orion/OEC003_ORION_EVOLUTION_ROUTING.md

VALIDAÇÃO
python -m pytest -q tests/test_oec003_orion_evolution_routing.py

ESPERADO
4 passed

TESTE FUNCIONAL
Selecionar Orion e enviar:
"Orion, faça uma leitura do estado atual da evolução da ORKIO, identifique as
capacidades envolvidas, relacione-as ao Master Evolution Plan e gere apenas uma
proposta governada. Não execute escrita, branch, PR, merge ou deploy."

LOG ESPERADO
OEC003_ORION_EVOLUTION_ROUTE
intent=analysis
route_family=orion_evolution_analysis
bypass_legacy_ao20j=True
ownership_locked=True

NÃO DEVE APARECER
AO20J — Governed Proposal & Dry-Run Gate
AO-16 CONTROLLED DRY-RUN DIFF PREVIEW

ROLLBACK
- restaurar main.py
- remover runtime/orion_evolution_routing.py
- remover tests/test_oec003_orion_evolution_routing.py
- remover docs/orion/OEC003_ORION_EVOLUTION_ROUTING.md
