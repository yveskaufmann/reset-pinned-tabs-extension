#!/usr/bin/env bash

set -e

if [[ -z "$WEB_EXT_API_KEY" || -z "$WEB_EXT_API_SECRET" ]]; then
  echo "Error: WEB_EXT_API_KEY and WEB_EXT_API_SECRET environment variables must be set."
  exit 1
fi

if [[ ! -d "dist/build" ]]; then
  echo "Error: Build artifacts not found. Please run the prepare script first."
  exit 1
fi

VERSION=$(jq -r '.version' manifest.json)
echo "Publishing version: $VERSION"

npx web-ext sign \
  --channel=listed \
  --source-dir=dist/build \
  --artifacts-dir=dist/
