#!/bin/sh
uglifyjs www/header.js www/tracings.js www/icediagram.js www/lib/selectator/fm.selectator.jquery.js --output www/tracings-all.min.js --compress drop-console --mangle --screw-ie8 --comments "/!.*/" --verbose --source-map www/tracings-all.min.js.map --prefix relative --mangle-props --mangle-regex="/^_/" --reserve-domprops