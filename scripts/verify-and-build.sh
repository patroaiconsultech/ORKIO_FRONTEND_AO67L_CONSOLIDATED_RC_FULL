#!/usr/bin/env sh
set -eu

test "$(node --version)" = "v20.20.2"
test "$(npm --version)" = "10.8.2"
test "$(npm config get registry)" = "https://registry.npmjs.org/"

node scripts/verify-lockfile.mjs
npm ci --ignore-scripts --no-audit --no-fund
npm run check:server
npm run check:sw
npm test
npm run build
npm run verify:dist
npm run build:evidence
