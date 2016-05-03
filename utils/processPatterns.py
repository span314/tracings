#!/usr/bin/python
#This script processes csv (steps and timing) and svg (paths) files into json dance pattern components.
import json
import os
import re
import csv

NEW_WIDTH = 512
NEW_HEIGHT = 1024
DIRECTORY = "data"
EXT_SVG = ".svg"
EXT_CSV = ".csv"
PATH_REGEX = re.compile("^\s*d=\"(.*)\"")

EDGE_DESC = {
  "LFO": "Left Forward Outside",
  "LFI": "Left Forward Inside",
  "LBO": "Left Back Outside",
  "LBI": "Left Back Inside",
  "RFO": "Right Forward Outside",
  "RFI": "Right Forward Inside",
  "RBO": "Right Back Outside",
  "RBI": "Right Back Inside"
}

STEP_LABEL_PREFIX = {
  "cr": "CR"
}

STEP_LABEL_SUFFIX = {
  "pr": "Pr",
  "ch": "Ch",
  "swr": "swR",
  "slch": "slCh"
}

STEP_DESC_PREFIX = {
  "pr": "Progressive"
}

STEP_DESC_SUFFIX = {
  "": "Edge",
  "pr": "Edge",
  "swr": "Swing Roll",
  "ch": "Chasse",
  "slch": "Slide Chasse",
  "cr": "Cross Roll"
}

for file in os.listdir(DIRECTORY):
  if (file.endswith(EXT_CSV)):
    patternName = os.path.splitext(file)[0]
    print "Processing " + patternName
    svgFilename = os.path.join(DIRECTORY, patternName + EXT_SVG)
    csvFilename = os.path.join(DIRECTORY, patternName + EXT_CSV)

    processedPaths = []
    components = []

    #Extract path values from svg
    paths = []
    with open(svgFilename, "r") as svgFile:
      for line in svgFile:
        match = re.match(PATH_REGEX, line)
        if (match):
          tokens = match.group(1).strip().replace(" ",",").split(",")
          paths.append(tokens)

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
      startPoint = [round((new - old) * scaleFactor, 3) for new, old in zip(startPoint, oldCenter)]
      cubicPath = [round((new - old) * scaleFactor, 3) for new, old in zip(cubicPath, oldCenter * 3)]
      
      processedPaths.append({"start":startPoint,"bezier":cubicPath});


    #Extract steps from csv
    with open(csvFilename, "r") as csvFile:
      pathIndex = 0
      offset = 0
      reader = csv.DictReader(csvFile)
      for row in reader:
        #Calculate unspecified duration
        if (not row["duration"]):
          row["duration"] = 4 * int(row["beats"])
        #Calculate offset
        row["offset"] = offset
        if (not row["optional"]):
          offset += int(row["duration"])
        #Create labels
        if (not row["label"]):
          label = ""
          if (row["step"] in STEP_LABEL_PREFIX):
            label += STEP_LABEL_PREFIX[row["step"]]
            label += "-"
          label += row["edge"]
          if (row["step"] in STEP_LABEL_SUFFIX):
            label += "-" 
            label += STEP_LABEL_SUFFIX[row["step"]]
          row["label"] = label
        #Create descriptions
        if (not row["desc"]):
          desc = ""
          if (row["step"] in STEP_DESC_PREFIX):
            desc += STEP_DESC_PREFIX[row["step"]]
            desc += ": "
          desc += EDGE_DESC[row["edge"]]
          if (row["step"] in STEP_DESC_SUFFIX):
            desc += " " 
            desc += STEP_DESC_SUFFIX[row["step"]]
          row["desc"] = desc
        #Add paths
        componentPaths = []
        pathCount = row.pop("pathCount")
        if (pathCount):
          pathCount = int(pathCount)
        else:
          pathCount = 1
        for i in range(pathCount):
          componentPaths.append(processedPaths[pathIndex])
          pathIndex += 1
        row["path"] = componentPaths
        components.append(row)

    #Print component array
    print json.dumps(components, sort_keys=True, indent=2);