from __future__ import annotations

import importlib.util
from pathlib import Path

SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "apply_access_grant_two_step_r17.py"
)

spec = importlib.util.spec_from_file_location("r17_patch", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)


def source_fixture():
    return '''
async function completeRegistration({
  nameValue,
  emailValue,
  passwordValue,
  accessCodeValue = "",
}) {
  const registerRequestId = makeAuthRequestId("auth_register");
  const loginRequestId = makeAuthRequestId("auth_login_after_register");
  const registerPayload = {
    tenant,
    email: emailValue,
    name: nameValue,
    password: passwordValue,
    access_code: accessCodeValue || undefined,
    accept_terms: acceptTerms,
    marketing_consent: false,
  };
  const hasInvite = hasInviteAccessCode(accessCodeValue);
  await apiFetch("/api/auth/register", {
    method: "POST",
    org: tenant,
    headers: { "X-Request-Id": registerRequestId },
    body: registerPayload,
  });
  const { data: loginData } = await apiFetchWithTimeout(
    "/api/auth/login",
    {
      method: "POST",
      org: tenant,
      skipAuthRedirect: true,
      headers: { "X-Request-Id": loginRequestId },
      body: { tenant, email: emailValue, password: passwordValue },
    },
    AUTH_REQUEST_TIMEOUT_MS
  );
}
'''


def test_installs_validate_header_and_credentials():
    patched, status = module.patch_source(source_fixture())
    assert status == "patched"
    assert "/api/access-grants/validate" in patched
    assert '"X-ORKIO-Access-Grant"' in patched
    assert 'credentials: "include"' in patched
    assert "access_code: accessCodeValue || undefined" in patched


def test_is_idempotent():
    patched, _ = module.patch_source(source_fixture())
    second, status = module.patch_source(patched)
    assert status == "already_applied"
    assert second == patched


def test_ambiguous_register_contract_fails_closed():
    source = source_fixture() + source_fixture()
    try:
        module.patch_source(source)
    except RuntimeError as exc:
        assert "exactly one" in str(exc)
    else:
        raise AssertionError("Ambiguous source must fail closed.")
