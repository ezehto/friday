#!/usr/bin/env bash
# Fails when the index or any scanned commit contains a path under frontend/src/mocks/local, or when git errors.
# Default scan: every commit not yet on a remote. Arguments replace the rev-list arguments, for example
# `check-no-local-mocks.sh HEAD` scans the whole history of HEAD (used in CI).
set -euo pipefail

dir=frontend/src/mocks/local
fail() { echo "$dir is the owner's private overlay and must never be committed or pushed: $1" >&2; exit 1; }

tracked=$(git ls-files "$dir")
[ -z "$tracked" ] || fail "tracked in the index: $tracked"

if [ "$#" -gt 0 ]; then revs=("$@"); else revs=(HEAD --branches --tags --not --remotes); fi
commits=$(git rev-list "${revs[@]}")

for commit in $commits; do
  found=$(git ls-tree -r --name-only "$commit" -- "$dir")
  [ -z "$found" ] || fail "commit $commit contains: $found"
done
