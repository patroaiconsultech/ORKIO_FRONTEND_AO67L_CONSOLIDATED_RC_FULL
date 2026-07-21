#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys

TARGET = Path("src/routes/AuthPage.jsx")
MARKER = "ORKIO_ACCESS_GRANT_TWO_STEP_R17"

REGISTER_CALL = re.compile(
    r'''await\s+apiFetch\(\s*["']/api/auth/register["']\s*,\s*\{\s*
        method:\s*["']POST["']\s*,\s*
        org:\s*tenant\s*,\s*
        headers:\s*\{\s*["']X-Request-Id["']:\s*registerRequestId\s*\}\s*,\s*
        body:\s*registerPayload\s*,?\s*
        \}\s*\)\s*;''',
    re.VERBOSE | re.DOTALL,
)

REPLACEMENT = '''/* ORKIO_ACCESS_GRANT_TWO_STEP_R17 */
    let accessGrantToken = "";
    if (hasInvite) {
      const grantRequestId = makeAuthRequestId("access_grant_validate");
      const { data: grantData } = await apiFetchWithTimeout(
        "/api/access-grants/validate",
        {
          method: "POST",
          org: tenant,
          credentials: "include",
          skipAuthRedirect: true,
          headers: { "X-Request-Id": grantRequestId },
          body: {
            code: accessCodeValue,
            purpose: "platform_beta",
          },
        },
        AUTH_REQUEST_TIMEOUT_MS
      );
      if (!grantData?.granted) {
        throw new Error("Código inválido, expirado ou sem disponibilidade.");
      }
      accessGrantToken = String(grantData?.grant_token || "").trim();
    }

    await apiFetch("/api/auth/register", {
      method: "POST",
      org: tenant,
      credentials: "include",
      headers: {
        "X-Request-Id": registerRequestId,
        ...(accessGrantToken
          ? { "X-ORKIO-Access-Grant": accessGrantToken }
          : {}),
      },
      body: registerPayload,
    });'''

LOGIN_OPTIONS = re.compile(
    r'''("/api/auth/login"\s*,\s*\{\s*
        method:\s*["']POST["']\s*,\s*
        org:\s*tenant\s*,)''',
    re.VERBOSE | re.DOTALL,
)

def patch_source(source: str) -> tuple[str, str]:
    if MARKER in source:
        required = [
            "/api/access-grants/validate",
            '"X-ORKIO-Access-Grant"',
            'credentials: "include"',
        ]
        if not all(item in source for item in required):
            raise RuntimeError("R1.7 marker exists but contract is incomplete.")
        return source, "already_applied"

    matches = list(REGISTER_CALL.finditer(source))
    if len(matches) != 1:
        raise RuntimeError(
            "Expected exactly one canonical register call; "
            f"found {len(matches)}."
        )

    patched = REGISTER_CALL.sub(REPLACEMENT, source, count=1)

    if LOGIN_OPTIONS.search(patched):
        patched = LOGIN_OPTIONS.sub(
            r'\1\n        credentials: "include",',
            patched,
            count=1,
        )

    required = [
        MARKER,
        "/api/access-grants/validate",
        '"X-ORKIO-Access-Grant"',
        'credentials: "include"',
        "access_code: accessCodeValue || undefined",
    ]
    if not all(item in patched for item in required):
        raise RuntimeError("Patched source failed contract validation.")
    return patched, "patched"

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=Path, default=TARGET)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if not args.target.is_file():
        print(f"R17_PATCH_FAILED target_not_found={args.target}", file=sys.stderr)
        return 2

    source = args.target.read_text(encoding="utf-8")
    try:
        patched, status = patch_source(source)
    except RuntimeError as exc:
        print(f"R17_PATCH_FAILED {exc}", file=sys.stderr)
        return 2

    if args.check and status == "patched":
        print("R17_PATCH_REQUIRED")
        return 1

    if args.apply and status == "patched":
        args.target.write_text(patched, encoding="utf-8", newline="\n")

    print(f"R17_PATCH_OK status={status} target={args.target}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
