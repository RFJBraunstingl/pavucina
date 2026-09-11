#!/usr/bin/env bash
LAST_TAG=$(git describe --tags --abbrev=0) || exit 1
RELEASE_MESSAGES=$(git log --reverse --format=%s "${LAST_TAG}..HEAD") || exit 1
VERSION="$1" perl -pi -e 's/^  "version": "[^"]*",/  "version": "$ENV{VERSION}",/' package.json
npm update
git add package.json
git add package-lock.json
git commit -m "release v$1" -m "$RELEASE_MESSAGES"
git push
git tag -s $1 -m "release v$1"
git push --tags
