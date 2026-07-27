from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

TRANSIENT_DIRS = {"__pycache__", ".pytest_cache"}
TRANSIENT_SUFFIXES = {".pyc", ".pyo"}
MANIFEST_NAMES = {
    "REPOSITORY_FILE_MANIFEST.json",
    "REPOSITORY_SHA256SUMS.txt",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    root = args.root.resolve()

    transient = []
    for path in root.rglob("*"):
        relative = path.relative_to(root).as_posix()
        if any(part in TRANSIENT_DIRS for part in path.parts):
            transient.append(relative)
        elif path.is_file() and path.suffix in TRANSIENT_SUFFIXES:
            transient.append(relative)

    manifest_path = root / "REPOSITORY_FILE_MANIFEST.json"
    sums_path = root / "REPOSITORY_SHA256SUMS.txt"
    manifest_errors = []

    if not manifest_path.is_file() or not sums_path.is_file():
        manifest_errors.append("deterministic repository manifests are missing")
    else:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        declared = {entry["path"]: entry for entry in manifest["files"]}
        actual_paths = {
            path.relative_to(root).as_posix()
            for path in root.rglob("*")
            if path.is_file()
            and path.name not in MANIFEST_NAMES
            and not any(part in TRANSIENT_DIRS for part in path.parts)
            and path.suffix not in TRANSIENT_SUFFIXES
        }
        if set(declared) != actual_paths:
            manifest_errors.append("manifest coverage mismatch")
        for relative, entry in declared.items():
            path = root / relative
            if not path.is_file():
                manifest_errors.append(f"missing: {relative}")
                continue
            if path.stat().st_size != entry["size_bytes"]:
                manifest_errors.append(f"size mismatch: {relative}")
            if sha256_file(path) != entry["sha256"]:
                manifest_errors.append(f"hash mismatch: {relative}")

    status = "PASS" if not transient and not manifest_errors else "FAIL"
    result = {
        "status": status,
        "transient_artifact_count": len(set(transient)),
        "transient_artifacts": sorted(set(transient)),
        "manifest_errors": manifest_errors,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
