#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "$(uname -s)" == "Darwin" ]]; then
  FIREFOX_PATH="/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox"
else
  FIREFOX_PATH="/opt/firefox/firefox"
fi

if [[ ! -x "$FIREFOX_PATH" && ! -f "$FIREFOX_PATH" ]]; then
  echo "Firefox Developer Edition not found in $FIREFOX_PATH. Please install Firefox there to use this target." >&2
  exit 1
fi

PROFILE_DIR="$ROOT_DIR/profiles/web-ext-dev"
mkdir -p "$PROFILE_DIR"

exec npx web-ext run \
  --source-dir="$ROOT_DIR/dist/build" \
  --artifacts-dir="$ROOT_DIR/dist" \
  --firefox="$FIREFOX_PATH" \
  --keep-profile-changes \
  --profile-create-if-missing \
  --firefox-profile "$PROFILE_DIR" \
  --watch-ignored='node_modules/**' '**/profiles/**' '**/scripts/**'
