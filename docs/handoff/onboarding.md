# Friday: session onboarding

Read this first when picking the work up in a new session. It records where the
work stands and what was agreed in conversation that the other documents do not
say. It was written at a stop the owner called on 2026-11-20.

## 1. Resume in five steps

1. Read `CLAUDE.md` at the repo root if it exists. It is never committed, so a
   fresh clone will not have it; section 5 below repeats its binding rules.
2. Read this file to the end.
3. From the repo root, run:
   - `git status -sb`, `git log --oneline -10`, `git stash list`
   - `bd ready` and `bd list --status in_progress` (beads is local to the
     owner's machine; on another machine recreate the issues from the plan)
4. Read the execution ledger, the recovery map of the task run:
   `.superpowers/sdd/2026-11-20-friday-milestone-u-dashboard-preview/progress.md`
   (git-ignored, on the owner's machine only). Trust the ledger and `git log`
   over memory.
5. Continue from section 6. Use `/engineer` with
   `superpowers:subagent-driven-development`, the owner's chosen method.

## 2. What Friday is

A single-user personal AI assistant that runs locally in containers. A lean
agent answers from the owner's notes, memory and git and shows validated
widgets on a HUD-style dashboard (orange and teal on warm near-black), with
push-to-talk voice. Work that needs the owner's full Claude Code setup goes
through a host companion. The owner approves every host action. The design is
the source of truth.

## 3. Where the work stands

| Item | State |
|---|---|
| Design | Approved by the owner at revision 8. Decisions D1 to D28. |
| Repository | `git@github.com:ezehto/friday.git`, public. `main` has one commit. |
| Working branch | `milestone-u-preview`, pushed at this stop. |
| Milestone | U, the dashboard preview on mock data: plan Tasks 1 to 25 plus 2a. |
| Task 1, repository hygiene | Done, review clean. `27ff743`. |
| Task 2, frontend package and dev container | Done, review clean. `892c78c`, `2e39d45`. |
| Task 2a, toolchain corrections | Done, review clean. `1c39714`. |
| Task 3, schema contract and type generation | Started, then stopped by the owner before any commit. Not done. |
| Tasks 4 to 25 | Not started. |
| Backend (L3 onward) | Planned, parked until the owner has reviewed the UI. |

Branch history at the stop, oldest last:

```
(this file's commit)
1c39714 Fix toolchain config for scripts, lint scope and test cleanup
f0d4cb4 Organize docs into subfolders
090720f Amend preview plan from cross-check findings
215e2e2 Move design and plans into docs
2e39d45 Document lockfile regeneration with npm 11.21.3
892c78c Add frontend package and dev container
27ff743 Initialize repository with hygiene files and design docs
b9120c2 Add Friday design document and implementation plans   (main)
```

What exists in the code so far: `frontend/` (package with exact pins, lockfile,
TypeScript, Vite, ESLint and Vitest configuration, a placeholder app and three
passing tests), a `Dockerfile` with `base` and `dev` stages, `compose.dev.yaml`
with the `frontend-dev` service, the gitleaks commit hook, README and LICENSE.
There is no schema, no visual design and no preview container yet, so there is
nothing to look at in a browser.

Task 3 leftovers: the stopped implementer had written three test files and no
implementation. They are not committed. On the owner's machine they are in
`git stash` (entry "task-3 partial: failing tests only"). Re-dispatching Task 3
from its brief is the clean way to resume; drop the stash, or apply it if the
new implementer wants the tests as a start.

## 4. Where everything is

| What | Path |
|---|---|
| Design (source of truth) | `docs/specs/2026-11-20-friday-design.md` |
| Owner's original scope | `docs/specs/ai-goal-prompt.md` |
| Plan in execution | `docs/plans/2026-11-20-friday-milestone-u-dashboard-preview.md` |
| Backend plan (parked) | `docs/plans/2026-11-20-friday-l3-backend-foundation.md` |
| This file | `docs/handoff/onboarding.md` |
| Style guide, created by Task 8 | `docs/guides/style-guide.md` |
| Visual references (never commit) | `docs/design-references/`, three PNG files, owner's machine only |
| Execution workspace (git-ignored) | `.superpowers/sdd/2026-11-20-friday-milestone-u-dashboard-preview/` |
| In that workspace | `progress.md` (ledger), `preflight.md` (plan cross-check), `implementer-rules.md` (standing rules given to every implementer), `task-N-brief.md`, `task-N-report.md`, `review-<base>..<head>.diff`, `context-usage.py` |
| Beads data (local only) | `.beads/` |
| Owner's notes hub | `10-Projects/Personal/Friday/Friday.md` in his second-brain vault |

In the plan: Global Constraints with the implementation conventions are lines
15 to 54, the file structure lines 67 to 138, the owner answers lines 620 to
631, and the amendments table from line 632.

## 5. Owner instructions given in conversation

These are binding.

1. **UI only for now.** Build Milestone U and nothing else. After the last
   task, stop for the owner's review before any other work. There is an earlier
   checkpoint after Task 8: he approves the look at
   `http://127.0.0.1:8742/#/style-guide` before Task 9 starts.
2. **Follow the owner's global workflow** (`~/.claude/CLAUDE.md` and
   `/engineer`): classify, delegate to specialist agents, an independent review
   after every task, evidence before claims, approval is his.
3. **Execution is subagent-driven**: a fresh implementer per task, a fresh
   reviewer after each, a whole-branch review at the end.
4. **Track work in beads.** Issue `friday-N` is plan Task N; `friday-26` was
   Task 2a. Close an issue only after its review is clean.
5. **`CLAUDE.md` is never committed.** Nor are `.beads/`, `.superpowers/` or
   `docs/design-references/`. Stage by explicit path, never `git add -A`.
6. **No push unless the owner asks.** Never commit on `main`. The push at this
   stop was his instruction for this stop only.
7. **Commit messages:** one line, imperative, no body, no attribution trailer.
8. **Documents live in dedicated subfolders of `docs/`** (`specs/`, `plans/`,
   `guides/`, `handoff/`, `design-references/`), never loose in `docs/` and
   never under `docs/superpowers/`.
9. **Monitor token usage and stop at 91 percent**, then document, commit and
   push. See section 8 for how it is measured.
10. **The preview is the real frontend**, not a throwaway mock-up.
11. **MIT license**, holder "the Friday authors". `ai-goal-prompt.md` is public.
12. Everything else (backend, proofs, vault decision notes) is discussed after
    the UI review.

## 6. Next steps, in order

1. **Task 3.** Record the base commit (`git rev-parse HEAD`), mark `friday-3`
   in progress, dispatch a `frontend-engineer` on `sonnet` with
   `implementer-rules.md` and `task-3-brief.md` (regenerate the brief with the
   `task-brief` script if the workspace is missing). When it reports: build the
   review package from that base, dispatch a `code-reviewer` on `sonnet`, run
   the fix loop if it finds Critical or Important issues, then write the ledger
   line and close the issue.
2. **Tasks 4, 5, 6** the same way. Task 5 creates the preview container, the
   Makefile and CI; Task 6 is the L0 gate.
3. **Tasks 7 and 8.** Task 8 is the visual design pass: brief a
   `frontend-engineer` who loads the `frontend-design` skill first and looks at
   the three reference images without copying anything from them.
4. **Owner checkpoint after Task 8.** Stop. He looks at the style guide page
   and the core.
5. **Tasks 9 to 25**, then the whole-branch review on the most capable model,
   then stop for the owner's review of the UI.
6. Update this file at each stop.

Scripts for briefs and review packages are in the superpowers plugin, under
`skills/subagent-driven-development/scripts/` (`task-brief PLAN N`,
`review-package PLAN BASE HEAD`, `sdd-workspace PLAN`).

## 7. How each task is run

- Implementer: `frontend-engineer` for UI and schema tasks,
  `devops-cloud-engineer` for containers and CI, model `sonnet`, never the top
  tier. Reviewer: `code-reviewer` on `sonnet`, a fresh agent each time.
- The dispatch gives the standing rules file, the brief path, the state left by
  earlier tasks, and the report path. It never pastes the plan.
- Record the base commit before each dispatch. Review packages use that base,
  never `HEAD~1`.
- A report with a concern about correctness is settled before review.
- Never move, rename or stage files while an implementer or reviewer is
  running: a staged change lands in the agent's commit.
- Ledger lines: `Task N: complete (commits <base>..<head>, review clean)` and
  `Ruling: <decision>, <why>, <cost if wrong>` for every judgment call.

## 8. Token usage monitoring

- The figure watched is the session's context-window usage, the one the
  owner's status line shows. `context-usage.py` in the workspace computes it
  from the session transcript (window 1,000,000 tokens) and exits 3 at 91
  percent or more. Run it after every task and before every dispatch. A new
  session has a new id: pass it as the first argument.
- Reading at this stop: about 54 percent. The owner called the stop himself.
- The weekly "all models" plan bar that `/usage` shows cannot be read from a
  shell. Its only documented machine-readable source is the JSON Claude Code
  passes to the status line command (`rate_limits.seven_day.used_percentage`).
  Using it needs a small change to the owner's status line script so it writes
  that JSON to a file. Not done; it is his global setup and his decision.
  Which of the two bars he means was asked and not yet answered.

## 9. Things learned the hard way

- **Stale git lock.** The repo is on a Windows drive under WSL.
  `.git/index.lock` can be left behind. Check no git process is running,
  remove it, retry.
- **npm in the Node image crashes on `npm install`** (npm 10.9.4) with this
  dependency set. `npm ci` works. Regenerate the lockfile with
  `npx -y npm@11.21.3 install` in the dev container. It is in the README.
- **The plan's original sample secret is allowlisted by gitleaks**, so it does
  not prove the hook. Use a key gitleaks catches.
- **The commit hook is gitleaks through Docker.** Docker Desktop must be
  running. Never bypass it.
- **Dependencies live in the named volume `friday-node-modules`**, never in a
  `node_modules` folder on the Windows drive.
- **Push uses SSH.** HTTPS has no stored credentials on the owner's machine.
- **Beads** was initialised with `--no-db --setup-exclude --skip-hooks` so
  nothing of it reaches the public repo.
- **The first plan had 35 defects** found by an independent cross-check before
  Task 3 (6 would have blocked a task). They were applied to the plan; the
  table at its end traces each one. Cross-check a plan before executing it.
- **Agent reports are claims.** Spot-check the artefact before building on one.

## 10. Parked until the UI is reviewed

1. **Backend foundation (L3).** Plan written. Owner answers are recorded at its
   end: no Node in the runtime image; if the container cannot see a host login
   refresh, the lean agent runs in the host companion; a dedicated socket
   directory is acceptable.
2. **Two proofs** in Part 1 of that plan (the mounted Claude login watched for
   24 hours; the companion socket across a restart). Started once and stopped
   at the owner's request before anything was created.
3. **Vault records.** The Friday hub has no decision notes yet.
4. **Not independently reviewed:** design revisions 7 and 8 (containers, host
   companion, UI-first order), the backend plan, and the amended preview plan.
5. **Humanizer pass** was partial on the design's later revisions and was not
   run on this file.
6. **`npm audit`:** 8 moderate findings in `minimatch` through
   `typescript-eslint` 8.72.1, development only. The fix is 8.73.0, outside the
   plan's pin. The owner decides; do not change the pin silently.

## 11. Open questions for the owner

1. Which usage bar should be monitored: the context bar (watched now) or the
   weekly plan bar (needs the status line change in section 8)?
2. Should `CLAUDE.md` be listed in the committed `.gitignore`, so the exclusion
   survives a fresh clone? It would reveal that the file exists.
3. The `npm audit` findings: bump the pin or leave it?
4. Vault decision notes for the design: write them now or after the UI review?

## 12. What is public

The GitHub repository is public. It holds the design, the goal prompt, both
plans, this file and the code. The design describes the owner's local setup
(notes path, folder layout, ports). A pattern search before the first push
found no work email, employer or client names, keys or tokens; it was not a
full read. All fixtures and mock data must stay synthetic.
