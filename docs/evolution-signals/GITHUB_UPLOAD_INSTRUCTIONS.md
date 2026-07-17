# Upload direto no GitHub

Este pacote já está na estrutura do repositório frontend.

## Branch

Crie:

```text
evolution-signals-v2-honest-metrics
```

## Upload

Extraia o ZIP e envie **todo o conteúdo extraído** para a raiz da branch.

Não envie o ZIP fechado.

## Arquivos de runtime

```text
src/routes/AdminEvolutionCenter.jsx
src/lib/evolutionSignals.mjs
src/components/admin/EvolutionSignalGraph.jsx
```

## Teste

```bash
node --test tests/evolution_signals_contract.test.mjs
npm run build
```

## Critério

```text
contract_tests=6_pass
vite_build=PASS
sample_zero_score_null=true
sample_zero_confidence_zero=true
agent_configuration_not_measured=true
backend_changed=false
migration_added=false
```
