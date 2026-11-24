# Local mock overlay

The committed mocks are synthetic, because this repository is public. To see your own projects in the preview, put files in `frontend/src/mocks/local/`. That folder is git-ignored (`/frontend/src/mocks/local` in `.gitignore`) and listed in `.dockerignore`, so it never reaches GitHub, CI or the `make preview` image. Do not commit it, and do not remove those two lines.

## Files

| File | Effect |
|---|---|
| `local/scenarios/<name>.json` | A `Scenario` (see `mock.schema.json`). A file whose `id` matches a committed scenario replaces it; a new `id` adds a scenario. Sorting is unchanged (group, then label). |
| `local/views.json` | A partial `ViewSet`. A key present here replaces that whole list in `views.json`. |

## Rules for local files

- Every envelope is `data_class: "personal"` and `source: "sample"`. It is still not live data.
- No secrets, tokens, email addresses, hostnames, IPs or URLs. Names of people other than "Owner" stay out too.
- Never copy work or client material into it.
- The scenario tests run over the merged set, so local files must pass the same schema, caps and scan checks. Scan them for secrets yourself: the commit hook does not see ignored files.
- The style guide stays synthetic and does not read this folder.

## Seeing it

`make preview-local` starts the Vite dev server (`compose.dev.yaml`, `127.0.0.1:5740`), which reads the folder. `make preview` builds an image from the committed files only.
