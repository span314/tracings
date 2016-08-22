#!/usr/bin/python
#This script processes csv (steps and timing) and svg (paths) files into json dance pattern components.
import json
import os
import re
import csv
import math

DATA_VERSION = 2
NEW_WIDTH = 435
NEW_HEIGHT = NEW_WIDTH * 2
INPUT_DIRECTORY = "patternData"
OUTPUT_DIRECTORY = "patternOutput"
JS_DIRECTORY = "js"
MIN_OUTPUT_DIRECTORY = "www/patterns"
EXT_SVG = ".svg"
EXT_CSV = ".csv"
EXT_JSON = ".json"
PATH_REGEX = re.compile("^\s*d=\"(.*)\"")

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

  def toArray(self):
    return [self.x, self.y]

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

  def toArray(self):
    """Convert to array of coordinates, rounding to 3 digits"""
    return [round(c, 3) for p in self.points for c in p.toArray()]

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
    processedPaths.append(cubic.toArray())

  return processedPaths

def extractStepsFromCSV(fileHandle, processedPaths):
  components = []
  pathIndex = 0
  reader = csv.DictReader(csvFile)
  for row in reader:
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
    row["paths"] = componentPaths
    #Pop off blank values
    if (not row["optional"]):
      row.pop("optional")
    if (not row["group"]):
      row.pop("group")
    if (not row["labelOffset"]):
      row.pop("labelOffset")
    components.append(row)
  return components

def createStepList(components):
  steps = {}
  for component in components:
    step = component["step"]
    if step not in steps:
      steps[step] = {"label": stepLabel[step], "desc": stepDesc[step]}
  return steps


#Load step label and descriptions
stepLabel = {}
stepDesc = {}
with open(os.path.join(INPUT_DIRECTORY, "0_steps.csv"), "r") as stepsFile:
  reader = csv.DictReader(stepsFile)
  for row in reader:
    stepLabel[row["code"]] = row["label"]
    stepDesc[row["code"]] = row["desc"]

#Load holds
holdLabel = {}
holdDesc = {}
with open(os.path.join(INPUT_DIRECTORY, "0_holds.csv"), "r") as stepsFile:
  reader = csv.DictReader(stepsFile)
  for row in reader:
    holdLabel[row["code"]] = row["label"]
    holdDesc[row["code"]] = row["desc"]

#Create edge params
# The following codes consisting of a # and a character represent parameterized edge features in text.
# A lower case character (e.g. #e) represent the short text version (e.g. RFO) and an upper case
# character (e.g. #E) represents a long text version (e.g. Right Forward Outside). Examples are given
# in paratheses for the edge code RFO.

# #e  edge (RFO, Right Forward Outside)
# #m  mirrored edge (LFO, Left Forward Outside)
# #f  skating foot (R, Right)
# #r  free foot (L, Left)
# #d  direction (F, Forward)
# #b  opposite direction (B, Backward)
# #q  quality (O, Outside)
# #o  opposite quality (I, Inside)
# ##  escaped # character (#)
edgeParams = {}
for edge in ('LB', 'LBI', 'LBO', 'LF', 'LFI', 'LFO', 'RB', 'RBI', 'RBO', 'RF', 'RFI', 'RFO'):
  params = {'#': '#'}
  if 'L' in edge:
    params["f"] = 'L'
    params["r"] = 'R'
    params["F"] = 'Left'
    params["R"] = 'Right'
  if 'R' in edge:
    params["f"] = 'R'
    params["r"] = 'L'
    params["F"] = 'Right'
    params["R"] = 'Left'
  if 'F' in edge:
    params["d"] = 'F'
    params["b"] = 'B'
    params["D"] = 'Forward'
    params["B"] = 'Backward'
  if 'B' in edge:
    params["d"] = 'B'
    params["b"] = 'F'
    params["D"] = 'Backward'
    params["B"] = 'Forward'
  if 'I' in edge:
    params["q"] = 'I'
    params["o"] = 'O'
    params["Q"] = 'Inside'
    params["O"] = 'Outside'
  if 'O' in edge:
    params["q"] = 'O'
    params["o"] = 'I'
    params["Q"] = 'Outside'
    params["O"] = 'Inside'
  params["e"] = params["f"] + params["d"] + params.get("q", "")
  params["E"] = (params["F"] + " " + params["D"] + " " + params.get("Q", "")).strip()
  params["m"] = params["r"] + params["d"] + params.get("q", "")
  params["M"] = (params["R"] + " " + params["D"] + " " + params.get("Q", "")).strip()
  edgeParams[edge] = params

messages = {
  "errorContact": '\n\nLet me know at icediagrams@shawnpan.com if this problem continues.',
  "errorServer": 'Cannot find pattern file for selected dance.',
  "errorConnection": 'Cannot connect to server to load dance. Please check your internet connection. Press OK to refresh the page.',
  "errorVersion": 'Incompatible pattern version. Webpage has probably been updated. Press OK refresh the page.',
  "errorDev": 'Warning: This pattern is still under development.'
};

#Output files
with open(os.path.join(JS_DIRECTORY, "icediagramtext.js"), "w") as jsonFile:
  diagramText = {
                  "edgeParams": edgeParams,
                  "holdLabels": holdLabel,
                  "holdDescriptions": holdDesc,
                  "messages": messages,
                  "stepLabels": stepLabel,
                  "stepDescriptions": stepDesc
                }
  header = """/*!
Text for Ice Diagram Widget | Software Copyright (c) Shawn Pan
*/
/*
This file is automatically generated by processPatterns.py
Stored as javascript rather than JSON to be easily packaged into one file with uglify.js
Future versions may have separate JSON resource files for localization.
*/
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(factory);
  } else if (typeof exports === 'object') {
    // Node, CommonJS-like
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.IceDiagramText = factory();
  }
}(this, function () {
return """
  jsonFile.write(header + json.dumps(diagramText, sort_keys=True, indent=2) + ";\n}));")

#Load dances
dances = []
with open(os.path.join(INPUT_DIRECTORY, "0_dances.csv"), "r") as dancesFile:
  reader = csv.DictReader(dancesFile)
  for row in reader:
    dances.append(row)

#Main
for danceData in dances:
  danceData["patterns"] = {}
  danceData["patterns"]["lady"] = {"startComponent": danceData.pop("ladyStart"), "endComponent": danceData.pop("ladyEnd")}
  danceData["patterns"]["man"] = {"startComponent": danceData.pop("manStart"), "endComponent": danceData.pop("manEnd")}
  patternName = danceData["name"].lower().replace(" ", "_").replace("-", "_")
  danceData["dataVersion"] = DATA_VERSION
  if (not danceData["dev"]):
    danceData.pop("dev")
  print "Processing " + patternName

  #Extract path values from svg
  processedPaths = []
  for fileSuffix in ["", "_lady", "_man"]:
    filePath = os.path.join(INPUT_DIRECTORY, patternName + fileSuffix + EXT_SVG)
    if os.path.isfile(filePath):
      with open(filePath, "r") as svgFile:
        processedPaths += extractPathsFromSVG(svgFile)

  #Extract steps from csv
  with open(os.path.join(INPUT_DIRECTORY, patternName + EXT_CSV), "r") as csvFile:
    components = extractStepsFromCSV(csvFile, processedPaths)
    danceData["components"] = components
    danceData["steps"] = createStepList(components)

  #Output files
  with open(os.path.join(OUTPUT_DIRECTORY, patternName + EXT_JSON), "w") as jsonFile:
    jsonFile.write(json.dumps(danceData, sort_keys=True, indent=2))

  #Output minified files
  with open(os.path.join(MIN_OUTPUT_DIRECTORY, patternName + EXT_JSON), "w") as jsonFile:
    jsonFile.write(json.dumps(danceData, sort_keys=True, separators=(',', ':')))