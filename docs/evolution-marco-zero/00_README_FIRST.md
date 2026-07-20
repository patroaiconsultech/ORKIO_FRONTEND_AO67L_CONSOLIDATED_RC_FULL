# ORKIO MZ-001-R1 — Frontend preview-only

## Baseline

```text
artifact_source=ORKIO_FRONTEND_AO67L_CONSOLIDATED_RC_FULL-main (26).zip
artifact_sha256=f681bb9ebb4a90aeafd47ffc8f80a77731ff7fe4b9e66b991fc1836bf790a1b1
AdminEvolutionCenter_before_sha256=2e58f62a8838f8abc3f314755a8133c5a63048b504f37230caa7d5c736568bad
AdminEvolutionCenter_after_sha256=b1e5bf58e50e2d3c2503ccf8a2ab3758fcf52ac1b303be769db0544defde9640
```

## Mudança

- remove autoridade de confirmação do bundle;
- remove chamada `dry_run=false`;
- remove botão `Aplicar marco zero`;
- mantém somente preview;
- mostra fonte, escrita bloqueada e próxima fase;
- preserva todo o restante do Evolution Center.

Este pacote deve ser implantado somente depois do backend R1 passar no smoke.
