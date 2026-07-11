# OEC-003 — Orion Evolution Routing

## Objetivo

Separar análise consultiva do Orion, registro de proposta e execução governada.

## Problema corrigido

O fast-path legado AO20J capturava pedidos de análise do Orion e devolvia um
template determinístico antes do runtime real do agente.

## Rotas

- `orion_evolution_analysis`
- `evolution_proposal_registration`
- `governed_evolution_execution`

## Regras

1. Orion selecionado + pedido de leitura/análise:
   - bypass do AO20J;
   - segue para o runtime real do Orion;
   - nenhuma escrita automática.

2. Registro de proposta:
   - exige comando explícito;
   - exige referência a análise/plano ou proposal_id.

3. Execução:
   - exige proposal_id;
   - exige verbo positivo de execução;
   - restrições negativas como "não execute" não contam como intenção.

## Governança preservada

O patch não altera Mutation Authority, permissões GitHub, merge, deploy,
migration, schema ou aprovação humana.
