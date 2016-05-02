#!/usr/bin/python
#This script processes csv (steps and timing) and svg (paths) files into json dance pattern components.
import json
import os
import re

NEW_WIDTH = 512
NEW_HEIGHT = 1024
DIRECTORY = "data"
EXT_SVG = ".svg"
EXT_CSV = ".csv"
PATH_REGEX = re.compile("^\s*d=\"(.*)\"")

for file in os.listdir(DIRECTORY):
  if (file.endswith(EXT_CSV)):
    patternName = os.path.splitext(file)[0]
    print "Processing " + patternName
    svgFilename = os.path.join(DIRECTORY, patternName + EXT_SVG)
    csvFilename = os.path.join(DIRECTORY, patternName + EXT_CSV)

    processedPaths = []

    #Extract path values from svg
    paths = []
    svgFile = open(svgFilename, 'r')
    for line in svgFile:
      match = re.match(PATH_REGEX, line)
      if (match):
        tokens = match.group(1).strip().replace(" ",",").split(",")
        paths.append(tokens)
    svgFile.close()

    oldCenter = [float(paths[1][1]), float(paths[0][2])]
    oldWidth = float(paths[0][3])
    oldHeight = float(paths[1][4])

    scaleFactor = min(NEW_WIDTH / oldWidth, NEW_HEIGHT / oldHeight)

    for path in paths[2:]:
      #Convert to absolute coordinate floats
      startPoint = [float(p) for p in path[1:3]]
      if path[3] == "c": #relative coordinates cubic
        offset = startPoint * 3
        absPath = [float(p) for p in path[4:10]]
        cubicPath = [a + o for a, o in zip(absPath, offset)]
      elif path[3] == "C": #absolute coordinates cubic
        cubicPath = [float(p) for p in path[4:10]]
      else:
        raise Exception("path format code " + path[3] + " is not supported")
      #Normalize - center as (0, 0)
      startPoint = [(new - old) * scaleFactor for new, old in zip(startPoint, oldCenter)]
      cubicPath = [(new - old) * scaleFactor for new, old in zip(cubicPath, oldCenter * 3)]
      
      processedPaths.append({"paths":[{"start":startPoint,"bezier":cubicPath}]});

    #Extract steps from csv 

    for bezier in processedPaths:
      print json.dumps(bezier);