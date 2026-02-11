# Pinned Tab Resetter — small open‑source Firefox WebExtension that restores pinned tabs to their initial URLs on startup

Restore pinned tabs to their initially opened URLs on browser startup or
on demand via the context menu.

## Usage

Install the extension (see below) and pin some tabs. The extension will automatically restore their original URLs on browser startup. You can also reset individual pinned tabs by selecting “Reset Pinned Tab” from the tab's context menu, or reset all pinned tabs at once via the “Reset All Pinned Tabs” option.

### Motivation & features

Keep pinned tabs as stable shortcuts — restore their original (home) URL on startup.

I liked Zen Browser's pinned‑tab shortcuts and wanted to replicate that behavior in Firefox.
It keeps pinned tabs as reliable shortcuts to important sites.

- Automatic restore of pinned tabs to their initial URLs on browser startup.
- Reset a single tab or reset all pinned tabs via context menu.
- Pin tabs per context menu or via the browser's built-in pinning feature; the extension will track and restore them.

## Development requirements

- [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/) installed at `/opt/firefox`
  - Note: `web-ext --watch` may fail with snap-installed Firefox due to sandboxing. Use `--firefox=/opt/firefox/firefox` with `web-ext` or install Firefox Developer Edition at `/opt/firefox`.
- [npm](https://www.npmjs.com/) for dependency management and build scripts
- [GIMP](https://www.gimp.org/) >= 3.0 (optional — only required for icon edits via `scripts/export-icons.sh`)
- [Make](https://www.gnu.org/software/make/) for build automation

## Build (Makefile)

Install dependencies:

```bash
npm install
```

Common targets:

```bash

# Start Firefox with the extension loaded as a temporary add-on and auto-reloads on source changes
make watch

# Create a distribution bundle of the extension as `reset-pinned-tabs-extension.xpi`
make bundle

# Lint the extension against WebExtension best practices and common issues
make lint

# Export icons in different sizes from the GIMP source file (requires GIMP)
make icons
```

> [!NOTE]
> `make watch` will launch Firefox Developer Edition with the extension loaded as a temporary add-on.
> As long as the terminal is running, the extension will reload on source changes.

## Install the extension

- Temporary (development):
  1. Open `about:debugging#/runtime/this-firefox`
  2. Click “Load Temporary Add-on” and select `manifest.json` from this folder
  - Note: temporary add-ons unload at browser restart.

- Persistent (testing/distribution):
  1. Run `make bundle` to produce `reset-pinned-tabs-extension.xpi`
  2. Install via `about:addons` → “Install Add-on From File” or drag-and-drop the `.xpi` file

## License

This project is available under the MIT License — see [LICENSE](LICENSE).
