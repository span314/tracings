#!/usr/bin/python
#This script compiles svgs into css urls
import os
import base64

DIRECTORY = "icons"
EXT_SVG = ".svg"

for filename in os.listdir(DIRECTORY):
  if filename.endswith(EXT_SVG):
    svgData = ""
    with open(os.path.join(DIRECTORY, filename), "r") as svgFile:
      svgLines = svgFile.readlines()
      svgData = "".join(svgLines[2:])
    print("/* mdi icon " + filename + " */")
    print("background-image: url(\"data:image/svg+xml;base64," + base64.b64encode(svgData) + "\");")