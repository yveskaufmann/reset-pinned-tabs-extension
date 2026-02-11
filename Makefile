.SHELL := /usr/bin/env bash

.PHONY: bundle
bundle:
	@mkdir -p dist
	zip -r dist/reset-pinned-tabs-extension.xpi manifest.json icons/*.png src/ README.md LICENSE

.PHONY: lint
lint:
	npx web-ext lint  --ignore-files scripts/**,profiles/**

.PHONY: watch
watch:
	@if [ ! -d /opt/firefox ]; then \
		echo "Firefox Developer Edition not found in /opt/firefox. Please install Firefox there to use this target."; \
		exit 1; \
	fi; \
	mkdir -p profiles/web-ext-dev; \
	npx web-ext run \
		--firefox=/opt/firefox/firefox \
 		--keep-profile-changes --profile-create-if-missing --firefox-profile $(shell pwd)/profiles/web-ext-dev \
		--devtools --no-reload \
		--watch-ignored "**/node_modules/**,profiles/**,**/scripts/**"

.PHONY: icons
icons:
	scripts/export-icons.sh
