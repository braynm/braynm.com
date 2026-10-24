#!/bin/sh
# Builds site/ from content/, layouts/ and static/, renders the share cards, and builds again to copy them in.
set -e
cd "$(dirname "$0")/.."
hugo --cleanDestinationDir
node tools/og.mjs
hugo
