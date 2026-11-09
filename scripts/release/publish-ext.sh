#!/usr/bin/env bash

set -eo pipefail




function usage() {
  local prog="$(basename "$0")"

  cat <<EOF
Usage: $prog [options]

Publishes the extension to the Mozilla Marketplace. Must be run after executed release/prepare.sh.

Options:
  -h, --help    Show this help message and exit

Environment Variables:
  WEB_EXT_API_KEY     Your Mozilla Marketplace API key
  WEB_EXT_API_SECRET  Your Mozilla Marketplace API secret
EOF
}

function publish_ext_to_mozilla_marketplace() {

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        usage; exit 0
        ;;
      *)
        echo "Unknown option: $1"; usage; exit 1
        ;;
    esac
  shift
  done

  if [[ -z "$WEB_EXT_API_KEY" || -z "$WEB_EXT_API_SECRET" ]]; then
    echo "Error: WEB_EXT_API_KEY and WEB_EXT_API_SECRET environment variables must be set."
    exit 1
  fi

  if [[ ! -d "dist/build" ]] || [[ ! -f "dist/release-meta.json" ]] || [[ ! -f "manifest.json" ]]; then
    echo "Error: Build artifacts not found. Please run the prepare script first."
    usage
    exit 1
  fi

  VERSION=$(jq -r '.version' manifest.json)

  npx web-ext sign \
    --channel=listed \
    --source-dir=dist/build \
    --artifacts-dir=dist/ \
    --metadata=dist/release-meta.json

  if [[ $? -eq 0 ]]; then
    echo "🪀  Successfully published version $VERSION to Mozilla Marketplace."
  else
    echo "❌ Failed to publish version $VERSION to Mozilla Marketplace."
    exit 1
  fi
}

publish_ext_to_mozilla_marketplace "$@"
