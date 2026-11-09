#!/usr/bin/env bash

set -eo pipefail

function usage() {
  local prog="$(basename "$0")"

  cat <<EOF
Usage: $prog [OPTIONS]

Publishes the extension to Mozilla Add-ons via web-ext.

Options:
  --source-dir DIR      Extension source directory (default: dist/build)
  --artifacts-dir DIR   Output directory for signed artifacts (default: dist)
  --metadata-file FILE  AMO metadata JSON file (default: dist/release-meta.json)
  --channel CHANNEL     AMO channel (default: listed)
  -h, --help            Show this help and exit

Environment Variables:
  WEB_EXT_API_KEY       Mozilla Add-ons API key
  WEB_EXT_API_SECRET    Mozilla Add-ons API secret
EOF
}

function publish_ext_to_mozilla_marketplace() {
  local source_dir="dist/build"
  local artifacts_dir="dist"
  local metadata_file="dist/release-meta.json"
  local channel="listed"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --source-dir)
        source_dir="${2:?missing value for --source-dir}"
        shift 2
        ;;
      --artifacts-dir)
        artifacts_dir="${2:?missing value for --artifacts-dir}"
        shift 2
        ;;
      --metadata-file)
        metadata_file="${2:?missing value for --metadata-file}"
        shift 2
        ;;
      --channel)
        channel="${2:?missing value for --channel}"
        shift 2
        ;;
      -h|--help)
        usage; exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage; exit 1
        ;;
    esac
  done

  if [[ -z "$WEB_EXT_API_KEY" || -z "$WEB_EXT_API_SECRET" ]]; then
    echo "Error: WEB_EXT_API_KEY and WEB_EXT_API_SECRET environment variables must be set." >&2
    exit 1
  fi

  if [[ ! -d "$source_dir" || ! -f "$metadata_file" || ! -f "$source_dir/manifest.json" ]]; then
    echo "Error: required release inputs not found. Please run the prepare script first." >&2
    usage
    echo "Expected source dir: $source_dir" >&2
    echo "Expected metadata file: $metadata_file" >&2
    echo "Expected manifest: $source_dir/manifest.json" >&2
    exit 1
  fi

  VERSION=$(jq -r '.version' "$source_dir/manifest.json")

  npx web-ext sign \
    --channel="$channel" \
    --source-dir="$source_dir" \
    --artifacts-dir="$artifacts_dir" \
    --amo-metadata="$metadata_file"

  if [[ $? -eq 0 ]]; then
    echo "🪀  Successfully submitted version $VERSION to Mozilla Add-ons ($channel)."
  else
    echo "❌ Failed to publish version $VERSION to Mozilla Add-ons."
    exit 1
  fi
}

publish_ext_to_mozilla_marketplace "$@"
