# ORKIO Frontend — Access Grant Two-Step R1.7

## Objetivo

Executar a validação do convite antes do cadastro e transportar o grant
assinado no mesmo fluxo, sem depender exclusivamente de cookie cross-site.

## Aplicação

```bash
python scripts/apply_access_grant_two_step_r17.py --check
python scripts/apply_access_grant_two_step_r17.py --apply
python scripts/apply_access_grant_two_step_r17.py --check
python -m pytest -q tests/test_access_grant_two_step_r17.py
npm ci
npm run build
```

## Fluxo esperado

```text
POST /api/access-grants/validate → 200
POST /api/auth/register         → sucesso ou OTP
```

O grant fica somente em memória e é enviado no header
`X-ORKIO-Access-Grant`. O `access_code` continua no payload para
compatibilidade com o fluxo single-step.

## Rollback

Reverter somente `src/routes/AuthPage.jsx`.
