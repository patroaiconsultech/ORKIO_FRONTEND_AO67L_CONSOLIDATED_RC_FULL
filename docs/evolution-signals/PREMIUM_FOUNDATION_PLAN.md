# EVOLUTION-SIGNALS-002 — Fundação premium

## Incluído agora

```text
contrato de métrica V2
formula_version
sample_count
confidence
signal_status
missing_sources
snapshot_kind
historical_trend=false
suporte futuro a avaliação real por agente
```

## Não implementado neste PR

```text
backend endpoint
snapshots históricos persistidos
migration
scheduled job
runtime write
autoevolução autônoma
```

## Arquitetura futura

```text
telemetria real
→ agregador backend readonly
→ job governado de snapshots
→ evolution_signal_snapshots
→ endpoint admin versionado
→ frontend
```

## Regras futuras

- nenhuma escrita em GET;
- tenant obrigatório;
- autorização admin obrigatória;
- migration reversível;
- fórmula versionada;
- score nulo sem evidência;
- histórico derivado somente de snapshots reais;
- feature flag inicia desligada.
