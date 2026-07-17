# Riscos e rollback

## Escopo

Frontend-only.

## Riscos

1. Regressão visual no Evolution Center.
2. Divergência entre fontes vazias e fontes indisponíveis.
3. Perda do score heurístico por agente.

O item 3 é intencional: configuração de agente não é prova de conhecimento medido.

## Mitigações

- `sample_count=0` produz score nulo;
- `confidence=0` sem amostra;
- falhas de fonte entram em `missing_sources`;
- contrato puro com seis testes;
- build Vite antes do merge;
- nenhum backend ou banco alterado.

## Rollback

Reverter o commit do PR.

Não exige:

```text
migration
rollback de banco
alteração de env
restauração de segredo
rollback backend
```
