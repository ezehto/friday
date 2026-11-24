#!/usr/bin/env bash
# Smoke test: drives a running preview with the Playwright CLI. Usage: smoke.sh [base_url]
set -euo pipefail

BASE="${1:-http://127.0.0.1:8742}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIOS="$HERE/../src/mocks/scenarios"
BANNER="PREVIEW, NOT LIVE"
NOTHING="Preview: nothing was executed"
FAILED=0

# The CLI writes its output files into the working directory; keep them out of the repo.
cd "$(mktemp -d)"
pw() { playwright-cli -s=smoke "$@"; }
trap 'pw close >/dev/null 2>&1 || true' EXIT

# Runs a JS function in the page and prints its raw value without JSON string quotes.
val() { pw --raw eval "$1" 2>&1 | tr -d '"'; }

expect_eq() {
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: got '$2', expected '$3'"; FAILED=1; fi
}

# Loads a fresh page: reload drops any state left by the previous route.
load() { pw goto "$BASE/$1" >/dev/null; pw reload >/dev/null; }

# eval awaits a returned Promise (verified on playwright-cli 0.1.24).
wait_done() {
  val '() => new Promise((resolve) => {
    const end = Date.now() + 15000;
    const tick = () => document.body.dataset.scenarioDone === "true" ? resolve("done") : Date.now() > end ? resolve("timeout") : setTimeout(tick, 50);
    tick();
  })'
}

pw close >/dev/null 2>&1 || true
pw open --browser chromium "$BASE/" >/dev/null
pw resize 1440 900 >/dev/null

echo "== 1. scenarios: panel count and Sample data stamp"
while read -r id count; do
  load "#/board?scenario=$id&instant=1"
  expect_eq "1 $id finished" "$(wait_done)" "done"
  expect_eq "1 $id panels" "$(val '() => document.querySelectorAll("[data-widget-id]").length')" "$count"
  expect_eq "1 $id sample stamp" "$(val '() => [...document.querySelectorAll("[data-widget-id]")].every((p) => p.textContent.includes("Sample data"))')" "true"
done < <(node -e '
const fs = require("fs"), dir = process.argv[1];
for (const f of fs.readdirSync(dir).sort()) {
  const s = JSON.parse(fs.readFileSync(dir + "/" + f, "utf8"));
  const boards = s.script.filter((x) => x.board);
  console.log(s.id, boards.length ? boards[boards.length - 1].board.length : 0);
}' "$SCENARIOS")

echo "== 2. network: only the preview origin"
OFFENDERS="$(pw requests --static --all | grep -oE 'https?://[^ )]+' | grep -vF "$BASE/" || true)"
expect_eq "2 requests stay on $BASE" "${OFFENDERS:-none}" "none"

echo "== 3. layout at 1440 and 900"
for id in edge-caps edge-board-full; do
  for w in 1440 900; do
    pw resize "$w" 800 >/dev/null
    load "#/board?scenario=$id&instant=1"
    wait_done >/dev/null
    expect_eq "3 $id@$w page width" "$(val '() => document.documentElement.scrollWidth <= innerWidth')" "true"
    expect_eq "3 $id@$w widgets fit" "$(val '() => [...document.querySelectorAll("[data-widget-id]")].every((w) => w.scrollWidth <= w.clientWidth + 1)')" "true"
    sel=".core-full"; [ "$w" = 900 ] && sel=".topbar .core-compact"
    expect_eq "3 $id@$w core visible ($sel)" "$(val "() => [...document.querySelectorAll('$sel')].some((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none' && e.offsetParent !== null)")" "true"
  done
done
pw resize 1440 900 >/dev/null

echo "== 4. approvals, permissions, sessions: banner and actions"
banner() { expect_eq "4 $1 banner" "$(val '() => document.querySelector("[role=note]")?.textContent.trim()')" "$BANNER"; }
# click_expect <name> <button text or aria-label prefix> [pre-step eval]
click_expect() {
  local name="$1" label="$2"
  val "() => { const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') ?? x.textContent).trim().startsWith('$label')); if (!b) return 'no button'; b.click(); return 'clicked'; }" >/dev/null
  # React renders the result on the next tick.
  expect_eq "4 $name shows result" "$(val "() => new Promise((r) => setTimeout(() => r([...document.querySelectorAll('[role=status]')].some((s) => s.textContent.trim() === '$NOTHING')), 200))")" "true"
}
pick() { val "() => { document.querySelectorAll('.proposal-item')[$1].click(); return 'picked'; }" >/dev/null; }

load "#/approvals?scenario=focus-today&instant=1"; banner approvals
click_expect "approvals Approve" "Approve"
load "#/approvals?scenario=focus-today&instant=1"; pick 0; click_expect "approvals Reject" "Reject"
load "#/approvals?scenario=focus-today&instant=1"; pick 1; click_expect "approvals Open confirm page" "Open confirm page"

load "#/permissions?scenario=focus-today&instant=1"; banner permissions
pw fill "textarea" "Smoke test reason" >/dev/null
click_expect "permissions Deny" "Deny"
expect_eq "4 permissions has no allow control" "$(val '() => [...document.querySelectorAll("button,a,input,select,[role],[aria-label]")].some((e) => /allow/i.test(e.getAttribute("aria-label") ?? e.textContent ?? ""))')" "false"

load "#/sessions?scenario=focus-today&instant=1"; banner sessions
click_expect "sessions Cancel" "Cancel "
load "#/sessions?scenario=focus-today&instant=1"
pw fill "textarea" "Smoke test message" >/dev/null
click_expect "sessions Send" "Send"

echo "== 5. style guide: core states and reduced motion"
load "#/style-guide"
for state in $(node -e 'console.log(require("fs").readFileSync(process.argv[1], "utf8").match(/CORE_STATES = \[([^\]]*)\]/)[1].match(/"[a-z_]+"/g).map((s) => s.slice(1, -1)).join(" "))' "$HERE/../src/chrome/coreStates.ts"); do
  expect_eq "5 core state $state" "$(val "() => { const r = document.querySelector('input[name=core-state][value=$state]'); r.click(); return r.checked && document.querySelector('.sg-core-stage .core').dataset.coreState === '$state'; }")" "true"
done
pw set-reduced-motion reduce >/dev/null
expect_eq "5 reduced motion ring duration" "$(val '() => getComputedStyle(document.querySelector(".core-ring")).animationDuration')" "0s"

echo "== 6. console: no errors"
CONSOLE="$(pw console error --all)"
expect_eq "6 console errors" "$(printf '%s\n' "$CONSOLE" | grep -c '^\[ERROR\]' || true)" "0"
[ "$FAILED" = 0 ] || printf '%s\n' "$CONSOLE" | grep '^\[ERROR\]' || true

[ "$FAILED" = 0 ] && echo "SMOKE PASSED" || { echo "SMOKE FAILED"; exit 1; }
