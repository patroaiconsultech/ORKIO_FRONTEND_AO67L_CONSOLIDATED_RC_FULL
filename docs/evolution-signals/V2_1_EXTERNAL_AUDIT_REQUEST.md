# Pedido de auditoria — Evolution Signals V2.1

Auditar em modo somente leitura.

## Executar

```bash
node --test tests/evolution_signals_contract.test.mjs
node --test tests/evolution_signals_polling_contract.test.mjs
npm run build
```

## Confirmar

```text
overall_label=estimated
coverage_disclosed=true
zero_sample_copy=honest
native_metric_tooltip=false
custom_popover=true
summary_poll_seconds=60
static_poll_seconds=300
poll_pauses_when_hidden=true
selected_detail_not_polled=true
backend_changed=false
migration_added=false
```

## Veredito

```text
GO_FRONTEND_PR=
GO_FRONTEND_DEPLOY=
GO_BACKEND_CHANGE=NO
GO_MIGRATION=NO
```
