from __future__ import annotations

import importlib.util
from pathlib import Path


SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "apply_access_type_status_ux_r16.py"
)

spec = importlib.util.spec_from_file_location("ux_patch", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)


def fixture(invite_input: str) -> str:
    return f"""
function renderRegisterForm() {{
  return (
    <form>
      <label style={{label}}>Tipo de acesso</label>
      {{hasServerValidatedInvite ? (
        {invite_input}
      ) : (
        <select value={{selectedPlan}}>
          <option value="free_trial">Diagnóstico inicial</option>
        </select>
      )}}
    </form>
  );
}}
"""


def test_replaces_disabled_input_and_preserves_select():
    source = fixture(
        '<input style={{...input}} value="Acesso por convite" disabled />'
    )
    patched, status = module.patch_text(source)
    assert status == "patched"
    assert 'data-access-type-summary="invite"' in patched
    assert 'role="status"' in patched
    assert 'aria-live="polite"' in patched
    assert "<select" in patched
    assert 'value="Acesso por convite"' not in patched


def test_patch_is_idempotent():
    source = fixture(
        '<input style={{...input}} value="Acesso por convite" disabled />'
    )
    patched, _ = module.patch_text(source)
    second, status = module.patch_text(patched)
    assert status == "already_applied"
    assert second == patched


def test_ambiguous_contract_fails_closed():
    source = fixture(
        '<input value="Acesso por convite" disabled />'
        '<input value="Acesso por convite" disabled />'
    )
    try:
        module.patch_text(source)
    except module.PatchError as exc:
        assert "exactly one" in str(exc)
    else:
        raise AssertionError("Ambiguous source must fail closed.")
