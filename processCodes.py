#!/usr/bin/python
#Compiles step, transition, and hold codes into javascript resource file.
import json
import os
import csv

INPUT_DIRECTORY = "codes"
OUTPUT_DIRECTORY = "js/package"
PREFIX = "DiagramCodes."

def exportObject(var, obj):
  return PREFIX + var + " = " + json.dumps(obj, sort_keys=True, indent=2, separators=(',', ': ')) + ";\n\n"

#Load step label and descriptions
stepLabel = {}
stepDesc = {}
with open(os.path.join(INPUT_DIRECTORY, "steps.csv"), "r") as inputFile:
  reader = csv.DictReader(inputFile)
  for row in reader:
    stepLabel[row["code"]] = row["label"]
    stepDesc[row["code"]] = row["desc"]

#Load holds
holdLabel = {}
holdDesc = {}
with open(os.path.join(INPUT_DIRECTORY, "holds.csv"), "r") as inputFile:
  reader = csv.DictReader(inputFile)
  for row in reader:
    holdLabel[row["code"]] = row["label"]
    holdDesc[row["code"]] = row["desc"]

#Load transitions
transitionLabel = {}
transitionDesc = {}
with open(os.path.join(INPUT_DIRECTORY, "transitions.csv"), "r") as inputFile:
  reader = csv.DictReader(inputFile)
  for row in reader:
    transitionLabel[row["code"]] = row["label"]
    transitionDesc[row["code"]] = row["desc"]

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
  "_ERROR_CONTACT": '\n\nLet me know at icediagrams@shawnpan.com if this problem continues.',
  "_ERROR_SERVER": 'Cannot find pattern file for selected dance.',
  "_ERROR_CONNECTION": 'Cannot connect to server to load dance. Please check your internet connection. Press OK to refresh the page.',
  "_ERROR_VERSION": 'Incompatible pattern version. Webpage has probably been updated. Press OK refresh the page.',
  "_ERROR_DEV": 'Warning: This pattern is still under development.'
};

#Output files
with open(os.path.join(OUTPUT_DIRECTORY, "diagramcodes.js"), "w") as outputFile, open(os.path.join(INPUT_DIRECTORY, "diagramcodeswrapper.js"), "r") as inputFile:
  for line in inputFile:
    if "###GENERATED###" in line:
      outputFile.write(exportObject("_EDGE_PARAMS", edgeParams))
      outputFile.write(exportObject("_HOLD_LABELS", holdLabel))
      outputFile.write(exportObject("_HOLD_DESCRIPTIONS", holdDesc))
      outputFile.write(exportObject("_MESSAGES", messages))
      outputFile.write(exportObject("_STEP_LABELS", stepLabel))
      outputFile.write(exportObject("_STEP_DESCRIPTIONS", stepDesc))
      outputFile.write(exportObject("_TRANSITION_LABELS", transitionLabel))
      outputFile.write(exportObject("_TRANSITION_DESCRIPTIONS", transitionDesc))
    else:
      outputFile.write(line)