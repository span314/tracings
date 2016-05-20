#!/usr/bin/python
#This script processes csv (steps and timing) and svg (paths) files into json dance pattern components.
import json
import os
import re
import csv
import math

NEW_WIDTH = 512
NEW_HEIGHT = 1024
INPUT_DIRECTORY = "patternData"
OUTPUT_DIRECTORY = "www/patterns"
EXT_SVG = ".svg"
EXT_CSV = ".csv"
EXT_JSON = ".json"
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

STEP_LABEL = {
  "": "#",
  "ch": "#-Ch",
  "cr": "CR-#",
  "e3": "#3",
  "e3x": "",
  "opmo": "#-opMo",
  "opmox": "#",
  "pr": "#",
  "prx": "#-Pr",
  "slch": "#-slCh",
  "swr": "#-swR"
}

STEP_DESC = {
  "": "# Edge",
  "ch": "# Chasse",
  "cr": "# Cross Roll",
  "e3": "European 3-turn: #",
  "e3x": "European 3-turn (exit): #",
  "opmo": "Open Mohawk: #",
  "opmox": "Open Mohawk (exit): #",
  "pr": "Progressive: # Edge",
  "prx": "Progressive: # Edge",
  "slch": "# Slide Chasse",
  "swr": "# Swing Roll"
}

class PointF:
  """Ordered pair of floats. May represent a point or a vector"""

  def __init__(self, x, y):
    self.x = float(x)
    self.y = float(y)

  def __add__(self, other):
    return PointF(self.x + other.x, self.y + other.y)

  def __sub__(self, other):
    return PointF(self.x - other.x, self.y - other.y)

  def __rmul__(self, cons):
    return PointF(self.x * cons, self.y * cons)

  def __neg__(self):
    return self.__rmul__(-1)

  def dotp(self, other):
    return self.x * other.x + self.y * other.y

  def norm(self):
    return math.sqrt(self.dotp(self))

  def normalize(self):
    length = self.norm()
    return PointF(self.x / length, self.y / length)

  def rotate(self, theta):
    """Rotate around origin"""
    sinTheta = math.sin(theta)
    cosTheta = math.cos(theta)
    return PointF(self.x * cosTheta - self.y * sinTheta, self.x * sinTheta + self.y * cosTheta)

class CubicBezierPath:
  """Represents a cubic bezier path"""

  @classmethod
  def fromSvgInput(cls, svgInput):
    """Factory method from svg format cubic"""
    points = [None] * 4
    points[0] = PointF(svgInput[1], svgInput[2])
    #Convert to absolute coordinate floats
    if svgInput[3] == "c": #relative coordinates cubic
      offset = points[0]
    elif svgInput[3] == "C": #absolute coordinates cubic
      offset = PointF(0, 0)
    else:
      raise Exception("path format code " + svgInput[3] + " is not supported")
    points[1:4] = [PointF(svgInput[2*i+4], svgInput[2*i+5]) + offset for i in xrange(3)]
    return cls(points)

  def __init__(self, points):
    self.points = points

  def scale(self, cons):
    return CubicBezierPath([cons * p for p in self.points])

  def shift(self, vector):
    return CubicBezierPath([p + vector for p in self.points])

  def rotate(self, theta):
    return CubicBezierPath([p.rotate(theta) for p in self.points])

  def value(self, t):
    """Value on the curve at point for parameter 0<=t<=1"""
    p0, p1, p2, p3 = self.points
    ti = 1 - t
    return ti * ti * ti * p0 + 3 * ti * ti * t * p1 + 3 * ti * t * t * p2 + t * t * t * p3

  def firstDerivative(self, t):
    """Derivative at point for parameter 0<=t<=1"""
    p0, p1, p2, p3 = self.points
    ti = 1 - t
    return 3 * ti * ti * (p1 - p0) + 6 * ti * t * (p2 - p1) + 3 * t * t * (p3 - p2)

  def secondDerivative(self, t):
    """Second derivative at point for parameter 0<=t<=1"""
    p0, p1, p2, p3 = self.points
    ti = 1 - t
    return 6 * ti * (p2 - 2 * p1 + p0) + 6 * t * (p3 - 2 * p2 + p1)

  def normalOut(self):
    """Normalized normal vector at t=1/2 pointed out of the radius of curvature"""
    dt = self.firstDerivative(0.5)
    dt2 = self.secondDerivative(0.5)
    normVector = dt.rotate(math.pi / 2).normalize()
    if normVector.dotp(dt2) > 0:
      normVector = -normVector
    return normVector

  def toObject(self):
    """Convert to object hash"""
    p0, p1, p2, p3 = self.points
    mid = self.value(0.5)
    n = self.normalOut()
    return {
      "start": [p0.x, p0.y],
      "bezier": [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y],
      "mid": [mid.x, mid.y],
      "normal": [n.x, n.y]
    }

def extractPathsFromSVG(fileHandle):
  paths = []
  processedPaths = []
  for line in fileHandle:
    match = re.match(PATH_REGEX, line)
    if (match):
      tokens = match.group(1).strip().replace(" ",",").split(",")
      paths.append(tokens)

  #Orient with guide lines
  oldCenter = PointF(paths[1][1], paths[0][2])
  oldWidth = float(paths[0][3])
  oldHeight = float(paths[1][4])

  scaleFactor = min(NEW_WIDTH / oldWidth, NEW_HEIGHT / oldHeight)

  for path in paths[2:]:
    cubic = CubicBezierPath.fromSvgInput(path)
    #Normalize centered at (0, 0)
    cubic = cubic.shift(-oldCenter)
    cubic = cubic.scale(scaleFactor)
    #Rotate by 90 degrees
    cubic = cubic.rotate(math.pi / 2)
    processedPaths.append(cubic.toObject())

  return processedPaths

def extractStepsFromCSV(fileHandle, processedPaths):
  components = []
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
      row["label"] = STEP_LABEL[row["step"]].replace("#", row["edge"])
    #Create descriptions
    if (not row["desc"]):
      row["desc"] = STEP_DESC[row["step"]].replace("#", EDGE_DESC[row["edge"]])
    #Add paths
    componentPaths = []
    pathCount = row.pop("pathCount")
    if (pathCount):
      pathCount = int(pathCount)
    else:
      pathCount = 1
    for i in range(max(pathCount, 1)):
      componentPaths.append(processedPaths[pathIndex + i])
    pathIndex += pathCount
    row["path"] = componentPaths
    components.append(row)
  return components

#Main
for file in os.listdir(INPUT_DIRECTORY):
  if (file.endswith(EXT_JSON)):
    patternName = os.path.splitext(file)[0]
    print "Processing " + patternName

    #Input dance data
    with open(os.path.join(INPUT_DIRECTORY, patternName + EXT_JSON), "r") as jsonFile:
      danceData = json.loads(jsonFile.read())

    #Extract path values from svg
    processedPaths = []
    for fileSuffix in ["", "_lady", "_man"]:
      filePath = os.path.join(INPUT_DIRECTORY, patternName + fileSuffix + EXT_SVG)
      if os.path.isfile(filePath):
        with open(filePath, "r") as svgFile:
          processedPaths += extractPathsFromSVG(svgFile)

    #Extract steps from csv
    with open(os.path.join(INPUT_DIRECTORY, patternName + EXT_CSV), "r") as csvFile:
      danceData["components"] = extractStepsFromCSV(csvFile, processedPaths)

    #Output files
    with open(os.path.join(OUTPUT_DIRECTORY, patternName + EXT_JSON), "w") as jsonFile:
      jsonFile.write(json.dumps(danceData, sort_keys=True, indent=2))