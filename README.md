# Friday

Friday is a single-user personal AI assistant that runs locally. It answers
from the owner's existing sources and shows results as validated widgets on a
HUD-style dashboard. Every sensitive action needs the owner's approval.

## Status

Milestone U: dashboard preview on synthetic data. No backend exists yet.

## Running the preview

From milestone U L0 onward, `make preview` runs the dashboard preview. Once
that task has landed, open http://127.0.0.1:8742. Until then the `make` target
does not exist.

## Reference images

`docs/design-references/` holds third-party reference images. It is git-ignored
and never committed.
