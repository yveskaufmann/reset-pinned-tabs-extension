.SHELL := /usr/bin/env bash

.PHONY: build
build:
	@mkdir -p dist
	npx vite build
	@rsync -a --relative --exclude=*.xcf  \
		manifest.json \
		icons/ \
		README.md LICENSE \
		dist/build

.PHONY: clean
clean:
	rm -rf dist

.PHONY: lint
lint:
	npx biome check --write
	npx web-ext lint --ignore-files scripts/** profiles/**

.PHONY: test
test:
	npx vitest run

.PHONY: bundle
bundle: build
	npx web-ext build --source-dir=dist/build --artifacts-dir=dist

.PHONY: watch
watch:
	./scripts/run-firefox-dev.sh

.PHONY: icons
icons:
	scripts/export-icons.sh
