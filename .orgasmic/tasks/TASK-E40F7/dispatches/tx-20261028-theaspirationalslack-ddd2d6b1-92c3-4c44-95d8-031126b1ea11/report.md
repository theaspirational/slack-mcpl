# Disabled-tool controls

## Step 0 — recorded before coding

The read-only upstream fetch returned
`d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`, unchanged from the brief.
The reference implementation is `685b2deb`; the plan is
`a2295638:docs/FORK-VS-UPSTREAM.md`. Supplied baseline and repository
contribution/changelog instructions were read; no additional conventions
or gotchas were supplied.

### Exact reference behavior

- `SLACK_DISABLED_TOOLS` is the only environment variable for this control.
  Split on commas, trim each name, discard empty entries. Unset, empty,
  whitespace-only and comma-only values disable nothing. Names are exact and
  case-sensitive; duplicates are accepted. Unknown names reject startup.
- All 16 definitions can be disabled: `send_message`, `reply_message`,
  `upload_file`, `send_dm`, `add_reaction`, `edit_message`, `delete_message`,
  `list_channels`, `refresh_channels`, `fetch_history`, `fetch_thread`,
  `find_user`, `fetch_attachment`, `subscribe_channel`,
  `unsubscribe_channel`, `list_subscriptions`.
- Disabled tools are absent from `tools/list` in both MCP and MCPL. A direct
  `tools/call` returns `isError: true` and
  `Tool '<name>' is disabled by operator configuration`; no execution occurs.
  MCPL's missing `tools` capability still takes precedence as a protocol
  denial. Feature-set grants do not override the operator setting.
- There are no exempt/required tool names. Explicit calls, including explicit
  history/thread reads, cannot bypass disabling. Required schema arguments
  remain unchanged for enabled tools. This is not a ban on underlying Slack
  operations: automatic history and MCPL `channels/publish` are independent.
  Existing DM and MCPL-only availability filters remain in force.
- The embedded server option is `disabledTools?: readonly string[]`; unknown
  names throw at construction, and a copied options object/list prevents
  caller mutation from changing policy later.

### Upstream validation and refusal today

At the fetched baseline, `src/config.ts:23-54` returns a discriminated
`{settings}` / `{refusal}` result. Mode and token checks are at lines 27-34,
comma-list parsing and empty write-list refusal at 36-41, and boolean parsing
with caught errors at 42-49. `booleanFlag` quotes invalid values using JSON
at lines 7-8. `src/index.ts:40-44` prints the refusal once and exits 1 before
`connectSlack` at line 50; thrown errors instead reach its fatal-error handler.
The reference's separate configuration parser throws a generic unknown-tool
error, so it must not be transplanted.

### Smallest upstream shape and interpretation

Use the existing list parser and tool definitions in `src/config.ts`, return
an explicit refusal naming the first invalid value via JSON quoting, carry the
parsed list through `src/index.ts`, and add constructor validation/snapshot,
listing filtering and direct-call refusal in `src/server.ts`. Three production
files, well below 250 net lines; no separate parser or routing/policy dependency
is necessary. Tests belong in config/operator-controls, plus executable CLI
coverage of both valid wiring and clean invalid-setting refusal.

The plan's O row contains two independent controls, but orders zero automatic
backscroll separately as PR 2 and disabled tools as PR 3. This PR does not
silently incorporate PR 2. The document's sibling-fold guidance explicitly
requires H with A, recommends S with F, and incorporates E when its validators
are introduced; none is an O prerequisite. Copied-option protection is part
of disabled tools and will be included, not deferred. No recipient fixture,
access policy, or unrelated sibling feature will be imported.


## Changed

Final local commit: `c1c09cd8ac24152d96e896057805afe5c810879b`.
Its sole parent is the fetched upstream head; exactly one commit was added.
Working tree is clean. No push, PR, or GitHub comment was made.

- `src/config.ts`: pure startup parsing and clean, quoted unknown-name refusal.
- `src/index.ts`: carries the validated setting into the server constructor.
- `src/server.ts`: validates and copies options, filters listings, and refuses
  direct calls before execution, without overriding MCPL capability denial.
- `test/config.test.ts`: syntax/default/all-name coverage, rejection and actual
  entry-point refusal before any Slack contact.
- `test/operatorControls.test.ts`: MCP/MCPL listing equality against an
  unconfigured control, direct refusal and no effects, all 16 names, unchanged
  enabled calls/publish, capability precedence, option copying, and executable
  stdio wiring with only Slack SDK boundaries replaced in a child process.
- `test/cli.test.ts`: existing complete-settings expectation includes the new
  empty default. README row and behavior-specific changelog fragment included.
- No dependency, lockfile, generated-file, harness, or release-version changes.
  Build output remains ignored in the worktree. Runtime downloads, isolated
  npm configs and release-fold output are outside the repository.

Production delta: **3 files, +23/-4 (19 net lines)**. Overall:

```text
 README.md                           |   1 +
 changelog.d/disabled-tools.added.md  |   4 ++
 src/config.ts                       |  10 ++-
 src/index.ts                        |   4 +-
 src/server.ts                       |  13 +++-
 test/cli.test.ts                    |   1 +
 test/config.test.ts                 |  45 +++++++++++++-
 test/operatorControls.test.ts       | 120 +++++++++++++++++++++++++++++++++++-
 8 files changed, 191 insertions(+), 7 deletions(-)
```

### Fragment verbatim

```markdown
- Operators can set `SLACK_DISABLED_TOOLS` to comma-separated tool names to
  hide them from tool listings and refuse direct calls in MCP and MCPL.
  Unknown names stop startup with a clean diagnostic naming the bad value;
  unset or empty leaves existing tool availability unchanged.
```

## Verification Gates

Every suite used `orgasmic dispatch gate <name> -- timeout 900 <command>`.
Log filenames below are relative to this report's evidence directory; each
contains the corresponding durable gate-receipt log path. `environment.sh`
records the exact reproduction environment. Gates were run, not reused from
another task. All final gates identify the final SHA and `clean=yes`.

### Environment and safety

- Node **22.23.3** was on PATH from the first command. Both notifier variables
  were disabled from the first command onward.
- Every install used `npm ci --ignore-scripts
  --registry=https://registry.npmjs.org`, two distinct empty user/global npm
  config files outside the repo, and `npm_config_audit=false` /
  `npm_config_fund=false`.
- Node **24.22.1** was downloaded into scratch from
  `https://nodejs.org/dist/v24.22.1/node-v24.22.1-linux-x64.tar.xz` and compared
  with that directory's official `SHASUMS256.txt` using `sha256sum -c`:
  `6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`.
  Receipt: `node24-checksum.log`.
- `NODE_OPTIONS=--require=<scratch>/loopback.cjs` was inherited by all test
  processes, including CLI children. It rejects listeners unless explicitly
  bound to `127.0.0.1` or `::1`. `runtime-preflight` additionally verifies
  rejection of unspecified, wildcard and hostname binds, acceptance of IPv4
  loopback, Node version, notifier settings and empty npm configurations.
  Script/receipt: `runtime-preflight.mjs`, `runtime-preflight.log`.
- No nested mocks of the same property were added. CLI SDK replacements run
  only inside disposable child processes; in-memory server tests use fakes.

### Baseline, red/green and mutation

| Gate | Command after wrapper | Result | Log |
|---|---|---|---|
| initial-install | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass | `initial-install.log` |
| baseline-node22 | `npm test` | 584 pass / 0 fail | `baseline-node22.log` |
| baseline-node24 | `npm test` | 584 pass / 0 fail | `baseline-node24.log` |
| red-disabled-tools | `node --import tsx --test --experimental-test-isolation=none test/config.test.ts test/operatorControls.test.ts` | Expected red: 14 pass / 9 fail | `red-disabled-tools.log` |
| red-final-tests | Same two-file command, final test content against unchanged upstream production | Expected red: 14 pass / 9 fail | `red-final-tests.log` |
| green-disabled-tools-fixed | Same command plus `test/cli.test.ts` | 27 pass / 0 fail | `green-disabled-tools-fixed.log` |
| mutation-cli-wiring | Two-file command after deleting only the constructor's `disabledTools,` forwarding line in `src/index.ts` | Expected red: 22 pass / 1 fail | `mutation-cli-wiring.log` |

All nine new tests fail without the production change. The mutation fails
only `index wires SLACK_DISABLED_TOOLS through to the stdio server`, proving
that parser/server unit coverage cannot substitute for the entry-point test.
The mutation was restored before committing; `cli-wiring.patch` records the
final forwarding change.

One development green attempt failed **26/1** because the new MCPL comparison
fixture lacked its own capability grant (`green-disabled-tools.log`). This
was a test-fixture error, not a product failure: granting both comparison
connections fixed it. It is not claimed as passing evidence.
`development-typecheck.log` also passed before the final committed reruns.

### Fresh gates at the final commit

| Runtime | Gate | Command after wrapper | Result | Log |
|---|---|---|---|---|
| 22.23.3 | final-npm-ci | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass | `final-npm-ci.log` |
| 22.23.3 | final-typecheck | `npm run typecheck` | Pass | `final-typecheck.log` |
| 22.23.3 | final-build | `npm run build` | Pass | `final-build.log` |
| 22.23.3 | final-node22 | `npm test` | **593 pass / 0 fail** | `final-node22.log` |
| 24.22.1 | final-npm-ci-node24 | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass | `final-npm-ci-node24.log` |
| 24.22.1 | final-typecheck-node24 | `npm run typecheck` | Pass | `final-typecheck-node24.log` |
| 24.22.1 | final-build-node24 | `npm run build` | Pass | `final-build-node24.log` |
| 24.22.1 | final-node24-fresh | `npm test` | **593 pass / 0 fail** | `final-node24-fresh.log` |
| 22.23.3 | release-fold | `node "$ORGASMIC_EVIDENCE_DIR/release-fold.mjs"` | Pass | `release-fold.log` |
| 22.23.3 | changelog-ci | `bash "$ORGASMIC_EVIDENCE_DIR/changelog-ci.sh"` | Pass | `changelog-ci.log` |
| 22.23.3 | runtime-preflight | `node "$ORGASMIC_EVIDENCE_DIR/runtime-preflight.mjs"` | Pass | `runtime-preflight.log` |

Both baselines and final suites have **zero skipped, cancelled or todo tests**.
Each final suite adds **9 passing tests** over its own upstream baseline;
failure count remains zero. An additional `final-node24` run before the
Node-24-specific reinstall also passed 593/0 (`final-node24.log`).

The release dry fold copied changelog inputs into scratch, used synthetic
version `99.0.0`, folded all **34** pending fragments, and asserted that this
fragment appeared exactly once and every consumed fragment was removed from
scratch. The real changelog/package were untouched. The CI check uses the
repository workflow's exact added-file regex and compares upstream to final
HEAD. Final `git diff --check` passed and the tree remained clean.

## PR body draft

### Problem

Operators cannot selectively remove tools while retaining the rest of the
connector's MCP or MCPL functionality.

### Changes

- Add `SLACK_DISABLED_TOOLS`, accepting comma-separated exact tool names.
- Validate through startupSettings; unknown names produce a clean startup
  refusal naming the invalid value before connecting to Slack.
- Hide disabled tools and refuse direct calls in MCP and MCPL, with copied
  constructor options and existing capability/availability checks preserved.
- Document defaults and limits, and include a changelog fragment.

This is tool-level control, not an operation-wide restriction: automatic
backscroll and MCPL channels/publish remain independent. No companion PR or
routing/access-policy feature is required.

### Tests

- Upstream baseline: 584 pass / 0 fail on Node 22.23.3 and 24.22.1.
- This change: 593 pass / 0 fail on each runtime, no skips or cancellations.
- Fresh npm ci, typecheck and build pass on both runtimes.
- All nine new tests fail against unchanged upstream production code.
- Removing the CLI forwarding line fails the new executable wiring test.
- Changelog dry fold and CI fragment check pass.

### Not verified

No live Slack workspace, macOS, or minimum-version Node 22.12.0 run.
CLI tests execute the real entry point with Slack SDK boundaries mocked.

### Out of scope

Zero automatic backscroll, recipient routing, access policy, path uploads,
and thread status. This change can land independently.

AI-assisted contribution; model co-authorship is recorded in the commit.

## Unmet Criteria

None. Required implementation, local commit, red/green and mutation evidence,
both runtime matrices, documentation and changelog checks are complete.
Publishing remains intentionally unperformed.

## Residual Risk

- Runtime qualification is Linux-only on the two requested Node versions.
- No live Slack or real external-client composition was exercised. Tests
  cover real parser, entry point, stdio transport and server dispatch, using
  mocked external Slack boundaries.
- Tool disabling intentionally does not block equivalent non-tool operations
  or automatic reads. Operators needing operation-wide restrictions must use
  the existing conversation/DM controls; the README makes this distinction.
- Disabling all tools, including discovery/subscription helpers, is allowed
  to match the reference. A deployment must choose a useful remaining surface.
