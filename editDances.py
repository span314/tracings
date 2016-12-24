#!/usr/bin/python
#Utility script to edit csv format
import os
import csv

INPUT_DIRECTORY = "patternData"
EXT_SVG = ".svg"
EXT_CSV = ".csv"

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
    headers = ["index", "pathCount", "beats", "beatGrouping", "edge", "transition", "step", "group", "optional", "hold", "labelOffset"]
    reader = csv.DictReader(inputFile)
    writer = csv.DictWriter(outputFile, headers, lineterminator='\n')
    writer.writeheader()
    for row in reader:
      #Edit rows here
      beat = row["beats"]
      if "_" in beat:
        row["beats"] = beat[:-1]
        row["beatGrouping"] = "+"
      elif "*" in beat:
        row["beats"] = beat[:-1]
        row["beatGrouping"] = "*"
      else:
        row["beats"] = beat
      writer.writerow(row)

  os.remove(backuppath)