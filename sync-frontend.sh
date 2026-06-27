#!/usr/bin/env bash
# Copy the static app shell into dist/ for the Tauri desktop build. The web app
# stays at the repo root with no build step; dist/ is generated and gitignored.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist"
rm -rf "$DIST"
mkdir -p "$DIST"
cp "$ROOT/index.html" "$ROOT/manifest.json" "$ROOT/sw.js" "$DIST/"
cp -R "$ROOT/css" "$ROOT/js" "$ROOT/fonts" "$ROOT/icons" "$DIST/"
echo "synced frontend -> dist/"
