# Roteiro enxuto para o Codex

1. Testar com admin.
2. Testar com não-admin.
3. Testar em tela desktop e mobile.
4. Validar clareza da copy `preview somente leitura`.
5. Confirmar ausência do botão de aplicação real.
6. Conferir Network:
   - um POST com `dry_run=true`;
   - nenhum POST com `dry_run=false`.
7. Conferir Console.
8. Confirmar que o resultado JSON é legível.

Saída:

```text
admin_preview=PASS|FAIL
non_admin_denied=PASS|FAIL
apply_button_absent=PASS|FAIL
dry_run_false_requests=0|N
copy_clear=PASS|FAIL
mobile_layout=PASS|FAIL
console_errors=0|N
```
