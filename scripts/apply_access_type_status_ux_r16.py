#!/usr/bin/env python3
"""ORKIO R1.6 frontend UX patch.

Replaces the disabled input that displays "Acesso por convite" with a
non-editable semantic status block. The script is idempotent and fail-closed:
it refuses to change the file when the expected contract is absent or
ambiguous.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys


TARGET_DEFAULT = Path("src/routes/AuthPage.jsx")
PATCH_MARKER = 'data-access-type-summary="invite"'

INVITE_INPUT_RE = re.compile(
    r"""
    <input\b
    (?=[^>]*\bvalue\s*=\s*["']Acesso\s+por\s+convite["'])
    (?=[^>]*\b(?:disabled|readOnly)\b)
    [^>]*
    />
    """,
    flags=re.IGNORECASE | re.DOTALL | re.VERBOSE,
)

REPLACEMENT = """<div
                data-access-type-summary="invite"
                role="status"
                aria-live="polite"
                style={{
                  ...statusBox,
                  marginTop: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ color: palette.success, fontWeight: 950 }}
                >
                  ✓
                </span>
                <strong style={{ color: palette.success }}>
                  Acesso por convite
                </strong>
              </div>"""


class PatchError(RuntimeError):
    pass


def patch_text(source: str) -> tuple[str, str]:
    if PATCH_MARKER in source:
        if "Acesso por convite" not in source or 'role="status"' not in source:
            raise PatchError("Patch marker found, but status contract is incomplete.")
        return source, "already_applied"

    if "Tipo de acesso" not in source:
        raise PatchError('Expected label "Tipo de acesso" was not found.')

    matches = list(INVITE_INPUT_RE.finditer(source))
    if len(matches) != 1:
        raise PatchError(
            "Expected exactly one disabled/read-only invite input; "
            f"found {len(matches)}."
        )

    start, end = matches[0].span()
    patched = source[:start] + REPLACEMENT + source[end:]

    if patched.count(PATCH_MARKER) != 1:
        raise PatchError("Patched source does not contain exactly one UX marker.")
    if 'role="status"' not in patched or 'aria-live="polite"' not in patched:
        raise PatchError("Accessibility contract was not installed.")
    if INVITE_INPUT_RE.search(patched):
        raise PatchError("Invite input still exists after patch.")

    return patched, "patched"


def process(path: Path, *, apply: bool) -> str:
    if not path.is_file():
        raise PatchError(f"Target file not found: {path}")

    source = path.read_text(encoding="utf-8")
    patched, status = patch_text(source)

    if apply and status == "patched":
        path.write_text(patched, encoding="utf-8", newline="\n")

    return status


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=Path, default=TARGET_DEFAULT)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    try:
        status = process(args.target, apply=args.apply)
    except PatchError as exc:
        print(f"ACCESS_TYPE_STATUS_UX_PATCH_FAILED: {exc}", file=sys.stderr)
        return 2

    if args.check and status == "patched":
        print("ACCESS_TYPE_STATUS_UX_PATCH_REQUIRED")
        return 1

    print(
        "ACCESS_TYPE_STATUS_UX_PATCH_OK "
        f"status={status} target={args.target.as_posix()}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
