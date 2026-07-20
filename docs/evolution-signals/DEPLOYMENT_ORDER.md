# Ordem de implantação

1. Criar a branch `evolution-signals-v2-honest-metrics`.
2. Fazer upload de todo o conteúdo deste pacote.
3. Revisar o diff.
4. Executar:

```bash
node --test tests/evolution_signals_contract.test.mjs
npm run build
```

5. Abrir PR para `main`.
6. Confirmar que somente frontend, testes e documentação foram alterados.
7. Fazer merge após revisão humana.
8. Aguardar o Railway WEB ficar ativo.
9. Executar smoke do Evolution Center.

## Smoke

```text
/healthz = 200
/admin/evolution renderiza
sample=0 mostra —
confidence=0 quando sample=0
agente sem avaliação mostra configuração detectada
modo técnico abre e fecha
fila de propostas continua funcional
approve/reject continuam funcionais
console sem erro
```

Backend, migration, banco e Stage 2 não fazem parte deste PR.
