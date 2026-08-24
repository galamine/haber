#!/usr/bin/env bash
#
# Build production bundles for apps/server and apps/web using their
# .env.production files, then zip the results into the repo root.
#
# Usage: pnpm build:production
#        scripts/build-production.sh

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE_DIR="$ROOT_DIR/.build-production"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
ZIP_PATH="$ROOT_DIR/production-build-${TIMESTAMP}.zip"

log() { printf '\n[build:production] %s\n' "$*"; }
die() { printf '\n[build:production][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -f "$ROOT_DIR/apps/server/.env.production" ]] || die "apps/server/.env.production not found"
[[ -f "$ROOT_DIR/apps/web/.env.production" ]] || die "apps/web/.env.production not found"

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/server" "$STAGE_DIR/web"

# ---------------------------------------------------------------------------
# Server: build with tsdown, then stage dist + package.json + prod env.
# The server loads env via `dotenv/config`, which reads `.env` in its cwd,
# so .env.production is staged as `.env` for the packaged build.
# ---------------------------------------------------------------------------
log "Building server (apps/server) with .env.production"
(
	cd "$ROOT_DIR/apps/server"
	NODE_ENV=production pnpm --filter server build
)

cp -R "$ROOT_DIR/apps/server/dist" "$STAGE_DIR/server/dist"
cp "$ROOT_DIR/apps/server/package.json" "$STAGE_DIR/server/package.json"
cp "$ROOT_DIR/apps/server/.env.production" "$STAGE_DIR/server/.env"

# ---------------------------------------------------------------------------
# Web: `vite build` defaults to mode "production", which auto-loads
# .env.production. Passed explicitly for clarity.
# ---------------------------------------------------------------------------
log "Building web (apps/web) with .env.production"
(
	cd "$ROOT_DIR/apps/web"
	pnpm vite build --mode production
)

cp -R "$ROOT_DIR/apps/web/dist" "$STAGE_DIR/web/dist"

# ---------------------------------------------------------------------------
# Zip
# ---------------------------------------------------------------------------
log "Zipping build to $(basename "$ZIP_PATH")"
(cd "$STAGE_DIR" && zip -rq "$ZIP_PATH" server web)

rm -rf "$STAGE_DIR"

log "Done: $ZIP_PATH"
