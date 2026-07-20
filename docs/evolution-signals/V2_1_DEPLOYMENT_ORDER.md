# Evolution Signals V2.1 — Ordem de implantação

## Escopo

Frontend-only.

## Arquivos de runtime

```text
src/routes/AdminEvolutionCenter.jsx
src/lib/evolutionSignals.mjs
src/components/admin/EvolutionSignalGraph.jsx
```

## Branch sugerida

```text
evolution-signals-v2-1-coverage-polling
```

## Validação antes do PR

```bash
node --test tests/evolution_signals_contract.test.mjs
node --test tests/evolution_signals_polling_contract.test.mjs
npm run build
```

## Smoke após deploy

```text
/admin/evolution abre
overall mostra cobertura medida/total
sample=0 continua mostrando —
frentes sem amostra aparece no rodapé
fontes indisponíveis não é confundido com ausência de amostra
popover técnico abre sem tooltip nativo
aba oculta pausa polling
detalhe/plano só recarrega por seleção ou mutação
approve/reject continuam funcionando
```

Backend, banco, migration, env e Stage 2 não fazem parte deste patch.
