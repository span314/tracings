#!/usr/bin/python
import os
import csv

INPUT_DIRECTORY = "patternData"
EXT_SVG = ".svg"
EXT_CSV = ".csv"

#Load step label and descriptions
stepMapping = {}
transMapping = {}
with open(os.path.join("codes", "0_steps.csv"), "r") as stepsFile:
  reader = csv.DictReader(stepsFile)
  for row in reader:
    stepMapping[row["code"]] = row["code"]
    transMapping[row["code"]] = row["trans"]

#Load dances
dances = []
with open(os.path.join(INPUT_DIRECTORY, "0_dances.csv"), "r") as dancesFile:
  reader = csv.DictReader(dancesFile)
  for row in reader:
    dances.append(row)

#Main
for danceData in dances:
  patternName = danceData["name"].lower().replace(" ", "_").replace("-", "_")
  print "Processing " + patternName

  filepath = os.path.join(INPUT_DIRECTORY, patternName + EXT_CSV)
  backuppath = filepath + "~"
  os.rename(filepath, backuppath)

  #Extract steps from csv
  with open(backuppath, "r") as inputFile, open(filepath, "w") as outputFile:
    headers = ["index", "pathCount", "beats", "edge", "transition", "step", "group", "optional", "hold", "labelOffset"]
    reader = csv.DictReader(inputFile)
    writer = csv.DictWriter(outputFile, headers, lineterminator='\n')
    writer.writeheader()
    for row in reader:
      row["transition"] = transMapping[row["step"]]
      row["step"] = stepMapping[row["step"]]
      writer.writerow(row)

  os.remove(backuppath)