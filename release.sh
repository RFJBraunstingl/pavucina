#!/usr/bin/env bash
LAST_TAG=$(git describe --tags --abbrev=0) || exit 1
RELEASE_MESSAGES=$(git log --reverse --format=%s "${LAST_TAG}..HEAD") || exit 1
RELEASE_MESSAGES=$(awk '!seen[$0]++' <<< "$RELEASE_MESSAGES")
VERSION="${1:-$(node -p 'const [major, minor, patch] = require("./package.json").version.split("."); `${major}.${minor}.${Number(patch) + 1}`')}"
VERSION="$VERSION" perl -pi -e 's/^  "version": "[^"]*",/  "version": "$ENV{VERSION}",/' package.json
npm update
git add package.json
git add package-lock.json
git commit -m "release v$VERSION" -m "$RELEASE_MESSAGES"
git push
git tag -s "$VERSION" -m "release v$VERSION"
git push --tags
