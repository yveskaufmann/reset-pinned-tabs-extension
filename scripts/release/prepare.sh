#!/usr/bin/env bash

#
# Prepare the release of the extension by updating release meta information

set -euo pipefail

function usage() {
  local prog="$(basename "$0")"

  cat <<EOF
Usage: $prog --version '<version>' --changelog '<changelog>' [OPTIONS]

Prepare the release of the extension by updating release meta information.

Required options:
  --version <version>       The version for the release
  --changelog <changelog>   The changelog for the release

Options:
  -h, --help                Show this help message

Example:
  $prog --version '1.0.0' --changelog 'Initial release'
EOF
}

fail_with_usage() {
  local msg="${1:?missing error message}"
  echo "Error: $msg"
  usage
  exit 1
}

function prepare_release() {

  # Parse arguments for version and changelog
  local VERSION=""
  local CHANGELOG=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --version)
        VERSION="${2:?missing value for --version}"
        shift 2
        ;;
      --changelog)
        CHANGELOG="${2:?missing value for --changelog}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown arg: $1"
        fail_with_usage "Unknown argument: $1"
        ;;
    esac
  done

  if [[ -z "$VERSION" ]]; then
    fail_with_usage "Version is required"
  fi

  if [[ -z "$CHANGELOG" ]]; then
    fail_with_usage "Changelog is required"
  fi

  echo "💡Preparing release with version $VERSION"

  #  Version bump
  jq --arg version "$VERSION" '.version = $version' manifest.json > manifest.json.tmp
  mv manifest.json.tmp manifest.json
  npx biome format --write manifest.json
  echo "⏭️ Updated manifest.json with version $VERSION"

  # Create build artifacts
  make clean bundle
  echo "📦 Created build artifacts"

  # Generate release meta information with changelog
  jq --arg changelog "$CHANGELOG" -n '{ release_notes:{"en-US": $changelog}}' > dist/release-meta.json
  echo "📝 Generated release meta information at dist/release-meta.json"

  echo "✅ Release preparation complete"
}

prepare_release "$@"
