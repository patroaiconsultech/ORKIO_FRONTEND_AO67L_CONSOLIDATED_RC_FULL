# ORKIO Frontend — Access Type Status UX R1.6

## Objetivo

Corrigir a percepção de que existe um segundo campo de código no cadastro.

O campo real de código permanece editável. A representação readonly
`Acesso por convite` deixa de usar aparência de input e passa a ser um
bloco semântico de status.

## Escopo

Repositório:

```text
patroaiconsultech/ORKIO_FRONTEND_AO67L_CONSOLIDATED_RC_FULL
```

Arquivo-alvo:

```text
src/routes/AuthPage.jsx
```

Nenhuma rota, API, regra de cadastro, preço ou integração de backend é
alterada.

## Aplicação

Extraia este ZIP na raiz do frontend e execute:

```bash
python scripts/apply_access_type_status_ux_r16.py --check
python scripts/apply_access_type_status_ux_r16.py --apply
python scripts/apply_access_type_status_ux_r16.py --check
```

Resultados esperados:

```text
primeiro check:
ACCESS_TYPE_STATUS_UX_PATCH_REQUIRED

apply:
ACCESS_TYPE_STATUS_UX_PATCH_OK status=patched

segundo check:
ACCESS_TYPE_STATUS_UX_PATCH_OK status=already_applied
```

O aplicador é idempotente e fail-closed. Ele só altera o arquivo quando
encontra exatamente um input disabled/read-only com o valor
`Acesso por convite`.

## Validação

```bash
python -m pytest -q tests/test_access_type_status_ux_r16.py
npm ci
npm run build
git diff --check
git diff -- src/routes/AuthPage.jsx
```

Critérios:

```text
invite_code_input=preserved
invite_status_input=removed
invite_status_role=status
invite_status_aria_live=polite
non_invite_plan_select=preserved
backend_contract=unchanged
```

## Rollback

Reverter somente `src/routes/AuthPage.jsx` para o commit anterior. O hotfix
backend de access grant não deve ser revertido por causa de uma regressão
puramente visual.
