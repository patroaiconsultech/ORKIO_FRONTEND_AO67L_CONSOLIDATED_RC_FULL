#!/usr/bin/env sh
set -eu

test "$(node --version)" = "v20.20.2"
test "$(npm --version)" = "10.8.2"
test "$(npm config get registry)" = "https://registry.npmjs.org/"

if [ -e package-lock.json ]; then
  echo "Refusing to replace an existing package-lock.json." >&2
  exit 1
fi

npm install \
  --package-lock-only \
  --ignore-scripts \
  --no-audit \
  --no-fund

node scripts/verify-lockfile.mjs
sha256sum package.json package-lock.json > LOCKFILE_SHA256SUMS.txt
