#!/usr/bin/env bash

set -e

if [[ -z "$AMO_API_KEY" || -z "$AMO_API_SECRET" ]]; then
  echo "Error: AMO_API_KEY and AMO_API_SECRET environment variables must be set."
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
  --artifacts-dir=dist/ \
  --api-key="${AMO_API_KEY}" \
  --api-secret="${AMO_API_SECRET}" \
