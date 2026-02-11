#!/usr/bin/env bash
#
# Exports icons in different sizes from the GIMP source file `src/icons.xcf` to the `src/icons/` directory.
#
# Requires GIMP 3.0 or later with Python support.
#
# Usage: `./scripts/export-icons.sh` or `make icons`
##

gimp -i \
  --batch-interpreter="python-fu-eval" \
  -b "import os; exec(open(os.path.abspath('scripts/export-icons.py')).read())" \
  --quit
