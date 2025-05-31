#!/bin/bash
# Generate a CSV of all commits, files, and line changes for the repo
# Output: meta/loc.csv

# Write CSV header
mkdir -p meta

echo "commit,date,time,author,file,added,deleted" > meta/loc.csv

git log --reverse --pretty=format:'%H,%ad,%an' --date=iso --numstat | \
awk '
  BEGIN { commit=""; date=""; author="" }
  /^[0-9]/ {
    split($0, a, "\t");
    if (commit != "") {
      print commit "," date ",," author "," a[3] "," a[1] "," a[2]
    }
  }
  /^[^0-9]/ {
    if ($0 ~ /^[a-f0-9]{40}/) {
      split($0, h, ",");
      commit=h[1]; date=h[2]; author=h[3]
    }
  }
' >> meta/loc.csv 