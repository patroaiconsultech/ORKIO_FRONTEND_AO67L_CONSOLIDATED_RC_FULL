# Evolution Signals V2.1 — Riscos e rollback

## Riscos

1. Regressão visual no popover técnico.
2. Dados estáticos de agentes/capabilities com até cinco minutos de defasagem.
3. Detalhe de proposta não atualizar até nova seleção ou mutação.
4. Cobertura do overall ser interpretada como qualidade, quando representa somente disponibilidade de evidência.

## Mitigações

- health, proposals e executions continuam a cada 60 segundos;
- agents e capabilities atualizam a cada 5 minutos;
- retorno à aba dispara refresh do resumo;
- mutações continuam recarregando detalhe e plano;
- cobertura aparece como `medidas/total`;
- testes de contrato e polling;
- nenhum backend ou banco alterado.

## Rollback

Reverter o commit frontend.

Não exige rollback de:

```text
banco
migration
backend
variáveis
segredos
```
