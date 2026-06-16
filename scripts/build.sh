#!/usr/bin/env bash
#
# build.sh — build Tulip's static distribution.
#
# Intended to be called by trader's build pipeline (the "pull" side of
# the integration): trader checks out a pinned Tulip ref, runs this
# script, then copies dist/ into the binary's embed assets.
#
# Usage:
#   ./scripts/build.sh                 # standalone build, base path "/"
#   ./scripts/build.sh --embed         # embed build, base path "/ui/"
#   TULIP_BASE_PATH=/foo/ ./scripts/build.sh   # custom base path
#
set -euo pipefail

cd "$(dirname "$0")/.."

MODE="standalone"
if [[ "${1:-}" == "--embed" ]]; then
  MODE="embed"
fi

echo "==> Installing dependencies (npm ci)"
npm ci --no-audit --no-fund

echo "==> Cleaning previous build"
npm run clean --silent || true

echo "==> Type-checking (svelte-check)"
npm run check

if [[ "$MODE" == "embed" ]]; then
  echo "==> Building embed bundle (base path: /ui/)"
  npm run build:embed
else
  echo "==> Building standalone bundle (base path: /)"
  npm run build
fi

echo "==> Done. Output in ./dist"
du -sh dist
