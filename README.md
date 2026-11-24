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

`make preview-local` runs the dev server at http://127.0.0.1:5740 and shows the git-ignored local overlay when it exists (see `frontend/src/mocks/local.README.md`); `make preview` never does. `make preview-local-stop` stops the dev server.

## Reference images

`docs/design-references/` holds third-party reference images. It is git-ignored
and never committed.

## Development

Frontend commands run in the dev container, for example
`docker compose -f compose.dev.yaml run --rm frontend-dev npm run check`.
`npm ci` works with the container's own npm 10.9.4, but `npm install` crashes
on this dependency set. To add or update a dependency, regenerate the lockfile
with the npm version that produced it:
`docker compose -f compose.dev.yaml run --rm frontend-dev npx -y npm@11.21.3 install`.
