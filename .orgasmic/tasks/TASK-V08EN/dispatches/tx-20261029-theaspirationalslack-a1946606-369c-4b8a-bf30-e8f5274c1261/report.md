# TASK-V08EN — fix round 2

## Changed

- Amended SHA: `d9fa8ab55af6cdd13d95d0b147bb937d376988e1`. Exactly ONE local commit on `7274283fa719a17328ef8e085336ce25f6f22b08`, preserving default author and the requested co-author trailer. The worktree is clean.
- Fetched upstream main before changes and before amendment: still `7274283f`; no rebase needed. No push, PR, public comment, merge or rollout.
- Read the complete review at `/home/orgasmic/.orgasmic/runs/run-01M63J5ABFCB4YT7JDXDJQS4TD/evidence/report.md` and its mutation driver `/tmp/rev-v08en/mutate.mjs`; reproduced the findings against current source rather than assuming the earlier passes still held.
- Scope remains independent of #55/#56. Shared files touched: `src/slack-adapter.ts`, `src/server.ts`.
- This round changes 7 files: README, changelog fragment, content type, adapter, server, tool descriptions and reaction tests. No dependencies or lockfile changes. Build/dependency outputs remain ignored local artifacts.

### Fix → evidence

| Finding | Fix | Fresh evidence |
| --- | --- | --- |
| MEDIUM-1 | After joining automatic cleanup, re-read the ACK map. If that entry is gone, return success-shaped “Nothing changed” without a second Slack call. | `src/slack-adapter.ts:1440–1444`; JSON-RPC + timer test `test/reactions.test.ts:223`; failed in `reactions-red.log`, passed in all final suites; join mutant killed. |
| MEDIUM-2 | Omit `own` when unknown. Emit true only for listed bot ID; false only when valid user-list length equals the valid count and the bot is absent. Updated the negative fixture to a complete list. | Both read-tool metadata tests at `test/reactions.test.ts:333`, plus unknown-bot and missing-users tests. Partial-list bot-positive, bot-absent and complete-negative cases all pass. |
| MEDIUM-3 | Added automatic-first join and timer-driven expiry/retry tests, not just explicit `clearAck`. | Tests at lines 223 and 252; final mutations join/cancel/rearm killed with 1/1/2 assertion failures respectively. |
| MEDIUM-4 | Both read descriptions explain reactions, cap, omissions and unknown ownership; removal argument says “to remove the reaction from”. Schema comparison now checks required fields and property names. | Agent-facing description test at line 382 and schema/argument test at line 72; fresh typecheck and suites pass. |
| LOW-5 | Validate reaction arrays, object entries and string names; omit unsafe, negative or non-integer counts; guard users with Array.isArray before includes. Invalid entries do not consume the valid-reaction cap. | Both tools tested with null/scalar/object entries, non-array reactions, object names, string/object users and malformed counts at lines 333–379. In particular, a string containing UBOT cannot mark own=true. |
| LOW-6 | Manual ACK removal increments tries and follows the automatic drop rules: refused-for-good, stopping, or five attempts. Only eligible transient failures re-arm. | Timer-driven permanent-refusal/no_reaction tests; mixed manual/automatic budget at line 287; fifth manual failure at line 300; shutdown observer at line 311. All pass. |

Ownership choice and retry/join behavior are documented in README, tool descriptions, the changelog and the PR body. Missing or malformed reaction metadata adds no invented ownership assertion. Live messages/backscroll, existing policies and scopes remain unchanged.

### Diff stat against upstream base

```text
 README.md                            |  41 +++-
 changelog.d/slack-reactions.added.md |  14 ++
 src/content.ts                       |   1 +
 src/feature-sets.ts                  |   1 +
 src/history-read.ts                  |   2 +
 src/server.ts                        |   8 +
 src/slack-adapter.ts                 |  70 +++++++
 src/slack-errors.ts                  |  13 +-
 src/tool-classes.ts                  |   1 +
 src/tools.ts                         |  21 +-
 test/reactions.test.ts               | 387 +++++++++++++++++++++++++++++++++++
 test/slackErrors.test.ts             |   1 +
 12 files changed, 554 insertions(+), 6 deletions(-)
```

## Verification Gates

All required regression gates were rerun in this round at `d9fa8ab55af6cdd13d95d0b147bb937d376988e1`. Each used `orgasmic dispatch gate <name> -- timeout 900 …`. The complete gate commands, PATH selection and NODE_OPTIONS guard are in `final-gates.sh`; `final-gates.log` indexes their receipt log paths. All log names below are relative to `/home/orgasmic/.orgasmic/runs/run-01M63K6V25E568QV8Z5CGZDP5C/evidence`.

| Gate | Command after timeout | Result | Log |
| --- | --- | --- | --- |
| r2-install | `env NPM_CONFIG_USERCONFIG=/tmp/task-v08en/user.npmrc NPM_CONFIG_GLOBALCONFIG=/tmp/task-v08en/global.npmrc npm_config_audit=false npm_config_fund=false npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass; both configs empty | `install.log` |
| r2-runtimes | `bash "$ORGASMIC_EVIDENCE_DIR/runtimes.sh"` | PATH Node 22.23.3; scratch Node 24.22.1/22.12.0 verified against freshly fetched official SHASUMS256.txt; executable bytes match archives | `runtimes.log`, `SHASUMS256-*.txt` |
| typecheck-22.23.3 / 24.22.1 | `npm run typecheck` | Both pass | `typecheck-<version>.log` |
| build-22.23.3 / 24.22.1 | `npm run build` | Both pass | `build-<version>.log` |
| full-22.23.3 / 24.22.1 / 22.12.0 | `npm test` | Each 621 pass / 0 fail | `full-<version>.log` |
| reactions-repeat-1 through 5 | `node --import tsx --test --experimental-test-isolation=none test/reactions.test.ts` | Each 38 pass / 0 fail | `reactions-repeat-<n>.log` |
| changelog | `node "$ORGASMIC_EVIDENCE_DIR/check-changelog.mjs"` | Added-fragment check and release grammar pass; scratch only | `changelog.log` |
| diff-check | `git diff --check HEAD^ HEAD` | Pass | receipt indexed in `final-gates.log` |
| r2-final-mutation-join / cancel / rearm | `env NODE_OPTIONS=… python3 "$ORGASMIC_EVIDENCE_DIR/mutate.py" <mutation>` | All killed by assertions, with 37/1, 37/1 and 36/2 pass/fail; originals restored in finally | `final-mutation-<mutation>.log` |
| r2-final-state | clean-tree, one-commit and trailer assertions | Pass after mutation restoration | `final-state.log` |

`NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` were set from the first command this round. The loopback-only guard in `loopback.cjs` was preloaded for test runs. Timer mocks are test-scoped; the shutdown test has one call-through observer of armAck, not layered global mocks. No fetch mocks were added.

### Red/green and development diagnostics

- `reactions-red.log`: 38 tests, 21 pass / 17 fail against unchanged `9b43671e` production code. The automatic-cleanup-first case was written and failed before changing the implementation.
- `reactions-green.log`: all 38 passed after the fixes. Initial typecheck caught the new boolean removal result being assigned to a void cleanup promise and an untyped schema-property access; both were corrected. `dev-typecheck-fixed.log` and the final typecheck/build gates pass.
- Expected red and mutant failures are deliberate regression evidence. No remaining failing, flaky or environment-blocked gate.

### Inherited evidence — limited scope

- Original-run baseline logs in `/home/orgasmic/.orgasmic/runs/run-01M63HJ2QJP0J6AYD9X5XRP1DD/evidence/baseline-<version>.log` were re-read: 583 pass / 0 fail for each Node version on the clean, unchanged base `7274283f`. These remain historical baseline evidence only; they are not passes for the amended code. The baseline package/lockfile inputs and base SHA have not changed.
- Reused the original scratch Node archives, but freshly verified their official checksums and extracted executable bytes this round. Reused the loopback and scratch changelog-check scripts, rerunning the checks.
- Prior contribution/project instructions and method/scope source reads remain context. The manifest still grants reactions:write and the change still introduces no reaction-lookup call. No previous head-suite or review pass was used as final verification of this amendment.

## Unmet Criteria

None for this fix round. All six findings and all three requested surviving mutations are addressed. Independent follow-up review, PR publication, merge and rollout remain separate actions.

## Residual Risk

No live Slack workspace or external MCPL host was exercised. Partial/malformed metadata is intentionally omitted rather than guessed. The inherited ACK timeout limitation remains: an add whose request times out may still reach Slack after removal. Future rebases against #55/#56 may conflict in the two shared files named above.

## PR body

Saved at `/home/orgasmic/.orgasmic/runs/run-01M63K6V25E568QV8Z5CGZDP5C/evidence/pr-body.md` and quoted verbatim below.

> ## Problem
>
> Agents can add reactions but cannot inspect existing reactions in history or remove their own, limiting shared reaction-based status conventions.
>
> ## Changes
>
> - History and thread results include up to 20 valid reactions per message, Slack counts, and `reactionsOmitted`, within the existing byte budget. Messages without reactions remain byte-identical.
> - `own: true` means the bot appears in Slack's user list; `false` requires a complete list without the bot. Unknown ownership is omitted. Malformed entries are skipped and invalid counts omitted.
> - Add `remove_reaction` with the same arguments, feature set, scope and write restrictions as `add_reaction`. A missing own reaction gets a clear error.
> - Coordinate manual removal with ACK cleanup: joining a cleanup that finishes returns successful “Nothing changed” without another Slack call. Manual attempts share the five-attempt cleanup budget and terminal-failure rules.
> - Document the fields and caveats in agent-facing tool descriptions and the README; add a changelog fragment. Live incoming messages and backscroll remain unchanged.
>
> No additional scope or reaction lookup is needed: [history includes reactions](https://docs.slack.dev/reference/methods/conversations.history/), [thread replies use conversation history scopes](https://docs.slack.dev/reference/methods/conversations.replies/), and [removal requires `reactions:write`](https://docs.slack.dev/reference/methods/reactions.remove/), already granted by the manifest.
>
> ## Tests
>
> - Node 22.23.3, 24.22.1 and 22.12.0: **621 pass / 0 fail each**, against **583 pass / 0 fail** on base `7274283f`.
> - Typecheck and build pass on Node 22.23.3 and 24.22.1.
> - All 38 reaction tests pass five consecutive runs, with loopback-only listeners and one-process suite isolation disabled.
> - Fix-round red run: 17 fail / 21 pass before production changes, including automatic-cleanup-first dispatch.
> - All three previously surviving mutations are killed: skipping the cleanup join, timer cancellation, or failure re-arm. Timer-driven tests cover retry timing, terminal refusals, shutdown and the shared attempt limit.
> - Changelog validation passes.
>
> ## Not verified
>
> No live Slack workspace or external MCPL host. Slack may supply partial metadata; unknown ownership is deliberately omitted. The existing limitation remains that a timed-out ACK add can reach Slack after removal.
>
> ## Out of scope
>
> Live reaction events, access-policy changes, reaction rollback, publishing, merge and rollout.
>
> ## Companion PRs
>
> Independent of #55 and #56. Upstream main remained at `7274283f`; no rebase was needed. Shared files to watch: `src/slack-adapter.ts` and `src/server.ts`. No merge-order dependency.
>
> ---
>
> - [x] Changelog fragment added: `changelog.d/slack-reactions.added.md`.
>
> 🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)
