# Path uploads — rebuilt on current upstream main

## Changed

**One local commit:** `f1f9eee9e60ef8c80b9bfcf7385cae896c1701da`.
Its sole parent is current upstream main fetched at the start of this run,
`7274283fa719a17328ef8e085336ce25f6f22b08`, not the fork head. Upstream advanced
from the previously reported `ca8f6b1` by merging #54 (test-only changes).
The worktree is clean. Default Git author was used, with the required trailer:

```text
Co-Authored-By: GPT-6-Astra <noreply@openai.com>
```

No push, PR edit, GitHub comment, merge, landing, main-checkout edit, or version
bump was performed. The PR body and comment below are drafts only.

The approved design is preserved: multiple roots, canonical aliases, the
unchanged 301-line Python-backed reader from #31's specified head, explicit
unrestricted mode, and configurable per-file `maxBytes`. Path access remains
off by default. No fork-only access-policy or routing work was imported.

- `src/config.ts`: parse the policy in `startupSettings`; reject malformed,
  unknown-key, invalid-limit, invalid-root and unsupported-runtime policies
  with sanitized refusals before authentication. A real reader probe validates
  capabilities/roots and closes its descriptors; the server subsequently pins
  its own lifetime roots. The unset setting remains absent.
- `src/index.ts`: consume the centralized setting and close the reader at
  shutdown; no duplicate inline environment parser.
- Server/adapter/schema/class integration retains current upstream framing,
  timing, inline validation before allocation, three-step uploads,
  acknowledgement cleanup and rollback. Path reader refusals are introduced as
  “Nothing was uploaded”; upload-step errors retain upstream's outcome handling.
- README includes the environment row and policy-key rows, platform/runtime
  requirements, the broad explicit unrestricted choice, and memory/race limits.
- Three new test files adapt #31's two suites to current startup and the
  one-process runner and add startup refusals. No `fileAccess.test.ts` was
  imported. No nested mocks of the same property/context; builtin mocks are
  restored with ESM export synchronization. No fetch mock was added. New
  filesystem fixtures use owned temporary directories, without `/dev/null`
  reads or broad temp-root capability probes. Shared upload-endpoint entries
  created by these fixtures are removed during cleanup.

**Diff:** 13 files, +1,258 / -54; production subset **8 files, +459 / -49 =
+410 net lines**. No package/lockfile changes. Generated `dist/`, TypeScript
build metadata and installed dependencies are ignored local build artifacts,
not committed or stored in evidence.

```text
 README.md                            | 116 ++++++++++-
 changelog.d/31-path-uploads.added.md |  21 ++
 src/config.ts                        |  21 +-
 src/content.ts                       |   5 +
 src/index.ts                         |   6 +-
 src/server.ts                        | 126 +++++++-----
 src/slack-adapter.ts                 |  17 +-
 src/tool-classes.ts                  |   5 +-
 src/tools.ts                         |  27 +++
 src/upload-path.ts                   | 301 ++++++++++++++++++++++++++++
 test/pathStartup.test.ts             | 114 +++++++++++
 test/pathUploads.test.ts             | 183 +++++++++++++++++
 test/uploadPath.test.ts              | 370 +++++++++++++++++++++++++++++++++++
 13 files changed, 1258 insertions(+), 54 deletions(-)
```

Read the earlier Step 0 report before implementation, the supplied project
baseline, current repository contribution/changelog/template/CI instructions,
and the command-ownership worker page. No applicable AGENTS.md was found;
conventions/gotchas were supplied as absent. Public API reads reconfirmed #31
at `ddf92124e5f120b0576f66c9f989ca13ee9d74b4`, three author issue comments,
zero formal reviews and zero inline review comments. There are **no automated
review findings to answer** in those collections. Evidence: `pr31.json`,
`pr31-comments.json`, `pr31-reviews.json`, `pr31-review-comments.json`.

### New fragment, verbatim

`changelog.d/31-path-uploads.added.md`:

```markdown
- **Operators:** opt in to connector-local `upload_file` paths with a
  `SLACK_PATH_UPLOADS` JSON policy or the embedded server's `pathUploads` option.
  Unset remains inline-only. Restricted mode pins one or more absolute directory
  roots (including root aliases), refuses below-root symlinks and parent traversal,
  and uses an isolated Python 3.9+ worker to check descriptor containment before
  reading and before returning bytes on Linux/macOS. Both enabled modes refuse
  Windows; missing restricted-mode support fails closed without a fallback.
  CLI policy/root/capability errors are refused before Slack authentication,
  without echoing raw configuration or filesystem paths.
- **Operators:** explicit `unrestricted` mode permits any regular file readable
  by the connector account, including through symlinks, without a directory
  boundary or Python dependency. Both modes bound reads from the opened file;
  optional `maxBytes` sets a per-file cap from 1 byte to 1 GiB, defaulting to
  5 MiB. Inline content keeps its 5 MiB cap. Whole files may occupy multiple
  memory copies; this is not a process-memory or concurrency limit.
- Path uploads add the `files` tool class alongside `comms`, may omit `filename`
  to use the path's basename, and retain destination checks before reads and
  uploads, Slack's three-step upload, and rollback. Pinned roots and descriptor
  checks are not immutable snapshots, a perpetual atomic boundary or an OS
  sandbox; hard links, privileged mounts and equivalent account access remain
  outside that boundary.
```

### #31 point → treatment

| #31 point | Treatment in this rebuild |
|---|---|
| Avoid reproducing existing files through model context | Retained: absolute connector-local `path`, not a transfer from a different agent machine. |
| Off by default; explicit JSON; no boolean broad opt-in | Retained; malformed JSON, booleans, null, unknown modes/keys and empty roots refuse through `startupSettings`. |
| Restricted and unrestricted choices | Both retained as explicitly approved. Unrestricted is never the default and permits account-wide regular-file reads, including symlinks. README and replacement body state the risk. **A maintainer may want to drop unrestricted mode.** |
| Exactly one source; basename filename for paths | Retained; inline filename remains required; metadata/source failures occur before file reads or uploads. |
| `comms` plus `files` when enabled | Retained; default schema hides `path` and stays `comms`; hidden path calls still refuse. |
| Multi-root, canonical aliases, pinned descriptors | Retained unchanged in the reader, including most-specific overlapping-root selection and root-replacement refusals. Startup checks root availability without exposing paths. |
| Python 3.9+, isolation, Linux `/proc`, macOS `F_GETPATH` | Reader unchanged; static `-I -S` worker, clean environment, fixed search path, no shell/credentials, directory-relative no-follow opens and actual-FD admission checks. Missing support fails closed. Both enabled modes refuse Windows. |
| Parent traversal, inner symlinks and races | Retained and tested: siblings, `..`, inner links, root replacement, leaf/ancestor moves, unlink and returned-parent/escaped-leaf schedules. No perpetual-containment claim. |
| Regular files, FIFO handling, bounded growth | Retained. Tests use owned files/directories/FIFOs rather than a live device read. Exact caps and cap+1 growth are exercised. |
| Bytes only reach Slack; checks before read and upload | Retained and exercised through the real tool/server/adapter path and a loopback byte endpoint. Destination/DM refusal happens before reader invocation; changed destination policy refuses after the read too. |
| Three upload steps, not SDK path convenience | Current upstream steps are reused unchanged: get URL, POST Buffer, complete upload. |
| Inline validation, framing, timing, acknowledgements, rollback | Kept current upstream implementations. Full one-process suites include their existing tests; new reader refusals have the upload refusal prefix. |
| `maxBytes` follow-up: default 5 MiB, maximum 1 GiB | Retained in both modes; may lower or raise the path cap. 6 MiB files succeed with an 8 MiB policy and fail with the default; inline cap stays 5 MiB. Parent/worker growth checks, early size rejection and bounded allocation are tested. |
| Memory and time-budget caveats | README explicitly describes multiple whole-file copies, per-file rather than process/concurrency limits, 5 s restricted reader and upstream call/upload timing. No 1 GiB live-upload performance claim. |
| Not a sandbox/snapshot; hardlinks/mounts/equivalent privilege | Preserved in README, fragment and replacement body. |
| Exclude consolidated access policy, routing, bridge, deployment, extra scopes | Excluded; no fork `fileAccess.test.ts` or its leaking nested fetch mock. |
| Old #26 dependency, #15/#29 history and tools import conflict | Replace stale stacked/unmerged claims. Current upstream already supplies inline uploads and newer behavior. The actual integration adaptation is centralized startup settings. |
| Old freeze/head/test counts, Mac cleanup failure, claimed independent review/secret scan | Not reused as evidence. Replaced with this run's same-base Linux matrices. No claim that macOS cleanup, historical independent reviews, or a new secret scan was verified here. |
| Automated review/comment findings | None found in refreshed public collections; no invented replies or GitHub writes. |

## Verification Gates

All checks below used `orgasmic dispatch gate <name> -- timeout 900 …`.
Final gates record **the clean final commit** above; baseline gates record the
clean upstream SHA above. Red/mutation/development gates are explicitly dirty
and are not offered as final-commit receipts.

The commands/environment are reproduced in `env.sh`, `final-gates.sh`,
`final-gates.log`, `environment.txt` and `gate-index.md`. Each short log named
below ends with the full unique `gate-…log` receipt path. Controller PID/PGID
is in `final-gates.log`; the gate wrappers owned their child process groups.
All command sessions completed; no detached check remains.

### Environment and dependency discipline

- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` were set from
  the first shell command and on subsequent invocations.
- `/opt/node/bin/node` is **22.23.3**. **24.22.1** and **22.12.0** were downloaded
  into scratch, checked against each version's official nodejs.org
  `SHASUMS256.txt`, and extracted only after successful `sha256sum -c`.
  Evidence: `node-downloads.log`, `SHASUMS256-24.22.1.txt`,
  `SHASUMS256-22.12.0.txt`. Linux x64; Python **3.12.3**.
- Every npm ci used `npm ci --ignore-scripts --registry=https://registry.npmjs.org`
  with two distinct empty user/global configs outside the repo and
  `npm_config_audit=false`, `npm_config_fund=false`. No lockfile regeneration.
- `NODE_OPTIONS=--require=<evidence>/loopback-only.cjs` was in force for all
  tests, including baseline/final suites and the new CLI children. The guard
  refuses listeners without an explicit loopback host. CLI refusal tests add
  an outbound-network tripwire (allowing tsx's local Unix IPC connection only).

### Baseline and final-commit matrix

`npm test` runs `node --import tsx --test --experimental-test-isolation=none test/*.test.ts`.
All suite rows below have **0 fail / 0 skip / 0 cancelled**.

| Runtime | Same-SHA upstream baseline | Final full suite | Final npm ci / typecheck / build |
|---|---:|---:|---|
| Node 22.23.3 | 583 pass | 683 pass | All pass |
| Node 24.22.1 | 583 pass | 683 pass | All pass |
| Node 22.12.0 | 583 pass | 683 pass | Not required; full suite passed |

Logs: `baseline-suite-<version>.log`, `final-suite-<version>.log`,
`final-ci-<version>.log`, `final-typecheck-<version>.log`,
`final-build-<version>.log`. Baseline installation also has
`baseline-npm-ci.log`. Commands for type/build: `npm run typecheck`,
`npm run build`.

| Other final-commit gate | Result / evidence |
|---|---|
| All three new files, five separate one-process runs on 22.23.3 | Each **100 pass / 0 fail / 0 skip**. `final-new-tests-1.log` through `final-new-tests-5.log`. Command: `node --import tsx --test --experimental-test-isolation=none test/pathStartup.test.ts test/pathUploads.test.ts test/uploadPath.test.ts`. |
| Release dry fold | Pass. `node <evidence>/release-dry-fold.mjs` copied release inputs into owned scratch, folded 34 fragments, asserted the new fragment verbatim, its consumption and a single Unreleased heading, then removed scratch. Repository release files untouched. `final-release-dry-fold.log`. |
| Actual changelog CI regex | Pass. `bash <evidence>/changelog-ci.sh` compares parent/base to final HEAD and checks an **added**, flat `changelog.d/….(breaking|added|changed|fixed).md` path with the workflow's regex. `final-changelog-ci.log`. |
| Diff hygiene / one commit / clean tree | `git diff --check HEAD^ HEAD` passed; range count is 1; `git status --porcelain` empty. `commit.txt`, `production-numstat.txt`, `rebuild.diff`. |

### Red/green and deliberate mutations

- **Behavioral startup red:** restored upstream `src/config.ts`, retaining
  the new tests; **1 pass / 21 fail** (`red-startup-network.log`). Invalid
  policies were not refused, and the CLI network tripwire caught attempted
  authentication before any actual network connection.
- **Behavioral path red:** restored upstream `src/server.ts` and selected
  the two enabled-schema tests; **0 pass / 2 fail** (`red-path-schema.log`).
  Both failed at the missing path capability. Other feature dependencies
  remained available; this tests the missing server integration, not import
  failure.
- **Containment mutation:** temporarily replaced the Python leaf
  `commonpath`/root equality rejection with a false condition. Selected
  deterministic containment tests: **2 pass / 4 fail**
  (`mutation-containment.log`); moved leaf/parent and returned-parent cases
  detected the weakened boundary. Root-path/unlink guards still caught their
  separate cases.
- **Byte-cap mutation:** changed the Python post-read cap check to allow
  one excess byte (`size > LIMIT + 1`). Both selected growth tests failed:
  **0 pass / 2 fail** (`mutation-byte-cap.log`). Preflight size checking alone
  was insufficient, as intended.
- Both mutations were restored before committing. Restored tests passed,
  then the final expanded focused set passed **100/100**, and all final gates
  above passed. `src/upload-path.ts` is byte-for-byte #31's reader.

Development-only failed attempts are retained rather than hidden:
`red-path-integration.log` initially failed at a missing constant import and
is **not** behavioral red evidence; the focused server red supersedes it.
`green-new-tests.log` initially failed because the test's overly broad outbound
tripwire also rejected tsx's Unix IPC connection. The tripwire was narrowed to
allow local IPC, not network connections; `green-new-tests-fixed.log` passed.
These are test-harness corrections, not unresolved regressions or flakes.

### Production-path evidence and limits

The new integration tests traverse the real MCP request/server, real
`PathUploadReader` (including Python), real adapter guards and real HTTP POST
of file bytes to an explicitly loopback-only endpoint. Fake initial/completion
Web API methods record all three upload steps. They verify exact bytes,
filename/thread/comment, cap failures with zero upload starts, pre-read
permission refusal and post-read permission revalidation. This is more than a
reader-only stub, but **not a live Slack/OAuth/MCPL-host validation**.

## Unmet Criteria

**None for the assigned local implementation and gates.** Public publishing
was prohibited and remains an owner decision. There were no automated findings
to answer. macOS/Windows runtime execution and live Slack were not required
by the specified Linux matrix and are explicitly not claimed.

## Residual Risk

- Restricted roots are directory capabilities and point-in-time descriptor
  observations, not immutable content or a perpetual atomic sandbox. Hardlinks,
  privileged mount/namespace changes, malicious filesystem services and
  equivalent-account/sudo access remain outside the protection claim.
- Unrestricted mode deliberately has no configured-root boundary. It can read
  sensitive regular files permitted to the connector account. It remains an
  explicit opt-in; **dropping this mode is a reasonable maintainer choice**.
- Large caps and concurrent uploads can consume multiple whole-file copies
  across Node/Python. Per-file byte caps and timeouts do not impose a total
  memory/concurrency budget. Large/slow real uploads were not measured.
- CLI startup validates and closes a capability probe; the server creates its
  lifetime reader afterward. Filesystem/runtime changes between validation and
  server construction can still abort startup. Readers fail closed rather than
  downgrade; the probe is not a snapshot guarantee.
- macOS `F_GETPATH` behavior and cleanup were not executed in this run. Windows
  refusal was unit-tested via platform substitution, not a Windows machine.
  Missing Python/support is mocked; real restricted tests used Linux/Python
  3.12.3. No live Slack upload/deletion, OAuth grant or real host was exercised.

## Replacement PR body for #31 — not posted

### Problem

`upload_file` already accepts inline text/base64, but attaching an existing
report or binary still requires reproducing its bytes in the tool call.
Optional connector-local paths avoid that model-context round trip. The old
branch also conflicted with current main's centralized startup settings.

### Changes

- Rebuild on current upstream main, keeping inline-only as the default.
  `SLACK_PATH_UPLOADS` is an explicit JSON policy, also available as the
  embedded server's `pathUploads` option; no boolean enables file access.
- Restricted mode supports multiple absolute roots and canonical aliases.
  The isolated Python 3.9+ reader uses directory-descriptor-relative no-follow
  traversal and checks the opened file's descriptor path before reading and
  before releasing bytes. Linux uses `/proc`, macOS uses `F_GETPATH`; enabled
  paths refuse Windows and missing restricted-mode capabilities fail closed.
- Parse and validate policy/root/capability settings through `startupSettings`
  before Slack authentication, with clean diagnostics that do not echo raw
  settings or filesystem paths. Remove the duplicate inline environment block.
- Preserve explicit **unrestricted** mode: any regular file readable by the
  connector account, including through symlinks, without a root boundary.
  This can expose sensitive files and is **never the default**. A maintainer
  may prefer to drop this mode; it is retained here as part of the existing
  design, not required by restricted uploads.
- Both modes enforce a configurable per-file `maxBytes` from 1 byte to 1 GiB,
  default 5 MiB. Inline content remains capped at 5 MiB. Whole files may occupy
  multiple memory copies; the cap is not a process/concurrency limit.
- Enabled tools accept exactly one of `path`, `content`, `contentBase64`.
  Paths are on the connector machine, not automatically the agent host.
  Path filenames default to the basename; inline filenames stay required.
  Tool classes become `comms` plus `files` only when path access is enabled.
- Retain current sender framing, timing, pre-allocation inline checks,
  destination/DM guards before reading and before uploading, Slack's three
  upload steps, acknowledgements and rollback. Add README policy/environment
  rows and a new changelog fragment.

### Tests

Linux x64, Python 3.12.3; full **one-process** suites:

| Node | Current-main baseline | Rebuild |
|---|---:|---:|
| 22.23.3 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip |
| 24.22.1 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip |
| 22.12.0 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip |

- Clean `npm ci --ignore-scripts`, typecheck and build pass on 22.23.3 and
  24.22.1. Downloaded runtimes were checked against official SHA-256 sums.
- New startup/path/reader tests: **100 pass / 0 fail / 0 skip**, five repeats.
  Tests use owned temporary fixtures and loopback upload endpoints, without
  live device reads or nested fetch mocks.
- Behavioral red/green covers missing startup refusals and path capability.
  Disabling descriptor containment fails four selected tests; permitting one
  excess growth byte fails both selected cap tests. Restored code passes.
- Release dry fold and the changelog CI regex pass.

### Not verified

No live Slack upload/deletion, OAuth grant or real MCPL host. macOS and Windows
were not run; Windows refusal has a unit test. Large real uploads were not
benchmarked. Descriptor checks are observations, not immutable snapshots or a
perpetual atomic boundary; hardlinks, privileged mounts and equivalent account
access are not isolated. Unrestricted mode intentionally has no root boundary.

### Out of scope

Consolidated access policy, recipient routing, host bridge, deployment changes,
additional Slack scopes and an OS sandbox.

### Companion PRs

No unmerged dependency: the former inline-upload dependency is already in
upstream main. This rebuild extends that implementation rather than carrying
an old stacked copy.

---

- [x] Changelog fragment added — `changelog.d/31-path-uploads.added.md`
      (see `changelog.d/README.md`).

🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)

## Short comment for #31 — not posted

I've prepared a local rebuild on current main, keeping the existing multi-root,
alias, Python-reader and configurable-cap design. Policy parsing and sanitized
startup refusals now use `startupSettings`; current inline validation, framing,
timing, three-step uploads and rollback are preserved. Unrestricted access is
still explicit and off by default; dropping that mode remains a maintainer
option. Linux one-process tests pass 683/683 on Node 22.23.3, 24.22.1 and
22.12.0, against 583/583 baseline runs; the 100 new tests pass five repeats,
and containment/byte-cap mutations were caught. macOS and live Slack were not
retested. No branch update has been pushed.
