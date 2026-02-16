#!/usr/bin/env python3

##
# DO NOT invoke this script directly:
#
# Use `make icons` instead, which will call this script via GIMP's batch mode.
#
# This script exports icons in the array specified in
# `sizes` from the GIMP source file `src/icons.xcf` to the `src/icons/` directory.
##

import os
from gi.repository import Gio
from gi.repository import Gimp
import gi

gi.require_version('Gimp', '3.0')

pdb = Gimp.get_pdb()
cwd = os.getcwd()
master_path = os.path.join(cwd, "icons/icon-master.xcf")
sizes = [16, 32, 48, 64, 128, 256]

# In GIMP 3, we load files using Gio
input_file = Gio.File.new_for_path(master_path)

for size in sizes:
    image = Gimp.file_load(Gimp.RunMode.NONINTERACTIVE, input_file)

    image.scale(size, size)

    layers = image.get_layers()
    drawable = layers[0]

    output_name = os.path.join(cwd, f"icons/icon{size}.png")
    output_file = Gio.File.new_for_path(output_name)

    procedure = pdb.lookup_procedure('file-png-export')

    config = procedure.create_config()
    config.set_property('run-mode', Gimp.RunMode.NONINTERACTIVE)
    config.set_property('image', image)
    config.set_property('file', output_file)
    config.set_property('compression', 9)

    config.set_property('bkgd', False)
    config.set_property('time', False)
    config.set_property('include-thumbnail', False)
    config.set_property('save-transparent', True)
    config.set_property('format', 'rgba8')
    config.set_property('include-color-profile', False)

result = procedure.run(config)

image.delete()
