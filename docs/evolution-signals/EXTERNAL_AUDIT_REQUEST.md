# Pedido de auditoria externa

Auditar somente frontend, testes e contrato.

## Executar

```bash
node --test tests/evolution_signals_contract.test.mjs
npm run build
```

## Confirmar

```text
sample_zero_score_null=true
sample_zero_confidence_zero=true
agent_configuration_not_presented_as_measured_score=true
overall_ignores_null_metrics=true
missing_source_no_nan=true
readonly_copy_is_scoped_to_map=true
backend_changed=false
migration_added=false
secret_scan=PASS
```

## Veredito esperado

```text
GO_FRONTEND_PR=
GO_FRONTEND_DEPLOY=
GO_BACKEND_PREMIUM=NO
GO_MIGRATION=NO
```
