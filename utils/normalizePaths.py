#!/usr/bin/python
import subprocess
import json
import os

NEW_WIDTH = 512
NEW_HEIGHT = 1024
DIRECTORY = "data"
EXT_SVG = ".svg"
EXT_CSV = ".csv"

for file in os.listdir(DIRECTORY):
  if (file.endswith(EXT_CSV)):
    patternName = os.path.splitext(file)[0]
    print "Processing " + patternName
    svgFile = os.path.join(DIRECTORY, patternName + EXT_SVG)
    csvFile = os.path.join(DIRECTORY, patternName + EXT_CSV)

    beziers = []

    #Extract path values from svg
    pathValues = subprocess.check_output(["sed", "-n", "s/^\\s*d=\\\"\(.*\)\\\"/\\1/p", svgFile])
    paths = [line.split(",") for line in pathValues.strip().replace(" ",",").split("\n")]

    oldCenterX = float(paths[1][1])
    oldCenterY = float(paths[0][2])
    oldWidth = float(paths[0][3])
    oldHeight = float(paths[1][4])

    scaleFactor = min(NEW_WIDTH / oldWidth, NEW_HEIGHT / oldHeight)

    for path in paths[2:]:
      #Convert to absolute coordinate floats
      x0 = float(path[1])
      y0 = float(path[2])
      if path[3] == "c": #relative coordinates cubic
        x1 = float(path[4]) + x0
        y1 = float(path[5]) + y0
        x2 = float(path[6]) + x0
        y2 = float(path[7]) + y0
        x3 = float(path[8]) + x0
        y3 = float(path[9]) + y0
      elif path[3] == "C": #absolute coordinates cubic
        x1 = float(path[4])
        y1 = float(path[5])
        x2 = float(path[6])
        y2 = float(path[7])
        x3 = float(path[8])
        y3 = float(path[9])
      else:
        raise Exception("path format code " + path[3] + " is not supported")
      #Normalize - center as (0, 0)
      x0 = (x0 - oldCenterX) * scaleFactor
      x1 = (x1 - oldCenterX) * scaleFactor
      x2 = (x2 - oldCenterX) * scaleFactor
      x3 = (x3 - oldCenterX) * scaleFactor
      y0 = (y0 - oldCenterY) * scaleFactor
      y1 = (y1 - oldCenterY) * scaleFactor
      y2 = (y2 - oldCenterY) * scaleFactor
      y3 = (y3 - oldCenterY) * scaleFactor
      
      beziers.append({"paths":[{"start":[x0,y0],"bezier":[x1,y1,x2,y2,x3,y3]}]});

    for bezier in beziers:
      print json.dumps(bezier);