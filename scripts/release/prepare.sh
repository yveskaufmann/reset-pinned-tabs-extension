#!/usr/bin/env bash

set -e

VERSION=${1?Version is required}

#  Version bump
echo "Updating manifest.json with version $VERSION"
jq --arg version "$VERSION" '.version = $version' \
  manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json
npx biome format --write manifest.json

# Create build artifacts
make clean bundle



