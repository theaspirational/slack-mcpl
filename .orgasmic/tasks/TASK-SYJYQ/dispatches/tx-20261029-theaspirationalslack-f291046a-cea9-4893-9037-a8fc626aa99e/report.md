# Path uploads — final polish

## Changed

**Final SHA:** `0fa20a15e4108f7ab0fbfc29e825d296052eb6c2`.
Amended into **one commit** on parent
`7274283fa719a17328ef8e085336ce25f6f22b08`. Read-only fetch confirmed upstream
main is unchanged, so **no rebase was necessary**. The default author and
`Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer are retained.
Worktree clean; no push, PR edit, GitHub comment, merge or ledger edit.

This polish changes five files relative to `f1f9eee9`: **18 insertions,
8 deletions**. The complete rebuilt commit changes 13 files, **1,268 insertions,
54 deletions** against upstream (production: eight files, net +412 lines).
No package/lockfile change. Generated build output/dependencies remain ignored
local artifacts outside evidence. `commit.txt`, `polish.diff`, `full-stat.txt`
and `reader-vs-pr31.diff` preserve the exact scope.

Read the supplied reviewer report and verified the findings against the
reviewed source. The shared worktree initially pointed at the fork head; it
was clean, and was switched to the reviewed commit before making the polish.
No broad investigation or unassigned review fix was added.

### Fix → evidence

| Requested fix | Treatment and evidence |
|---|---|
| Hidden-path refusal test; kill the reviewer's M5 | `test/pathUploads.test.ts` now asserts `/doesn't take file paths/` on the same refused call. Deleting the entire server guard makes the three-file suite **99 pass / 1 fail**, specifically at that assertion, showing the unwanted `Cannot read properties of undefined` response. `mutation-m5-hidden-path.log`. Restored server passes **100/100** (`green-polish.log` and five final repeats). The server code itself is unchanged from the reviewed commit. |
| Explicit unrestricted self-credential risk | README, the unrestricted fragment bullet and the final PR body below name Linux `/proc/self/environ`, Slack tokens and other environment secrets, and require that the agent already be trusted with those credentials. Verified in `polish.diff` and the verbatim text below. No process environment was read to reproduce or publish credentials. |
| Empty `filename` documentation | README says an explicitly empty filename is refused, not defaulted. No handler/schema behavior changed. The existing `path cardinality, metadata and empty-file failures have no Slack effect` test still covers `{path, filename: ''}` in every focused/full run. |
| Sanitize unrestricted `open` errors | `readUnrestricted` maps opening failures to `Upload path is unreadable`. The updated test asserts that exact message using a nonexistent file under its own temp fixture. With old production code it fails **0 pass / 1 fail** against raw ENOENT/path text (`red-open-sanitization.log`); after the fix it passes. `reader-vs-pr31.diff` shows this is the only change to #31's reader module, which is **no longer byte-identical**. The PR body says so explicitly. |
| State unbounded parallel-read memory in PR body; do not add a limiter | Final body explicitly says no concurrency bound exists, so N parallel reads can each hold a whole file, potentially multiple copies. Reader lifecycle/cap/concurrency behavior is unchanged; no semaphore or schema redesign was added. |

## Verification Gates

All named checks use `orgasmic dispatch gate <name> -- timeout 900 …`.
All **16 final gates** recorded clean final SHA
`0fa20a15e4108f7ab0fbfc29e825d296052eb6c2`, exit 0. Baselines were freshly rerun
at clean upstream SHA `7274283fa719a17328ef8e085336ce25f6f22b08` in this
assigned worktree, not a scratch export. No prior run's pass substitutes for a
required final gate.

### Environment

- Notifiers disabled from the first command:
  `NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`.
- Node 22.23.3 on PATH; cached official Node 24.22.1/22.12.0 tarballs were
  checked again against freshly downloaded official `SHASUMS256.txt`, then
  extracted into this round's new scratch directory. See
  `node-verification.log`, `SHASUMS256-24.22.1.txt` and
  `SHASUMS256-22.12.0.txt`. Linux x64, Python 3.12.3.
- npm ci used two newly created empty user/global configs outside the repo,
  audit/fund disabled, ignored scripts and the npmjs registry.
- `NODE_OPTIONS=--require=<this-round-evidence>/loopback-only.cjs` was in force
  for all tests. New tests still use only owned temp fixtures; no `/dev/null`,
  broad temp-root probes, actual credential reads or nested fetch mocks.
- `env.sh`, `final-gates.sh` and `final-gates.log` record the environment and
  orchestration. PID/PGID ownership is in `baseline-controller.log` and
  `final-gates.log`. All check sessions completed.

### Fresh baseline / final suite matrix

| Node | Upstream baseline | Amended commit | Final npm ci / typecheck / build |
|---|---:|---:|---|
| 22.23.3 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip | All pass |
| 24.22.1 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip | All pass |
| 22.12.0 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip | Not required |

All suites also have zero cancelled tests. Logs:
`baseline-suite-<version>.log`, `final-suite-<version>.log`,
`final-ci-<version>.log`, `final-typecheck-<version>.log`,
`final-build-<version>.log`. Exact commands:

```sh
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm run typecheck
npm run build
npm test
# npm test expands to:
node --import tsx --test --experimental-test-isolation=none test/*.test.ts
```

### Focused, mutation and release checks

| Gate(s) | Command after wrapper/timeout | Result and log |
|---|---|---|
| `red-open-sanitization` | `node --import tsx --test --experimental-test-isolation=none --test-name-pattern='unrestricted mode needs no Python' test/uploadPath.test.ts` | Expected red: **0 pass / 1 fail** on old code. `red-open-sanitization.log`. |
| `mutation-m5-hidden-path` | Three-file command below, with guard deleted | Expected red: **99 pass / 1 fail** at new wording assertion. `mutation-m5-hidden-path.log`. |
| `mutation-containment` | `node --import tsx --test --experimental-test-isolation=none --test-name-pattern='actual descriptor checks reject deterministic mutation\|parent returned under root' test/uploadPath.test.ts` | Leaf containment check disabled: **2 pass / 4 fail**. `mutation-containment.log`. |
| `mutation-byte-cap` | `node --import tsx --test --experimental-test-isolation=none --test-name-pattern='restricted worker caps bytes if the file grows\|restricted worker takes its limit' test/uploadPath.test.ts` | One excess growth byte allowed: **0 pass / 2 fail**. `mutation-byte-cap.log`. |
| `green-polish` | Three-file command below, restored code | **100 pass / 0 fail / 0 skip**. `green-polish.log`. |
| `final-new-tests-1` through `final-new-tests-5` | Three-file command below | Each **100 pass / 0 fail / 0 skip** on 22.23.3. Corresponding `.log` files. |
| `final-release-dry-fold` | `node <evidence>/release-dry-fold.mjs` | Pass: 34 fragments folded in owned scratch; new fragment included verbatim and consumed; one Unreleased heading; repository unchanged. `final-release-dry-fold.log`. |
| `final-changelog-ci` | `bash <evidence>/changelog-ci.sh` | Pass: actual CI regex against **added** files from upstream to final commit. `final-changelog-ci.log`. |

Three-file command:

```sh
node --import tsx --test --experimental-test-isolation=none test/pathStartup.test.ts test/pathUploads.test.ts test/uploadPath.test.ts
```

The red and mutation gates were dirty development evidence, not final-commit
receipts. Every mutation was restored before amending. These expected failures
are regression-test evidence, not unresolved failures. `git diff --check
HEAD^ HEAD` passed; the upstream-to-HEAD range contains exactly one commit.
`gate-index.md` maps each wrapper log to its unique durable receipt log.

### Inherited evidence and unchanged scope

- The prior implementation/report and supplied reviewer report establish the
  starting design and review findings, not fresh gate passes. The M5 finding is
  reproduced here with the strengthened test. The credential warning comes
  from the supplied finding and the unrestricted reader's existing account-wide
  semantics; no environment contents were accessed in this round.
- The restricted worker, containment, caps, upstream framing/timing, startup,
  three-step upload and rollback integration are unchanged from the reviewed
  commit. Only unrestricted `open` failure rendering changes in production.
  Full suites and containment/cap mutations were nevertheless rerun here.
- The loopback guard, release-fold probe, CI-regex probe and orchestration
  scripts were copied from the prior run and inspected for this round's paths
  and unchanged base. Their **executions and receipts are fresh**. Cached Node
  archives were rehashed and freshly extracted, rather than treating the
  previous runtime check as a new result.
- Historical macOS, load, race-loop, leak and live-system probes in the review
  are not promoted to new verification claims. This run's fixtures remain
  temp-only and loopback-only. No old final-commit receipt was reused.

## Unmet Criteria

**None for the narrowed local assignment.** Public posting remains prohibited
and was not performed. The remaining reviewed LOW schema/concurrency choices
were deliberately left unchanged as scoped; default author was retained as
requested. macOS/Windows execution and live Slack are not claimed.

## Residual Risk

Unrestricted mode can disclose the connector's own environment credentials;
only explicitly trusted agents should receive it, and a maintainer may drop
that mode. No concurrency bound exists, so parallel whole-file reads can
exhaust memory despite individual byte caps. Restricted containment is
point-in-time, not a snapshot or OS sandbox; hardlinks, privileged mounts and
equivalent account access remain outside its boundary. The startup capability
probe and later lifetime-reader construction are separate, so intervening
filesystem/runtime changes can still cause a sanitized fatal startup error
after authentication. macOS `F_GETPATH`, native Windows, live Slack/OAuth and
large concurrent uploads were not exercised here. Sanitization intentionally
removes errno detail from unrestricted opening failures.

## Final fragment — verbatim

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
  boundary or Python dependency. On Linux this includes the connector process's
  own `/proc/self/environ`, and therefore its Slack tokens and any other secret
  in its environment. Enable unrestricted mode only where the agent is already
  trusted with those credentials. Both modes bound reads from the opened file;
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

## Final replacement PR body — verbatim, not posted

```markdown
## Problem

`upload_file` already accepts inline text/base64, but attaching an existing
report or binary requires reproducing its bytes in the tool call. Optional
connector-local paths avoid that model-context round trip. The old branch also
conflicted with current main's centralized startup settings.

## Changes

- Rebuild on current upstream main. Inline-only remains the default;
  `SLACK_PATH_UPLOADS` is an explicit JSON policy, also available as the
  embedded server's `pathUploads` option. No boolean enables file access.
- Restricted mode supports multiple absolute roots and canonical aliases.
  Its isolated Python 3.9+ worker uses directory-descriptor-relative no-follow
  traversal and checks the opened file's descriptor path before reading and
  before releasing bytes. Linux uses `/proc`, macOS uses `F_GETPATH`; enabled
  paths refuse Windows and missing restricted-mode capabilities fail closed.
- Policy parsing and root/capability checks use `startupSettings` before Slack
  authentication, with sanitized refusals. There is no duplicate inline
  environment parser. Unrestricted `open` failures now also return the constant
  `Upload path is unreadable`, without errno text or filesystem paths.
  **`src/upload-path.ts` is no longer byte-identical to #31's earlier reader:**
  this open-failure sanitization is the difference; the restricted worker and
  containment logic are unchanged.
- Explicit **unrestricted** mode permits any regular file readable by the
  connector account, including through symlinks, without a root boundary.
  **On Linux this includes the connector process's own `/proc/self/environ`,
  and therefore its Slack tokens and any other secret in its environment.
  Enable it only where the agent is already trusted with those credentials.**
  It is never the default. A maintainer may prefer to drop unrestricted mode;
  restricted uploads do not depend on it.
- Both modes enforce configurable per-file `maxBytes` from 1 byte to 1 GiB,
  default 5 MiB. Inline content remains capped at 5 MiB. **No concurrency bound
  exists over path reads: N parallel reads can each hold a whole file,
  potentially in multiple memory copies.** The cap is not a process-memory or
  concurrency limit; this PR adds no semaphore or other concurrency control.
- Enabled tools accept exactly one of `path`, `content`, `contentBase64`.
  Paths belong to the connector machine, not automatically the agent host.
  Omitted path filenames default to the basename; an explicitly empty
  `filename` is refused, not defaulted. Inline filenames remain required.
  Tool classes become `comms` plus `files` only when path access is enabled.
- Keep current sender framing, timing, pre-allocation inline checks,
  destination/DM guards before reads and uploads, Slack's three-step upload,
  acknowledgements and rollback. Document the policy and credential risk in
  README and a new changelog fragment. Pin the hidden-path refusal wording
  in its test so deleting the guard cannot silently pass.

## Tests

Fresh Linux x64 runs, Python 3.12.3; full **one-process** suites:

| Node | Upstream baseline (`7274283`) | Rebuild |
|---|---:|---:|
| 22.23.3 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip |
| 24.22.1 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip |
| 22.12.0 | 583 pass / 0 fail / 0 skip | 683 pass / 0 fail / 0 skip |

- Clean `npm ci --ignore-scripts`, typecheck and build pass on 22.23.3 and
  24.22.1. Scratch runtimes were checked against official SHA-256 sums.
- The three new test files pass **100/100**, five separate repeats.
- Deleting the hidden-path refusal guard now fails its wording assertion:
  **99 pass / 1 fail**; restoring it gives **100 pass / 0 fail**.
- The new exact-message assertion fails on the old raw unrestricted-open
  error and passes after sanitization. Disabling leaf containment fails four
  selected tests; allowing one excess growth byte fails both selected cap
  tests. All mutations were restored before the final runs.
- Release dry fold and the changelog CI regex pass. Tests use owned temporary
  fixtures and loopback upload endpoints; no live device or process-environment
  reads were added, and no nested fetch mock was imported.

## Not verified

No live Slack upload/deletion, OAuth grant or real MCPL host. macOS and Windows
were not run; Windows refusal has a unit test. Large concurrent uploads were
not benchmarked here. Descriptor checks are observations, not immutable
snapshots or a perpetual atomic boundary; hardlinks, privileged mounts and
equivalent account access are not isolated. Unrestricted mode intentionally
has no root boundary and may disclose the connector's own credentials.

## Out of scope

Consolidated access policy, recipient routing, host bridge, deployment changes,
additional Slack scopes, an OS sandbox and a concurrency limiter.

## Companion PRs

No unmerged dependency: the former inline-upload dependency is already in
upstream main. This rebuild extends that implementation, not an old stacked
copy.

---

- [x] Changelog fragment added — `changelog.d/31-path-uploads.added.md`
      (see `changelog.d/README.md`).

🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)
```

## Final #31 comment — verbatim, not posted

```text
The local rebuild now includes the review follow-ups: deleting the hidden-path
guard fails its refusal-text test, unrestricted open errors are sanitized, and
the docs clarify empty filenames and unrestricted access to the connector's
own environment and Slack tokens. Unrestricted mode stays explicit and off by
default; enable it only for an agent already trusted with those credentials,
and dropping it remains a maintainer option. There is still no concurrency
bound over path reads. Fresh Linux one-process suites pass 683/683 on Node
22.23.3, 24.22.1 and 22.12.0 against 583/583 upstream baselines; the 100 new
tests pass five repeats. macOS and live Slack were not retested. No branch
update has been pushed.
```
