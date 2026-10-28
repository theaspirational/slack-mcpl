# Review — TASK-E40F7, `SLACK_DISABLED_TOOLS` via `startupSettings`

Reviewed commit `c1c09cd8ac24152d96e896057805afe5c810879b`, sole parent
`d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`. Read-only review: no edits, no
commits, no push, no GitHub interaction. Worktree left clean
(`git status --porcelain` empty before and after; `npm ci` refreshed the
ignored `node_modules`).

Upstream check: `git ls-remote https://github.com/anima-research/slack-mcpl main`
→ `d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`. Upstream has not moved; it is
this commit's parent, so the commit applies as-is.

## Verdict

**Approve — no blocking findings.** The port is behaviourally faithful to the
fork, the M1 refusal redesign is done properly (clean, value-naming,
single-line, pre-Slack, no stack), I found no bypass on four independent
probe classes, and the tests are substantive: I reproduced the red state and
killed the change six different ways, each caught by a specific test. One
MEDIUM documentation gap and six LOWs, none of which should hold the PR.

## Findings

### MEDIUM

**MEDIUM `README.md:332` (docs): the row's exemption list is incomplete where
it matters most — `state/rollback` still deletes messages and the ack
reaction still writes, with those tools disabled.**

The row ends with "This does not disable automatic backscroll or MCPL
`channels/publish`". Because it enumerates exemptions, the omissions read as
guarantees. Two further server-initiated/host-driven Slack writes ignore the
setting:

- `state/rollback` (`src/server.ts:493` → `handleRollback`, `:1424`) deletes
  the bot's messages and files with no `disabledTools` check. Probe:
  `probes/probe2.log` — with `disabledTools: ['delete_message','edit_message']`,
  a host rollback returned `success=true` and `chat.delete` ran
  (`deletedMessages=[{"channel":"C1","ts":"100.2"}]`).
- the ack reaction (`SLACK_ACK_REACTION`) still calls `reactions.add`/`remove`
  with `add_reaction` disabled. Probe: `probes/probe.log` —
  `reactions=["add:C1:111.1:eyes"]`, and automatic backscroll still read
  (`reads=["history:C1"]`, which is the row's own documented behaviour).

Failure scenario: an operator disables `delete_message` as a destructive-action
guard, reads the row, and still has a host able to delete Slack messages
through rollback. Nothing is wrong in the code — this is the intended
tool-surface-only scope — but the doc should say so. Fix direction: replace the
two-item list with the general rule, e.g. "only the agent's tool surface is
affected; server-initiated and host-driven Slack calls — automatic backscroll,
ack reactions, MCPL `channels/publish` and `state/rollback` — are not."
Same wording gap exists in the changelog fragment and the PR body's
"This is tool-level control, not an operation-wide restriction" line, which is
correct but equally partial in its examples.

### LOW

**LOW `src/server.ts:259` (design): the constructor's throw does not name the
offending tool** — `throw new Error('Unknown disabled tool')`. Every
operator-facing diagnostic in `src/config.ts` names and JSON-quotes its value
(`:10`, `:48`), and the new startup refusal does too. An embedded user who
passes `disabledTools: ['fetch_histroy']` gets no clue which entry is wrong.
This is verbatim parity with the fork (`685b2deb:src/server.ts:272`), so it is
inherited, not introduced. Fix: include the name, e.g.
`Unknown disabled tool: ${JSON.stringify(name)}`.

**LOW `src/config.ts:46` (usability): only the first unknown name is reported.**
`find` + single refusal means an operator with three typos fixes them one
restart at a time. Parity with `booleanFlag`, which also refuses one variable
at a time, so this is consistent rather than wrong. Fix if wanted: collect all
unknown entries into one refusal.

**LOW `test/config.test.ts:50-66` (test/reuse): a third CLI child-process
bootstrap, in the one test file that otherwise tests pure functions.**
`test/cli.test.ts:12-24` already has `startWith()` — "Start the CLI as an
operator would … so whatever it reports instead of an API error was checked
before connecting" — with the house `timeout: 30_000`; the existing
`SLACK_DISABLE_DMS: 'maybe'` test next to it asserts exactly this shape. The
new refusal test instead inlines an `--input-type=module -e` bootstrap that
monkey-patches `WebClient.prototype.apiCall`, and
`test/operatorControls.test.ts:251-266` inlines a second near-identical one.
The new bootstraps are strictly more hermetic (upstream's helper would attempt
a real `slack.com` call if validation ever stopped refusing), so this is a
tradeoff, not a defect — but a maintainer will likely ask for one shared
helper, and for the refusal test to sit beside its sibling in `cli.test.ts`.
Related nit: the new spawns use `timeout: 10_000` / `{ timeout: 15_000 }`
against the house 30 s. Measured cost is 145–175 ms per test on Node 22.12.0,
22.23.3 and 24.22.1 (`probes/green.log`, `probes/floor-2212.log`), i.e. ~60×
headroom, so not a practical flake risk on CI's slower macOS runners — but the
house value is free.

**LOW `src/index.ts:66-72` (observability): the effective disabled-tool set is
never logged.** The startup line reports writes and DMs only. Validation
cannot catch the one mistake that matters — misspelling the *variable*
(`SLACK_DISABLE_TOOLS`), which silently disables nothing — and nothing in the
log would reveal it. Parity with the fork (its `index.ts:105-113` doesn't log
it either) and with `SLACK_SUBSCRIBE_MEMBER_CHANNELS`, but `SLACK_SEND_CHANNELS`
does log its effective list and the README advertises that. Fix: append
`; tools off: ${disabledTools.join(', ') || 'none'}` to the existing line.

**LOW `README.md:332` (docs): no example value.** The fork's row gives one
("operators may disable subscription editing …",
`SLACK_DISABLED_TOOLS=subscribe_channel,unsubscribe_channel`); the upstream row
is a dense 6-clause sentence with no sample. `SLACK_ACK_REACTION` sets the
precedent for an inline `(e.g. …)`.

**LOW (process): the PR body draft does not carry the AI footer
CONTRIBUTING requires.** `CONTRIBUTING.md:76-84` asks for the
`🤖 Generated with [Claude Code](https://claude.com/claude-code)` footer "or
equivalent for your tooling" **in the PR body**, plus the `Co-Authored-By:`
commit trailer. The commit has the trailer
(`Co-Authored-By: GPT-6-Astra <noreply@openai.com>`) ✓; the body draft has only
the prose line "AI-assisted contribution; model co-authorship is recorded in
the commit", which is not a tool-naming footer. Also: the draft's "Not
verified" can now drop the Node 22.12.0 caveat for the new tests (see gates),
and the branch name `task-e40f7-impl` does not match CONTRIBUTING's
`feat/<kebab-case>` — both owner decisions at push time, not code problems.

## Answers to the brief's seven checks

### 1. Behaviour parity with the fork (reference `685b2deb`)

Parity is exact everywhere except the one intended M1 difference.

| Aspect | Fork | This commit | Same? |
|---|---|---|---|
| env syntax | `split(',')`/`trim()`/`filter(Boolean)` (`configuration.ts:47`) | the existing `list()` helper, identical semantics (`config.ts:39,45`) | yes |
| the 16 names | all of `toolDefinitions` | all of `toolDefinitions`; I enumerated `src/tools.ts` — exactly the 16 the implementer listed | yes |
| hidden from `tools/list` | `server.ts:431` filter | `server.ts:396-398` filter, same predicate | yes |
| direct-call refusal text | `Tool '${name}' is disabled by operator configuration` (`:683`) | byte-identical (`:613`) | yes |
| position vs MCPL `tools` capability denial | after the `capabilityDenied('tools')` throw (`:676-683`) | after it (`:607-614`) | yes |
| feature-set grants | checked after the disabled check, so a grant cannot re-enable | same | yes |
| copied options | `this.opts = { ...opts, disabledTools: [...] }` (`:273`) | identical (`:261`) | yes |
| constructor validation | throws `Unknown disabled tool` (`:272`) | identical (`:259`) | yes |
| **parser + refusal** | separate `optionalConfiguration()` that **throws** a message without the value (`:49`) | built into `startupSettings`, returns `{refusal}` naming and JSON-quoting the value | **intended difference (M1)** |

Differences, all intended or benign:
- M1, above: the port is strictly better — the fork's throw reaches
  `index.ts`'s fatal handler with a stack; the port's refusal is one line,
  exit 1, before Slack.
- The fork's refusal text omits the offending value; the port adds it.
- The fork's `offeredTools` composes with its `pathUploads`/access-policy
  features, which do not exist upstream — correctly not imported.
- No accidental difference found. Duplicates, whitespace handling and
  case-sensitivity all match the fork.

### 2. The refusal

Shape matches the other `src/config.ts` settings: `{ refusal: … }`, one line,
`JSON.stringify` quoting, printed by `src/index.ts:42-44` before
`connectSlack` at `:51`. Verified on the real entry point with hostile values
(`probes/hostile.mjs`, `probes/hostile.log`) — for every bad value: `status 1`,
`stdout` empty, **1** stderr line, no `at …` frames, and the Slack mocks
(`apiCall`, `SocketModeClient.start`, both set to throw) were never reached:

| value | stderr |
|---|---|
| `bad\nname` | `… unknown tool: "bad\nname"` (escaped, still one line) |
| `bad\r\nname` | `… "bad\r\nname"` |
| `BEL`/`ESC`/`SOH` | `… "badname"` |
| `"quoted"\backslash` | `… "\"quoted\"\\backslash"` |
| ANSI `[31m…` | escaped — no terminal-colour injection |
| 100 000 chars | 1 line, 100 047 bytes (see below) |
| `SEND_MESSAGE` | `… "SEND_MESSAGE"` |
| lone surrogate | reaches the child as U+FFFD (the OS env cannot carry it); in-process `JSON.stringify('bad\ud800name')` → `"bad\ud800name"`, escaped |

Duplicates / whitespace / case: `send_message,send_message,send_message` is
accepted and kept as three entries (pinned by the parse test); leading/trailing
whitespace and empty entries are dropped (`'  send_message , fetch_history  '`
starts normally); case variants are **refused** as unknown names. All three
confirmed through the real CLI (`probes/hostile.log`, `probes/parity.log`).

Should anything more be refused? My view, and what I'd expect a maintainer to
land on: **no.**

- *Duplicates*: `SLACK_DM_USERS` and `SLACK_SEND_CHANNELS` use the same `list()`
  helper and do not dedupe either. Refusing or deduping here would make this
  setting the odd one out, and the behaviour is already pinned by a test — my
  mutation E (`[...new Set(...)]`) is caught, so a future dedupe would be a
  deliberate, visible change rather than drift.
- *Set-but-empty*: accepted (disables nothing), unlike `SLACK_SEND_CHANNELS`,
  which refuses it. The asymmetry is right: an empty write allow-list is
  ambiguous between "nowhere" and "anywhere", whereas an empty disable list
  means exactly what unset means. Verified both through the CLI
  (`probes/parity.log`: `sendChannels-empty` refuses, `disabledTools-empty`
  proceeds) and documented in the row.
- *Case-insensitive matching*: correctly not done — mutation D proves the test
  suite rejects it.

What a maintainer would most plausibly raise: the unlogged effective set
(LOW above — the only operator error validation can't catch is a misspelled
variable name), the first-unknown-only refusal (LOW), and possibly the
unbounded echo of a very long value. On the last one I'd push back: upstream's
`booleanFlag` already echoes the whole raw value — measured
`SLACK_DISABLE_DMS` with 100 000 chars → one 100 048-byte line
(`probes/parity.log`) — so truncating here alone would be the inconsistency.

### 3. Bypass

No bypass found. `tools/call` → `handleToolCall` (`src/server.ts:424-429`) is
the single door to `executeToolCall`; `grep` confirms no other caller of
either. Probes (`probes/zz-review-probe.test.ts`, `probes/probe.log`, all
passing):

- **Near-miss names**: `SEND_MESSAGE`, `' send_message'`, `'send_message '`,
  `'send_message\n'` — all return `isError`, none execute; `fake.posts` stayed
  empty. They fall through to upstream's unknown-tool error, whose tool list
  now comes from `offeredTools()`, so it no longer advertises a disabled tool
  (verified: with `send_message` disabled on plain MCP the message lists 14
  tools, omitting `send_message` and `refresh_channels`).
- **Grant churn after startup**: `featureSets/update` cycled through
  `FULL_GRANT → [] → FULL_GRANT → ['tools']`; `tools/list` omitted the tool
  every time and no call executed. With the `tools` capability absent the
  protocol denial wins (`RpcError -32002 Capability denied: tools`), which is
  the required precedence; with it present the operator refusal applies.
- **MCPL vs MCP**: both covered by the implementer's loops and by my probes.
- **Embedded constructor without `startupSettings`**: validates and throws, and
  it throws *before* `setupSlackForwarding()`, so a rejected construction
  registers no Slack handlers. Consistent with upstream style — `src/server.ts`
  already throws for programmer misuse (`:278` "A client is already
  connected"); `grep` shows these are the only two constructor/entry throws in
  `src/`. Only the message is below house standard (LOW above).
- **Host-driven paths that are *not* the tool surface** do proceed —
  `channels/publish`, automatic backscroll, ack reactions, `state/rollback`.
  That is the design (the fork is identical); only the doc enumeration is
  incomplete (MEDIUM above).

### 4. Tests

Meaningful, and genuinely red without the change. I rebuilt upstream
`d3e4f7c` in scratch, dropped in only the three changed test files, and ran
them (`probes/red.log`): **17 pass / 10 fail** — all 9 new tests plus the
`cli.test.ts` complete-settings expectation. Same tree with the commit's
sources: **27/0** (`probes/green.log`).

My own mutations, each run over all three files:

| mutation | result | caught by |
|---|---|---|
| A — delete the `handleToolCall` refusal, keep the listing filter | 21/6 | both MCP+MCPL refusal tests, all-16 tests, copy test, CLI wiring test |
| B — move the refusal **above** the `capabilityDenied('tools')` throw | 26/1 | `… hidden and refused … (MCPL)` — the precedence assertion is real |
| C — drop the defensive `this.opts` copy | 26/1 | `disabled-tool options are validated and copied at construction` |
| D — make the unknown-name check case-insensitive | 26/1 | `unknown disabled tool names return a clean refusal naming the bad value` |
| E — dedupe the parsed list | 26/1 | `disabled tools parse exact comma-separated names …` |
| F — delete `disabledTools,` from the `index.ts` constructor call (reproducing the implementer's claim) | 26/1 | **only** `index wires SLACK_DISABLED_TOOLS through to the stdio server` |

F confirms the implementer's central claim: unit coverage of the parser and
the server cannot substitute for the entry-point test, which the fork lacked.
Logs: `probes/mut-A…F-*.log`.

CLI child-process wiring is real, not theatre: it spawns the actual
`src/index.ts`, replaces only `WebClient.prototype.apiCall` and
`SocketModeClient.prototype.start/disconnect`, throws on any unexpected Slack
method, drives a genuine MCP handshake over the child's stdio, and asserts
both the hidden tool and a still-working `find_user`. Not flaky: 8 consecutive
clean runs of the two files — 5× on Node 22.23.3, 3× on 24.22.1, 23/0 every
time (`probes/repeat22-*.log`, `probes/repeat24-*.log`), plus the floor run
below. No nested same-property mocks: each prototype property is assigned
exactly once, inside a disposable child process; in-process tests use the
repo's `fakeSlack` fakes. `node:test`'s mock API is not used at all.

Test-substance notes worth keeping: the listing assertion compares against a
*separately constructed unconfigured server*, so it pins order and content
rather than mere absence; the copy test mutates the caller's array in place
*and* reassigns the property; the MCPL branch asserts `channels/publish` still
posts and that revoking capabilities restores the protocol denial.

### 5. Docs

- `README.md:332` — row is in the single env table (the only such table; the
  only other env mention is the required-tokens run example, which lists
  nothing optional), placed between `SLACK_SUBSCRIBE_MEMBER_CHANNELS` and
  `SLACK_DISABLE_DMS`, matching the order added to `src/index.ts`'s header.
  Every clause checks out against behaviour I exercised: hidden from
  `tools/list` and refused on direct calls in both modes ✓; any tool
  disable-able including history/reply ✓; grants don't override ✓; whitespace
  and empty entries ignored ✓; unset/empty disables nothing ✓; unknown names
  stop startup naming the value ✓; backscroll and `channels/publish`
  unaffected ✓. Incomplete only as described in the MEDIUM.
- `changelog.d/disabled-tools.added.md` — one bullet, two-space continuation
  lines, no heading or rule; slug unique among the 34 pending fragments and
  filesystem-safe; matches the CI regex
  `^changelog\.d/[^/]+\.(breaking|added|changed|fixed)\.md$`
  (`.github/workflows/changelog.yml:33`) and is an *added* file, which that
  check requires. `added` is the right category: a new operator-visible
  environment variable, nothing pre-existing changed or fixed, no audience
  migration — so `breaking`'s audience/migration/unchanged shape does not
  apply. Content is accurate. Receipts `changelog-ci` and `release-fold`
  (exit 0, this commit) cover the CI check and the dry fold.
- `src/index.ts:20` header comment added in the same position. Consistent.

### 6. Fresh full suite on both runtimes vs baseline 584

| runtime | gate | result | source |
|---|---|---|---|
| 22.23.3 | `npm ci --ignore-scripts --registry=…` → `npm test` | **593 pass / 0 fail / 0 skipped / 0 cancelled / 0 todo** | my gates `review-npm-ci-node22`, `review-node22-fresh` |
| 24.22.1 | same | **593 / 0**, 0 skipped | reused receipt `final-node24-fresh` (exit 0, this commit) |
| 22.23.3 | `npm run typecheck` | pass | my gate `review-typecheck-node22` |
| 24.22.1 | typecheck + build | pass | reused receipts |

Baseline confirmed from the implementer's logs: **584 / 0** on both runtimes
(`baseline-node22.log`, `baseline-node24.log`). Delta **+9, all passing**,
matching the 9 new tests. The Node 24.22.1 tarball I reused for the repeat
runs re-verified against the official `SHASUMS256.txt` (`OK`).

Extra, beyond the brief: the engines floor. CI runs Node 22.12.0, and two new
tests assert *exact* child-process stderr, which warning drift would break. I
downloaded 22.12.0 (checksum verified `OK`) and ran `config` +
`operatorControls` + `cli`: **27 / 0** (`probes/floor-2212.log`). So the
exact-stderr assertions hold on the floor, 22.23.3 and 24.22.1.

### 7. PR body draft

Accurate. Every number I could check reproduced: 584 baseline and 593 after on
both runtimes; "all nine new tests fail against unchanged upstream production
code" (I measured 10 failures — the 9 new ones plus the modified `cli.test.ts`
expectation, which the body does not claim either way); "removing the CLI
forwarding line fails the new executable wiring test" (mutation F: exactly one
failure, that test); changelog fold and CI check receipts exist. The
Problem/Changes/Tests + Not verified + Out of scope shape matches
`CONTRIBUTING.md`, and the companion-PR question is answered explicitly. Three
fixes before posting: the missing AI footer and the now-stale 22.12.0 caveat
(LOW above), and I'd widen the "not an operation-wide restriction" sentence the
same way as the README (MEDIUM above).

## Verification Gates

Mine, wrapped (reusable receipts in `$ORGASMIC_EVIDENCE_DIR`):

| gate | command | outcome | log |
|---|---|---|---|
| `review-npm-ci-node22` | `timeout 900 npm ci --ignore-scripts --registry=https://registry.npmjs.org` | exit 0 | `gate-review-npm-ci-node22-01M625Z0ZTCPRQRK3AM4J3JT82.log` |
| `review-typecheck-node22` | `timeout 900 npm run typecheck` | exit 0 | `gate-review-typecheck-node22-01M6261V606JK2M0VQABGV7TMF.log` |
| `review-node22-fresh` | `timeout 900 npm test` | exit 0 — 593/0 | `gate-review-node22-fresh-01M625Z44ZGFMF2C040DANJYMV.log` |

Reused receipts at this commit, read not re-run: `final-node24-fresh` (593/0),
`final-typecheck-node24`, `final-build-node24`, `final-npm-ci-node24`,
`changelog-ci`, `release-fold`, `runtime-preflight`. Baselines read from the
implementer's `baseline-node22.log` / `baseline-node24.log`.

Unwrapped scoped probes (no receipts, artifacts in `$ORGASMIC_EVIDENCE_DIR/probes`,
all run outside the tracked tree in `/tmp/review-e40f7` copies):
red reproduction (`red.log`), green control (`green.log`), six mutations
(`mut-A…F`), five in-process bypass/behaviour probes
(`probe.log`, `probe2.log`, sources `zz-review-probe*.test.ts`), hostile-value
and upstream-parity CLI probes (`hostile.log`, `parity.log` + `.mjs` sources),
Node 22.12.0 floor run (`floor-2212.log`), 8 repeat runs
(`repeat22-*.log`, `repeat24-*.log`). Environment for every probe:
`probes/env.sh` — notifiers off, two distinct empty npm config files outside
the repo, `audit`/`fund` off, loopback-only listener guard inherited via
`NODE_OPTIONS`, suites under `timeout`.

## Unmet criteria / test gaps

Acceptance criteria are met: one commit on current upstream main, only the
needed files; tests in `test/config.test.ts` and `test/operatorControls.test.ts`
including the `src/index.ts` wiring the fork left untested; red without the
change (reproduced) and mutations red (six, mine); typecheck, build and the
one-process suite on both runtimes; `changelog.d` fragment and README row;
public-safe text only (no tokens, workspace IDs, or private references in the
diff or docs). Remaining gaps, all acceptable:

- No test asserts the documented exemptions. `channels/publish` is covered,
  but nothing pins "backscroll and the ack reaction keep working with their
  tools disabled" or "rollback still deletes" — today only my throwaway probes
  do. If the README is going to enumerate exemptions, one small test would
  stop a future refactor from silently widening the setting into an
  operation-wide ban.
- No test covers `--tcp` with a disabled tool; the wiring test is stdio-only.
  The setting is transport-independent and the server is shared, so this is
  thin risk.
- No coverage of `SLACK_DISABLED_TOOLS` interacting with `SLACK_SEND_CHANNELS`
  / `SLACK_DISABLE_DMS` (e.g. `send_dm` disabled *and* not writable). The
  filters compose by `&&`, so the combination is structurally safe.
- The suite does not pin that the unknown-tool error message no longer lists
  disabled tools (my probe does).

## Residual risk

- Linux-only, two runtimes for the full suite plus a targeted run on the
  22.12.0 floor. CI also runs macOS and a full floor suite — not reproduced
  here.
- No live Slack workspace. All Slack I/O is faked or prototype-replaced; the
  disabled-tool gate sits strictly above the adapter, so live behaviour adds
  little new risk.
- The 1-line-exact-stderr assertions depend on the child inheriting no
  warning-producing `NODE_OPTIONS`. Upstream's existing `cli.test.ts` test has
  the same dependence, so it is pre-existing house style.
- `config.ts` is no longer import-free: it now pulls `tools.ts` →
  `history-read.ts` → `content`/`framing`/`near-miss`. No cycle (none of those
  import `config`), both consumers already load the server, and the fork does
  the same. Noted, not a finding.
- Host-driven Slack writes (rollback, publish) and server-initiated ones
  (backscroll, ack reactions) remain outside the setting by design — the
  MEDIUM is about saying so, not about changing it.

## Fix directions

1. Widen the README row's exemption clause (and the matching PR-body sentence)
   to name `state/rollback` and ack reactions, or state the general rule
   instead of a partial list. Optionally add one test pinning it.
2. Name the offending tool in `src/server.ts:259`'s throw.
3. Append the effective disabled-tool set to the existing startup log line in
   `src/index.ts`.
4. Collapse the three CLI bootstraps onto one shared helper, move the refusal
   test next to its sibling in `test/cli.test.ts`, and use the house 30 s
   spawn timeout.
5. Add an example value to the README row.
6. Before posting: add the CONTRIBUTING AI footer to the PR body, drop the
   stale 22.12.0 line from "Not verified" (the new tests pass there — cite
   `probes/floor-2212.log`), and rename the branch to `feat/…` if the owner
   wants house convention.

None of these change behaviour; 1 and 6 are the two I would actually ask for
before merge.
