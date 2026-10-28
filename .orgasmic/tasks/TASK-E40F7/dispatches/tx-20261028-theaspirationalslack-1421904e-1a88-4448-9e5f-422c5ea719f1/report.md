# Disabled-tool controls — round 2

## Changed

### Preflight and local commits

Preflight confirmed clean `c1c09cd8ac24152d96e896057805afe5c810879b` on
`task-e40f7-impl`. A fresh read-only fetch returned upstream main
`d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`, unchanged; no rebase was needed.

- Polish commit, retained atop round 1 on `task-e40f7-impl`:
  **`58da36c01fe82918e5c6b30967a761aae139ea52`**.
- Final squash, checked out on the new local branch `pr/disabled-tools`:
  **`76f97f57b9b46aee560b8cef7cdd851f165127b0`**.
- The squash has exactly one parent, the fetched upstream main, and exactly
  one commit above it. Its title is **Add operator setting to disable tools**.
- Both branch tips have the identical tree:
  **`91e7cd867d10095549775521cc0584d443c368c8`**.
  `git diff --exit-code HEAD task-e40f7-impl` is empty.
- Both new commits use the default author, wrapped bodies and the required
  `Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer.
- Working tree is clean; `git diff --check` passes. No push, PR, comment,
  merge or release-version change was made. Evidence: `commits-and-tree.log`.

### Review changes

1. README, fragment and the PR draft now state the general boundary:
   **only the agent's tool surface is affected**. Server-initiated and
   host-driven Slack calls are unaffected, including automatic backscroll,
   acknowledgement reactions, MCPL `channels/publish` and `state/rollback`.
   The README includes the requested subscription-tool example.
2. A small fake-backed integration test disables `add_reaction` and
   `delete_message`, proves direct calls are refused without effects, then
   proves an automatic acknowledgement posts and a host rollback deletes
   the message sent by an enabled tool. No nested property mocks were added.
3. The constructor names the first invalid tool using JSON quoting:
   `Unknown disabled tool: <quoted name>`. Its test checks exact messages,
   including a newline-bearing name.
4. The existing startup summary appends `; tools off: ...`, deduplicating
   the effective set and reporting `none` when empty. Tests cover both
   populated and default summaries.
5. The CLI refusal test now lives beside its sibling in `test/cli.test.ts`
   and reuses `startWith()`. Both synchronous refusal/startup tests and the
   asynchronous stdio wiring test use `test/cliHarness.ts`: one hermetic
   bootstrap, sanitized environment and the house **30-second spawn timeout**.
   SDK replacements are confined to disposable child processes.
6. **Optional choice:** retain the first unknown name rather than enumerate
   every unknown name. This keeps the existing single-refusal contract and
   small parser unchanged; the first offending value is sufficient to
   identify the immediate configuration error. Constructor and environment
   diagnostics now follow the same first-invalid-name convention.

Production remains limited to three files, **+25/-5, 20 net lines** versus
upstream. No dependency, lockfile, main harness or generated-file changes.
The polish itself changes eight files, +93/-64. Final squash diff:

```text
 README.md                           |   1 +
 changelog.d/disabled-tools.added.md  |   8 +++
 src/config.ts                       |  10 ++-
 src/index.ts                        |   6 +-
 src/server.ts                       |  14 +++-
 test/cli.test.ts                    |  37 +++++-----
 test/cliHarness.ts                  |  29 ++++++++
 test/config.test.ts                 |  25 ++++++-
 test/operatorControls.test.ts       | 135 +++++++++++++++++++++++++++++++++++-
 9 files changed, 239 insertions(+), 26 deletions(-)
```

### Fragment verbatim

```markdown
- Operators can set `SLACK_DISABLED_TOOLS` to comma-separated tool names to
  hide them from tool listings and refuse direct calls in MCP and MCPL.
  Unknown names stop startup with a clean diagnostic naming the bad value;
  unset or empty leaves existing tool availability unchanged. Startup logs
  the effective disabled set. Only the agent's tool surface is affected:
  server-initiated and host-driven Slack calls (including automatic backscroll,
  acknowledgement reactions, MCPL `channels/publish` and `state/rollback`)
  are not.
```

## Verification Gates

All commands below ran through
`orgasmic dispatch gate <name> -- timeout 900 <command>`.
Logs are relative to this report's evidence directory and include their
immutable gate-receipt log paths. All final gates report the squash SHA and
`clean=yes`. No earlier pass substitutes for a current final gate.

### Environment

`environment.sh` records reproduction settings. Notifiers were disabled
from this round's first command. Installs used distinct empty user/global
npm config files outside the repo, `npm_config_audit=false`,
`npm_config_fund=false`, and exactly:

```sh
npm ci --ignore-scripts --registry=https://registry.npmjs.org
```

Node 22.23.3 remains on the normal PATH; other runtimes are selected only
for their checks. Node 24.22.1 remains in external scratch; its retained
archive was checked again against the official SHASUMS256.txt downloaded in
round 1. Node 22.12.0 and its official SHASUMS256.txt were freshly downloaded
from `https://nodejs.org/dist/v22.12.0/` into external scratch and verified
before extraction. SHA-256 checks passed:

```text
24.22.1 linux-x64: 6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6
22.12.0 linux-x64: 22982235e1b71fa8850f82edd09cdae7e3f32df1764a9ec298c72d25ef2c164f
```

Evidence: `node24-checksum.log`, `node2212-checksum.log`.
Every suite and CLI child inherited `NODE_OPTIONS=--require=<guard>`.
`loopback.cjs` rejects listeners not explicitly bound to 127.0.0.1 or ::1.
The fresh `r2-runtime-preflight` gate validates that guard, runtime, notifier
settings and distinct empty npm configs. Builds stay in the worktree's
ignored build directory, not evidence.

### Inherited evidence and limits of reuse

The initial behavior analysis and Step 0 are preserved in
`inherited-round1-report.md`. Its syntax/default/snapshot/grant analysis
remains applicable; this report supersedes its narrower documentation of
non-tool exemptions and its historical final SHA/verification summary.

The unchanged upstream commit, lockfile, runner and runtime versions make
round 1's **584/0** Node 22.23.3 and 24.22.1 baselines valid numerical
comparators. Copies: `inherited-baseline-node22.log` and
`inherited-baseline-node24.log`. They are **historical baseline evidence,
not final-squash receipts**. Likewise, round 1's 593/0 result establishes
the previous test count only. All assigned current checks were rerun.

### Red/green and mutation checks

The focused command is:

```sh
node --import tsx --test --experimental-test-isolation=none \
  test/config.test.ts test/operatorControls.test.ts test/cli.test.ts
```

The exemption-only command is:

```sh
node --import tsx --test --experimental-test-isolation=none \
  --test-name-pattern='disabled reaction and deletion tools' \
  test/operatorControls.test.ts
```

| Gate | Command | Result | Log |
|---|---|---|---|
| r2-install | npm ci command above | Pass | `r2-install.log` |
| r2-red-diagnostics | Focused, new tests with c1c09cd production | Expected red: **26 pass / 3 fail** | `r2-red-diagnostics.log` |
| r2-red-ack-exemption | Exemption-only, temporary overbroad acknowledgement suppression | Expected red: **0 pass / 1 fail** | `r2-red-ack-exemption.log` |
| r2-red-rollback-exemption | Exemption-only, temporary disabled-delete rollback refusal | Expected red: **0 pass / 1 fail** | `r2-red-rollback-exemption.log` |
| r2-green-focused | Focused, polished code with mutations removed | **29 pass / 0 fail** | `r2-green-focused.log` |
| r2-development-typecheck | `npm run typecheck` | Pass | `r2-development-typecheck.log` |
| r2-floor-focused-precommit | Focused, Node 22.12.0 | **29 pass / 0 fail** | `r2-floor-focused-precommit.log` |

The three initial failures are the exact constructor diagnostic and the two
startup-log expectations. The exemption is already implemented correctly in
c1c09cd; this is a documentation correction plus regression coverage, not a
new runtime exemption. To establish red/green for that test independently:

- Temporarily assign a no-op `slack.acknowledge` in the server constructor
  when `add_reaction` is disabled: the test fails waiting for the automatic
  acknowledgement.
- Separately, temporarily return `success: false` from `handleRollback` when
  `delete_message` is disabled: the test fails its rollback-success assertion.

Both mutations were restored before either commit. The same test passes in
the unmutated focused and full suites. These expected-red diagnostics are
not unresolved failures or claimed passing receipts.

### Fresh gates at the squash

| Runtime | Gate | Command | Result | Log |
|---|---|---|---|---|
| 22.23.3 | r2-final-ci-node22 | npm ci command above | Pass | `r2-final-ci-node22.log` |
| 22.23.3 | r2-final-typecheck-node22 | `npm run typecheck` | Pass | `r2-final-typecheck-node22.log` |
| 22.23.3 | r2-final-build-node22 | `npm run build` | Pass | `r2-final-build-node22.log` |
| 22.23.3 | r2-final-suite-node22 | `npm test` | **595 pass / 0 fail** | `r2-final-suite-node22.log` |
| 24.22.1 | r2-final-ci-node24 | npm ci command above | Pass | `r2-final-ci-node24.log` |
| 24.22.1 | r2-final-typecheck-node24 | `npm run typecheck` | Pass | `r2-final-typecheck-node24.log` |
| 24.22.1 | r2-final-build-node24 | `npm run build` | Pass | `r2-final-build-node24.log` |
| 24.22.1 | r2-final-suite-node24 | `npm test` | **595 pass / 0 fail** | `r2-final-suite-node24.log` |
| 22.12.0 | r2-final-floor-focused | Focused command above | **29 pass / 0 fail** | `r2-final-floor-focused.log` |
| 22.23.3 | r2-release-fold | `node "$ORGASMIC_EVIDENCE_DIR/release-fold.mjs"` | Pass | `r2-release-fold.log` |
| 22.23.3 | r2-changelog-ci | `bash "$ORGASMIC_EVIDENCE_DIR/changelog-ci.sh"` | Pass | `r2-changelog-ci.log` |
| 22.23.3 | r2-runtime-preflight | `node "$ORGASMIC_EVIDENCE_DIR/runtime-preflight.mjs"` | Pass | `r2-runtime-preflight.log` |

The full runner remains the upstream one-process runner. Both full suites
have **zero skipped, cancelled or todo tests**: **+11** tests over upstream
584, **+2** over round 1's 593 (exemption and default-log tests). The final
floor-focused run also has no skips/cancellations/todos.

The dry fold copied release inputs into scratch, folded all **34** fragments
into synthetic version 99.0.0, and checked this exact fragment occurs once
and all consumed fragments disappear from scratch. No real release files
changed. The changelog check uses the workflow's exact added-file regex and
the upstream-to-squash diff.

## PR body draft

### Problem

Operators need to remove selected tools without disabling the connector's
remaining MCP or MCPL functionality.

### Changes

- Add `SLACK_DISABLED_TOOLS`, for example
  `SLACK_DISABLED_TOOLS=subscribe_channel,unsubscribe_channel`.
- Parse it through startupSettings. Unknown names produce a clean refusal
  naming the invalid value before connecting to Slack; unset or empty keeps
  existing availability. Startup logs the effective disabled set.
- Hide disabled tools from listings and refuse direct calls in MCP and MCPL.
  Preserve capability checks and snapshot the constructor options.
- Document the boundary: **only the agent's tool surface is affected**.
  Server-initiated and host-driven Slack calls, including automatic
  backscroll, acknowledgement reactions, MCPL `channels/publish` and
  `state/rollback`, are unaffected. Existing conversation/DM restrictions
  still apply to those operations.
- Include a changelog fragment and hermetic CLI/integration coverage.

### Tests

- Upstream baseline: 584 pass / 0 fail on Node 22.23.3 and 24.22.1.
- Final full suites: **595 pass / 0 fail** on both, with no skipped or
  cancelled tests; failure count unchanged from upstream.
- Fresh npm ci, typecheck and build pass on both runtimes.
- Node 22.12.0: all 29 config/operator-controls/CLI tests pass.
- Constructor/log expectations fail before the polish. Separate mutations
  suppressing acknowledgements and rollback each fail the exemption test;
  restoring the intended tool-only boundary makes it pass.
- Release-changelog dry fold and CI fragment regex check pass.

### Not verified

No live Slack workspace or macOS run. CLI tests execute the real entry point
and stdio server with external Slack SDK boundaries mocked.

### Out of scope

Zero automatic backscroll, recipient routing, access policy, path uploads
and thread status. No companion PR is required.

🤖 Generated with GPT-6-Astra

### Contribution disclosure rule followed

CONTRIBUTING.md requires a “footer (or equivalent for your tooling) in the
PR body” and “a `Co-Authored-By:` trailer naming the model in commits.”
The draft uses the requested equivalent footer; both new commits carry the
required trailer. This explanation is report metadata, not part of the
proposed PR body.

## Unmet Criteria

None. The requested polish, two-branch commit shape, exact tree equality,
fresh final runtime checks and release/changelog evidence are complete.
The optional all-unknown-names enhancement was deliberately not selected,
for the reason above. Publishing remains intentionally unperformed.

## Residual Risk

- Verification is Linux-only and uses fake Slack boundaries, not a live
  workspace or external-client deployment.
- Node 22.12.0 qualification covers the three requested test files, not the
  entire repository suite; both requested newer runtimes have full coverage.
- Tool disabling intentionally does not block server-initiated or host-driven
  operations. The documentation and new exemption test now make that boundary
  explicit; this feature is not an operation-wide authorization policy.
