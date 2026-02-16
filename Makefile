.SHELL := /usr/bin/env bash

.PHONY: build
build:
	@mkdir -p dist
	@rsync -a --relative --exclude=*.xcf  \
		manifest.json \
		src/ \
		icons/ \
		README.md LICENSE \
		dist/build

.PHONY: clean
clean:
	rm -rf dist

.PHONY: lint
lint:
	npx web-ext lint --ignore-files scripts/** profiles/**

.PHONY: bundle
bundle: build
	npx web-ext build --source-dir=dist/build --artifacts-dir=dist


FIREFOX_PATH := /opt/firefox/firefox
ifeq ($(shell uname -s),Darwin)
FIREFOX_PATH := /Applications/Firefox\ Developer\ Edition.app/Contents/MacOS/firefox
endif

.PHONY: watch
watch:
	@if [ ! -f $(FIREFOX_PATH) ]; then \
		echo "Firefox Developer Edition not found in $(FIREFOX_PATH). Please install Firefox there to use this target."; \
		exit 1; \
	fi; \
	mkdir -p profiles/web-ext-dev; \
	npx web-ext run \
		--firefox=$(FIREFOX_PATH) \
 		--keep-profile-changes --profile-create-if-missing --firefox-profile $(shell pwd)/profiles/web-ext-dev \
		--devtools --no-reload \
		--watch-ignored "**/node_modules/**,profiles/**,**/scripts/**"

.PHONY: icons
icons:
	scripts/export-icons.sh

