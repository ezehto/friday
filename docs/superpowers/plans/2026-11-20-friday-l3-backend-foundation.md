# Friday L3 Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the backend to the existing Friday repository so the image runs the backend through compose with the `friday-host` companion beside it, stores traces and audit rows in SQLite on a named volume, and proves the lean subscription login works inside the container (or records why it cannot).

**Architecture:** The Python tooling joins the repository Milestone U created, with two packages in one `pyproject.toml`: `friday` (FastAPI backend in a non-root, read-only container, SQLite on the `friday-data` volume) and `friday_host` (a host process with a HMAC-authenticated Unix socket channel and its own confirm page on `127.0.0.1:8741`). The browser reaches the backend only on `127.0.0.1:8740`, behind Host, Origin, `Sec-Fetch-Site`, CSRF and CSP checks and a one-time-token login. Two spikes (A29 credentials mount, A25 socket mount) run first, from a scratch directory, in parallel with Milestone U, and decide how the compose service and the SDK startup check are wired.

**Tech Stack:** Python 3.12, uv 0.9.10, FastAPI, uvicorn, Typer, pydantic-settings, structlog, aiosqlite, claude-agent-sdk, pytest with pytest-asyncio, ruff, mypy strict, gitleaks, Docker 28.3.2 with Compose v2.39.1, GitHub Actions.

**Spec:** `/mnt/d/Projects/Personal/projects/friday/docs/superpowers/specs/2026-11-20-friday-design.md` (revision 8; layer L3 "Backend foundation", the "L3 and L4 specification", D19, D25 to D28, A25, A29). "Spec N" below means section N of it.

## Global Constraints

- Python `>=3.12,<3.13`; dependencies pinned in `uv.lock` (`uv sync --locked` everywhere after Task 1).
- The virtualenv lives on the Linux filesystem: every host command runs with `UV_PROJECT_ENVIRONMENT=$HOME/.cache/friday/venv` (the Makefile exports it; export it in your shell for the `uv run` commands below).
- Repo root: `/mnt/d/Projects/Personal/projects/friday`. Its own git repo, created by Milestone U L0.
- Dashboard backend: `127.0.0.1:8740` published from a container bound to `0.0.0.0:8740`. Companion page: `127.0.0.1:8741`, bound to 127.0.0.1 only. The preview service keeps `127.0.0.1:8742`. Never use 8000, 8001, 5432, 5433, 6379, 6380, 37700, 5173.
- Allowed `Host` for the backend: `127.0.0.1:8740`, `localhost:8740`. Allowed `Origin`: `http://127.0.0.1:8740` (plus `http://127.0.0.1:5740` only when `FRIDAY_DEV=true`). Companion: Host `127.0.0.1:8741`, Origin `http://127.0.0.1:8741`.
- Container paths: data `/data`, lean config `/data/claude`, SDK cwd `/data/sdk-cwd`, database `/data/db/friday.sqlite3` (file 0600, directory 0700), CLI socket `/run/friday/cli.sock`, companion socket `/run/friday-host/host.sock`, host key `/run/secrets/host_key`, vault `/vault` (ro), career `/career` (ro), models `/models`.
- Host paths: `~/.config/friday/` (0700; `host.secret` 0600, `secrets/host_key` 0600), `~/.local/state/friday/` (0700; `host.sock`, `host.sqlite3`). Spike scratch: `$HOME/.cache/friday/spikes/` (never in the repo).
- Cookies: `friday_session` (backend) and `friday_host_session` (companion), both `HttpOnly`, `SameSite=Strict`, `Path=/`, `Max-Age=43200`. Login tokens: 32 random bytes, 10 minutes, single use, stored as SHA-256 only.
- Every backend and companion response carries `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`. No CORS headers.
- `friday` container: non-root (owner uid and gid), read-only root filesystem, tmpfs `/tmp` and `/run/friday`, `cap_drop: [ALL]`, `no-new-privileges`, no Docker socket, no host network.
- No secret in the repo, an image layer, an image history line, a log line or a trace. Only `~/.claude/.credentials.json` is mounted from `~/.claude`, read-only, never read-write (D25, D27).
- Public repo (D8): fixtures, spike records, logs and screenshots are synthetic. Real spike output is reduced to field names and pass or fail before it enters the repo.
- No em dash or en dash characters in any doc, UI string or log message.
- `friday` never imports `friday_host`. `friday_host` may import only `friday.core.*`, `friday.log`, `friday.storage.db`, `friday.api.websec` and `friday.api.auth` (enforced by a test in Task 9).
- Files Milestone U owns (`README.md`, `LICENSE`, `.gitignore`, `.pre-commit-config.yaml`, `.github/workflows/ci.yml`, `compose.yaml`, `Makefile`, `Dockerfile`, `schema/`, `frontend/`) are modified only by adding backend parts; existing preview and frontend parts stay byte-identical, and `make preview` and `make check-frontend` must still pass after every task that touches them.
- Commits: one logical change each, imperative subject, no body unless the reason is non-obvious, never a `Co-Authored-By` or other attribution line, never on `main`. All work happens on branch `l3-backend-foundation`. Pushing and the GitHub remote are the owner's steps.
- Test placement: unit tests in `tests/unit`, socket and SQLite tests in `tests/integration`, companion tests in `tests/host`. During TDD run them on the host with `uv run pytest ...`. `make test` runs the backend suite inside the built `test` image and `tests/host` with uv, as CI does (spec 29, CI jobs). L3 has no browser tests.

## Preconditions

Milestone U layer L0 must have delivered, on `main` (L1 and L2 are not needed):

| File | Expected from L0 | What this plan adds |
|---|---|---|
| git repo, `main` branch | initialized at the repo root | branch `l3-backend-foundation` |
| `README.md`, `LICENSE` (MIT) | skeleton and license | backend sections (Task 17) |
| `.gitignore` | `docs/design-references/`, `secrets/`, `*.env`, data directories | Python entries (Task 1) |
| `.pre-commit-config.yaml` | gitleaks and the repo secret scan | ruff hooks (Task 1) |
| `.github/workflows/ci.yml` | frontend jobs, secret scan, image build | backend jobs (Task 16) |
| `Dockerfile` | `spa-build` and `preview` stages | `cli`, `base`, `runtime`, `test` stages (Task 15) |
| `compose.yaml` | `preview` service on `127.0.0.1:8742` | `friday` service, volumes, secret (Task 15) |
| `Makefile` | `preview`, `check-frontend`, a secret-scan target | backend targets (Tasks 1, 10, 15) |
| `schema/` | block and widget JSON Schema | nothing (server models come in L8) |

Check before Task 1: `git -C /mnt/d/Projects/Personal/projects/friday log --oneline -1 main` prints a commit, and `make preview` and `make check-frontend` pass. If any row is missing, stop and report which; do not create the missing preview parts here.

If the spikes (Part 1) run before Milestone U has created the repo, nothing changes: they run entirely from `$HOME/.cache/friday/spikes/`, write their records there, and Task 1 copies the synthetic records into the repo once it exists.

## Review Focus

1. **The credentials file is missing, unreadable, expired or not yet refreshed when Friday starts.** The server still starts, `/health` says `degraded`, `/api/health` says `sdk_login: "expired"` or `"unknown"`, and the startup query fails into a trace row, not a crash. Compose must not create a directory where the credentials file should be. Tests: Task 12 `test_probe_login_*`, Task 13 `test_app_starts_degraded_when_login_expired`, Task 15 step "missing credentials file".
2. **The companion socket is absent, is a directory Docker created, is stale after a companion restart, has loose permissions, the two key files differ, or the Docker Desktop VM clock drifts past 30 s.** The container reports `companion: "down"` with a logged reason and keeps serving; the companion refuses to listen on an unsafe path. Tests: Task 9 `test_refuses_*`, Task 11 `test_health_down_*`.
3. **A second migration run, a restart on an existing database, or a database file with loose modes.** Tests: Task 4 `test_migrations_twice_is_noop`, `test_reconnect_existing_db_keeps_rows`, `test_db_modes`.
4. **The companion started twice or port 8741 already in use.** The second instance exits with a clear message and never unlinks the live socket. Tests: Task 9 `test_second_instance_refuses_and_keeps_live_socket`, Task 10 `test_port_in_use_exits_2`.
5. **Exposure beyond loopback.** A compose port without `127.0.0.1:` (in either service), a foreign `Host`, or the companion off loopback. Tests: Task 15 `test_lint_*`, Task 6 `test_wrong_host_400`, Task 10 `test_companion_binds_loopback_only`.

## File structure

Created by this plan (files from the Preconditions table are modified, not listed again):

| Path | Responsibility |
|---|---|
| `pyproject.toml`, `uv.lock` | packages `friday` and `friday_host`, dependencies, ruff, mypy, pytest config, console scripts |
| `CLAUDE.md` | project commands for agents (created if absent, else extended) |
| `.dockerignore` | build context exclusions (created if absent, else extended) |
| `compose.dev.yaml` | dev overlay for the `friday` service with reload |
| `scripts/compose_lint.py` | fails on published ports without `127.0.0.1:` and unsafe `friday` service settings |
| `docs/adr/0001-runtime.md` ... `0018-containerization-and-host-companion.md` | ADRs from spec 30 |
| `docs/runbook.md` | login, spike results, operating notes (created if absent, else extended) |
| `src/friday/__init__.py`, `__main__.py` | `__version__`; Typer CLI `serve`, `login-url` |
| `src/friday/config.py`, `src/friday/log.py` | `Settings`; structlog JSON logging |
| `src/friday/core/clock.py`, `core/jsontypes.py`, `core/security/data_class.py` | shared helpers and types |
| `src/friday/core/security/paths.py` | private directory and socket path checks |
| `src/friday/core/security/web_auth.py` | `AuthStore`: login tokens, sessions, CSRF |
| `src/friday/core/security/channel.py` | companion wire format |
| `src/friday/core/tracing/spans.py` | `TraceRecorder` |
| `src/friday/core/runtime/login.py`, `core/runtime/claude_sdk.py` | CLI login probe; isolated SDK options and startup query |
| `src/friday/core/health.py` | `HealthService`, `HealthSnapshot` |
| `src/friday/storage/datapath.py`, `storage/db.py`, `storage/migrations/0001_init.sql` | `/data` check; SQLite, migrations, audit |
| `src/friday/adapters/host_client.py` | container side of the companion channel |
| `src/friday/api/websec.py`, `api/auth.py`, `api/static/login.*`, `api/routes_health.py`, `api/cli_socket.py`, `api/app.py` | web security, login, health routes, CLI socket, app factory |
| `src/friday_host/__init__.py`, `__main__.py`, `config.py`, `secrets.py`, `store.py`, `migrations/0001_init.sql`, `channel.py`, `ops/`, `confirm/` | the companion |
| `tests/unit`, `tests/integration`, `tests/host`, `tests/fixtures/cli/` | tests and synthetic CLI output samples |

## Part 1: Spikes that can run now, in parallel with Milestone U

These two spikes need only Docker and the Claude Code CLI. They touch neither the repo nor any preview file, commit nothing, and can run before, during or after Milestone U. Their records stay in `$HOME/.cache/friday/spikes/` until Task 1 copies the synthetic parts into the repo.

### Spike S1: A29, subscription credentials mounted read-only

**Question:** Does the Claude Code CLI inside a container accept the owner's `~/.claude/.credentials.json` mounted read-only into its own config directory, and does it keep working across a host-side token refresh for a full day without touching the host login? Can login expiry and plan reset time be read from the CLI? (spec A29, D25, D27.)

**Verified 2026-11-20:** the file is `~/.claude/.credentials.json`, mode 0600, on this host; Claude Code docs say that with `CLAUDE_CONFIG_DIR` set the CLI keeps `.credentials.json` and `.claude.json` under that directory; the native binary is published at `https://downloads.claude.ai/claude-code-releases/<version>/linux-x64/claude` and needs no Node; `claude auth status` takes `--text` or `--json`.

**Rules:** never print, copy or commit the file's contents or a token; never mount it read-write; never make a writable copy (a refresh from a copy can rotate the refresh token and break the host login).

- [ ] `mkdir -p $HOME/.cache/friday/spikes/a29` and write a scratch Dockerfile there: `FROM debian:bookworm-slim`, install `ca-certificates curl`, download the binary for version `2.1.329` to `/usr/local/bin/claude`, `chmod 0755`, `ENV CLAUDE_CONFIG_DIR=/data/claude HOME=/data/home DISABLE_AUTOUPDATER=1`. `docker build -t friday-spike-a29 $HOME/.cache/friday/spikes/a29`. Record the binary's `sha256sum` in `$HOME/.cache/friday/spikes/a29/record.md` (Task 15 needs it).
- [ ] Long-lived container that mimics the compose service: `docker volume create friday-spike-data && docker run -d --name a29 --user $(id -u):$(id -g) --read-only --tmpfs /tmp -v friday-spike-data:/data -v $HOME/.claude/.credentials.json:/data/claude/.credentials.json:ro friday-spike-a29 sleep infinity`. If `/data/claude` or `/data/home` is root-owned, fix once with `docker exec -u 0 a29 sh -c 'mkdir -p /data/home && chown $(id -u):$(id -g) /data /data/claude /data/home'` (substitute the numbers) and record that the image must pre-create both.
- [ ] Acceptance in the container: `docker exec a29 claude auth status --text` and `docker exec a29 claude -p "Reply with OK" --max-turns 1`. Pass: status reports logged in, reply contains `OK`. Record exit codes and whether stderr mentions `EROFS`, `read-only` or `EACCES`.
- [ ] Synthetic CLI samples: copy the real `--text` output with every email, org name, id and date replaced by placeholders into `$HOME/.cache/friday/spikes/a29/auth_status_ok.txt`; the same for an expired output if one is seen, else `docker run --rm friday-spike-a29 claude auth status --text` (no credentials) as `auth_status_logged_out.txt`. Record whether any line shows an expiry time or a plan reset time (field names only).
- [ ] Key names without values: `jq '[paths(scalars)|map(tostring)|join(".")]' ~/.claude/.credentials.json`. Record names only.
- [ ] Day-long loop `$HOME/.cache/friday/spikes/a29/loop.sh`, every 30 minutes for 24 hours under `nohup`: timestamp, host `claude auth status --text` exit code, `docker exec a29 claude -p "Reply with OK" --max-turns 1` exit code, and two booleans: host file hash changed since the last iteration; in-container hash equals host hash (hashes only in the scratch log).
- [ ] **Pass (all):** every in-container call succeeds for 24 hours; at least one host refresh happened and afterwards the in-container hash matched and calls succeeded; the host `claude auth status` stayed OK and the owner's own sessions kept working; no write attempt in stderr. **Fail:** any of these breaks, in particular the container not seeing the refreshed file (a single-file bind keeps the old inode when the host replaces the file by rename) or the host login breaking after an in-container refresh.
- [ ] Finish `record.md`: date, CLI version, binary hash, pass or fail per criterion, whether refresh needs write access, expiry and plan reset readability, key names only. Clean up: `docker rm -f a29 && docker volume rm friday-spike-data`.

**Effect on Part 2.** Tasks 2 to 11 do not depend on S1; Tasks 12, 13 and 15 wait for it.
- Pass: Task 15 mounts the file read-only at `/data/claude/.credentials.json`; Tasks 12 and 13 run the probe and the startup query in the container.
- Fail: D27. Task 15 omits the credentials mount; Task 12's `probe_login` and `run_startup_check` move to `src/friday_host/ops/sdk.py` with the same signatures and tests and run in the companion with the host login; the companion `health` result (Task 9) gains `sdk_login`, `sdk_login_checked_at`, `login_expires_at`; Task 13's `HealthService` reads them from `HostClient.call("health")`. If the failure is the "refresh invisible" case, confirm the D27 reading with the owner first (Q2).
- Expiry or plan reset readable: Task 12 adds the parser rule for that line; not readable: `login_expires_at` stays `null` and the runbook says so.

### Spike S2: A25, companion socket into the container

**Question:** Does a Unix socket created in the WSL distro work from inside a Docker Desktop container when bind-mounted, including after the companion restarts; can the container reach host loopback services; how far apart are the clocks; which filesystem types does the container see for a named volume and for bind mounts? (spec A25, ADR-18.)

- [ ] `mkdir -p $HOME/.cache/friday/spikes/a25 && mkdir -p -m 0700 $HOME/.local/state/friday/spike`; write a stdlib echo server `$HOME/.cache/friday/spikes/a25/echo.py` (asyncio `start_unix_server` on `argv[1]`, `chmod 0600` after bind, echoes one line and closes).
- [ ] File mount: start the server on `$HOME/.local/state/friday/spike/host.sock`; run a long-lived `python:3.12-slim-bookworm` container with `--user $(id -u):$(id -g) -v $HOME/.local/state/friday/spike/host.sock:/run/friday-host/host.sock`; connect from it and send `ping`. Pass: `ping` returns. Record `stat -c '%u %a %F'` inside.
- [ ] Restart, file mount: stop the server, delete the socket, start again (new inode), connect from the same running container. Record pass or fail.
- [ ] Directory mount: repeat both with `-v $HOME/.local/state/friday/spike:/run/friday-host`.
- [ ] Missing source: with no socket present, `docker run --rm -v $HOME/.local/state/friday/spike/absent.sock:/x python:3.12-slim-bookworm true`, then `ls -la` the host path. Record whether Docker created a directory there.
- [ ] Loopback: from the container, TCP connects to `127.0.0.1:37700` and `host.docker.internal:37700`, 3 s timeout. Design expectation: both fail. Record.
- [ ] Clock: host `date +%s.%N` and `docker run --rm python:3.12-slim-bookworm date +%s.%N` back to back, five times. Pass: difference under 5 s. Record the largest.
- [ ] Filesystem types: in one container with `-v friday-spike-data2:/data -v $HOME/.cache/friday/spikes:/bindwsl -v /mnt/d/Projects/Personal/projects/friday/docs:/bindd`, run `grep -E ' /(data|bindwsl|bindd) ' /proc/self/mountinfo`. Record the fstype after ` - ` for each.
- [ ] **Pass:** echo works through a mount that survives a companion restart, both loopback connects fail, clock difference under 5 s. **Fail:** no mount works, or only works until a restart with no working variant.
- [ ] Write `$HOME/.cache/friday/spikes/a25/record.md` with every result (no other paths or hostnames). Clean up containers, the spike volume and the spike directory.

**Effect on Part 2.**
- File mount survives a restart: Tasks 9 and 15 as written.
- Only the directory mount survives: Task 9 puts the socket in a dedicated directory `~/.local/state/friday/channel/` (0700, only `host.sock`), `HostPaths.socket` changes, Task 15 mounts that directory at `/run/friday-host`; `FRIDAY_HOST_SOCKET` keeps its default. Confirm with the owner first (Q3).
- No mount works: stop before Task 9; the design's fallbacks (TCP over `host.docker.internal` with the same HMAC and a pinned TLS certificate, then Docker Engine in the distro) need an owner choice. Task 8 stays; Tasks 9, 11 and 15 change.
- Clock difference over 5 s: raise it with the owner before Task 11; the 30 s window stays.
- Fstypes: Task 3's `ALLOWED_FSTYPES` must contain the named volume's fstype and none of the bind fstypes seen.

## Part 2: Backend foundation

### Task 1: Python tooling in the existing repository, spike records

**Files:** create `pyproject.toml`, `uv.lock`, `src/friday/__init__.py`, `src/friday_host/__init__.py`, `tests/unit/test_version.py`, `tests/fixtures/cli/*.txt` (from S1), `docs/runbook.md` and `CLAUDE.md` if absent; modify `.gitignore`, `.pre-commit-config.yaml`, `Makefile`, `docs/runbook.md` and `CLAUDE.md` if present.

**Interfaces:** produces `friday.__version__` and `friday_host.__version__` (both `"0.1.0"`, via `importlib.metadata.version("friday")`). Console scripts `friday = "friday.__main__:app"` and `friday-host = "friday_host.__main__:app"` are added in Tasks 13 and 10, when their modules exist.

- [ ] Check the Preconditions, then `cd /mnt/d/Projects/Personal/projects/friday && git checkout main && git checkout -b l3-backend-foundation`. Expected: `Switched to a new branch 'l3-backend-foundation'`.
- [ ] Write `tests/unit/test_version.py::test_versions_match_project` asserting `friday.__version__ == friday_host.__version__ == "0.1.0"`.
- [ ] Write `pyproject.toml`: project `friday` version `0.1.0`, `requires-python = ">=3.12,<3.13"`, license MIT, hatchling with `[tool.hatch.build.targets.wheel] packages = ["src/friday", "src/friday_host"]`; ruff (`line-length = 100`, `target-version = "py312"`, select `E,F,I,B,UP,S,ASYNC`, ignore `S101` under `tests/`, `extend-exclude = ["frontend"]`); mypy `strict = true`, `files = ["src", "tests"]`; pytest `asyncio_mode = "auto"`, `testpaths = ["tests"]`.
- [ ] `uv add fastapi uvicorn typer pydantic-settings structlog aiosqlite claude-agent-sdk` and `uv add --dev pytest pytest-asyncio httpx mypy ruff`. Expected: `uv.lock` created; `uv sync --locked` exits 0.
- [ ] `uv run pytest tests/unit/test_version.py -q` fails; create both `__init__.py` files; re-run: `1 passed`.
- [ ] `.gitignore`: append `.venv/`, `__pycache__/`, `.mypy_cache/`, `.ruff_cache/`, `.pytest_cache/` (leave existing lines). `.pre-commit-config.yaml`: append the `ruff-pre-commit` repo with hooks `ruff` and `ruff-format`; leave the gitleaks entry. `pre-commit run --all-files` passes.
- [ ] `Makefile`: add `export UV_PROJECT_ENVIRONMENT ?= $(HOME)/.cache/friday/venv` and targets `lint` (`uv run ruff check . && uv run ruff format --check .`), `types` (`uv run mypy`), `unit` (`uv run pytest tests/unit -q`). `make lint types unit preview check-frontend` passes.
- [ ] Runbook: ensure headings `Pinned versions`, `Login`, `Spike A29 results`, `Spike A25 results`, `Deferrals`. Copy `$HOME/.cache/friday/spikes/a29/record.md` and `a25/record.md` into the two spike sections (they are already synthetic; reread them for any real id, email, hostname or hash and remove it), and the S1 sample files into `tests/fixtures/cli/`. If the spikes have not run yet, leave the sections with "pending" and copy them in a later `Record ... spike results` commit before Task 9. Record the resolved `claude-agent-sdk` version under "Pinned versions".
- [ ] `CLAUDE.md`: add a "Backend" section with `make check`, `make test`, the `UV_PROJECT_ENVIRONMENT` rule, the branch rule, synthetic fixtures, no em or en dashes.
- [ ] Commits: `git commit -m "Add Python tooling for the backend"` (pyproject, lock, packages, test, gitignore, pre-commit, Makefile, CLAUDE.md), then `git commit -m "Record A29 and A25 spike results"` (runbook, fixtures).

### Task 2: Settings, logging and shared types

**Files:** create `src/friday/config.py`, `src/friday/log.py`, `src/friday/core/__init__.py`, `src/friday/core/clock.py`, `src/friday/core/jsontypes.py`, `src/friday/core/security/__init__.py`, `src/friday/core/security/data_class.py`; tests `tests/unit/test_config.py`, `tests/unit/test_log.py`.

**Interfaces (produces):**
- `class Settings(BaseSettings)`, `model_config = SettingsConfigDict(env_prefix="FRIDAY_", frozen=True)`, fields: `dev: bool = False`, `bind: str = "0.0.0.0"`, `port: int = 8740`, `data_dir: Path = Path("/data")`, `claude_config_dir: Path = Path("/data/claude")`, `sdk_cwd: Path = Path("/data/sdk-cwd")`, `host_socket: Path = Path("/run/friday-host/host.sock")`, `cli_socket: Path = Path("/run/friday/cli.sock")`, `vault_dir: Path = Path("/vault")`, `career_dir: Path = Path("/career")`, `model_main: str = "sonnet"`, `model_summary: str = "haiku"`, `request_timeout_s: int = 120`, `summary_timeout_s: int = 30`, `retention_interval_s: int = 3600`, `work_sources: bool = True`, `messaging_enabled: bool = False`, `log_level: Literal["debug", "info", "warning", "error"] = "info"`, `host_key_file: Path = Path("/run/secrets/host_key")`; property `db_path -> Path` = `data_dir / "db" / "friday.sqlite3"`.
- `configure_logging(level: str) -> None`; `get_logger(name: str) -> structlog.stdlib.BoundLogger`.
- `utcnow() -> datetime` (aware UTC); `to_iso(dt: datetime | None) -> str | None` (`2026-11-20T08:00:00.000Z`).
- `type JsonValue = str | int | float | bool | None | list[JsonValue] | dict[str, JsonValue]`; `DataClass = Literal["work", "personal"]`.

- [ ] Tests: `test_defaults_match_spec` (every default above), `test_env_override` (`FRIDAY_PORT=9999`), `test_bad_log_level_rejected` (`FRIDAY_LOG_LEVEL=loud` raises `ValidationError`), `test_db_path`, `test_json_line_for_app_and_stdlib` (a structlog call and a stdlib `logging.getLogger("uvicorn.error")` call each print one JSON line with `event`, `level`, `timestamp`), `test_iso_format`.
- [ ] `uv run pytest tests/unit/test_config.py tests/unit/test_log.py -q`: fails on import.
- [ ] Implement. `log.py` uses the structlog ProcessorFormatter pattern (verified in structlog docs): shared `add_log_level`, `TimeStamper(fmt="iso")`; `structlog.configure(... wrap_for_formatter ...)`; one stdout handler with `ProcessorFormatter(foreign_pre_chain=shared, processors=[remove_processors_meta, JSONRenderer()])` on the root logger; `uvicorn.access` at WARNING.
- [ ] Re-run: all pass; `make lint types` passes. Commit: `git commit -m "Add settings, JSON logging and shared types"`.

### Task 3: Data-path check

**Files:** create `src/friday/storage/__init__.py`, `src/friday/storage/datapath.py`; test `tests/unit/test_datapath.py`.

**Interfaces:** `class DataDirError(RuntimeError)`; `@dataclass(frozen=True) class MountEntry: mount_point: str; fstype: str; source: str`; `parse_mountinfo(text: str) -> list[MountEntry]`; `ALLOWED_FSTYPES: frozenset[str] = frozenset({"ext4", "xfs", "btrfs"})` (adjusted by the S2 record); `check_data_dir(data_dir: Path, mountinfo_text: str) -> MountEntry`.

- [ ] Tests with synthetic lines (`36 35 98:0 / /data rw,noatime master:1 - ext4 /dev/sdb rw`): `test_named_volume_ext4_accepted`, `test_not_a_mount_point_refused`, `test_drvfs_refused`, `test_9p_refused`, `test_unknown_fstype_refused` (`fakeowner`, `virtiofs`, `tmpfs`), `test_last_mount_wins`, `test_octal_escape_in_path` (`/da\040ta`). Every refusal raises `DataDirError` naming the path and fstype.
- [ ] Run: fails on import. Implement: split at `" - "`, field 5 on the left is the mount point (decode `\NNN`), first field on the right is the fstype, the last entry for `str(data_dir)` wins, refuse when absent or not allowlisted. Re-run: all pass.
- [ ] Commit: `git commit -m "Add data directory mount check"`.

### Task 4: SQLite, migrations and the audit log

**Files:** create `src/friday/storage/db.py`, `src/friday/storage/migrations/__init__.py`, `src/friday/storage/migrations/0001_init.sql`; test `tests/integration/test_db.py`.

**Interfaces (produces):**
- `PRAGMAS = ("PRAGMA journal_mode=WAL", "PRAGMA busy_timeout=5000", "PRAGMA foreign_keys=ON", "PRAGMA synchronous=NORMAL")`.
- `async def connect(db_path: Path) -> aiosqlite.Connection`: parent directory 0700 (chmod if looser), file 0600 (chmod if looser), pragmas, `row_factory = aiosqlite.Row`.
- `async def apply_migrations(conn: aiosqlite.Connection, package: str) -> list[int]`: creates `schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)` if missing, applies each `NNNN_*.sql` of `package` (via `importlib.resources`) above the highest recorded version inside one `BEGIN; ...; INSERT INTO schema_migrations ...; COMMIT;` script, returns the versions applied.
- `async def append_audit(conn, *, actor: str, action: str, target: str | None = None, args_sha256: str | None = None, data_class: DataClass | None = None) -> int`.
- `async def db_ok(conn) -> bool` (`SELECT 1`; False on `aiosqlite.Error`).

- [ ] Tests (path `tmp_path / "db" / "friday.sqlite3"`): `test_migrations_apply_once` (returns `[1]`; tables `login_tokens`, `web_sessions`, `audit_log`, `traces`, `spans`, `payloads` exist), `test_migrations_twice_is_noop` (returns `[]`), `test_reconnect_existing_db_keeps_rows`, `test_pragmas` (`wal`, `1`, `5000`), `test_db_modes` (pre-created 0755 and 0644 become 0700 and 0600), `test_audit_update_rejected`, `test_audit_delete_rejected` (each raises with `append-only` in the message), `test_append_audit_returns_id`.
- [ ] Run: fails on import. Write `0001_init.sql` exactly as below and implement `db.py`.

```sql
CREATE TABLE login_tokens (token_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT);
CREATE TABLE web_sessions (id_hash TEXT PRIMARY KEY, csrf_token_hash TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT, args_sha256 TEXT, data_class TEXT CHECK (data_class IN ('work', 'personal')));
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TABLE traces (trace_id TEXT PRIMARY KEY, conversation_id TEXT, started_at TEXT NOT NULL, ended_at TEXT, status TEXT, outcome TEXT, data_class TEXT NOT NULL CHECK (data_class IN ('work', 'personal')), model TEXT, input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER, cache_write_tokens INTEGER, cost_usd REAL, ttft_ms INTEGER, total_ms INTEGER);
CREATE TABLE spans (span_id TEXT PRIMARY KEY, trace_id TEXT NOT NULL REFERENCES traces(trace_id), parent_span_id TEXT REFERENCES spans(span_id), name TEXT NOT NULL, kind TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, status TEXT, attributes_json TEXT NOT NULL DEFAULT '{}', payload_ref TEXT, data_class TEXT NOT NULL CHECK (data_class IN ('work', 'personal')));
CREATE INDEX spans_by_trace ON spans(trace_id);
CREATE TABLE payloads (payload_ref TEXT PRIMARY KEY, trace_id TEXT NOT NULL REFERENCES traces(trace_id), data_class TEXT NOT NULL CHECK (data_class IN ('work', 'personal')), created_at TEXT NOT NULL, body TEXT);
```

- [ ] Re-run: all pass. Commit: `git commit -m "Add SQLite connection, migrations and append-only audit log"`.

### Task 5: Trace recorder

**Files:** create `src/friday/core/tracing/__init__.py`, `src/friday/core/tracing/spans.py`; test `tests/integration/test_spans.py`.

**Interfaces:** consumes Tasks 2 and 4. Produces `SpanKind = Literal["request", "decision", "model_turn", "tool_call", "retrieval", "subagent", "approval", "external_call", "summary", "handoff", "claude_run", "hook_event", "permission_decision"]`; `Status = Literal["ok", "error", "timeout"]`; `@dataclass(frozen=True) class Usage: input_tokens: int = 0; output_tokens: int = 0; cache_read_tokens: int = 0; cache_write_tokens: int = 0`; `class TraceRecorder` with `__init__(self, conn)`, `async start_trace(self, *, data_class: DataClass = "personal", conversation_id: str | None = None) -> str` (uuid4 hex), `async add_span(self, trace_id: str, *, name: str, kind: SpanKind, started_at: datetime, ended_at: datetime, status: Status, attributes: dict[str, JsonValue] | None = None, parent_span_id: str | None = None, data_class: DataClass = "personal") -> str`, `async finish_trace(self, trace_id: str, *, status: Status, model: str | None = None, usage: Usage | None = None, cost_usd: float | None = None, total_ms: int | None = None) -> None`.

- [ ] Tests: `test_trace_roundtrip` (one `external_call` span, `Usage(3, 1, 0, 0)`, `total_ms=12`, row values match, `ended_at` set), `test_span_unknown_trace_rejected`, `test_attributes_stored_as_json`, `test_invalid_kind_rejected` (`ValueError` before SQL).
- [ ] Run: fails. Implement with parameterized SQL, commit per write. Re-run: all pass. Commit: `git commit -m "Add trace recorder for traces and spans"`.

### Task 6: Web security middleware

**Files:** create `src/friday/api/__init__.py`, `src/friday/api/websec.py`; test `tests/unit/test_websec.py`.

**Interfaces:** `CSP = "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"`; `@dataclass(frozen=True) class WebPolicy: allowed_hosts: frozenset[str]; allowed_origins: frozenset[str]`; `dashboard_policy(settings: Settings) -> WebPolicy` (hosts `127.0.0.1:{port}`, `localhost:{port}`; origin `http://127.0.0.1:{port}`, plus `http://127.0.0.1:5740` when `dev`); `companion_policy() -> WebPolicy` (host `127.0.0.1:8741`, origin `http://127.0.0.1:8741`); `class WebSecurityMiddleware` (pure ASGI) `__init__(self, app: ASGIApp, policy: WebPolicy)`.

Rules: `http` and `websocket` scopes with a `Host` outside `allowed_hosts` get 400 `{"error": "bad_host"}` (websocket: close 1008). POST, PUT, PATCH, DELETE and websocket upgrades with `Origin` missing or not allowed get 403 `{"error": "bad_origin"}`; with `Sec-Fetch-Site` missing or not `same-origin` get 403 `{"error": "bad_fetch_site"}`. Every HTTP response gets `Content-Security-Policy`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`.

- [ ] Tests on a tiny app with `GET /x` and `POST /x`, `TestClient(app, base_url="http://127.0.0.1:8740")`: `test_wrong_host_400` (`evil.example:8740`, `192.168.1.5:8740`), `test_localhost_host_allowed`, `test_post_foreign_origin_403`, `test_post_missing_origin_403`, `test_post_cross_site_403`, `test_post_missing_fetch_site_403`, `test_post_same_origin_ok`, `test_dev_origin_only_in_dev`, `test_security_headers_on_every_response` (including 400 and 403), `test_no_cors_headers`, `test_websocket_foreign_origin_closed`, `test_companion_policy_refuses_localhost_host`, `test_preview_origin_8742_refused`.
- [ ] Run: fails. Implement. Re-run: all pass. Commit: `git commit -m "Add Host, Origin and fetch-site checks with security headers"`.

### Task 7: Login flow and CSRF

**Files:** create `src/friday/core/security/web_auth.py`, `src/friday/api/auth.py`, `src/friday/api/static/login.html`, `src/friday/api/static/login.js`; tests `tests/integration/test_web_auth.py`, `tests/integration/test_auth_routes.py`.

**Interfaces:** consumes Tasks 2, 4, 6. Produces `LOGIN_TOKEN_TTL = timedelta(minutes=10)`, `SESSION_TTL = timedelta(hours=12)`, `CSRF_HEADER = "X-CSRF-Token"`; `@dataclass(frozen=True) class WebSession: id_hash: str; expires_at: datetime`; `class AuthStore` with `__init__(self, conn, *, clock: Callable[[], datetime] = utcnow)`, `async issue_login_token(self) -> str`, `async redeem_login_token(self, token: str) -> tuple[str, str] | None` (session token, CSRF token), `async get_session(self, session_token: str) -> WebSession | None`, `csrf_for(self, session_token: str) -> str`, `async check_csrf(self, session_token: str, csrf_token: str) -> bool`; `build_auth_router(*, cookie_name: str, static_dir: Path, audit_target: str) -> APIRouter` reading `request.app.state.auth_store`, `request.app.state.db`, `request.app.state.cookie_name`; dependencies `require_session(request) -> WebSession` (401 `{"error": "no_session"}`) and `require_csrf(request) -> WebSession` (also 403 `{"error": "bad_csrf"}`).

Behaviour: tokens `secrets.token_urlsafe(32)`, stored as SHA-256 hex. `issue_login_token` sets `expires_at = now` on every unused token, then inserts. `redeem_login_token` uses one `UPDATE login_tokens SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at > ?` and proceeds only on one changed row; the session token is a fresh 32-byte token; `id_hash` and `csrf_token_hash` are stored. CSRF token = `HMAC-SHA256(key=session_token, msg=b"friday-csrf")` hex, so `GET /api/csrf` can return it while only its hash is stored. Routes: `GET /login`, `GET /login.js`, `POST /api/login` (`{"token": str}`; 200 `{"csrf_token": ...}` plus cookie, or 401 `{"error": "invalid_token"}`; success writes `append_audit(actor="owner", action="login", target=audit_target)`), `GET /api/csrf` (200 or 401). Never log a token.

`login.js` (no inline script): read `t` from `location.hash`, `history.replaceState(null, "", "/login")`, `fetch("/api/login", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({token}), credentials: "same-origin"})`; on 200 keep the CSRF token in a variable, `fetch("/api/health")`, show the JSON in a `<pre>` via `textContent`; on failure show "This login link is invalid or expired. Run make login for a new one." Title "Friday login".

- [ ] `test_web_auth.py`: `test_token_single_use`, `test_token_expires_after_10_minutes`, `test_new_token_invalidates_unused`, `test_only_hash_stored`, `test_session_expires_after_12_hours`, `test_session_survives_reconnect`, `test_csrf_stable_and_checked`.
- [ ] `test_auth_routes.py` (app with middleware, router and a test-only `POST /test/state` behind `require_csrf`; POSTs send `Origin: http://127.0.0.1:8740` and `Sec-Fetch-Site: same-origin` unless stated): `test_login_sets_cookie_and_returns_csrf` (attributes per Global Constraints), `test_reused_login_token_401`, `test_login_audited`, `test_post_without_csrf_403`, `test_post_with_wrong_csrf_403`, `test_post_with_csrf_ok`, `test_csrf_after_reload`, `test_csrf_without_cookie_401`, `test_login_page_has_csp_and_no_inline_script`, `test_token_never_logged`.
- [ ] Run: fails. Implement. Re-run: all pass. Commit: `git commit -m "Add one-time token login, session cookie and CSRF checks"`.

### Task 8: Companion channel wire format

**Files:** create `src/friday/core/security/channel.py`; test `tests/unit/test_channel.py`.

**Interfaces:** `PROTOCOL_VERSION = 1`, `MAX_SKEW_S = 30`, `MAX_LINE_BYTES = 65536`; `class ChannelError(Exception)` with `code: Literal["bad_request", "bad_mac", "stale", "replay", "unknown_op", "too_large", "bad_key"]`; `@dataclass(frozen=True) class ChannelRequest: op: str; args: dict[str, JsonValue]; nonce: str; ts: int`; `@dataclass(frozen=True) class ChannelResponse: ok: bool; result: dict[str, JsonValue] | None; error: str | None`; `canonical_args(args) -> bytes` (`json.dumps(args, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()`); `mac_input(op, args, nonce, ts) -> bytes` (`b"\n".join([op.encode(), canonical_args(args), nonce.encode(), str(ts).encode()])`); `sign_request(key: bytes, op: str, args, *, now: int, nonce: str | None = None) -> bytes` (one JSON line with `v`, `op`, `args`, `nonce`, `ts`, `mac`; nonce default `secrets.token_hex(16)`); `parse_and_verify(line: bytes, key: bytes, *, now: int) -> ChannelRequest` (length, JSON, `v == 1`, nonce `^[0-9a-f]{32}$`, `abs(now - ts) <= 30`, `hmac.compare_digest`; replay is the caller's job); `encode_response(response) -> bytes`; `decode_response(line) -> ChannelResponse`; `load_key(path: Path) -> bytes` (64 hex characters, else `ChannelError("bad_key")`).

- [ ] Tests: `test_roundtrip`, `test_bad_mac_refused`, `test_args_tamper_refused`, `test_stale_31s_refused`, `test_future_31s_refused`, `test_30s_accepted`, `test_too_large_refused`, `test_bad_nonce_format_refused`, `test_canonical_order_independent`, `test_load_key_rejects_short_and_non_hex`.
- [ ] Run: fails. Implement. Re-run: all pass. Commit: `git commit -m "Add HMAC wire format for the companion channel"`.

### Task 9: Companion core: secrets, store, channel server, health and version

Needs the S2 record. **Files:** create `src/friday/core/security/paths.py`, `src/friday_host/config.py`, `src/friday_host/secrets.py`, `src/friday_host/store.py`, `src/friday_host/migrations/__init__.py`, `src/friday_host/migrations/0001_init.sql`, `src/friday_host/channel.py`, `src/friday_host/ops/__init__.py`, `src/friday_host/ops/system.py`; tests `tests/host/test_paths.py`, `tests/host/test_secrets.py`, `tests/host/test_channel_server.py`, `tests/unit/test_import_rules.py`.

**Interfaces:** consumes Tasks 4 and 8. Produces:
- `friday.core.security.paths`: `UnsafePathError(RuntimeError)`, `AlreadyRunningError(RuntimeError)`, `check_private_dir(path: Path) -> None` (refuses missing, symlink, non-directory, owner other than `os.getuid()`, any group or other bit), `async def prepare_socket_path(path: Path) -> None` (live socket raises `AlreadyRunningError`; refusing socket is unlinked; anything else raises `UnsafePathError` naming the path).
- `@dataclass(frozen=True) class HostPaths: config_dir: Path; state_dir: Path` with `host_secret`, `compose_secret` (`config_dir/"secrets"/"host_key"`), `socket` (`state_dir/"host.sock"`, or the S2 variant), `db` (`state_dir/"host.sqlite3"`); `HostPaths.from_env()` reading `FRIDAY_HOST_CONFIG_DIR`, `FRIDAY_HOST_STATE_DIR`, defaults `~/.config/friday`, `~/.local/state/friday`.
- `ensure_host_key(paths) -> bytes`: directories 0700; neither file: write the same `secrets.token_hex(32)` to both, 0600; one missing: copy the other; both differ: `UnsafePathError("host.secret and secrets/host_key differ")`; refuses a mode other than 0600.
- `class HostStore`: `async open(cls, path: Path) -> HostStore` (connect, `apply_migrations(conn, "friday_host.migrations")`), `conn`, `async remember_nonce(self, nonce: str, ts: int) -> bool` (False if seen; deletes rows older than 120 s).
- `OpHandler = Callable[[dict[str, JsonValue]], Awaitable[dict[str, JsonValue]]]`; `OPS = {"health": health, "version": version}`; `health` returns `{"status": "ok", "version": friday_host.__version__, "protocol": 1, "claude_cli_version": str | None}` (from `claude --version`, 5 s timeout, computed once); `version` returns `{"version": ..., "protocol": 1}`; non-empty args raise `ChannelError("bad_request")`.
- `async def serve_channel(paths, key: bytes, store: HostStore, ops) -> asyncio.Server`: `check_private_dir(paths.state_dir)`, `prepare_socket_path(paths.socket)`, `start_unix_server`, chmod 0600; one request per connection: read one line, verify, `remember_nonce` (False gives `replay`), dispatch (`unknown_op`), one response, close; refusals logged with their code, never the line.
- Companion `0001_init.sql`: `login_tokens` and `web_sessions` as in Task 4, `seen_nonces (nonce TEXT PRIMARY KEY, ts INTEGER NOT NULL)`, `audit_log` with the same two triggers.

- [ ] `test_paths.py`: `test_refuses_group_readable_dir`, `test_refuses_symlinked_dir`, `test_refuses_missing_dir`, `test_stale_socket_unlinked`, `test_refuses_directory_at_socket_path`, `test_second_instance_refuses_and_keeps_live_socket`.
- [ ] `test_secrets.py`: `test_creates_both_files_0600_same_key`, `test_copies_missing_twin`, `test_refuses_differing_files`, `test_refuses_loose_mode`.
- [ ] `test_channel_server.py`: `test_health_ok`, `test_version_ok`, `test_bad_mac_refused`, `test_reused_nonce_refused`, `test_stale_ts_refused`, `test_unknown_op_refused`, `test_socket_mode_0600`, `test_refusal_not_logging_line`.
- [ ] `test_import_rules.py`: `test_friday_never_imports_friday_host`, `test_friday_host_imports_only_allowed_friday_modules` (AST walk; allowed: `friday.core`, `friday.log`, `friday.storage.db`, `friday.api.websec`, `friday.api.auth`; a bare `import friday` is refused).
- [ ] Run `uv run pytest tests/host tests/unit/test_import_rules.py -q`: fails. Implement. Re-run: all pass.
- [ ] Commit: `git commit -m "Add companion channel server with health and version operations"`.

### Task 10: Companion confirm page and CLI

**Files:** create `src/friday_host/__main__.py`, `src/friday_host/confirm/__init__.py`, `confirm/app.py`, `confirm/static/login.html`, `confirm/static/login.js`, `confirm/static/index.html`; modify `pyproject.toml` (`friday-host = "friday_host.__main__:app"`), `Makefile` (target `host`); tests `tests/host/test_confirm_app.py`, `tests/host/test_cli.py`.

**Interfaces:** consumes Tasks 6, 7, 9. Produces `COMPANION_HOST = "127.0.0.1"`, `COMPANION_PORT = 8741`, `PortInUseError(RuntimeError)`; `create_confirm_app(store: HostStore) -> FastAPI` (sets `app.state.db = store.conn`, `app.state.auth_store = AuthStore(store.conn)`, `app.state.cookie_name = "friday_host_session"`; `companion_policy()` middleware; `build_auth_router(cookie_name="friday_host_session", static_dir=<confirm/static>, audit_target="companion")`; `GET /` behind `require_session` serving "Friday host companion. No host actions are waiting."); `async def run_companion(paths: HostPaths, *, port: int = COMPANION_PORT) -> None` (`os.umask(0o077)`, `ensure_host_key`, `HostStore.open`, bind probe on `(COMPANION_HOST, port)` raising `PortInUseError`, `serve_channel`, then `uvicorn.Server(uvicorn.Config(app, host=COMPANION_HOST, port=port, log_config=None)).serve()` in the same loop); Typer `friday-host serve` (`configure_logging("info")`; `PortInUseError` prints `Port 8741 is already in use. Is another friday-host running?` and exits 2; `AlreadyRunningError` exits 2 with `friday-host is already running.`; `UnsafePathError` exits 2 with its message) and `friday-host login-url` (prints only `http://127.0.0.1:8741/login#t=<token>`). The companion `login.js` redirects to `/` after login.

- [ ] `test_confirm_app.py`: `test_login_then_index`, `test_index_without_session_401`, `test_origin_8740_refused_on_companion_login`, `test_companion_binds_loopback_only` (capture `uvicorn.Config` arguments; `host == "127.0.0.1"`), `test_frame_ancestors_none`.
- [ ] `test_cli.py`: `test_port_in_use_exits_2` (hold an ephemeral 127.0.0.1 port; `run_companion(paths, port=held)` raises `PortInUseError`; `serve` with `run_companion` patched to raise it exits 2 with the message), `test_login_url_prints_only_url` (matches `^http://127\.0\.0\.1:8741/login#t=[A-Za-z0-9_-]{43}\n$`).
- [ ] Run `uv run pytest tests/host -q`: new tests fail. Implement. Re-run: all pass.
- [ ] Makefile: `host:` runs `uv run friday-host serve`. Manual: `make host`, then `uv run friday-host login-url`, open the URL, see the index text; a second `make host` exits 2 with "already running".
- [ ] Commit: `git commit -m "Add companion confirm page with its own login and CLI"`.

### Task 11: Container host client

**Files:** create `src/friday/adapters/__init__.py`, `src/friday/adapters/host_client.py`; test `tests/integration/test_host_client.py`.

**Interfaces:** consumes Task 8; tests use Task 9. Produces `CompanionStatus = Literal["ok", "down"]`; `HostUnavailable(Exception)` with `reason: Literal["no_key", "no_socket", "not_socket", "refused", "timeout", "auth", "protocol"]`; `class HostClient` with `__init__(self, socket_path: Path, key: bytes | None, *, timeout_s: float = 3.0, clock: Callable[[], float] = time.time)`, `from_settings(cls, settings) -> HostClient` (missing or invalid key gives `key=None`, warned once), `async call(self, op, args=None) -> dict[str, JsonValue]`, `async health(self) -> CompanionStatus` (logs the reason at warning, returns `"down"`; `"ok"` only if `result["status"] == "ok"`). Mapping: `no_key`; missing path `no_socket`; not a socket `not_socket`; `ConnectionRefusedError` `refused`; no reply in `timeout_s` `timeout`; `bad_mac`, `stale`, `replay` replies `auth`; unparsable `protocol`.

- [ ] Tests: `test_health_ok_against_real_server`, `test_health_down_no_socket`, `test_health_down_directory_at_socket_path`, `test_health_down_stale_socket`, `test_health_down_key_mismatch`, `test_health_down_clock_skew` (`clock=lambda: time.time() + 40`; reason `auth`), `test_health_down_no_key`, `test_health_down_slow_server` (reason `timeout` within 3.5 s).
- [ ] Run: fails. Implement. Re-run: all pass. Commit: `git commit -m "Add container client for the companion channel"`.

### Task 12: Login probe and SDK startup check

Needs the S1 record. Written for the pass case; on fail the two functions move to the companion as S1 says, same signatures and tests.

**Files:** create `src/friday/core/runtime/__init__.py`, `core/runtime/login.py`, `core/runtime/claude_sdk.py`; tests `tests/unit/test_login.py`, `tests/unit/test_claude_sdk.py`.

**Interfaces:** consumes Tasks 2, 5 and `tests/fixtures/cli/`. Produces:
- `LoginState = Literal["ok", "expired", "unknown"]`; `@dataclass(frozen=True) class LoginStatus: state: LoginState; checked_at: datetime; expires_at: datetime | None`.
- `parse_auth_status(returncode: int, output: str) -> tuple[LoginState, datetime | None]`: output matching `not logged in|expired|invalid|log ?in again` (case-insensitive) gives `expired`; otherwise code 0 gives `ok`; else `unknown`. Adjust the patterns only to what the fixtures show; `expires_at` is `None` unless S1 recorded a readable expiry line.
- `async def probe_login(*, claude_bin: str = "claude", env: Mapping[str, str], timeout_s: float = 15.0) -> LoginStatus` (`[claude_bin, "auth", "status", "--text"]` via `create_subprocess_exec`; `FileNotFoundError` or timeout gives `unknown`).
- `ISOLATION_ENV = {"CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1", "CLAUDE_CODE_DISABLE_ATTACHMENTS": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_CLAUDEAI_MCP_SERVERS": "false", "ENABLE_TOOL_SEARCH": "false", "DISABLE_AUTOUPDATER": "1"}`; `lean_env(settings) -> dict[str, str]` adds `CLAUDE_CONFIG_DIR`.
- `async def deny_all(tool_name: str, tool_input: dict[str, Any], context: ToolPermissionContext) -> PermissionResultDeny` (message `"Tool not allowed for this request."`).
- `isolated_options(settings, *, system_prompt: str, max_turns: int) -> ClaudeAgentOptions` with `system_prompt`, `setting_sources=[]`, `cwd=str(settings.sdk_cwd)`, `env=lean_env(settings)`, `tools=[]`, `mcp_servers={}`, `strict_mcp_config=True`, `allowed_tools=[]`, `can_use_tool=deny_all`, `model=settings.model_main`, `max_turns`, `cli_path=shutil.which("claude")` (field names verified 2026-11-20 in the SDK's `ClaudeAgentOptions`; recheck against `uv.lock`. L4 adds the `friday` MCP server and `include_partial_messages=True`).
- `SdkCheckState = Literal["ok", "failed"]`; `@dataclass(frozen=True) class SdkCheckResult: state: SdkCheckState; error: str | None; trace_id: str`; `STARTUP_SYSTEM_PROMPT = "You are a health check. Reply with the single word OK."`; `STARTUP_PROMPT = "Reply with the single word OK."`; `QueryFn = Callable[..., AsyncIterator[Any]]`; `async def run_startup_check(settings, recorder: TraceRecorder, *, query_fn: QueryFn = claude_agent_sdk.query, timeout_s: float = 60.0) -> SdkCheckResult`.

`run_startup_check`: create `sdk_cwd` (0700) if missing; start a trace; `query_fn(prompt=..., options=isolated_options(settings, system_prompt=STARTUP_SYSTEM_PROMPT, max_turns=1))` under `asyncio.timeout`; `ResultMessage.is_error` false gives `ok`; one span `sdk_startup_check`, kind `external_call`; finish with `model`, `Usage` from `ResultMessage.usage` keys `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens` (missing counts 0), `cost_usd=total_cost_usd`, `total_ms`. Any exception or timeout gives `failed` with the exception class name only; trace status `error` or `timeout`; never re-raises.

- [ ] Prompt form: `grep -rn "can_use_tool" <installed claude_agent_sdk dir>` to see whether a string prompt with `can_use_tool` raises. If so, pass an async iterable yielding `{"type": "user", "message": {"role": "user", "content": STARTUP_PROMPT}, "parent_tool_use_id": None, "session_id": "default"}` (shape from SDK docs; the `session_id` value is unverified, confirm against the SDK's example). Record in the runbook.
- [ ] `test_login.py`: `test_probe_login_ok_fixture`, `test_probe_login_expired_fixture`, `test_probe_login_missing_cli_is_unknown`, `test_probe_login_timeout_is_unknown` (fake script that sleeps, `timeout_s=0.2`), `test_probe_login_nonzero_without_pattern_is_unknown`.
- [ ] `test_claude_sdk.py`: `test_isolated_options_values`, `test_lean_env_contains_config_dir`, `test_deny_all_denies`, `test_startup_check_ok_records_trace` (fake `ResultMessage`, usage `{"input_tokens": 5, "output_tokens": 1}`), `test_startup_check_error_result_failed`, `test_startup_check_exception_failed_not_raised` (`ProcessError`), `test_startup_check_timeout`.
- [ ] Run: fails. Implement. Re-run: all pass; `make types` passes. Commit: `git commit -m "Add CLI login probe and isolated SDK startup check"`.

### Task 13: Health service, app factory and `friday serve`

**Files:** create `src/friday/core/health.py`, `src/friday/api/routes_health.py`, `src/friday/api/app.py`, `src/friday/__main__.py`; modify `pyproject.toml` (`friday = "friday.__main__:app"`); tests `tests/unit/test_health.py`, `tests/integration/test_app.py`.

**Interfaces:** consumes Tasks 2 to 7, 11, 12. Produces `@dataclass(frozen=True) class HealthSnapshot: status: Literal["ok", "degraded"]; version: str; db: Literal["ok", "error"]; sdk_login: LoginState; sdk_login_checked_at: datetime | None; login_expires_at: datetime | None; companion: CompanionStatus` with `to_public()` (`status`, `version`) and `to_full()` (all seven, timestamps via `to_iso`); `class HealthService` with `__init__(self, *, db, host: HostClient, login_probe: Callable[[], Awaitable[LoginStatus]])`, `async refresh_login()`, `async login_loop(interval_s: float = 600.0)`, `async snapshot()` (runs `db_ok` and `host.health()` on every call; `sdk_login` from the last probe, `unknown` before the first; `status` is `ok` only when all three are ok); routes `GET /health` (no auth, `to_public()`) and `GET /api/health` (`require_session`, `to_full()`), both 200 while the process runs (`claude_mem` from L7 and `voice` from L11 are absent now); `create_app(settings=None, *, mountinfo_text=None, query_fn=None, login_probe=None) -> FastAPI` with lifespan: `check_data_dir(settings.data_dir, mountinfo_text or Path("/proc/self/mountinfo").read_text())`; `os.umask(0o077)`; `connect(settings.db_path)`; `apply_migrations(conn, "friday.storage.migrations")`; set `app.state.db`, `auth_store`, `cookie_name = "friday_session"`, `health`; `await health.refresh_login()`; background tasks `login_loop()` and `run_startup_check(...)` (logs `sdk_startup_check` with `state` and `trace_id`); CLI socket (Task 14); cancel and close on shutdown; middleware `WebSecurityMiddleware(dashboard_policy(settings))`; `build_auth_router(cookie_name="friday_session", static_dir=<api/static>, audit_target="dashboard")`; `friday serve` = `configure_logging(settings.log_level)` then `uvicorn.run("friday.api.app:create_app", factory=True, host=settings.bind, port=settings.port, log_config=None, reload=settings.dev, proxy_headers=False)`.

- [ ] `test_health.py`: `test_status_ok_when_all_ok`, `test_degraded_when_companion_down`, `test_degraded_when_login_expired`, `test_unknown_before_first_probe`, `test_public_has_only_status_and_version`, `test_login_loop_reprobes`.
- [ ] `test_app.py` (`data_dir=tmp_path`, `mountinfo_text` listing `tmp_path` as `ext4`, fake `query_fn` and `login_probe`, absent host socket): `test_health_public_no_auth`, `test_api_health_requires_session`, `test_api_health_fields_after_login` (keys exactly `status, version, db, sdk_login, sdk_login_checked_at, login_expires_at, companion`), `test_app_starts_degraded_when_login_expired`, `test_refuses_drvfs_data_dir`, `test_startup_check_trace_written`, `test_wrong_host_400_on_real_app`.
- [ ] Run: fails. Implement. Re-run: all pass. Commit: `git commit -m "Add health service, app factory and friday serve"`.

### Task 14: Read-only CLI socket and `friday login-url`

**Files:** create `src/friday/api/cli_socket.py`; modify `src/friday/api/app.py`, `src/friday/__main__.py`; test `tests/integration/test_cli_socket.py`.

**Interfaces:** consumes Tasks 7, 9, 13. Produces `CLI_OPS = frozenset({"login_url"})` (L4 adds read operations; never another state-changing one, S39); `async def start_cli_socket(path: Path, *, auth: AuthStore, port: int) -> asyncio.Server` (parent 0700 if missing, `check_private_dir`, `prepare_socket_path`, chmod 0600; `{"op": "login_url"}` gives `{"ok": true, "result": {"url": "http://127.0.0.1:<port>/login#t=<token>"}}`, anything else `{"ok": false, "error": "unknown_op"}`; logs `login_url_issued` without the token); `friday login-url` prints only the URL, or `Friday is not running.` to stderr with exit 1.

- [ ] Tests: `test_login_url_returns_working_token`, `test_unknown_op_refused` (`approve`, `deny`, `send`, `cancel`, `handoff`), `test_socket_mode_0600_dir_0700`, `test_token_not_logged`, `test_cli_command_prints_only_url`, `test_cli_command_not_running_exit_1`.
- [ ] Run: fails. Implement. Re-run: all pass; `uv run pytest -q` passes. Commit: `git commit -m "Add read-only CLI socket with login-url"`.

### Task 15: Runtime image, `friday` service and compose lint

Needs S1 and S2. **Files:** modify `Dockerfile`, `compose.yaml`, `Makefile`, `.dockerignore` (create if absent); create `compose.dev.yaml`, `scripts/compose_lint.py`; test `tests/unit/test_compose_lint.py`.

**Interfaces:** consumes Tasks 13 and 14, the S1 binary hash, the S2 mount decision. Produces image tags `friday:dev`, `friday:<version>`, the compose service `friday`, and `scripts/compose_lint.py` with `lint(config: dict[str, Any]) -> list[str]` and `main() -> int`.

Dockerfile, added after the existing `spa-build` and `preview` stages (which stay unchanged):
- `cli`: `debian:bookworm-slim@sha256:<digest>`; download `https://downloads.claude.ai/claude-code-releases/${CLAUDE_CODE_VERSION}/linux-x64/claude` with `ARG CLAUDE_CODE_VERSION=2.1.329`, `ARG CLAUDE_CODE_SHA256=<S1 hash>`, `echo "${CLAUDE_CODE_SHA256}  claude" | sha256sum -c`.
- `base`: `python:3.12-slim-bookworm@sha256:<digest>`; `COPY --from=ghcr.io/astral-sh/uv:0.9.10 /uv /uvx /bin/`; `ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy`; `WORKDIR /app`; `uv sync --locked --no-dev --no-install-project` with the uv Docker guide's bind-mount pattern, then copy `pyproject.toml uv.lock src/` and `uv sync --locked --no-dev`.
- `runtime`: from `base`; `ARG FRIDAY_UID=1000 FRIDAY_GID=1000`; user `friday` with those ids; `mkdir -p /data/claude /data/home /data/sdk-cwd /data/db /models /run/friday /run/friday-host`, `chown -R friday:friday /data /models /run/friday`, `chmod 0700 /data/claude /data/db /run/friday`; `COPY --from=cli /claude /usr/local/bin/claude`; `ENV PATH=/app/.venv/bin:$PATH HOME=/data/home CLAUDE_CONFIG_DIR=/data/claude DISABLE_AUTOUPDATER=1`; `USER friday`; `EXPOSE 8740`; `CMD ["friday", "serve"]`. No Node (Q1). Serving the built SPA from this stage is L8.
- `test`: from `runtime` as root, `uv sync --locked` (with dev), copy `tests/`, `USER friday`, `CMD ["pytest", "-q", "tests", "--ignore=tests/host"]`.
- Resolve digests with `docker buildx imagetools inspect <image>:<tag>`.

`compose.yaml`, adding next to the existing `preview` service: service `friday` with `image: friday:${FRIDAY_VERSION:-dev}`; `build: {context: ., target: runtime, args: {FRIDAY_UID: "${FRIDAY_UID:?run through make or export FRIDAY_UID}", FRIDAY_GID: "${FRIDAY_GID:?run through make or export FRIDAY_GID}"}}`; `user: "${FRIDAY_UID}:${FRIDAY_GID}"`; `read_only: true`; `tmpfs: ["/tmp", "/run/friday:mode=0700,uid=${FRIDAY_UID},gid=${FRIDAY_GID}"]` (tmpfs `uid` and `gid` unverified, confirm before running; if refused, stop and report, never fall back to a world-writable `/run/friday`); `ports: ["127.0.0.1:8740:8740"]`; `cap_drop: [ALL]`; `security_opt: ["no-new-privileges:true"]`; volumes `friday-data:/data`, `friday-models:/models`, and long-syntax binds with `read_only: true` and `bind: {create_host_path: false}` for `${FRIDAY_VAULT_HOST_DIR:-/mnt/d/Second Brain}` at `/vault`, `${FRIDAY_CAREER_HOST_DIR:-/mnt/d/Projects/Personal/learning/career-roadmap}` at `/career`, `${HOME}/.claude/.credentials.json` at `/data/claude/.credentials.json` (S1 pass only), and `${HOME}/.local/state/friday/host.sock` at `/run/friday-host/host.sock` without `read_only` (or the S2 directory variant); `secrets: [host_key]` with top-level `secrets: {host_key: {file: "${HOME}/.config/friday/secrets/host_key"}}`; healthcheck `["CMD", "python", "-c", "import sys,urllib.request;sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8740/health',timeout=3).status==200 else 1)"]`, interval 30 s, start period 20 s; top-level volumes `friday-data`, `friday-models`. (`create_host_path` is from the compose specification, not re-verified: confirm with `docker compose config` that it survives normalization.)

`compose.dev.yaml`: for `friday` only, `environment: {FRIDAY_DEV: "true", WATCHFILES_FORCE_POLLING: "true", PYTHONPATH: /app/src}`; volume `./src:/app/src:ro`. A Vite dev server against the backend belongs to L8 wiring.

`.dockerignore` entries (append the missing ones): `.git`, `.venv`, `**/__pycache__`, `docs/design-references`, `secrets`, `*.env`, `.env*`, `data`. Keep `tests` in the context.

Makefile additions (existing targets untouched): `export FRIDAY_UID := $(shell id -u)`, `export FRIDAY_GID := $(shell id -g)`, `VERSION := $(shell uv run python -c "import friday;print(friday.__version__)")`; `image` (`docker compose build friday && docker tag friday:dev friday:$(VERSION)`), `image-test` (`docker build --target test -t friday:test --build-arg FRIDAY_UID --build-arg FRIDAY_GID .`), `image-scan` (depends on `image`; `{ docker history --no-trunc --format '{{.CreatedBy}}' friday:dev; docker image inspect --format '{{json .Config.Env}}' friday:dev; } | docker run --rm -i zricethezav/gitleaks:v8.30.1 stdin`, tag unverified, confirm; reuse the gitleaks image L0 pinned if it differs), `compose-lint` (`uv run python scripts/compose_lint.py`), `check` (`lint types unit <L0 secret-scan target> compose-lint image-scan`), `test` (`image-test`, `docker run --rm friday:test`, `uv run pytest tests/host -q`), `up` (`docker compose up -d friday`), `down` (`docker compose stop friday && docker compose rm -f friday`, so the preview service is not touched), `dev` (`docker compose -f compose.yaml -f compose.dev.yaml up friday`), `logs` (`docker compose logs -f friday`), `login` (`docker compose exec friday friday login-url`).

`lint()`: every service's published ports must have `host_ip == "127.0.0.1"`; the `friday` service must have `read_only: true` and `user`, no bind whose source ends in `/.claude`, the credentials bind read-only, no `/var/run/docker.sock` bind, no `network_mode: host`. The preview service is checked for ports only (its other settings belong to L0).

- [ ] `test_compose_lint.py` (synthetic normalized configs): `test_lint_port_without_loopback` (no `host_ip`, and `0.0.0.0`, in either service), `test_lint_loopback_port_ok`, `test_lint_requires_read_only_and_user`, `test_lint_refuses_whole_claude_dir_bind`, `test_lint_refuses_writable_credentials_bind`, `test_lint_refuses_docker_socket_and_host_network`, `test_lint_preview_only_port_checked`.
- [ ] Run: fails. Implement; `main()` runs `docker compose -f compose.yaml config --format json` and the same with `-f compose.dev.yaml`, prints violations, returns 1 if any. Re-run: all pass; `make compose-lint` exits 0.
- [ ] `make image image-scan`: build succeeds, gitleaks reports no leaks. `make preview check-frontend` still pass.
- [ ] First run: `make host` running, then `make up`; `docker compose ps` shows `friday` healthy within 60 s.
- [ ] Container checks: `docker compose exec friday id -u` equals host `id -u`; `docker compose exec friday touch /x` fails with `Read-only file system`; `stat -c '%a %U' /run/friday /data/claude /data/db` prints `700 friday` three times; `stat -c '%a' /data/db/friday.sqlite3` prints `600`; `docker port $(docker compose ps -q friday)` prints only `8740/tcp -> 127.0.0.1:8740`; `curl -s http://127.0.0.1:8740/health` prints `{"status":"ok","version":"0.1.0"}` (or `degraded` with a logged reason); `curl -s -o /dev/null -w '%{http_code}' -H 'Host: evil.example' http://127.0.0.1:8740/health` prints `400`.
- [ ] Missing credentials file: `make down`; `HOME=$(mktemp -d)` with only the secret file copied in, `docker compose up -d friday`. Expected: compose refuses, naming the missing bind source; no directory is created there. Restore and `make up`.
- [ ] Data-path refusal: `docker compose run --rm -v /tmp/x:/data friday` exits non-zero with a `DataDirError` log line naming `/data`.
- [ ] Companion down: stop `make host`; the next `/api/health` says `companion: "down"` while `/health` answers 200. Restart it.
- [ ] Commit: `git commit -m "Add backend runtime image, friday service and compose lint"`.

### Task 16: Backend CI jobs

**Files:** modify `.github/workflows/ci.yml` (add jobs; existing frontend, secret-scan and image jobs unchanged); modify `README.md` only if L0 did not add the CI badge.

New jobs, `ubuntu-latest`, same triggers as the existing workflow, `permissions: contents: read`:
- `backend-lint-types`: `actions/checkout@v4`, `astral-sh/setup-uv@v6` with `version: "0.9.10"`, `enable-cache: true` (verified in setup-uv docs), `uv python install 3.12`, `uv sync --locked`, `make lint types unit`.
- `companion-tests`: same setup, `uv run pytest tests/host -q`.
- `backend-image`: with `FRIDAY_UID=1000 FRIDAY_GID=1000`, `make image-test`, `docker run --rm friday:test`, `make image image-scan`.
- `compose-lint`: placeholder secret (`mkdir -p ~/.config/friday/secrets && head -c 32 /dev/urandom | xxd -p -c 64 > ~/.config/friday/secrets/host_key`) and placeholder bind sources if `docker compose config` requires them, then `make compose-lint`.

- [ ] Validate: `docker run --rm -v $(pwd):/repo rhysd/actionlint:latest -color` (tag unverified; if unavailable, rely on the first CI run). Expected: no findings.
- [ ] Commit: `git commit -m "Add backend CI jobs"`. The first green run follows the owner's push (Demonstration step 7).

### Task 17: ADRs, README and runbook

**Files:** create `docs/adr/0001-runtime.md` through `docs/adr/0018-containerization-and-host-companion.md` (`0002-backend-framework`, `0003-storage`, `0004-frontend`, `0005-module-mechanism`, `0006-vault-access-path`, `0007-claude-mem-access-path`, `0008-voice-stack`, `0009-approval-mechanism`, `0010-model-routing`, `0011-conversation-context-ownership`, `0012-tool-exposure`, `0013-hybrid-runtime`, `0014-session-interaction-mechanism`, `0015-permission-view`, `0016-event-bus`, `0017-workflow-engine`), skipping any file L0 already created; modify `README.md`, `docs/runbook.md`, `CLAUDE.md`.

- [ ] Each ADR: title, `Status: accepted (2026-11-20)`, and Decision, Problem, Options, Recommendation, Reason, Trade-offs, When to revisit, copied from spec 30 without em or en dashes. In ADR-3 replace "Docker is unavailable in WSL (verified)" with "zero extra services; one process" and add `Note: corrected 2026-11-20, Docker is available (D19).` ADR-18 gets a "Spike results" line pointing at the runbook.
- [ ] README (add sections, keep the L0 skeleton): the container and companion split in three lines, backend Requirements, backend Quick start (the Demonstration steps), "Use `http://127.0.0.1:8740`, not `localhost`: the Origin check accepts only 127.0.0.1", the preview on 8742 unchanged.
- [ ] Runbook: Login (`make login`, `uv run friday-host login-url`, 10 minutes, 12 hours), Companion (`make host`, key files and modes, "already running" and "port in use"), Reset the database (`make down && docker volume rm friday_friday-data`, data loss warning), and "Deferrals" from "Out of scope for L3" with each item's layer.
- [ ] `grep -rnP '[\x{2013}\x{2014}]' docs README.md CLAUDE.md src` prints nothing.
- [ ] Commit: `git commit -m "Add ADRs, README and runbook for L3"`.

## Acceptance check

| Spec L3 acceptance criterion | Task | Proof |
|---|---|---|
| `make check` passes locally and in CI | 15, 16 | `make check`; CI after the owner's push |
| `make up` starts the stack; `/health` answers | 15 | `make up && curl -s http://127.0.0.1:8740/health` |
| `/api/health` reports `db`, `sdk_login`, `login_expires_at`, `companion` | 13, 15 | `test_api_health_fields_after_login`; Demonstration step 4 |
| Backend refuses to start when `/data` is not a named volume | 3, 13, 15 | `test_refuses_drvfs_data_dir`; Task 15 data-path step |
| Published port is `127.0.0.1:8740` only | 15 | `make compose-lint`; `docker port` step |
| Non-root with a read-only root filesystem | 15 | `id -u` and `touch /x` steps; `test_lint_requires_read_only_and_user` |
| No secret in the image history | 15 | `make image-scan` |
| Wrong `Host` gets 400 | 6, 13 | `test_wrong_host_400`, `test_wrong_host_400_on_real_app`; curl step |
| POST without CSRF, foreign Origin or `Sec-Fetch-Site: cross-site` gets 403 | 6, 7 | `test_post_without_csrf_403`, `test_post_foreign_origin_403`, `test_post_cross_site_403` |
| Reused login token refused | 7 | `test_reused_login_token_401`, `test_token_single_use` |
| Login token never in a log | 7, 14 | `test_token_never_logged`, `test_token_not_logged`; `make logs` shows no `#t=` |
| Migrations run twice without error | 4 | `test_migrations_twice_is_noop` |
| UPDATE on the audit table fails | 4 | `test_audit_update_rejected` |
| Companion request with bad HMAC or reused nonce refused | 8, 9 | `test_bad_mac_refused`, `test_reused_nonce_refused` |
| A25 and A29 recorded; fallbacks chosen if failed | S1, S2, 1 | runbook "Spike A29 results", "Spike A25 results" |
| Scope: SDK startup check with full isolation options | 12, 13 | `test_isolated_options_values`, `test_startup_check_trace_written`; `make logs` shows `sdk_startup_check state=ok` |
| Scope: login expiry and plan reset readability checked | S1, 12 | runbook A29; `parse_auth_status` tests |
| Scope: read-only CLI socket | 14 | `test_unknown_op_refused` |
| Scope: companion channel, `health`, `version`, confirm page with its own login | 9, 10 | `tests/host`; Demonstration step 6 |
| Scope: uv, ruff, mypy, pytest, backend CI jobs, ADR files | 1, 16, 17 | `make lint types unit`; `ls docs/adr` shows 18 files |
| Preview untouched | 1, 15 | `make preview check-frontend` after Tasks 1 and 15 |

## Demonstration

1. `cd /mnt/d/Projects/Personal/projects/friday && make host` (terminal A). Expected: a JSON log line `companion_started` with port 8741.
2. Terminal B: `make image up`, then `docker compose ps`. Expected: `friday` is `healthy` (the preview service, if running, is unaffected).
3. `make login`. Expected: one line `http://127.0.0.1:8740/login#t=...`.
4. Open it in a browser. Expected: the address bar shows `/login` and the page shows health JSON with `"db": "ok"`, `"sdk_login": "ok"`, `"companion": "ok"` and `login_expires_at` (a time, or `null` if S1 found it unreadable).
5. Open the same URL again. Expected: "This login link is invalid or expired."
6. `uv run friday-host login-url`, open the `127.0.0.1:8741` URL. Expected: "Friday host companion. No host actions are waiting."
7. Owner only, after pushing `l3-backend-foundation`: the backend CI jobs are green.
8. Keep nothing from this demonstration in the repo unless it shows synthetic data only (D8).

## Out of scope for L3

- Milestone U (L0 to L2): everything frontend, `schema/`, the preview service and stages, frontend CI, the repo-wide secret scan setup. This plan only adds to their files.
- L4: `AgentRuntime`, `ClaudeSdkRuntime`, `ScriptedRuntime`, orchestrator and queue, context assembly, the `conversations`, `turns`, `summaries` and `task_state` tables (migration 0002), prompts, event bus, `/ws/session`, `POST /api/messages`, `GET /api/state`, `friday chat`, `friday trace`, per-turn usage, `retention_task`, the L4 measurements (A2, A6, A11, A28), redactor.
- L5: bridge spikes (they may run in parallel with Milestone U, but are not part of this plan), `make contract`, `hooks/friday-hook`.
- L6: registry, approvals, proposals, outcomes, companion `proposal_register`, real host-action confirms.
- L7: knowledge module, vault and claude-mem adapters, companion vault and memory operations, `claude_mem` in health.
- L8: dashboard wiring (Pydantic models from `schema/`, `WsTransport`, the backend serving the built SPA, a Vite dev server against the backend, Playwright CLI end-to-end in CI, `make samples`).
- L9 to L11: local modules and `make eval` (L9), Claude Code bridge (L10), voice, `voice` in health and the `friday-models` contents (L11).
- Not built at L3 although in the repository structure: `prompts/`, `modules/`, `voice/`, `friday-host repos add`, `friday-host hooks ...`.

## Questions before execution

- **Q1. Claude Code CLI in the image.** Spec 25 and spec 26 still plan Node in the runtime stage for the CLI. The Claude Code docs (read 2026-11-20) say the CLI is a native binary that does not use Node, and the SDK bundles its own CLI. Recommended answer: install the pinned native binary (2.1.329, checksum-verified), point `cli_path` at it so the SDK and `claude auth status` use one version, and leave Node out of the runtime stage (Node stays in `spa-build`).
- **Q2. A29 "refresh invisible" case.** If the host replaces the credentials file by rename, a single-file bind mount keeps showing the old file to a running container. D27 names only "refresh needs write access". Recommended answer: treat this case the same way (lean agent through the companion, no credentials mount), since the only other fix would mount more than the one file.
- **Q3. A25 restart case.** If a bind-mounted socket file breaks after a companion restart but a directory mount works. Recommended answer: accept a dedicated directory `~/.local/state/friday/channel/` that holds only `host.sock`, so the container sees nothing else from the state directory.

Design calls made in this plan, for review (no answer needed unless you disagree): the `/data` check uses an allowlist of filesystem types, tighter than spec 27's "refuse 9p or drvfs" (Task 3); the CSRF token is derived from the session token so `GET /api/csrf` can return it while only its hash is stored (Task 7); the CSRF header is `X-CSRF-Token`; the channel MAC input joins fields with newlines (Task 8); `friday-host serve` creates both host key files on first run (Task 9); `friday-host login-url` mints the companion token in its database instead of the companion printing one at start (Task 10); `make check` builds the image to scan its history (Task 15); `make down` stops only the `friday` service so the preview keeps running; compose lint checks the preview service for ports only; `FRIDAY_HOST_KEY_FILE` is added to the settings table (Task 2); the startup query result shows in the trace and logs, not as a new `/api/health` field; ADR-3's stale Docker sentence is corrected in the ADR file (Task 17).
