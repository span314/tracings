#!/bin/bash
#ups the version in various files -- warning somewhat fragile
oldversion=`sed -n -e 's/^.*"version": "\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)".*/\1\\\.\2\\\.\3/p' package.json`
sed -i 's/'$oldversion'/'$1'/g' js/*js css/*css codes/*js latest.html package.json www/*html