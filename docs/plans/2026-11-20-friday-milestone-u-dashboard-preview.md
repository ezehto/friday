# Friday Milestone U Dashboard Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build layers L0 to L2 of the Friday design: the real React dashboard frontend, running in a container on `127.0.0.1:8742`, that draws the closed block set inside an original HUD frame from synthetic mock data validated against the shared JSON Schema contract.

**Architecture:** JSON Schema files in `schema/` are the contract; TypeScript types are generated from them and every mock file is validated against them with Ajv in vitest. Views read one small store fed by a `SessionTransport`; in this milestone the only implementation is `MockTransport`, which replays scenario scripts as `/ws/session` envelope frames, so L8 swaps in `WsTransport` without touching views. The page renders only blocks, as text, with tokens from one CSS file.

**Tech Stack:** Node 22.22.0, npm 10.9.4, React 19.3.1, TypeScript 6.0.3, Vite 8.3.8 with @vitejs/plugin-react 6.2.1, Vitest 5.1.0 with jsdom 30.1.3 and Testing Library (react 16.3.3, dom 10.4.2, user-event 14.6.8), Ajv 8.20.0 with ajv-formats 3.0.1, json-schema-to-typescript 16.0.0, ESLint 10.14.0 with @eslint/js 10.0.1, typescript-eslint 8.72.1, eslint-plugin-react-hooks 7.1.1, globals 17.14.0; Docker 28.3.2 with Compose v2.39.1, base image `node:22.22.0-bookworm-slim` pinned by digest; gitleaks v8.30.1 through pre-commit 3.6.2; Playwright CLI (`@playwright/cli`) 0.1.24; GitHub Actions `actions/checkout@v6`, `actions/setup-node@v6`.

**Spec:** `/mnt/d/Projects/Personal/projects/friday/docs/specs/2026-11-20-friday-design.md` (revision 8 content; sections 15, 16, 21, 24, 26, 28, 29 and D8, D18, D19, D23, D28).

---

## Global Constraints

Every task inherits these. A task brief never overrides them.

- Scope: L0, L1 and L2 only. No backend, no Python, no `src/friday`, no FastAPI, no WebSocket client, no login, no real data source.
- Location: repo root `/mnt/d/Projects/Personal/projects/friday` (D6). Frontend in `frontend/`, contract in `schema/`.
- Documents live in a dedicated subfolder of `docs/` (`specs/`, `plans/`, `guides/`, `handoff/`, `design-references/`), never directly in `docs/` and never in `docs/superpowers/` (owner instruction, 2026-11-20). Documents this milestone creates go to `docs/guides/`.
- Ports: preview `127.0.0.1:8742` (container binds `0.0.0.0:8742`, compose publishes `127.0.0.1:8742:8742`); Vite dev server `127.0.0.1:5740`. Never 8000, 8001, 5432, 5433, 6379, 6380, 37700, 5173. 8740 and 8741 stay free for L3.
- Every published port in any compose file starts with `127.0.0.1:`.
- Containers run as the non-root `node` user (uid 1000), no secret in any image, preview container `read_only: true` with a tmpfs `/tmp` (D19).
- Where commands run: `[host]` means the WSL shell in the repo root; `[dev]` means `docker compose -f compose.dev.yaml run --rm frontend-dev <cmd>` run from the repo root on the host (dependencies live in the named volume `friday-node-modules` mounted at `/app/frontend/node_modules`, never on `/mnt/d`). git, make, curl, pre-commit and `playwright-cli` always run on `[host]`.
- Closed block set for this milestone: `value`, `chart` (line, bar, area, donut), `table`, `rows` (variants `list` and `log`), `meter`, `timeline`, `person`, `chips`, `text`, `facts`, `alert`, `kanban`. No `quote` block, no month-grid `calendar` block, no other kind.
- Caps (section 16): title 80, label 60, value 40, text 400 characters; 12 widgets per board, 5 series per chart, 500 points per series, 50 table rows, 8 table columns; per-field caps from the section 16 field-type table. Caps count Unicode code points (Ajv default `unicode: true`).
- Tone is a word: `good`, `bad`, `attention`, `neutral`. Never colour alone: every toned element shows an icon and a visible or screen-reader tone word.
- Data class is `work` or `personal`; a `work` envelope shows a "Work" chip.
- Text-only rendering: every string from data is a React text child. No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function` anywhere in `frontend/src` (ESLint `no-restricted-syntax`).
- Links: kept only when `new URL(url).protocol` is `http:` or `https:` and the URL has no username or password; the page shows the text followed by the hostname in parentheses, for example `Natsu README (github.com)`; anything else renders as plain text with no anchor.
- No network from the page: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon` and `navigator.mediaDevices` are banned in `frontend/src` by ESLint `no-restricted-globals` / `no-restricted-properties`. Fonts and assets are bundled; no third-party origin.
- Colours: tokens only. Any hex, `rgb(` or `hsl(` colour literal in `frontend/src` outside `frontend/src/styles/tokens.css` fails `npm run check:hex`.
- Dark theme only (D23); tokens grouped so a light set can be added later as a second set of values.
- Accessibility: body text and primary values meet WCAG AA (4.5:1) on every background token; non-text focus ring 3:1; every control reachable and operable by keyboard with a visible focus ring; `prefers-reduced-motion: reduce` and the in-page motion setting (`<html data-motion="reduced">`) still the rings, glow pulses and panel entry; uppercase monospace for labels and headers only.
- Originality (D8, D18): no logos, wordmarks, emblems or franchise text from the reference images or any film; no dotted acronym styling of the name, no "Stark", "J.A.R.V.I.S.", "Marvel", "Iron Man". Nothing from `docs/design-references/` is ever copied, imported, traced or committed.
- Synthetic data only (D8): invented projects, people, tickets and sessions; links only to `example.com`, `example.org` or `github.com/example`; user chip reads "Owner". No real vault note, repo name of the owner's work, Jira key, email or session id.
- Preview markers: every mock envelope has `source: "sample"` and every panel shows a "Sample data" stamp; Approvals, Permissions and Sessions show the fixed banner `PREVIEW, NOT LIVE`; every action button there and the chat send only show `Preview: nothing was executed`.
- Fixed strings: the core, the status pill, alerts and tray rows show only strings from the `FIXED` object in `frontend/src/chrome/fixedText.ts`; mock data carries kinds and counts, never tray text, and the `text` of a mock `alert` block must equal a `FIXED.alert` value (amended 2026-11-20, F13: the `alert` block has a `text` field, so "never alert text" contradicted the block schema).
- No em dash (U+2014) or en dash (U+2013) in UI text, docs or comments; `npm run check:dashes` fails on either anywhere in the repo outside `node_modules`, `dist`, `.git`, `docs/design-references/` and the untracked working folders `.beads/`, `.superpowers/`, `.playwright-cli/` (amended 2026-11-20, F23: those folders are never committed).
- Dependencies: exact versions in `frontend/package.json` (no `^`), lockfile committed, nothing added beyond the list in Task 2 without a one-line justification in the task's commit and the reviewer's agreement. Charts are plain SVG. The image's npm 10.9.4 crashes on `npm install` with this dependency set (`npm ci` works): any lockfile change runs `[dev]` `npx -y npm@11.21.3 install` (amended 2026-11-20, found in Task 2).
- Commits: one logical change per commit, imperative subject, no body unless the reason is non-obvious, never a `Co-Authored-By` trailer or any attribution footer, only on branch `milestone-u-preview`, never on `main`. No push, no remote: creating the GitHub repo and pushing are the owner's steps.
- Every commit passes the gitleaks pre-commit hook. Screenshots, `.playwright-cli/` output and trace files are never committed. `CLAUDE.md` is never staged; stage files by explicit path.

### Implementation conventions (added 2026-11-20 from the cross-check)

- Component signatures in this plan omit the return type. Never write `JSX.Element`: `@types/react` 19 declares `JSX` only inside the `React` namespace (verified in the installed `@types/react` 19.3.0), so a bare `JSX` fails `tsc`. When a return type is needed, use `ReactElement` imported from `react` (F2).
- A component that shares its name with a generated type (`ChartBlock`, `ValueBlock` and the other `<Kind>Block` names) imports the type under an alias: `import type { ChartBlock as ChartBlockData } from "../generated/types"` (F3).
- Tests import `test`, `expect`, `vi`, `beforeEach` and `afterEach` from `vitest` explicitly; `tests/setup.ts` (Task 2a) runs Testing Library's `cleanup` after each test, so DOM never leaks between tests (F8).
- The text-only and no-network ESLint bans apply to `src/**` only; `scripts/**`, `tests/**` and config files get Node globals (Task 2a, F7).
- Schema ids for `validateAgainst`: a file's `$id` (for example `https://friday.invalid/schema/envelope.schema.json`), or `<$id>#/$defs/<Name>` for a definition inside a file (for example `https://friday.invalid/frontend/src/mocks/mock.schema.json#/$defs/SampleSet`) (F1).
- Owner checkpoints (end of Task 8) and owner demonstrations (Tasks 6, 15, 25) are stops for the orchestrator: the implementer finishes its steps and reports; the next task is not dispatched until the owner has looked.
- CI jobs cannot run until the owner pushes; a task that writes CI YAML is reviewed on the YAML and the local equivalents of its commands (F33).

## Review Focus

The five inputs most likely to bite the owner that the per-task tests would not otherwise reach, most likely first. Each has a pinned test in the task that owns the code.

1. **Degenerate chart data.** A series with one point, all points equal, all `y` zero on a donut, negative `y`, and a value of `1e12`. Scaling divides by `max - min` and a donut divides by its total, so these produce `NaN` in SVG path data and a blank or broken panel. Test: `Chart.test.tsx` "degenerate data renders without NaN", owned by Task 11.
2. **Long unbroken strings at the cap.** An 80-character title with no spaces, a 40-character value such as a hash, a 200-character `source_ref` URL. They overflow the panel or push the column wider than the core layout allows. Test: Playwright CLI check in `frontend/e2e/smoke.sh` that in scenario `edge-caps` every `[data-widget-id]` has `scrollWidth <= clientWidth + 1` and the document has no horizontal scroll at 1440 and 900 px, owned by Task 24, with the CSS rule (`overflow-wrap: anywhere; min-width: 0`) owned by Task 12.
3. **Script-like text and deceptive links.** `<img src=x onerror=alert(1)>` in a label, `JavaScript:alert(1)` (mixed case), ` javascript:` with a leading space, `data:text/html,...`, `//evil.example/x`, `https://github.com@evil.example/`, and an IDN host. Tests: `safety.test.ts` "safeLink rejects every non-http(s) form and credentials, and shows the parsed hostname" (Task 9) and `blocks.test.tsx` "onerror text renders literally" (Task 10).
4. **Empty and over-full boards.** A widget whose rows, table, chart series or timeline are empty, and a board with 13 envelopes reaching the renderer despite the schema. Tests: `blocks-empty.test.tsx` "every block kind shows the fixed empty text with no items" (Task 10) and `Board.test.tsx` "renders at most 12 panels and keeps the core mounted" (Task 20).
5. **Hidden characters next to action buttons.** A permission input or proposal content with CR, tab, ANSI `\x1b[31m`, a bidi override U+202E, a zero-width space U+200B and a Cyrillic `а` in `pаssword`. Shown raw, they make the preview teach the owner to trust what he sees. Test: `markers.test.ts` "every hidden class becomes a visible marker with line and byte counts", owned by Task 22.

---

## File structure

```
.gitignore                       adds secrets/, *.env, data/, frontend/node_modules, frontend/dist, .playwright-cli/ to the existing entry
.gitattributes                   * text=auto eol=lf (Windows drive, shell scripts must keep LF)
.pre-commit-config.yaml          gitleaks-docker hook, gitleaks v8.30.1
.github/workflows/ci.yml         frontend checks, secret scan, image build, (L2) Playwright CLI smoke
README.md                        what Friday is, milestone U status, how to run the preview
LICENSE                          MIT
Makefile                         preview, check-frontend (only these two in this milestone)
Dockerfile                       stages: base, dev, spa-build, preview
compose.yaml                     service preview on 127.0.0.1:8742
compose.dev.yaml                 service frontend-dev: source bind mount, node_modules volume, Vite on 127.0.0.1:5740
schema/
  friday.schema.json             root: $defs pointing at every contract schema (generation and L8 entry point)
  version.json                   {"schema_version": "0.1.0"}
  common.schema.json             Tone, DataClass, Link, IsoDate, IsoTime, capped string defs
  envelope.schema.json           WidgetEnvelope (the page's unit)
  blocks/<kind>.schema.json      one per block kind (12 files) plus blocks/block.schema.json (union)
  widgets/<type>.schema.json     one per widget type (14 MVP + 7 later-pack drafts) plus widgets/widget.schema.json (union)
  frames/server-frame.schema.json  /ws/session envelope and per-event data (L2)
  examples/last-week.envelope.json the section 16 wire example
frontend/
  package.json, package-lock.json, tsconfig.json, vite.config.ts, eslint.config.js, index.html
  scripts/gen-types.mjs          schema -> src/generated/types.ts; --check fails when stale
  scripts/check-hex.mjs          raw colour literal check
  scripts/check-dashes.mjs       U+2013 / U+2014 check over the repo
  src/main.tsx                   mounts <App/>
  src/app.tsx                    shell: router, store, scenario switcher, views
  src/router.ts                  hash router (no dependency)
  src/store.ts                   store, applyFrame reducer, useStore hook (L2)
  src/generated/types.ts         generated, committed, never edited
  src/styles/tokens.css          every design token; the only file with colour literals
  src/styles/base.css            layout and element styles using tokens only
  src/styles/contrast.ts         WCAG contrast ratio and token parser (used by tests)
  src/fonts/                     bundled font files if the designer chooses web fonts (OFL only)
  src/lib/safety.ts              safeLink, clampText helpers
  src/lib/format.ts              formatNumber, formatTime, isStale
  src/chrome/Background.tsx      static grid, blueprint lines, dot clusters, screen brackets (aria-hidden)
  src/chrome/HudFrame.tsx        panel frame: border, corner brackets, header line, glow
  src/chrome/Core.tsx            the core rings, dial and disc for each CoreState
  src/chrome/StatusPill.tsx      pill under the core
  src/chrome/coreStates.ts       CoreState list and fixed labels
  src/chrome/fixedText.ts        every fixed UI string (alerts, tray, banner, preview result, empty texts)
  src/chrome/ToneIcon.tsx        icon and tone word per tone
  src/chrome/MotionSetting.tsx   reduced-motion toggle
  src/chrome/TopBar.tsx          name, tagline, status, clock, tray bell, settings, user chip (L2)
  src/chrome/Tray.tsx            notification tray (L2)
  src/chrome/ChatLine.tsx        conversation drawer, chat line, push-to-talk, waveform (L2)
  src/blocks/*.tsx               one component per block kind, plus BlockRenderer.tsx
  src/widgets/WidgetPanel.tsx    envelope -> HudFrame with stamps and blocks
  src/transport/types.ts         SessionTransport, TransportAction, ActionResult (L2)
  src/transport/mock.ts          MockTransport (L2)
  src/mocks/mock.schema.json     MockWidget, SampleSet (L1); Scenario, ScriptStep, StateSnapshot, view models (L2)
  src/mocks/recipeTable.ts       expected block kinds per widget type (the L8 golden check's reference)
  src/mocks/samples.json         one MockWidget per widget type (style guide source)
  src/mocks/views.json           baseline approvals, runs, sessions, permissions, traces, tray (L2)
  src/mocks/scenarios/*.json     one file per scenario (L2)
  src/views/StyleGuide.tsx, Board.tsx, Approvals.tsx, Permissions.tsx, Sessions.tsx, Traces.tsx, PreviewBanner.tsx, ScenarioSwitcher.tsx
  src/views/markers.ts           visible-marker rendering for fields beside action buttons (L2)
  tests/*.test.ts(x)             vitest specs; tests/helpers/schema.ts (Ajv loader); tests/setup.ts (cleanup, Task 2a)
  src/mocks/index.ts             loadScenarios, BASE_VIEWS (L2)
  e2e/smoke.sh                   Playwright CLI smoke session (L2)
docs/guides/style-guide.md       token and widget rules, core labels, tone mapping (created by Task 8)
docs/specs/                      the design and ai-goal-prompt.md (existing)
docs/plans/                      this plan (docs/plans/2026-11-20-friday-milestone-u-dashboard-preview.md) and the L3 plan
docs/design-references/          the owner's reference images, git-ignored, never committed
docs/handoff/                    local onboarding file, uncommitted, no task touches it
```

---

## L0 Preview foundation

### Task 1: Repository, branch and hygiene

**Files:** create `README.md`, `LICENSE`, `.gitattributes`, `.pre-commit-config.yaml`; modify `.gitignore`. No test file (checks are commands).

**Interfaces:** produces the git repo on branch `milestone-u-preview` and the pre-commit hook every later commit passes.

- [ ] `[host]` `git init -b main && git switch -c milestone-u-preview`. Expected: `git branch --show-current` prints `milestone-u-preview`.
- [ ] Append to `.gitignore` (keep the existing comment and entry): `secrets/`, `*.env`, `data/`, `frontend/node_modules/`, `frontend/dist/`, `.playwright-cli/`. Check `[host]` `git check-ignore -v docs/design-references/01-layout-hud-core-minimal.png` prints the matching rule.
- [ ] Write `.gitattributes` with `* text=auto eol=lf` and `*.png binary`.
- [ ] Write `.pre-commit-config.yaml` with repo `https://github.com/gitleaks/gitleaks`, `rev: v8.30.1`, hook id `gitleaks-docker` (the `golang` hook needs Go, which is not installed; the docker hook entry is `zricethezav/gitleaks git --pre-commit --redact --staged --verbose`, verified in the v8.30.1 hook file). `[host]` `pre-commit install && pre-commit run --all-files`. Expected: Passed.
- [ ] Prove the hook bites: `[host]` write `scratch-leak.txt` containing `aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"`, `git add scratch-leak.txt && git commit -m test`. Expected: commit refused by gitleaks. Then `git rm --cached scratch-leak.txt && rm scratch-leak.txt`. Nothing is committed.
- [ ] Write `LICENSE` (MIT, year 2026, holder per Question Q3, default `the Friday authors`) and `README.md` skeleton: one paragraph on Friday, "Status: milestone U, dashboard preview on synthetic data", run instructions (`make preview`, open `http://127.0.0.1:8742`), a note that `docs/design-references/` is git-ignored and never committed. No em or en dashes.
- [ ] `[host]` `git add .gitignore .gitattributes .pre-commit-config.yaml LICENSE README.md docs/specs/2026-11-20-friday-design.md docs/plans/2026-11-20-friday-milestone-u-dashboard-preview.md && git commit -m "Initialize repository with hygiene files and design docs"`. Leave `docs/specs/ai-goal-prompt.md` untracked until Question Q2 is answered. Check `git ls-files docs/design-references` prints nothing.

> Complete (commit on `milestone-u-preview`). In practice: the repo already existed, so `git init` was skipped (Owner answers); gitleaks allowlists the sample AWS key in the planted-secret step, so the refusal was proven with a different secret; the `.gitignore` data entry is `/data/`.

### Task 2: Frontend package and dev container

**Files:** create `Dockerfile` (stages `base`, `dev` only for now), `compose.dev.yaml`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/eslint.config.js`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/app.tsx`; test `frontend/tests/app.test.tsx`.

**Interfaces:** produces the `[dev]` command, npm scripts `dev`, `build`, `lint`, `typecheck`, `test`, `check` (later tasks append to `check`), and `App` (`export function App(): JSX.Element` in `src/app.tsx`).

- [ ] `Dockerfile` stage `base`: `FROM node:22.22.0-bookworm-slim@sha256:<digest>`; get the digest with `[host]` `docker pull node:22.22.0-bookworm-slim && docker inspect --format '{{index .RepoDigests 0}}' node:22.22.0-bookworm-slim` (tag existence unverified, confirm before running). Stage `dev` from `base`: `RUN mkdir -p /app/frontend/node_modules && chown -R node:node /app`, `USER node`, `WORKDIR /app/frontend`. The `dev` stage exists so the empty named volume inherits `node` ownership on first mount.
- [ ] `compose.dev.yaml`: service `frontend-dev`, `build: {context: ., target: dev}`, `volumes: [".:/app", "friday-node-modules:/app/frontend/node_modules"]`, `ports: ["127.0.0.1:5740:5740"]`, `command: npm run dev`; top-level volume `friday-node-modules`. `[host]` `docker compose -f compose.dev.yaml config --quiet` exits 0.
- [ ] `package.json`: `"private": true`, `"type": "module"`, `"engines": {"node": ">=22.18"}`; dependencies `react@19.3.1`, `react-dom@19.3.1`; devDependencies with exact versions: `typescript@6.0.3` (typescript-eslint 8.72 supports TypeScript below 6.1, verified), `vite@8.3.8`, `@vitejs/plugin-react@6.2.1`, `vitest@5.1.0`, `jsdom@30.1.3`, `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.2` (peer of the former), `@testing-library/user-event@14.6.8` (keyboard tests), `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@types/node@22.20.5`, `eslint@10.14.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.72.1`, `eslint-plugin-react-hooks@7.1.1` (rules of hooks), `globals@17.14.0`, `ajv@8.20.0`, `ajv-formats@3.0.1` (ISO `date` and `date-time` formats), `json-schema-to-typescript@16.0.0`. Scripts: `dev`: `vite`, `build`: `tsc --noEmit && vite build`, `lint`: `eslint .`, `typecheck`: `tsc --noEmit`, `test`: `vitest run`, `check`: `npm run lint && npm run typecheck && npm run test`.
- [ ] `[dev]` `npm install`. Expected: `frontend/package-lock.json` appears on the host; `frontend/node_modules` on the host stays empty (the volume holds it).
- [ ] `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes: false`, `jsx: react-jsx`, `module: esnext`, `moduleResolution: bundler`, `resolveJsonModule`, `noEmit`, `types: ["vite/client", "node"]`, include `src`, `tests`, `scripts`, `vite.config.ts`.
- [ ] `vite.config.ts` with `defineConfig` from `vitest/config`: `plugins: [react()]`; `server: {host: "0.0.0.0", port: 5740, strictPort: true, watch: {usePolling: true}}` (polling because file events from `/mnt/d` do not reach containers, Vite WSL2 docs); `preview: {host: "0.0.0.0", port: 8742, strictPort: true, headers: {"Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"}}`; `test: {environment: "jsdom", include: ["tests/**/*.test.{ts,tsx}"]}`. The config must stay plain enough for Node's type stripping (no enums, no namespaces), because the preview loads it with `--configLoader native`.
- [ ] `eslint.config.js` (flat config with `defineConfig` from `eslint/config`, `js.configs.recommended`, `tseslint.configs.recommended`, react-hooks recommended flat preset; the preset's export name is unverified, confirm in the installed package README): `no-restricted-syntax` for `JSXAttribute[name.name='dangerouslySetInnerHTML']`, `MemberExpression[property.name=/^(innerHTML|outerHTML|insertAdjacentHTML)$/]`, `NewExpression[callee.name='Function']`, `CallExpression[callee.name='eval']`; `no-restricted-globals` for `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`; `no-restricted-properties` for `navigator.sendBeacon` and `navigator.mediaDevices`. Ignore `dist`, `node_modules`, `src/generated`.
- [ ] Write the failing test `tests/app.test.tsx`:
  ```tsx
  test("empty renderer smoke: App renders the Friday shell with no panels", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Friday" })).toBeTruthy();
    expect(document.querySelectorAll("[data-widget-id]").length).toBe(0);
  });
  ```
  `[dev]` `npm run test`. Expected: fails, `App` not found.
- [ ] Implement `src/app.tsx` (`<main><h1>Friday</h1></main>`), `src/main.tsx` (`createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>)`), `index.html` (`<title>Friday</title>`, `<div id="root">`, no external links). `[dev]` `npm run check`. Expected: lint, typecheck, test all pass.
- [ ] `[host]` `git add Dockerfile compose.dev.yaml frontend && git commit -m "Add frontend package and dev container"`.

> Complete (commit `892c78c` and a README follow-up). In practice: the image's npm 10.9.4 crashes on `npm install`, so the lockfile was generated with `npx -y npm@11.21.3 install` (documented in the README; `npm ci` works); `tsconfig.json` gained `target: ES2022`, `lib: [ES2022, DOM, DOM.Iterable]` and `skipLibCheck: true`; the react-hooks preset is `reactHooks.configs.flat.recommended`; the base digest is `sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94`. Its `JSX.Element` interface line is descriptive only (see Implementation conventions).

### Task 2a: Toolchain corrections from the cross-check

**Files:** modify `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/eslint.config.js`; create `frontend/tests/setup.ts`, `frontend/tests/cleanup.test.tsx`.

**Interfaces:** produces for every later task: JavaScript modules in `scripts/` importable from TypeScript tests (`allowJs: true`, `checkJs` off); Testing Library cleanup after every test through `test.setupFiles: ["tests/setup.ts"]`; ESLint with browser globals and all `no-restricted-*` bans scoped to `src/**`, and Node globals (`globals.node`) for `scripts/**`, `tests/**`, `vite.config.ts` and `eslint.config.js`. No dependency change.

- [ ] Write the failing test `tests/cleanup.test.tsx`: test "first render" renders `<App />`; test "DOM is clean before the next test" expects `document.querySelectorAll("h1").length` to be `0`. `[dev]` `npm run test`. Expected: the second test fails (Testing Library registers its automatic cleanup only when a global `afterEach` exists, verified in the installed `@testing-library/react` 16.3.3, and Vitest globals are off).
- [ ] Create `tests/setup.ts` (`import { afterEach } from "vitest"; import { cleanup } from "@testing-library/react"; afterEach(() => cleanup());`) and add `setupFiles: ["tests/setup.ts"]` to `test` in `vite.config.ts`. `[dev]` `npm run test`. Expected: both pass. Vitest `globals` stays off, so tests keep importing from `vitest`.
- [ ] Prove the `.mjs` import gap: create a throwaway `scripts/probe.mjs` (`export function probe() { return process.argv.length; }`) and `tests/probe.test.ts` importing it. `[dev]` `npm run typecheck`. Expected: TS7016 "Could not find a declaration file". `[dev]` `npm run lint`. Expected: `no-undef` for `process` in `scripts/probe.mjs`.
- [ ] Add `"allowJs": true` to `tsconfig.json` compilerOptions (leave `checkJs` unset, so JavaScript is inferred, not checked). In `eslint.config.js` move the three `no-restricted-*` rules into a block with `files: ["src/**/*.{ts,tsx}"]` and `languageOptions: { globals: globals.browser }`, and add a block with `files: ["scripts/**/*.{js,mjs}", "tests/**/*.{ts,tsx}", "vite.config.ts", "eslint.config.js"]` and `languageOptions: { globals: globals.node }` (import `globals` from the pinned `globals` package). `[dev]` `npm run check`. Expected: pass.
- [ ] Prove the bans still bite in `src`: add `fetch("/x")` to `src/app.tsx`, `[dev]` `npm run lint`. Expected: `no-restricted-globals` error. Revert. Delete `scripts/probe.mjs` and `tests/probe.test.ts`. `[dev]` `npm run check`. Expected: pass.
- [ ] `[host]` `git add frontend/tsconfig.json frontend/vite.config.ts frontend/eslint.config.js frontend/tests/setup.ts frontend/tests/cleanup.test.tsx && git commit -m "Fix toolchain config for scripts, lint scope and test cleanup"`.

### Task 3: Schema contract and type generation

**Files:** create `schema/version.json`, `schema/common.schema.json`, `schema/envelope.schema.json`, `schema/blocks/*.schema.json` (12 kinds plus `block.schema.json`), `schema/widgets/*.schema.json` (21 types plus `widget.schema.json`), `schema/friday.schema.json`, `schema/examples/last-week.envelope.json`, `frontend/scripts/gen-types.mjs`, `frontend/src/generated/types.ts`, `frontend/tests/helpers/schema.ts`; tests `frontend/tests/schema.test.ts`, `frontend/tests/gen-types.test.ts`.

**Interfaces:** produces every contract type in `frontend/src/generated/types.ts`, named by each schema's `title`: `Tone`, `DataClass`, `Link`, `WidgetEnvelope`, `Block`, `ValueBlock`, `ChartBlock`, `TableBlock`, `RowsBlock`, `RowsItem`, `MeterBlock`, `TimelineBlock`, `PersonBlock`, `ChipsBlock`, `TextBlock`, `FactsBlock`, `AlertBlock`, `KanbanBlock`, `Widget` and one `<Pascal>Widget` per widget type (for example `ProjectStatusWidget`); and `loadSchemas(): Ajv2020` plus `validateAgainst(id: string, data: unknown): string[]` (error messages, empty when valid; `id` is a file `$id` or `<$id>#/$defs/<Name>`) in `tests/helpers/schema.ts`; `schemaFiles(): string[]` (absolute paths of every `*.schema.json` under the repo's `schema/` and `frontend/src/mocks/`). Script `npm run gen:types` writes, `npm run gen:check` fails when stale; `check` gains `npm run gen:check`.

Schema rules (decisions, reviewer checks each):
- Draft 2020-12 (`"$schema": "https://json-schema.org/draft/2020-12/schema"`). Every file has `$id` equal to `https://friday.invalid/` plus its repo-relative path (for example `https://friday.invalid/schema/blocks/value.schema.json`), a PascalCase `title`, `additionalProperties: false` on every object, and only relative `$ref`s. `.invalid` can never resolve, and mirroring paths lets Ajv (resolving by `$id`) and json-schema-to-typescript (resolving by file) agree.
- No `minItems` on any array except `WidgetEnvelope.blocks` (min 1): empty lists are valid data and the renderer shows an empty state (F32).
- `schema/version.json` and `schema/examples/` are data, not schemas: they have no `$id` and are never added to Ajv (F1).
- Enums are real `enum`s here; the "no enum" rule of section 16 applies to the model tool schema of L8, not to this contract.
- Widget schemas: `type` as `const`, optional `title` (80), fields and caps exactly as the section 16 field-type table. The seven later-pack widgets (`jira_ticket`, `jira_attention`, `sprint`, `sprint_burndown`, `schedule`, `meeting`, `focus_time`) use the fields of the section 16 pack table with the general caps (key and status 40, summary and title 80, names 60, free text 400, `source_ref` and `prep_ref` 200, `updated` ISO time, `start`/`end` ISO date for sprints and `HH:MM` pattern `^([01]\d|2[0-3]):[0-5]\d$` for schedule and focus blocks, lists max 20, attendees max 12, columns max 6, days max 31, `total_minutes` integer 0 to 1440), carry `"$comment": "draft: finalized with its pack (L14 or L16)"`, and omit `sprint_burndown.ideal` (its type is undefined). `interview_prep` (L20) gets no schema.
- Block shapes (the design gives only the timeline example; these are plan decisions L8 inherits):

| Kind | Fields (cap) |
|---|---|
| `value` | label (60), value (40), unit? (40), change? (40), hint? (60), tone? |
| `chart` | chart: line, bar, area, donut; series max 5 of {name (60), points max 500 of {x (40), y number}}; y_label? (60) |
| `table` | columns max 8 of string (60); rows max 50 of (max 8 of string (60)) |
| `rows` | variant? list (default) or log; heading? (60); items max 30 of {label (80), detail? (400), meta? (40), tone?, link? Link, source_ref? (200)} |
| `meter` | items max 10 of {label (60), done number >= 0, total number > 0, tone?} |
| `timeline` | items max 30 of {when (40), title (80), detail? (400), tone?} |
| `person` | people max 12 of {name (60), role? (60)} (no images) |
| `chips` | items max 12 of {label (60), tone?} |
| `text` | text (400), tone? |
| `facts` | items max 12 of {label (60), value (80), link? Link} |
| `alert` | level Tone, text (200), view? sessions, permissions, traces, modules |
| `kanban` | columns max 6 of {title (60), items max 20 of {label (80), meta? (40)}} |

  Every block has `kind` as `const`. `Link` is {text (80), url string (2,048) with `pattern: "^https?://"`}. `WidgetEnvelope` is {widget_id pattern `^[A-Za-z0-9_-]{1,40}$`, source (200), as_of `date-time`, data_class, title (80), blocks 1 to 6 of `Block`} (the block count cap is a plan decision).

- [ ] Write the failing tests in `tests/schema.test.ts`: "every schema file has an $id matching its path and a title"; "the section 16 wire example validates" (`validateAgainst("https://friday.invalid/schema/envelope.schema.json", example)` returns `[]`); "version.json holds a semver schema_version"; "an 81-character title fails" (error mentions `/title`); "a timeline item without title fails"; "an unknown block kind fails"; "a link with javascript: fails the pattern"; "project_status with blockers as a string fails" (one test per widget type would repeat the table; instead a table-driven test over `[type, invalidField, badValue]` covering one wrong-type field per MVP widget type). `[dev]` `npm run test`. Expected: fails, files missing.
- [ ] Write the schema files and `schema/examples/last-week.envelope.json` (the section 16 example, unchanged). `loadSchemas` uses `import Ajv2020 from "ajv/dist/2020"` (the `dist/2020` entry is verified in the 8.20.0 package), `addFormats(ajv)`, `strict: true` (this turns on `strictTypes` and `strictRequired` too, verified in the Ajv 8.20 options docs), `allErrors: true`, and adds every file from `schemaFiles()`: only `**/*.schema.json`, found with `node:fs` from `fileURLToPath(new URL("../../../schema/", import.meta.url))` and `new URL("../../src/mocks/", import.meta.url)` (when present). The example keeps the design's "Natsu webhooks" text as a design-quoted exception to the synthetic-names rule; every other fixture uses invented names (F31). Run tests. Expected: pass.
- [ ] Write the failing test `tests/gen-types.test.ts`: "no duplicate numbered type names" (`/export (type|interface) [A-Z]\w*\d\b/` does not match `src/generated/types.ts`). Freshness is not repeated as a test: `npm run gen:check` in `check` covers it. Run. Expected: fails (file missing).
- [ ] Implement `scripts/gen-types.mjs`: `compile` from `json-schema-to-typescript` over an in-memory root `{ $id: "https://friday.invalid/frontend/scripts/gen-root.json", $defs: { contract: { $ref: "../../schema/friday.schema.json" }, mock: { $ref: "../src/mocks/mock.schema.json" } } }` (the `mock` entry only when that file exists), options `{cwd: <frontend/scripts>, unreachableDefinitions: true, additionalProperties: false, bannerComment: "/* Generated from schema/ by scripts/gen-types.mjs. Do not edit. */"}`; writes `src/generated/types.ts`; with `--check` compares to the file and exits 1 with "generated types are stale: run npm run gen:types" when they differ. `[dev]` `npm run gen:types && npm run check`. Expected: pass.
- [ ] Prove the freshness check bites: change one `maxLength` in `schema/blocks/text.schema.json`, `[dev]` `npm run gen:check`. Expected: exit 1 with the stale message. Revert.
- [ ] `[host]` `git add schema frontend && git commit -m "Add block and widget JSON Schema contract with generated types"`.

### Task 4: Repository text checks

**Files:** create `frontend/scripts/check-hex.mjs`, `frontend/scripts/check-dashes.mjs`; tests `frontend/tests/checks.test.ts`.

**Interfaces:** `checkHex(root: string): string[]` and `checkDashes(root: string): string[]` (each returns `path:line` findings; the CLI exits 1 when any) exported from the scripts; npm scripts `check:hex` (root `src`, allowlist `src/styles/tokens.css`) and `check:dashes` (root `..`, skips directories named `node_modules`, `dist`, `.git`, `.beads`, `.superpowers`, `.playwright-cli`, the path `docs/design-references`, and binary files; it knows no other `docs/` subfolder); `check` gains both. The tests import the `.mjs` scripts, which Task 2a's `allowJs` permits.

- [ ] Write the failing tests (write the dash characters as `\u2013` and `\u2014` escapes in the test source, so the test file itself passes the check): "a planted #ff7a1a in a .tsx fails check:hex"; "rgb( and hsl( literals fail"; "the same value in styles/tokens.css passes"; "href=\"#/board\" passes" (not a colour); "a U+2014 in a .md fails check:dashes"; "a U+2013 in a .tsx string fails"; "a U+2014 under .superpowers/ or docs/design-references/ is skipped"; "a U+2014 in docs/guides/x.md fails". Each test writes fixtures into a temp dir from `node:os` `tmpdir()`. Run. Expected: fail.
- [ ] Implement. Colour pattern: `/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b(?![\w-])/` and `/\b(?:rgb|rgba|hsl|hsla)\(/` in `.ts`, `.tsx`, `.css`, `.svg`, `.html`. Run `[dev]` `npm run check`. Expected: pass.
- [ ] `[host]` `git add frontend && git commit -m "Add raw colour and dash checks"`.

### Task 5: Preview container, Makefile and CI

**Files:** modify `Dockerfile` (add `spa-build`, `preview`); create `compose.yaml`, `Makefile`, `.github/workflows/ci.yml`; test `frontend/tests/compose.test.ts`.

**Interfaces:** `make preview` (starts the preview on `127.0.0.1:8742`), `make check-frontend` (`[dev]` `npm run check` plus `docker compose config --quiet` for both compose files); CI jobs `frontend`, `secrets`, `image` that later tasks extend.

- [ ] Write the failing test `tests/compose.test.ts`: "every published port in compose.yaml and compose.dev.yaml starts with 127.0.0.1:" (reads both files as text, collects list items under `ports:` with a regex, expects at least one and every one to match `/^"?127\.0\.0\.1:\d+:\d+"?$/`). Run. Expected: fails, `compose.yaml` missing.
- [ ] `Dockerfile` stage `spa-build` from `base`: `WORKDIR /app/frontend`, `COPY frontend/package.json frontend/package-lock.json ./`, `RUN npm ci`, `COPY schema /app/schema`, `COPY frontend ./`, `RUN npm run build`. Stage `preview` from `base`: `COPY --from=spa-build --chown=node:node /app/frontend /app/frontend`, `USER node`, `WORKDIR /app/frontend`, `EXPOSE 8742`, `CMD ["./node_modules/.bin/vite", "preview", "--configLoader", "native"]` (native loading avoids the bundle loader's write to `node_modules/.vite-temp`, which a read-only root would refuse; verified in Vite 8.3 docs, needs Node 22.18 or later; `npx` is avoided because it writes to the npm cache).
- [ ] `compose.yaml`: service `preview`, `build: {context: ., target: preview}`, `image: friday-preview:0.1.0`, `ports: ["127.0.0.1:8742:8742"]`, `read_only: true`, `tmpfs: ["/tmp"]`, `user: "1000:1000"`, `cap_drop: [ALL]`, `security_opt: ["no-new-privileges:true"]`, healthcheck `["CMD", "node", "-e", "fetch('http://127.0.0.1:8742/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]`. The `read_only`, `tmpfs`, `cap_drop` and `security_opt` keys are from the Compose Specification and were not checked against v2.39.1 docs: `docker compose config --quiet` is the confirmation.
- [ ] `Makefile`: `preview:` runs `docker compose up --build -d --wait preview` (waits for the healthcheck; `--wait` verified in the local Compose v2.39.1 help, F18) then prints `Friday preview: http://127.0.0.1:8742`; `check-frontend:` runs `docker compose config --quiet`, `docker compose -f compose.dev.yaml config --quiet`, then `docker compose -f compose.dev.yaml run --rm frontend-dev npm run check`. Both `.PHONY`.
- [ ] `[host]` `make check-frontend`. Expected: all pass, including the compose test.
- [ ] `[host]` `make preview && curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8742/`. Expected: `200`. `[host]` `docker compose port preview 8742`. Expected: `127.0.0.1:8742`. `[host]` `curl -sSI http://127.0.0.1:8742/ | grep -i content-security-policy`. Expected: the policy from Task 2. `[host]` `curl -sS --max-time 3 http://$(hostname -I | awk '{print $1}'):8742/`. Expected: connection refused or timeout.
- [ ] `.github/workflows/ci.yml` on `push` and `pull_request`, `permissions: contents: read`. Job `frontend`: `actions/checkout@v6`, `actions/setup-node@v6` with `node-version: 22.22.0`, `cache: npm`, `cache-dependency-path: frontend/package-lock.json` (verified in setup-node v6 docs), `npm ci` and `npm run check` in `frontend`. Job `secrets`: checkout with `fetch-depth: 0`, `docker run --rm -v "$GITHUB_WORKSPACE:/repo" zricethezav/gitleaks:v8.30.1 git /repo --redact --verbose` (image tag and positional path unverified, confirm with `docker run --rm zricethezav/gitleaks:v8.30.1 git --help` before relying on it). Job `image`: `docker build --target preview .`. Action tags may be replaced by commit SHAs at review.
- [ ] `[host]` `git add Dockerfile compose.yaml Makefile .github frontend/tests/compose.test.ts && git commit -m "Add preview container, Makefile and CI"`.

### Task 6: L0 gate

**Files:** none created.

- [ ] `[host]` `make check-frontend`: lint, types, unit tests, type freshness, hex and dash checks pass.
- [ ] `[host]` the Task 3 stale-type and Task 4 planted-hex demonstrations fail as expected (re-run both, revert).
- [ ] `[host]` `pre-commit run --all-files`: Passed. `git log --format='%s%n%b' main..HEAD | grep -ci 'co-authored'` prints `0` (branch commits only; `main` is the owner's, F35). `git ls-files | grep -c design-references` prints `0`.
- [ ] `[host]` `make preview`, then the Task 5 curl checks.
- [ ] Owner demonstration: `make preview`, open `http://127.0.0.1:8742`, see the empty Friday page. Stop: the owner pushes the branch to his new GitHub repo if he wants CI evidence (CI green is proven only after his push), reviews L0, and says go before L1 starts.

---

## L1 Visual design, block renderer and core

### Task 7: Hash router and style guide route

**Files:** create `frontend/src/router.ts`, `frontend/src/views/StyleGuide.tsx` (placeholder); modify `frontend/src/app.tsx`; test `frontend/tests/router.test.ts`.

**Interfaces:** `type View = "board" | "approvals" | "traces" | "sessions" | "permissions" | "style-guide"`; `type Route = { view: View; scenario: string | null; instant: boolean }` (`instant` from `&instant=1` in the hash query, F5); `parseHash(hash: string): Route`; `toHash(route: Route): string`; `useRoute(): Route` (subscribes to `hashchange`). `App` renders `StyleGuide` for `style-guide`, the empty shell otherwise.

- [ ] Failing tests: `parseHash("")` is `{view: "board", scenario: null, instant: false}`; `parseHash("#/style-guide")` is `{view: "style-guide", scenario: null, instant: false}`; `parseHash("#/board?scenario=focus-today")` keeps the id; `parseHash("#/board?scenario=edge-caps&instant=1")` has `instant: true` and `toHash` writes it back; an unknown view falls back to `board`; a scenario id not matching `^[a-z0-9-]{1,40}$` becomes `null`; `toHash(parseHash(h)) === h` for the canonical forms. Run `[dev]` `npm run test`. Expected: fail.
- [ ] Implement (about 30 lines, no dependency). Run. Expected: pass. Commit `[host]` `git add frontend && git commit -m "Add hash router"`.

### Task 8: Visual design pass (frontend implementer, owner checkpoint)

**Who:** a `frontend-engineer` subagent. Before anything else it loads the owner's skill with the Skill tool (`frontend-design:frontend-design`) and looks at the three images in `docs/design-references/` with the Read tool. It looks; it never copies, traces, imports or commits them.

**Inputs:** D18 (HUD layout: dark canvas with a faint grid, central circular core, framed panels in left and right columns, top status bar; warm near-black with a brown cast, saturated orange primary, muted teal-green secondary, white text, faint grey-brown linework), section 15 (core: concentric thin rings, segmented arcs with notches, radial tick-mark dial, disc with a short uppercase state label; thick segmented ring arcs; corner-bracket panel frames; small uppercase monospace labels; restraint rules), section 16 styling (token groups, tone mapping: good teal-green, attention amber-yellow, bad red, neutral grey-brown), the Global Constraints above.

**Files:** create `frontend/src/styles/tokens.css`, `frontend/src/styles/base.css`, `frontend/src/styles/contrast.ts`, `frontend/src/chrome/Background.tsx`, `frontend/src/chrome/HudFrame.tsx`, `frontend/src/chrome/Core.tsx`, `frontend/src/chrome/StatusPill.tsx`, `frontend/src/chrome/coreStates.ts`, `frontend/src/chrome/ToneIcon.tsx`, `frontend/src/chrome/MotionSetting.tsx`, `frontend/src/chrome/fixedText.ts` (`FIXED.core`, `FIXED.tagline`, `FIXED.motionLabel`), `frontend/src/fonts/` (only if web fonts), `docs/guides/style-guide.md`; modify `frontend/src/views/StyleGuide.tsx`; tests `frontend/tests/tokens.test.ts`, `frontend/tests/core.test.tsx`.

**Outputs (named artefacts):**
- `tokens.css` defining, under `:root`, exactly these groups and names (values are the designer's): background `--bg-canvas`, `--bg-panel`, `--bg-raised`; primary accent `--accent-primary`, `--accent-primary-strong`, `--accent-primary-dim`; secondary accent `--accent-secondary`, `--accent-secondary-dim`; text `--text-primary`, `--text-secondary`, `--text-muted`, `--text-on-accent`; lines and frames `--line-grid`, `--line-blueprint`, `--line-panel-border`, `--line-corner-bracket`; glow `--glow-color`, `--glow-radius`, `--glow-strength`; tone `--tone-good`, `--tone-bad`, `--tone-attention`, `--tone-neutral` and a `-bg` variant of each; `--focus-ring`; chart `--series-1` to `--series-5`; typography `--font-body`, `--font-label`, `--size-label`, `--size-body`, `--size-value`, `--tracking-label`; motion `--motion-ring-duration`, `--motion-pulse-duration`, `--motion-panel-entry-duration`, `--motion-easing`. Every `--motion-*` duration is redefined to `0s` under both `@media (prefers-reduced-motion: reduce)` and `:root[data-motion="reduced"]`. Colours that tests pair (backgrounds, text, accents, tones, focus ring) are opaque 6-digit hex. Light theme: none, but the file keeps all colour tokens in one `:root` block so a second block can follow.
- `HudFrame`: `export function HudFrame(props: { title: string; kicker?: string; stamps?: ReactNode; children: ReactNode })`; thin border, four corner brackets, uppercase monospace header line, glow from tokens; `<section aria-label={title}>` with an `<h2>`.
- `Core`: `export function Core(props: { state: CoreState; size: "full" | "compact" })`, an inline SVG built from tokens with rings, segmented arcs, tick dial and disc; `role="img"`, `aria-label` = the pill label; `data-core-state`; ring elements carry `className="core-ring"` and animate only through `--motion-*` tokens; `compact` is the small ring for the top bar.
- `coreStates.ts`: `export const CORE_STATES = ["idle", "listening", "transcribing", "thinking", "running_tools", "speaking", "awaiting_approval", "error", "plan_limit"] as const; export type CoreState = (typeof CORE_STATES)[number]; export function coreLabels(s: CoreState): { disc: string; pill: string }` returning `FIXED.core[s]` (the labels live in `fixedText.ts`, F13), with exactly: idle READY / AWAITING COMMAND; listening LISTENING / LISTENING; transcribing TRANSCRIBING / TRANSCRIBING; thinking THINKING / THINKING; running_tools TOOLS / RUNNING TOOLS; speaking SPEAKING / SPEAKING; awaiting_approval APPROVAL / AWAITING APPROVAL; error ERROR / ERROR; plan_limit LIMIT / CLAUDE PLAN LIMIT REACHED. The owner may reword them at the checkpoint; nothing else may add labels.
- `StatusPill`: `export function StatusPill(props: { state: CoreState })` with `role="status"`.
- `fixedText.ts`: `export const FIXED = { ... } as const`, the single home of every fixed UI string. This task defines `core` (record keyed by `CoreState`, values `{disc, pill}`), `tagline` (one original line chosen with the owner at the checkpoint, F14) and `motionLabel` (`"Reduce motion"`). Later tasks add, each in its own task: `emptyBlock`, `alertView` (Task 10), `unsupportedBlock` (Task 12), `alert` (Task 18), `emptyBoard`, `loadingBoard` (Task 20), `previewStatus`, `tray` (Task 21), `previewResult` (Task 17), `previewBanner`, `homoglyph` (Task 22).
- `ToneIcon`: `export function ToneIcon(props: { tone: Tone; showWord?: boolean })`, a distinct SVG shape per tone (check, triangle, cross, dot) with `aria-hidden`, plus the tone word visible when `showWord` else in a visually hidden span.
- `MotionSetting`: a labelled checkbox "Reduce motion" that sets `document.documentElement.dataset.motion = "reduced"` or removes it.
- Typography: system stacks, or at most two bundled OFL-licensed families in `src/fonts/` with the licence file beside them and `@font-face` in `base.css` (no package added unless justified in the commit body).
- `Background.tsx`: grid, blueprint lines, dot clusters and screen-corner brackets as one `aria-hidden` SVG using tokens.
- `StyleGuide.tsx` (provisional): sections Tokens (swatches by name drawn with `var(--token)`), Typography, Tones (`ToneIcon` with words), Frame (a `HudFrame` with fixed specimen text), Core (the `Core` plus a radio group "Core state" with one option per `CORE_STATES` entry, keyboard operable, and the `StatusPill`), Motion (`MotionSetting`).
- `docs/guides/style-guide.md`: token names and their intent, the tone mapping and icons, core labels, the rule that labels only use uppercase monospace.

**Checks it must pass (tests first):**
- [ ] Failing `tests/tokens.test.ts`, using `parseTokens(css: string): Record<string, string>` and `contrastRatio(a: string, b: string): number` from `src/styles/contrast.ts` (WCAG 2 relative luminance): "every listed token name is defined"; "text-primary, text-secondary, text-muted, accent-primary, accent-secondary and each tone colour have at least 4.5:1 against bg-canvas, bg-panel and bg-raised"; "text-on-accent has 4.5:1 on accent-primary"; "focus-ring has 3:1 on bg-canvas and bg-panel"; "text-primary has 4.5:1 on each --tone-*-bg"; "tone-attention differs from accent-primary by at least 20 degrees of hue" (`hueDistance(a, b)` in `contrast.ts`); "every --motion-* duration is redefined to 0s in both reduced-motion blocks".
- [ ] Failing `tests/core.test.tsx`: "CORE_STATES has the nine states"; "each state renders its disc and pill label" (for each state, the core's disc text equals `coreLabels(s).disc` and `getByRole("status").textContent === coreLabels(s).pill`); "coreLabels reads FIXED.core"; "the state radio group changes the core by keyboard" (user-event: Tab to the group, ArrowRight, expect `data-core-state="listening"`); "MotionSetting sets data-motion=reduced".
- [ ] `[dev]` `npm run test` fails; implement; `[dev]` `npm run check` passes (includes the hex and dash checks).
- [ ] Originality: `[host]` `grep -rniE 'stark|jarvis|j\.a\.r\.v\.i\.s|marvel|iron ?man|f\.r\.i\.d\.a\.y' frontend/src docs/guides/style-guide.md` prints nothing; the implementer states in its report that no shape, emblem or text was traced from the references.
- [ ] Reduced motion in a real browser: `[host]` `make preview`, then `playwright-cli -s=design open http://127.0.0.1:8742/#/style-guide`, `playwright-cli -s=design set-reduced-motion reduce`, `playwright-cli -s=design eval "() => getComputedStyle(document.querySelector('.core-ring')).animationDuration" --raw`. Expected: `0s`. `playwright-cli -s=design close`.
- [ ] Commit `[host]` `git add frontend docs/guides/style-guide.md && git commit -m "Add Friday visual design tokens, HUD frame and core"`.

**Owner checkpoint (blocking).** `[host]` `make preview`, then the owner opens `http://127.0.0.1:8742/#/style-guide` at full window width and at about 900 px, steps the core through all nine states with the keyboard, toggles "Reduce motion", and judges the look against D18: palette, ring and dial drawing, frame, typography, tone colours (attention must read as different from the brand orange), and originality. He also picks `FIXED.tagline`. His changes are applied in this task (new commits, same subject style) before Task 9 starts; the orchestrator does not dispatch Task 9 until he has looked. Tasks 9 onward build on the approved tokens and frame only.

### Task 9: Text safety and formatting helpers

**Files:** create `frontend/src/lib/safety.ts`, `frontend/src/lib/format.ts`, `frontend/src/blocks/LinkText.tsx`; tests `frontend/tests/safety.test.ts`, `frontend/tests/format.test.ts`.

**Interfaces:** `safeLink(url: string): { href: string; host: string } | null`; `LinkText(props: { link: Link })` (anchor with `rel="noopener noreferrer"`, `target="_blank"`, text then ` (host)`, or plain `link.text` when `safeLink` is null); `formatNumber(n: number): string` (`Intl.NumberFormat("en", {notation: "compact", maximumFractionDigits: 1})`, non-finite gives `"-"`); `formatTime(iso: string, timeZone?: string): string` (`HH:MM`, `en-GB`, 24 h); `isStale(asOf: string, now: string): boolean` (true when `asOf` is more than 24 h before `now`; a plan decision, see Questions).

- [ ] Failing tests (Review Focus 3): `safeLink` returns null for `JavaScript:alert(1)`, `" javascript:alert(1)"`, `data:text/html,x`, `//evil.example/x`, `ftp://example.com`, `https://user:pw@example.com`, `https://github.com@evil.example/`, and `not a url`; returns `{host: "github.com"}` for `https://github.com/example/orchard`; for `https://exаmple.com` (Cyrillic а) the host is the punycode form starting `xn--`. `LinkText` with a `javascript:` link renders no `a` element and the text. `formatNumber(1e12) === "1T"`, `formatNumber(NaN) === "-"`. `isStale` true at 24 h plus 1 s, false at exactly 24 h. Run. Expected: fail.
- [ ] Implement: reject a string with leading or trailing whitespace, parse with `new URL(url)` inside try/catch, reject when `username` or `password` is non-empty or the protocol is not `http:`/`https:`. Run. Expected: pass. Commit `"Add link safety and formatting helpers"`.

### Task 10: Block components (text and list kinds)

**Files:** create `frontend/src/blocks/Value.tsx`, `Text.tsx`, `Chips.tsx`, `Facts.tsx`, `Alert.tsx`, `Person.tsx`, `Rows.tsx`, `Table.tsx`, `Timeline.tsx`, `Meter.tsx`, `Kanban.tsx`, `Empty.tsx`; modify `fixedText.ts`; tests `frontend/tests/blocks.test.tsx`, `frontend/tests/blocks-empty.test.tsx`.

**Interfaces:** one component per kind, `export function <Kind>Block(props: { block: <Kind>BlockData })`, where `<Kind>BlockData` is the generated type `<Kind>Block` imported under that alias (F3); every root element has `data-block-kind`; toned elements have `data-tone` and a `ToneIcon`. `Empty()` shows `FIXED.emptyBlock` = `"Nothing to show"`. `Alert` maps `view` to the hash link `#/<view>` with the fixed link text from `FIXED.alertView[view]` (`Open sessions`, `Open permissions`, `Open traces`, `Open modules`). `Rows` shows `source_ref` as plain monospace text under the item when present (F26). The `modules` view link targets `#/modules`, which falls back to the board until the Modules view exists (L8) (F28). `Rows` with `variant: "log"` renders each item as one line: `meta` (time) in `--font-label`, label in monospace, tone icon. `Meter` shows `done / total` as text and a bar clamped to 0 to 100 percent.

- [ ] Failing `blocks.test.tsx`: per kind, a sample block renders its texts (table-driven over one fixture per kind); "onerror text renders literally" (a `value` with label `<img src=x onerror=alert(1)>` produces that exact text and no `img` element); "every toned element has an icon and a tone word"; "meter with done 12 total 10 shows 12 / 10 and a 100 percent bar"; "rows log variant shows meta then label"; "facts link shows the host". Failing `blocks-empty.test.tsx` (Review Focus 4): rows, table (no rows), timeline, chips, facts, person, meter and kanban (no columns, and a column with no items) each render `Nothing to show` instead of an empty frame. Run. Expected: fail.
- [ ] Implement with semantic markup (`table` for table, `ol` for timeline and rows, `dl` for facts, `ul` for chips and person). Run `[dev]` `npm run check`. Expected: pass. Commit `"Add text and list block components"`.

### Task 11: Chart block (SVG)

**Files:** create `frontend/src/blocks/Chart.tsx`, `frontend/src/blocks/chartMath.ts`; test `frontend/tests/Chart.test.tsx`.

**Interfaces:** `ChartBlock(props: { block: ChartBlockData })` (generated `ChartBlock` imported as `ChartBlockData`, F3), root `<figure data-block-kind="chart">` (F17); `scale(v: number, d0: number, d1: number, r0: number, r1: number): number`; `yDomain(series: ChartBlockData["series"]): [number, number]`; `xCategories(series): string[]` (union of `x` in first-seen order); `donutSlices(series): { name: string; value: number; start: number; end: number }[]`.

Rules: `yDomain` always includes 0; when min equals max it widens to `[min - 1, max + 1]`; `scale` with `d0 === d1` returns the midpoint of the range. Bars are grouped per category. Donut uses the first series only, treats non-positive values as 0, and with a total of 0 renders `Nothing to show`. Series colours `--series-1` to `--series-5`. The SVG has `role="img"` and an `aria-label` naming the chart kind and series; a visually hidden `table` lists every value (no information only in the drawing). `viewBox` with `preserveAspectRatio` so it scales with the panel.

- [ ] Failing tests (Review Focus 1): "degenerate data renders without NaN" over a single point, all-equal values, all-zero donut, negative values on bar and line, and `1e12`: no `path`, `rect` or `circle` attribute contains `NaN` or `Infinity`; the all-zero donut shows `Nothing to show`; "five series of 500 points render"; "the hidden table lists every value"; "the root carries data-block-kind=chart"; `scale(5, 5, 5, 0, 100) === 50`. Run. Expected: fail.
- [ ] Implement. Run `[dev]` `npm run check`. Expected: pass. Commit `"Add SVG chart block"`.

### Task 12: Block renderer and widget panel

**Files:** create `frontend/src/blocks/BlockRenderer.tsx`, `frontend/src/widgets/WidgetPanel.tsx`; modify `frontend/src/styles/base.css`, `fixedText.ts`; test `frontend/tests/WidgetPanel.test.tsx`.

**Interfaces:** `BlockRenderer(props: { block: Block })` (imports each component and the generated `Block` type; block types are aliased as in Task 10; switch on `kind`; an unknown kind renders `FIXED.unsupportedBlock` = `"This block cannot be shown"`, never throws); `WidgetPanel(props: { envelope: WidgetEnvelope; now: string; timeZone?: string })` = `<div className="widget-panel" data-widget-id={envelope.widget_id}>` wrapping a `HudFrame` titled `envelope.title` (HudFrame itself is not changed after the Task 8 checkpoint, F15), stamps: `Sample data` when `source === "sample"`, `Work` chip when `data_class === "work"`, `as of HH:MM`, `Stale` when `isStale(as_of, now)`, then each block through `BlockRenderer`. CSS: panel and its grid children get `min-width: 0` and `overflow-wrap: anywhere` (Review Focus 2).

- [ ] Failing tests: "sample envelope shows the Sample data stamp"; "work envelope shows the Work chip"; "as_of 30 h before now shows Stale"; "an unknown block kind shows the fixed text and the other blocks still render"; "the wire example of section 16 renders its timeline". Run. Expected: fail. Implement. Run `[dev]` `npm run check`. Expected: pass. Commit `"Add block renderer and widget panel"`.

### Task 13: Mock widget schema, recipe table and MVP samples

**Files:** create `frontend/src/mocks/mock.schema.json` (defs `MockWidget`, `SampleSet`), `frontend/src/mocks/recipeTable.ts`, `frontend/src/mocks/samples.json`; regenerate `src/generated/types.ts`; test `frontend/tests/samples.test.ts`.

**Interfaces:** `MockWidget` = `{ widget: Widget; envelope: WidgetEnvelope }`; `SampleSet` = `{ now: date-time; items: MockWidget[] }`; envelopes in mocks must have `source` `const "sample"` (enforced in `MockWidget`); every sample widget sets `title`. Cut rule (F12): wherever a widget field's cap is above the cap of the block field it maps to (standup `text` 200 -> rows `label` 80, a milestone chip `<name> <due>` -> chips `label` 60, `<key> <summary>` -> rows `label` 80, `goal` and `prep_ref` -> facts `value` 80), the envelope holds the text cut to the block cap minus one plus `…`, and the full text goes into a `detail` field where the block has one (standup: label cut, detail full). `RECIPE_BLOCKS: Record<Widget["type"], { kind: Block["kind"]; optional?: true }[]>` in `recipeTable.ts` (`optional` marks blocks the table says are omitted when their source field is empty), the reference the L8 server recipes must match. Mapping used to write every mock envelope:

| Widget | Blocks in order | Field mapping |
|---|---|---|
| stat | value | fields map one to one |
| chart | chart | kind -> chart, series as is |
| table | table | as is |
| task_list | rows, chips | title -> label, due -> meta, status -> tone (todo neutral, doing attention, done good, blocked bad); chips: one per status present, label `<n> <status>` |
| progress | meter | one item |
| daily_focus | rows, text | title -> label, why -> detail, source_ref; text = note (block omitted when no note) |
| project_status | chips, facts, rows | chips: status (active neutral, blocked bad, paused attention, done good) then milestones `<name> <due>` (planned neutral, at_risk attention, done good); facts: Next, Last commit; rows heading `Blockers and risks`: blockers tone bad, risks tone attention (rows omitted when both empty) |
| career_progress | value, meter | value: label = target, value = `Week <week> of 16`; meter: skills |
| work_timeline | timeline | as is |
| learning_roadmap | timeline, rows | weeks: when `Week <n>`, theme -> title, status -> tone (done good, current attention, next and later neutral); rows heading `Next`: topic -> label, why -> detail, source_ref |
| standup | rows, rows, rows, chips | headings `Yesterday`, `Today`, `Blockers` (tone bad; block omitted when none); chips `<n> yesterday`, `<n> today`, `<n> blockers` |
| alert | alert | as is |
| task_queue | rows (log), chips | since -> meta, title -> label, status -> detail; chips: counts per kind |
| claude_run | chips, facts, text | chips: status; facts: Run, Repo, Mode, Started, Duration, Usage; text: excerpt (omitted when none) |
| jira_ticket | chips, facts, person | chips: status, priority; facts: Key, Updated, link; person: assignee |
| jira_attention | rows, chips, person | `<key> <summary>` -> label, reason -> meta; chips: counts per reason; person: assignees |
| sprint | facts, kanban | facts: Name, Goal, Start, End; kanban: columns |
| sprint_burndown | chart | line, one series `Remaining` |
| schedule | timeline | `<start>-<end>` -> when, title, kind -> detail |
| meeting | facts, person | facts: Start, End, Location, Prep; person: attendees |
| focus_time | timeline, meter | blocks as timeline; meter `Focus time`, done = total_minutes, total = 480 (draft) |

- [ ] Failing `samples.test.ts`: "samples.json validates against SampleSet" (`validateAgainst("https://friday.invalid/frontend/src/mocks/mock.schema.json#/$defs/SampleSet", samples)`, S43); "a text cut by the cut rule ends in … and is exactly at the block cap"; "every widget type schema has exactly one sample"; "each sample widget validates against its own type schema"; "each sample envelope's block kinds equal RECIPE_BLOCKS[type] in order, where only `optional` entries may be missing"; "every envelope has source sample and a title equal to the widget title"; "all text is synthetic: no string contains an address other than example.com, example.org or github.com/example" (URL regex over the file). Run. Expected: fail.
- [ ] Write `samples.json` with the 14 MVP types (core, projects, career, server-made) and the 7 later-pack drafts, all synthetic (invented projects such as "Orchard", "Lantern", "Compass"; people such as "Mira Okafor"; keys such as `DEMO-142`). Regenerate types. Run `[dev]` `npm run check`. Expected: pass. Commit `"Add mock widget schema, recipe table and samples"`.

### Task 14: Complete style guide

**Files:** modify `frontend/src/views/StyleGuide.tsx`; test `frontend/tests/StyleGuide.test.tsx`.

**Interfaces:** consumes `samples.json`, `WidgetPanel`, every block, `Core`, `StatusPill`, `MotionSetting`. Sections added after the Task 8 sections: Blocks (one `HudFrame` per block kind with that block from the first sample that uses it, not a `WidgetPanel`, so it adds no `data-widget-id`), Widgets grouped by pack (`Core` including `daily_focus`, `Projects`, `Career`, `Server-made`, `Jira (later pack, L14)`, `Calendar (later pack, L16)`) (F16), each panel through `WidgetPanel` with `now` = `samples.now`.

- [ ] Failing tests: "every sample renders exactly one panel" (`[data-widget-id]` count equals `samples.items.length`); "every block kind appears" (set of `data-block-kind` equals the 12 kinds); "later packs carry their layer label"; "every interactive control is reachable by Tab" (user-event tabbing reaches the core radio group and the motion checkbox, in that order). Run. Expected: fail. Implement. Run `[dev]` `npm run check`. Expected: pass. Commit `"Complete style guide with every block and widget"`.

### Task 15: L1 gate

- [ ] `[host]` `make check-frontend`: all unit tests, contrast and token tests, hex and dash checks pass.
- [ ] `[host]` planted-value demonstration: add `color: #123456` to `frontend/src/blocks/Text.tsx`, `[dev]` `npm run check:hex` fails naming the line; revert.
- [ ] `[host]` `make preview`; `playwright-cli -s=l1 open http://127.0.0.1:8742/#/style-guide`; `playwright-cli -s=l1 eval "() => document.querySelectorAll('[data-widget-id]').length" --raw` equals the sample count; `playwright-cli -s=l1 eval "() => document.querySelector('img')" --raw` prints `null`; reduced-motion check as in Task 8; `playwright-cli -s=l1 requests` lists only `http://127.0.0.1:8742/` URLs; `playwright-cli -s=l1 close`.
- [ ] Frontend review (a fresh `code-reviewer` agent, not the implementer) against D18, originality, the Global Constraints and Review Focus 1, 3 and 4.
- [ ] Owner demonstration: the style guide and the core state switcher at wide and about 900 px widths. Stop for his review before L2.

---

## L2 Preview views and scenarios

### Task 16: Frame schema and scenario model

**Files:** create `schema/frames/server-frame.schema.json`; modify `schema/friday.schema.json`, `frontend/src/mocks/mock.schema.json` (add `Scenario`, `ScriptStep`, `ScriptCoreState`, `StateSnapshot`, `ViewSet`, `ProposalView`, `RunView`, `SessionView`, `PermissionView`, `TraceView`, `SpanView`, `TrayItem`); modify `schema/widgets/claude_run.schema.json` (move its status enum into `$defs/RunStatus`); regenerate types; test `frontend/tests/frames.test.ts`.

**Interfaces:**
- `ServerFrame` (contract, section 15): `{ v: 1; type: "event" | "error" | "ack"; id: string; ts: date-time; name?: EventName; data: object }`, `EventName` = the 14 client event names of section 15. Per-event `data` (ids, kinds and fixed labels only, S-N9): `board.updated {board: WidgetEnvelope[] max 12}`, `message.delta {request_id, text (400)}`, `message.done {request_id}`, `request.started {request_id}`, `request.finished {request_id}`, `approval.created {proposal_id}`, `approval.updated {proposal_id, status}`, `run.updated {run_id, status}`, `session.updated {session_id, state}`, `permission.pending {request_id}`, `permission.resolved {request_id}`, `session_message.sent {session_id}`, `research.finished {job_id}`, `alert.raised {kind: AlertKind, level: Tone, view?}`. Expressed with `if`/`then` on `name`; under Ajv `strict: true` each `then` carries `"type": "object"` and a `properties` entry for every name it requires; never relax `strict` (F9). `EventName` and `AlertKind` are `$defs` of `server-frame.schema.json` only; the mock schema refs them (F10).
- `AlertKind` (in `server-frame.schema.json`): `approvals_waiting`, `run_finished`, `run_failed`, `run_timed_out`, `run_over_tokens`, `session_waiting`, `plan_limit`, `login_expiring`, `adapter_degraded`, `companion_degraded`, `over_budget`, `proposal_expiring`.
- Preview view models (mock schema, not the server contract; L8 and L10 replace them): `ProposalView {proposal_id, host_action: boolean, tool (60), title (80), target? (200), target_folder? (200), data_class, content (raw, 20,000), secret_scan: "clean" | "found", created, expires, args_sha256 pattern ^[0-9a-f]{64}$}`; `RunView {run_id, repo (60), mode: ask | task, status: $ref claude_run.schema.json#/$defs/RunStatus, started}`; `SessionView {session_id (uuid format), project (60), data_class, kind: terminal | background | friday, state: working | idle | waiting | done, waiting: boolean, last_activity}`; `PermissionView {request_id pattern ^[0-9a-f]{32}$, session_id, project, data_class, permission_mode (40), friday_started: boolean, cwd (200), tool (60), input: object of string values (20,000 each)}`; `TraceView {trace_id, label (80), started, duration_ms, tokens_in, tokens_out, cost_usd, spans: SpanView[] max 200}`; `SpanView {span_id, parent_span_id: string | null, name (80), kind: the 13 span kinds of section 23, duration_ms, tokens_in?, tokens_out?, status: ok | error | timeout}`; `TrayItem {kind: AlertKind, count?: integer, source: approvals | permissions | sessions | traces | health}`.
- `ViewSet {approvals, runs, sessions, permissions, traces, tray}` (all required, the shape of `views.json`) and `StateSnapshot` = `ViewSet` plus `board: WidgetEnvelope[] max 12` (F11).
- `ScriptCoreState`: a JSON enum of the nine core states, title `ScriptCoreState` so it does not collide with `CoreState` from `coreStates.ts`.
- `ScriptStep` (one of): `{at_ms, event: EventName, data}` (a frame without id and ts); `{at_ms, board: widget_id[] max 12}` (the transport emits `board.updated` with those envelopes); `{at_ms, reply: string (400)}` (the transport emits word-sized `message.delta` frames 30 ms apart, then `message.done`); `{at_ms, core: ScriptCoreState}` (preview only; never becomes a frame).
- `Scenario {id pattern ^[a-z0-9-]{1,40}$, group: request | state | edge, label (80), request? (400), now: date-time, widgets: MockWidget[] max 20, script: ScriptStep[] max 200, views?: ViewSet with every key optional}`; a key present in `views` replaces the baseline list for that key (F20).

- [ ] Failing tests: "a board.updated frame with 13 envelopes fails"; "an alert.raised frame carrying a text field fails"; "message.delta text of 401 characters fails"; "a ScriptStep with both board and reply fails"; "the ScriptCoreState enum equals CORE_STATES" (reads the JSON enum and compares with the array from `coreStates.ts`); "AlertKind and EventName are declared once" (no `AlertKind1` or `EventName1` in generated types); "an unknown event name fails". Run. Expected: fail. Implement, `[dev]` `npm run gen:types && npm run check`. Expected: pass. Commit `"Add session frame schema and scenario model"`.

### Task 17: SessionTransport, MockTransport and store

**Files:** create `frontend/src/transport/types.ts`, `frontend/src/transport/mock.ts`, `frontend/src/store.ts`; modify `fixedText.ts`; tests `frontend/tests/mock-transport.test.ts`, `frontend/tests/store.test.ts`.

**Interfaces:**
```ts
// src/transport/types.ts
export type TransportAction =
  | { kind: "approve" | "reject" | "open_confirm"; proposalId: string }
  | { kind: "deny"; requestId: string; reason: string }
  | { kind: "cancel_run"; runId: string }
  | { kind: "send_session_message"; sessionId: string; text: string }
  | { kind: "send_message"; text: string };
export type ActionResult = { ok: false; preview: true; message: "Preview: nothing was executed" };
export interface SessionTransport {
  connect(): Promise<StateSnapshot>;                       // L8: GET /api/state, then /ws/session
  subscribe(listener: (frame: ServerFrame) => void): () => void;
  act(action: TransportAction): Promise<ActionResult>;     // L8: the HTTP routes of section 15
  close(): void;
}
// src/transport/mock.ts
export class MockTransport implements SessionTransport {
  constructor(scenario: Scenario, baseViews: ViewSet,
              opts?: { schedule?: (fn: () => void, ms: number) => unknown; instant?: boolean });
  onCore(listener: (s: CoreState) => void): () => void;   // preview only
  onDone(listener: () => void): () => void;               // fires after the last step
}
// src/store.ts
export type AppState = StateSnapshot & { core: CoreState; reply: { requestId: string; text: string; done: boolean } | null; requestOpen: boolean; done: boolean };
export function applyFrame(state: AppState, frame: ServerFrame): AppState;
export type PreviewFeed = Pick<MockTransport, "onCore" | "onDone">;
export function createStore(transport: SessionTransport, preview?: PreviewFeed): { getState(): AppState; subscribe(l: () => void): () => void; act: SessionTransport["act"]; dispose(): void };
export function useStore<T>(store: ReturnType<typeof createStore>, select: (s: AppState) => T): T; // useSyncExternalStore
```
`createStore` subscribes to `preview.onCore` and `preview.onDone` when given and writes `core` and `done` (initial `core: "idle"`, `done: false`); App passes the same `MockTransport` as both arguments; L8 passes none (F4). `connect()` returns `{...baseViews, ...scenario.views, board: []}` (a key in `scenario.views` replaces that list). `message.delta` and `message.done` from a `reply` step carry the `request_id` of the latest `request.started` step before it in the script, else `"r1"` (F22). `act` resolves `{ok: false, preview: true, message: FIXED.previewResult}` (Task 17 adds `FIXED.previewResult` = `"Preview: nothing was executed"`; Tasks 21 to 23 read it). Frames get `v: 1`, `id` = zero-padded sequence (`f000001`, sortable), `ts` = `scenario.now` plus `at_ms`. `instant: true` runs every step, including reply deltas, at 0 ms in order (used by the smoke test through `?instant=1`). `act` never changes state and resolves the fixed `ActionResult`. `close()` cancels pending steps. `applyFrame` handles `board.updated` (replace, keep at most 12), `message.delta` (append for the same request), `message.done`, `request.started` / `request.finished` (`requestOpen`), `alert.raised` (append a `TrayItem` with `source: "health"` unless the kind maps to approvals, permissions or sessions); other names return the state unchanged in the preview.

- [ ] Failing tests with `vi.useFakeTimers()`: "steps fire at their at_ms in order"; "every emitted frame validates against ServerFrame" (Ajv helper); "a board step emits the scenario's envelopes in the listed order"; "a reply step emits word deltas 30 ms apart then message.done"; "core steps reach onCore and never subscribe listeners"; "close cancels pending steps"; "act resolves the preview result for every action kind and the state is unchanged"; "applyFrame keeps at most 12 board envelopes"; "alert.raised adds a tray item and never carries text"; "createStore with a preview feed sets core from core steps and done after the last step"; "reply deltas carry the request_id of the preceding request.started". Run. Expected: fail. Implement. `[dev]` `npm run check`. Expected: pass. Commit `"Add SessionTransport, MockTransport and store"`.

### Task 18: Baseline views and request scenarios

**Files:** create `frontend/src/mocks/index.ts`, `frontend/src/mocks/views.json` and `frontend/src/mocks/scenarios/{focus-today,project-blockers,standup,jira-attention,career-progress,learn-next,last-week,plan-week,review-implementation,email-summary}.json`; modify `fixedText.ts`; test `frontend/tests/scenarios.test.ts`.

**Interfaces:** `loadScenarios(): Scenario[]` in `src/mocks/index.ts` (`import.meta.glob("./scenarios/*.json", { eager: true })`, sorted by group (request, state, edge) then by `label`; no order list, so Task 19 only adds files) (F21), `BASE_VIEWS` from `views.json`. Each request scenario: `request` = the exact example text of L2, a `core` step to `thinking` at 0, `request.started`, the `board` step at 900 to 1,500 ms, a `reply` step (one short sentence), `request.finished`, a `core` step back to `idle`. Widgets per scenario (all synthetic, `source: "sample"`):

| id | request | widgets |
|---|---|---|
| focus-today | What should I focus on today? | daily_focus (3 items with source_ref), project_status x2 |
| project-blockers | What's blocking my projects? | project_status x3 (one blocked with a blocker, one with risks and milestones, one stale: as_of 3 days before now) |
| standup | Prepare my standup | standup; reply says Jira is not connected |
| jira-attention | What Jira tickets need my attention? | jira_attention, jira_ticket (later pack, labelled) |
| career-progress | How am I progressing toward Senior Software Engineer? | career_progress, progress |
| learn-next | What should I learn next? | learning_roadmap (current week, at most 3 next topics) |
| last-week | What did I work on last week? | work_timeline, chart (bar, commits per day) |
| plan-week | Plan my week | schedule, focus_time, task_list |
| review-implementation | Review this implementation | claude_run (mode ask, status done), task_queue; `views.approvals` adds a host-action handoff proposal (tool `claude_handoff`, content = the exact brief); an `approval.created` step and core `awaiting_approval` before the run; `views.approvals` is a full replacement, so it lists both baseline proposals plus the handoff (F20) |
| email-summary | Summarize my important emails | table, stat; reply states the email pack is not designed yet and these are sample core widgets |

`views.json`: 2 approvals (one container-only demo write, one host vault-note proposal with `target_folder`), 2 runs, 3 sessions (one waiting), 2 permissions (one plain `pytest -x`, one carrying the Review Focus 5 characters), 3 traces with nested spans of several kinds, tray items `approvals_waiting` (count 2), `session_waiting`, `run_finished`. Add `FIXED.alert` to `fixedText.ts`: a record keyed by `AlertKind` with the text an `alert` widget shows, exactly: `approvals_waiting` "Approvals are waiting", `run_finished` "A run finished", `run_failed` "A run failed", `run_timed_out` "A run timed out", `run_over_tokens` "A run crossed 200,000 tokens", `session_waiting` "A session is waiting for permission", `plan_limit` "Claude plan limit reached" (design section 9 wording), `login_expiring` "The login expires soon", `adapter_degraded` "A source is unavailable", `companion_degraded` "The host companion is unavailable", `over_budget` "A request went over its token budget", `proposal_expiring` "A proposal is about to expire" (F13).

- [ ] Failing `scenarios.test.ts` (S43, S42 data side): "every scenario file validates against Scenario"; "every board step references existing widget ids"; "every widget in a scenario is shown by some board step and validates against its type schema"; "every envelope's block kinds match RECIPE_BLOCKS"; "every request scenario has the exact L2 example text"; "every alert widget text is a FIXED.alert value"; "views.json validates against ViewSet" (`...mock.schema.json#/$defs/ViewSet`); "no board step shows more than 12"; "all URLs are synthetic". Run. Expected: fail. Write the files. `[dev]` `npm run check`. Expected: pass. Commit `"Add baseline views and request scenarios"`.

### Task 19: State and edge scenarios

**Files:** (only JSON and the test; `FIXED.alert` and `loadScenarios` come from Task 18) create `frontend/src/mocks/scenarios/{state-empty-board,state-error,state-waiting-approval,state-plan-limit,edge-caps,edge-empty-widgets,edge-slow-source,edge-adapter-error,edge-board-full,edge-work-class}.json`; modify `scenarios.test.ts`.

Content: `state-empty-board` (no widgets, core idle); `state-error` (core `error`, `alert` widget level bad whose text is `FIXED.alert.adapter_degraded`, `alert.raised adapter_degraded`); `state-waiting-approval` (core `awaiting_approval`, `approval.created`, tray approvals count 1); `state-plan-limit` (core `plan_limit`, `alert` widget level attention whose text is `FIXED.alert.plan_limit` (`Claude plan limit reached`), `alert.raised plan_limit`); `edge-caps` (every capped string at exactly its cap, past-cap inputs shown as the server will emit them: cut to cap minus one plus `…`; widget fields at their own cap that map to a smaller block cap follow the Task 13 cut rule (F12); unbroken 80-character title; 40-character hash value; a table at 50 rows and 8 columns; a chart at 5 series of 500 points); `edge-empty-widgets` (one widget per MVP type with every list empty where the schema allows); `edge-slow-source` (`request.started` at 0, board at 4,000 ms, envelope as_of 30 h before now so it shows Stale); `edge-adapter-error` (an answer from one source plus an `alert` widget `adapter_degraded`); `edge-board-full` (exactly 12 widgets of mixed MVP types); `edge-work-class` (personal and work `project_status` side by side, work chip visible).

- [ ] Add failing tests: "edge-board-full shows exactly 12"; "edge-caps contains at least one string at each cap of section 16"; "state-error and state-plan-limit drive the matching core state"; "edge-slow-source envelope is stale relative to scenario now". Run. Expected: fail on missing files. Write them. `[dev]` `npm run check`. Expected: pass. Commit `"Add state and edge scenarios"`.

### Task 20: Board view, layout and scenario switcher

**Files:** create `frontend/src/views/Board.tsx`, `frontend/src/views/ScenarioSwitcher.tsx`; modify `frontend/src/app.tsx`, `base.css`, `fixedText.ts`; tests `frontend/tests/Board.test.tsx`, `frontend/tests/app-scenarios.test.tsx`.

**Interfaces:** `splitColumns(board: WidgetEnvelope[]): { left: WidgetEnvelope[]; right: WidgetEnvelope[] }` (board index 0 is newest; even indexes left, odd right, order kept); `Board(props: { state: AppState; now: string })` renders the left column, the centre `Core` (`size="full"`, wrapper class `core-full`) with `StatusPill`, the right column (the top bar's compact core wrapper is `core-compact`, Task 21); at most 12 panels; empty board shows `FIXED.emptyBoard` = `"The board is empty. Ask Friday something."`; while `requestOpen` and the board is empty shows `FIXED.loadingBoard` = `"Waiting for sources"`. `ScenarioSwitcher(props: { scenarios: Scenario[]; current: string; onSelect(id: string): void; onRestart(): void })`: a labelled `select` "Scenario" grouped by request, state, edge, plus a "Restart" button. `App` owns: route, one `MockTransport` and store per selected scenario (`createStore(transport, transport)`, closed and disposed on switch); it deletes `document.body.dataset.scenarioDone` whenever it creates a transport and sets it to `"true"` when the store's `done` turns true; it passes `route.instant` to `MockTransport` (F5). With no scenario in the route the board is empty and nothing plays (F27). CSS: three columns at 1,100 px and wider, each side column `overflow-y: auto` with the core column fixed; below 1,100 px the full core is hidden, the top bar shows the compact core (Task 21) and panels form one column; no horizontal page scroll at 640 px and wider.

- [ ] Failing tests: `splitColumns` over 5 envelopes gives left `[0,2,4]` right `[1,3]`; "renders at most 12 panels and keeps the core mounted" (13 envelopes injected into `Board` directly, Review Focus 4); "empty and loading texts"; "switching scenario closes the previous transport and clears scenarioDone" (spy on `close`); "no scenario in the route shows the empty board"; "selecting focus-today shows its widgets after the board step" (fake timers). Run. Expected: fail. Implement. `[dev]` `npm run check`. Expected: pass. Commit `"Add board layout and scenario switcher"`.

### Task 21: Top bar, tray, chat line and push-to-talk visual

**Files:** create `frontend/src/chrome/TopBar.tsx`, `frontend/src/chrome/Tray.tsx`, `frontend/src/chrome/ChatLine.tsx`; modify `fixedText.ts`, `app.tsx`, `base.css`; test `frontend/tests/chrome.test.tsx`.

**Interfaces:** `TopBar(props: { state: AppState; nowMs: number; timeZone?: string; onNavigate(v: View): void })`: product name `Friday` in the page's only `h1`, with `FIXED.tagline` outside the `h1` (F14, F27), a system status indicator showing `FIXED.previewStatus` = `"Preview: no backend"`, a local `HH:MM` clock (`formatTime(new Date(nowMs).toISOString(), timeZone)`, F29), the tray bell with unread counts for Approvals (`state.approvals.length`) and Permissions (`state.permissions.length`) (F26), a settings button opening a small menu holding `MotionSetting`, the user chip `Owner`, the compact `Core` below 1,100 px, and nav links to each view. `Tray(props: { items: TrayItem[] })`: rows of `FIXED.tray[kind]` with `count` substituted, each with a kind chip and a source chip. Fixed texts (exact): `approvals_waiting` "Friday: {n} approvals waiting", `run_finished` "Friday: a run finished", `run_failed` "Friday: a run failed", `run_timed_out` "Friday: a run timed out", `run_over_tokens` "Friday: a run crossed 200,000 tokens", `session_waiting` "Friday: a session is waiting for permission", `plan_limit` "Friday: Claude plan limit reached", `login_expiring` "Friday: the login expires soon", `adapter_degraded` "Friday: a source is unavailable", `companion_degraded` "Friday: the host companion is unavailable", `over_budget` "Friday: a request went over its token budget", `proposal_expiring` "Friday: a proposal is about to expire". `ChatLine(props: { state: AppState; request: string | null; onAct: SessionTransport["act"] })`: a drawer at the bottom edge, opened by a button and closable with Escape, showing the scenario request and the streamed reply; a text input whose submit calls `act({kind: "send_message"})` and shows the preview result; a "New" button (same preview result); a push-to-talk button (`aria-pressed`, hold with pointer or Space) that only toggles a CSS waveform and the label "Listening (preview, no audio)"; it never touches media APIs.

- [ ] Failing tests: "tray shows only fixed strings with count, kind chip and source chip"; "bell shows the approvals and permissions counts"; "chat submit shows Preview: nothing was executed and the store is unchanged"; "push-to-talk toggles aria-pressed by Space and makes no media call" (assert `navigator.mediaDevices` is never read, by defining a getter spy); "Escape closes the drawer and returns focus to its button"; "clock renders HH:MM from nowMs with timeZone UTC"; "the h1 text is exactly Friday". Run. Expected: fail. Implement. `[dev]` `npm run check`. Expected: pass. Commit `"Add top bar, tray, chat line and push-to-talk visual"`.

### Task 22: Visible markers, Approvals and Permissions previews

**Files:** create `frontend/src/views/markers.ts`, `frontend/src/views/RawField.tsx`, `frontend/src/views/PreviewBanner.tsx`, `frontend/src/views/Approvals.tsx`, `frontend/src/views/Permissions.tsx`; modify `app.tsx`, `fixedText.ts`; tests `frontend/tests/markers.test.ts`, `frontend/tests/action-views.test.tsx`.

**Interfaces:** `renderVisible(raw: string): { segments: { text: string; marker: boolean }[]; lines: number; bytes: number; nonAscii: boolean }` with markers `[CR]` (U+000D), `[TAB]`, `[ESC]` (U+001B), `[BIDI U+XXXX]` for U+061C, U+200E, U+200F, U+202A to U+202E, U+2066 to U+2069, `[ZW U+XXXX]` for U+200B, U+200C, U+200D, U+2060, U+FEFF, `[U+XXXX]` for any other C0 or C1 control except LF; LF stays a line break; `lines` = LF count plus 1 (0 for the empty string); `bytes` = UTF-8 length of the raw string. `RawField(props: { name: string; value: string })`: monospace, never truncated, markers styled distinctly, `"<lines> lines, <bytes> bytes"`, and `FIXED.homoglyph` = `"Contains non-ASCII characters. Check for look-alike letters."` when `nonAscii`. `PreviewBanner()`: fixed `PREVIEW, NOT LIVE`, `role="note"`, sticky at the top of the view. `Approvals`: banner; list of `ProposalView`; selecting one shows a preview with target, target folder, data class, secret scan result, `args_sha256`, content through `RawField`; buttons `Approve` and `Reject` for container proposals, `Open confirm page` for host actions, each calling `act` and showing the result in a `role="status"` region. `Permissions`: banner; one request at a time with `Request 1 of N`, session, project, data class, permission mode, cwd, whether Friday started it, tool, every input field through `RawField`; a required reason textarea and a single `Deny` button (no allow control of any kind); next and previous buttons that never move the Deny button. One modal at a time; nothing reorders under the cursor.

- [ ] Failing tests (Review Focus 5, S44): "every hidden class becomes a visible marker with line and byte counts" over `"a\rb\tc\x1b[31m‮d​e pаssword"` (expected markers in order, `nonAscii` true, `bytes` equals `new TextEncoder().encode(raw).length`); "LF is a line break, not a marker"; "empty string has 0 lines and 0 bytes"; "both views show PREVIEW, NOT LIVE"; "every action button shows Preview: nothing was executed" (action buttons: Approve, Reject, Open confirm page, and Deny after a non-empty reason; Next, Previous and list selection are navigation and excluded, F19); "Deny stays the same DOM element and position across Next and Previous"; "Permissions has no button whose name matches /allow/i"; "Deny requires a reason"; "long content is shown in full" (a 20,000-character field renders 20,000 characters). Run. Expected: fail. Implement. `[dev]` `npm run check`. Expected: pass. Commit `"Add visible-marker rendering and approval and permission previews"`.

### Task 23: Traces and Sessions previews

**Files:** create `frontend/src/views/Traces.tsx`, `frontend/src/views/spanTree.ts`, `frontend/src/views/Sessions.tsx`; modify `app.tsx`; tests `frontend/tests/spanTree.test.ts`, `frontend/tests/info-views.test.tsx`.

**Interfaces:** `buildSpanTree(spans: SpanView[]): SpanNode[]` where `SpanNode = SpanView & { children: SpanNode[] }`; roots are spans with `parent_span_id` null; a span whose parent is missing becomes a root; children keep input order; cycles are broken by visiting each span once. `Traces`: request list (label, started, duration, tokens in and out, cost) and, for the selected trace, the span tree as nested lists with kind, name, duration, tokens, status (status by word and icon). `Sessions`: banner; sessions table (project, class chip, kind, state, waiting, last activity) with an attach hint `claude attach <session_id>` shown as text; runs list with a `Cancel` button for `starting`, `working` and `waiting` runs; a message panel (textarea and `Send`); every button shows the preview result.

- [ ] Failing tests: tree over nested, orphan and self-parented spans; "traces show cost and tokens"; "sessions show the waiting session first marked waiting" (sort: waiting, then last activity descending); "Sessions shows the banner and every button gives the preview result". Run. Expected: fail. Implement. `[dev]` `npm run check`. Expected: pass. Commit `"Add traces and sessions previews"`.

### Task 24: Playwright CLI smoke test and CI job

**Files:** create `frontend/e2e/smoke.sh`; modify `.github/workflows/ci.yml`. The Makefile is not touched; `smoke.sh` is run directly (F30).

**Interfaces:** `frontend/e2e/smoke.sh [base_url]` (default `http://127.0.0.1:8742`), `[host]`, exits 0 only when every check passes, prints one line per check. Uses session `-s=smoke`, `--raw eval` for values, and a helper `expect_eq <name> <actual> <expected>`. Expected widget counts per scenario come from the scenario files via `node -e` on the host (Node 22 is installed there): the length of the last `board` step, or 0 when a scenario has none (`state-empty-board`).

Checks:
1. For each scenario id: `goto <base>/#/board?scenario=<id>&instant=1`; wait for `document.body.dataset.scenarioDone === "true"` with an `eval` that returns a polling Promise (that `eval` awaits a returned Promise is unverified; fallback `run-code` with `page.waitForFunction`, also unverified, confirm with `playwright-cli --help run-code`); panel count equals the expected count; every panel contains `Sample data` (S42).
2. `requests` lists only URLs starting with the base URL (S42).
3. At `resize 1440 900` and `resize 900 800` on `edge-caps` and `edge-board-full`: `document.documentElement.scrollWidth <= innerWidth`; every `[data-widget-id]` has `scrollWidth <= clientWidth + 1` (Review Focus 2); at 1440 the `.core-full` element is visible, at 900 the compact core in the top bar is.
4. `#/approvals`, `#/permissions`, `#/sessions`: the banner text is `PREVIEW, NOT LIVE`; clicking each action button (Approve, Reject, Open confirm page, Cancel, Send, and Deny after typing a reason; navigation buttons excluded, F19) leaves `Preview: nothing was executed` in the status region; no element whose accessible name matches /allow/i on Permissions (S44).
5. `#/style-guide`: every core state reachable through the radio group; with `set-reduced-motion reduce` the ring animation duration is `0s`.
6. `console error` (min level) prints no messages, which also catches CSP violations.

- [ ] Write `smoke.sh` (`set -euo pipefail`, LF line endings), `chmod +x`. `[host]` `make preview && frontend/e2e/smoke.sh`. Expected: every check prints `ok`, exit 0. Then break one thing on purpose (remove the banner text in `PreviewBanner.tsx`, rebuild with `make preview`), run again. Expected: exit 1 naming check 4. Revert and rebuild.
- [ ] CI job `e2e` (needs `image`; it runs only after the owner pushes, so the review covers the YAML): `docker compose up --build -d --wait preview`, `npm install -g @playwright/cli@0.1.24`, `playwright-cli install-browser chromium` (Linux system packages for the browser are unverified on the runner; confirm on the first CI run), `frontend/e2e/smoke.sh`, `docker compose down` in an `always()` step. No screenshot or trace is uploaded as an artefact.
- [ ] Commit `[host]` `git add frontend/e2e .github && git commit -m "Add Playwright CLI smoke test and CI job"`.

### Task 25: L2 gate and milestone U review

- [ ] `[host]` `make check-frontend`: every unit test, schema validation of all mocks (S43), hex, dash and type freshness checks pass.
- [ ] `[host]` `make preview && frontend/e2e/smoke.sh` (`make preview` rebuilds the image from the current tree): exit 0 (S42, S44, Review Focus 2).
- [ ] `[host]` `pre-commit run --all-files` passes; `git log --format=%B main..HEAD | grep -ci co-authored` prints `0`; `git ls-files | grep -ciE 'design-references|\.png$|\.playwright-cli'` prints `0`.
- [ ] `[host]` `grep -rnP '[\x{2013}\x{2014}]' --include='*.md' --include='*.ts*' --include='*.json' --include='*.css' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.beads --exclude-dir=.superpowers --exclude-dir=.playwright-cli --exclude-dir=design-references` prints nothing.
- [ ] Reviews in parallel, each by a fresh agent that did not implement: `code-reviewer` (`opus`, the change is Significant) over the whole branch against `~/.claude/docs/quality/code-review.md`, the Global Constraints and every Review Focus item; frontend review against D18 and originality.
- [ ] Owner demonstration (below), his judgement of the preview against D18 (D28), and his go before any L3 work. Nothing is merged or pushed by an agent.

---

## Acceptance check

| Layer | Acceptance criterion (design section 29) | Task | Command that proves it |
|---|---|---|---|
| L0 | `make preview` starts the container and the page answers on `127.0.0.1:8742` only | 5, 6 | `make preview`; `curl` 200 on 127.0.0.1; `docker compose port preview 8742` = `127.0.0.1:8742`; LAN IP refused; `compose.test.ts` |
| L0 | CI is green | 5, 6 | the same commands locally via `make check-frontend` and `docker build --target preview .`; the CI run itself after the owner pushes |
| L0 | secret scan in pre-commit and CI | 1, 5 | `pre-commit run --all-files`; the refused planted-secret commit; CI job `secrets` |
| L0 | generated types are fresh | 3 | `npm run gen:check` (part of `npm run check`) and the stale demonstration |
| L0 | a planted raw hex colour fails the check | 4, 6 | `checks.test.ts`; `npm run check:hex` with a planted value |
| L0 | tests: schema validation of a sample, type freshness, empty renderer smoke | 2, 2a, 3 | `schema.test.ts`, `npm run gen:check`, `gen-types.test.ts`, `app.test.tsx`, `cleanup.test.tsx` |
| L1 | every widget renders from samples inside the HUD frame on the style guide | 13, 14, 15 | `StyleGuide.test.tsx`; Task 15 panel count in the browser |
| L1 | the core shows every state from the switcher with only the fixed labels | 8 | `core.test.tsx` |
| L1 | WCAG AA contrast; every tone has an icon or label | 8, 10 | `tokens.test.ts`; `blocks.test.tsx` tone test |
| L1 | reduced motion stills rings and glow | 8, 15 | `tokens.test.ts`; Playwright CLI `set-reduced-motion` check |
| L1 | every control works by keyboard | 8, 14 | `core.test.tsx`, `StyleGuide.test.tsx` |
| L1 | hex check passes and fails on a planted value | 4, 15 | `npm run check`; Task 15 planted value |
| L1 | `<img onerror>` text renders as literal text | 10 | `blocks.test.tsx` "onerror text renders literally" |
| L1 | a `javascript:` link is dropped | 9 | `safety.test.ts` |
| L1 | schema validation of every sample, vitest per block and core | 10 to 13 | `samples.test.ts`, block and core tests |
| L2 | open the preview, switch scenarios, every core state and widget at wide and narrow widths | 20, 21, 24 | `smoke.sh` checks 1, 3, 5 |
| L2 | every mock file validates (S43) | 13, 18, 19 | `samples.test.ts`, `scenarios.test.ts` |
| L2 | S42: every scenario shows its widgets with the sample stamp and no request leaves the origin | 18, 19, 24 | `smoke.sh` checks 1 and 2 |
| L2 | S44: preview banner and the preview-only buttons | 22, 23, 24 | `action-views.test.tsx`, `info-views.test.tsx`, `smoke.sh` check 4 |
| L2 | Playwright CLI smoke steps through every scenario and checks the banners | 24 | `frontend/e2e/smoke.sh` |
| L2 | frontend unit tests for the renderer pass | 10 to 12 | `make check-frontend` |
| L2 | `MockTransport` and views tested | 17, 20 to 23 | `mock-transport.test.ts`, `store.test.ts`, view tests |

## Demonstration

1. `[host]` from the repo root: `make preview`. Wait for `Friday preview: http://127.0.0.1:8742`.
2. Open `http://127.0.0.1:8742/#/style-guide`: the tokens, the frame, every block and every widget (later packs labelled), the core in all nine states through the "Core state" control, "Reduce motion" on and off.
3. Open `http://127.0.0.1:8742/#/board`, pick each scenario in "Scenario" in turn: watch the core move from THINKING to READY, the reply stream in the chat drawer, panels appear on both sides of the core with "Sample data" stamps. Look specifically at `focus-today`, `project-blockers` (the stale and blocked cards), `review-implementation` (proposal, run card, task queue), `state-plan-limit`, `edge-caps`, `edge-board-full` and `edge-work-class`.
4. Narrow the window below about 1,100 px: the core moves into the top bar, panels form one column.
5. Open Approvals, Permissions and Sessions: the `PREVIEW, NOT LIVE` banner, every button answering `Preview: nothing was executed`, the hidden-character markers on the second permission request, no allow control.
6. Open the tray bell and Traces.
7. Stop with `docker compose down`. Anything kept from the demo shows synthetic data only and stays out of the repo.

## Out of scope

- Everything from L3 onward: the backend, FastAPI, SQLite, login and CSRF, `/api/*` routes, `/ws/session` and `WsTransport`, the companion and its confirm page, the Modules view, the server validator, aliases and recipes, server samples (`make samples`), the golden recipe check, `make check` and the other L3 Makefile targets, ADR files under `docs/adr/`, the runbook (the design names `docs/runbook.md`; under the subfolder rule L3 puts it in `docs/guides/`), `CLAUDE.md` for the repo, and the parallel spikes A25, A29 and the L5 bridge spikes.
- Fake in the preview: no model, no tools, no backend, no approval, reject, deny, cancel or send is executed, no message or chat request is sent, no audio is captured or played (push-to-talk and the waveform are visual), the clock and status indicator are local, every board, proposal, run, session, permission, trace and tray item comes from mock files, core states come from scenario scripts rather than real events, and the later-pack widget schemas are drafts.
- Not built: the `quote` block, a month-grid calendar block, `interview_prep`, the phone layout below 640 px, browser notifications, live widgets, tap-to-ask, closing widgets, a light theme.
- The owner's steps: creating the GitHub repo, pushing, and adding Friday to the workspace `CLAUDE.md`.

## Questions before execution

**For the owner (please answer before Task 1):**

- Q1 (design section 31, still open): do you object to the preview being the real frontend built against the shared schema rather than a throwaway mock-up? This plan assumes no objection; an objection would replace Tasks 3, 13 and 16 to 19 with a lighter mock-up.
- Q2: should `docs/specs/ai-goal-prompt.md` go into the public repo? Default: it stays untracked (the design's repository structure lists only the design document).
- Q3: which name goes on the MIT copyright line? Default: `the Friday authors`.

**Ambiguities in the design for these layers, resolved conservatively (override any of them at the Task 8 checkpoint or before):**

- The design header says revision 7 while its content includes the revision 8 change (D28, milestone U); the plan follows the content.
- The "sample title rule of section 16" does not exist; section 16 only says a widget with no source tool call is marked "sample". Plan: every mock envelope has `source: "sample"` and shows a "Sample data" stamp.
- S43 says a mock past its cap fails, while the mock data rules ask for text "at and past every cap (trimmed with an ellipsis)". Plan: the schema is strict at the cap; past-cap edge cases appear as the server will emit them (cut, ending in `…`); negative tests hold the past-cap inputs.
- Block field shapes are not specified (only the timeline example); the plan defines them (Task 3 table) and the widget-to-block mapping (Task 13 table). L8 inherits both, so a reviewer should check them against the design's intent.
- Later-pack widget fields have no types or caps in the design; draft schemas use the general caps, omit `sprint_burndown.ideal`, and give `focus_time` a meter of 480 minutes; L14 and L16 finalize them.
- L1 says "every block in the closed set" while section 16 says `quote` is added only with a widget that needs it: `quote` is not built. `interview_prep` (L20) is not in the style guide.
- The core's nine states have only one fixed label in the design ("AWAITING COMMAND"); the plan fixes the rest (Task 8). The client event list has no event for "running tools" or the voice states, so in the preview the core is driven by scenario scripts and the event mapping is left to L8.
- Staleness has no threshold: 24 hours before the scenario clock.
- Board order "newest at the top, alternating sides": board index 0 is newest, even indexes go left.
- No cap on blocks per envelope: 6.
- S44 names only Approvals and Permissions; the banner and preview-only buttons also cover Sessions and the chat send, because those actions would be live too.
- The published-port rule is enforced by `make check` from L3; L0 adds the same rule as a unit test.
- The Dockerfile gets a `dev` stage besides `spa-build` and `preview`, so the `node_modules` named volume is owned by the non-root user.

**Verification record:** verified with documentation on 2026-11-20: Vite 8.3 preview and server options (`host`, `port`, `strictPort`, `headers`, `watch.usePolling`, `--configLoader native` and the bundle loader's temp directory), Ajv 8.20 draft 2020-12 entry (`ajv/dist/2020`, package listing) and `$ref` by `$id`, ajv-formats, json-schema-to-typescript 16 options and the `compile` API, Vitest 5 `environment` and fake timers, typescript-eslint 8.72 flat config and its TypeScript range (below 6.1), setup-node v6 caching inputs, the gitleaks v8.30.1 tag and hook ids, Playwright CLI 0.1.24 commands (`open` headless by default, `goto`, `eval`, `resize`, `requests`, `console`, `set-reduced-motion`, `run-code`, `install-browser`, `-s`, `--raw`) from the installed CLI's help, and npm versions and release dates. Unverified, confirm before running: the `node:22.22.0-bookworm-slim` tag and digest, the `zricethezav/gitleaks:v8.30.1` image tag and its positional path argument, the react-hooks flat preset name, Compose `read_only`, `tmpfs`, `cap_drop` and `security_opt` (confirmed by `docker compose config`), whether `playwright-cli eval` awaits a returned Promise, `run-code` argument form, and the browser's system packages on GitHub runners. Added 2026-11-20 with the cross-check: `@types/react` 19.3.0 declares `JSX` only inside the `React` namespace (installed `index.d.ts`); `@testing-library/react` 16.3.3 registers automatic cleanup only when a global `afterEach` exists (installed `dist/index.js`); Ajv 8.20 `strict: true` enables `strictTypes`, `strictTuples` and `strictRequired` (options docs); `docker compose up --wait` exists in the local Compose v2.39.1. Unverified: whether Ajv strict mode rejects each `if`/`then` shape in Task 16 (the brief gives the fix if it does).

## Owner answers (2026-11-20)

Recorded after the plan was written. They override any conflicting line above.

- The plan is approved. Execution is subagent-driven, with tasks tracked in beads.
- The preview is the real frontend, not a throwaway mock-up (Q1).
- `docs/specs/ai-goal-prompt.md` is tracked and already public (Q2).
- The MIT copyright line reads "the Friday authors" (Q3).
- The repository already exists: `main` holds one commit with the docs and `.gitignore`, and the remote is `git@github.com:ezehto/friday.git`. Task 1 starts from that state: it creates the branch `milestone-u-preview` and skips `git init`.
- `CLAUDE.md` at the repo root stays uncommitted. It is listed in `.git/info/exclude`. No task stages or commits it.
- Commits are approved on the working branch. Nothing is pushed unless the owner asks.

## Amendments (2026-11-20)

From the independent cross-check (`.superpowers/sdd/2026-11-20-friday-milestone-u-dashboard-preview/preflight.md`). Accepted means the proposed ruling was applied as written; adjusted means a different fix for the same problem.

| Finding | Ruling | Changed |
|---|---|---|
| F1 schema glob and id form | accepted | Task 3, Implementation conventions |
| F2 `JSX.Element` | accepted (verified in installed types) | Implementation conventions, Tasks 8 to 22 signatures |
| F3 component and type name clash | accepted | Implementation conventions, Tasks 10, 11, 12 |
| F4 core and done never reach the store | adjusted: `createStore(transport, preview?: PreviewFeed)` instead of an intersection type | Tasks 17, 20 |
| F5 `instant` and `scenarioDone` | accepted | Tasks 7, 20, 24 |
| F6 `.mjs` imports need `allowJs` | accepted | Task 2a, Task 4 |
| F7 ESLint globals and ban scope | accepted | Task 2a, Implementation conventions |
| F8 Testing Library cleanup | adjusted: `tests/setup.ts` with `afterEach(cleanup)` instead of Vitest `globals` (verified in installed RTL) | Task 2a, Implementation conventions |
| F9 Ajv strict with `if`/`then` | accepted | Task 16 |
| F10 `AlertKind` placement | accepted | Task 16 |
| F11 no schema for `views.json` | accepted (`ViewSet`) | Tasks 16, 17, 18 |
| F12 widget caps above block caps | accepted (cut rule) | Tasks 13, 19 |
| F13 fixed strings have no single home | accepted; the three plan-limit strings stay, one per surface, all in `FIXED` | Global Constraints (amended), Tasks 8, 17, 18, 19 |
| F14 tagline | accepted | Tasks 8, 21 |
| F15 `data-widget-id` wrapper | accepted | Task 12 |
| F16 style guide panel count, `daily_focus` pack, `data-focusable` | accepted | Task 14 |
| F17 chart `data-block-kind` | accepted | Task 11 |
| F18 `make preview` does not wait | accepted (`--wait`) | Tasks 5, 24 |
| F19 Deny reason vs every button | accepted | Tasks 22, 24 |
| F20 shallow merge replaces lists | accepted (replacement, stated) | Tasks 16, 17, 18 |
| F21 `SCENARIO_ORDER` and `index.ts` | accepted | Tasks 18, 19 |
| F22 reply `request_id` | accepted | Task 17 |
| F23 dash check scans untracked folders | accepted | Global Constraints (amended), Tasks 4, 25 |
| F24 allowlisted planted secret | accepted; already handled while building Task 1 | Task 1 note |
| F25 attribution trailer | accepted; already a Global Constraint | none |
| F26 `source_ref` display, bell counts | accepted | Tasks 10, 21 |
| F27 tagline in `h1`, default scenario | accepted | Tasks 20, 21 |
| F28 inert modules link | accepted | Task 10 |
| F29 clock time zone | accepted | Task 21 |
| F30 Makefile not touched in Task 24 | accepted | Task 24 |
| F31 "Natsu" in the wire example | accepted as a design-quoted exception; the Task 9 test URL is now invented | Tasks 3, 9 |
| F32 no `minItems` | accepted | Task 3 |
| F33 CI cannot run before a push | accepted | Implementation conventions, Task 24 |
| F34 README before `make preview` | accepted, no change (the README already says the target arrives with L0) | none |
| F35 history grep includes `main` | adjusted: grep `main..HEAD` instead of reporting authors | Tasks 6, 25 |
| Defect 1 duplicate freshness check | accepted (test dropped, script kept) | Task 3 |
| Defect 2 disc label untested | accepted | Task 8 |
| Defect 3 tone backgrounds unchecked | accepted | Task 8 |
| Defect 5 core states listed three times | accepted (`ScriptCoreState` plus an equality test) | Task 16 |
| Defect 6 `RunView.status` duplicates an enum | accepted (`$defs/RunStatus`) | Task 16 |
| Defect 7 repeated planted-hex demo in Task 15 | rejected: it is the L1 gate's own evidence for its acceptance row | none |
| Defect 8 Deny position untested | accepted | Task 22 |
| Owner instruction: documents in subfolders of `docs/` | applied | Global Constraints, File structure, Spec line, Task 8 (`docs/guides/style-guide.md`), Out of scope |
| Owner request 2026-11-24: voice-level animation | added | Task 21a |

