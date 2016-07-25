#!/bin/sh
cd www;
uglifyjs tracings.js icediagram.js --output tracings-all.min.js --compress drop-console --mangle --screw-ie8 --comments "/!.*/" --verbose --source-map tracings-all.min.js.map --prefix relative --mangle-props --mangle-regex="/^_/" --reserve-domprops;
cleancss -o style-all.min.css style.css --source-map;

#svg
#scour -i clock-fast-75.svg -o clock-fast-75-s.svg --enable-viewboxing --enable-id-stripping --enable-comment-stripping --shorten-ids --indent=none