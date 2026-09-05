#!/usr/bin/env bash
VERSION="$1" perl -pi -e 's/^  "version": "[^"]*",/  "version": "$ENV{VERSION}",/' package.json
npm update
git add package.json
git add package-lock.json
git commit -m "release v$1"
git push
git tag -s $1 -m "release v$1"
git push --tags