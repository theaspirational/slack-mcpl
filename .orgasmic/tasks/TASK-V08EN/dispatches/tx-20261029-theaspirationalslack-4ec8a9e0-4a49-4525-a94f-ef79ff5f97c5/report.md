# TASK-V08EN — fix round 3

## Changed

- SHA: `8130e8735b5f3779f12b4bec7f32743f067f40e9`. Amended to ONE local commit on `7274283fa719a17328ef8e085336ce25f6f22b08`, preserving default author and the requested co-author trailer. Clean worktree after all checks and mutation restoration.
- Upstream main fetched before the fix and before amendment: unchanged at `7274283f`; no rebase needed. No push, PR, comment, merge or rollout.
- Read the re-review at `/home/orgasmic/.orgasmic/runs/run-01M63KQDN21CVP6GW7K3KX9KKC/evidence/report.md`, including the MEDIUM and probe5 reproduction. Reproduced the failure through fresh real-server JSON-RPC tests before changing production code.
- This round changes only `src/slack-adapter.ts`, `test/reactions.test.ts`, README and the existing changelog fragment; the updated public PR body is in this run's `pr-body.md`. No dependency or lockfile change.
- The overall PR remains independent of #55/#56. Shared source files touched by the overall PR: `src/slack-adapter.ts` and `src/server.ts`.

### Fix → evidence

| Fix | Evidence |
| --- | --- |
| Replace ACK map-membership inference with explicit `AckEntry.gone`; only confirmed removal or Slack's `no_reaction` sets it. Both automatic and manual cleanup record that outcome. | `src/slack-adapter.ts`: AckEntry, removeAck, removeReaction. Existing successful-join test and new automatic-no_reaction join test both pass with one Slack removal. |
| A manual call joining cleanup that gave up must make its own removal request and report Slack's answer. | Four new timer-driven JSON-RPC tests: is_archived, missing_scope, stopping, exhausted retry budget. All four failed on unchanged `d9fa8ab5` in `reactions-red.log`; all pass in `reactions-green.log` and final gates. They assert the refusal, one additional Slack call, and no subsequent retry. |
| Verify the new outcome flag is not set merely because cleanup failed. | `mutation-gone.log`: setting gone=true on every automatic cleanup error kills all four failed-join tests (39 pass / 4 fail). `mutate-gone.py` restores original bytes in finally. |
| Describe confirmed absence, not merely finished cleanup. | README and changelog now explicitly distinguish confirmed removal/no_reaction from giving up after failure; `pr-body.md` has the same correction. Changelog grammar passes. |

### Overall diff against base

```text
 README.md                            |  42 +++-
 changelog.d/slack-reactions.added.md |  16 ++
 src/content.ts                       |   1 +
 src/feature-sets.ts                  |   1 +
 src/history-read.ts                  |   2 +
 src/server.ts                        |   8 +
 src/slack-adapter.ts                 |  78 +++++++
 src/slack-errors.ts                  |  13 +-
 src/tool-classes.ts                  |   1 +
 src/tools.ts                         |  21 +-
 test/reactions.test.ts               | 442 +++++++++++++++++++++++++++++++++++
 test/slackErrors.test.ts             |   1 +
 12 files changed, 620 insertions(+), 6 deletions(-)
```

## Verification Gates

All requested final regression gates were rerun at `8130e8735b5f3779f12b4bec7f32743f067f40e9` in this round. Every check used `orgasmic dispatch gate <name> -- timeout 900 …`. Exact commands and runtime PATH selection are in `final-gates.sh`; `final-gates.log` lists wrapper receipt paths. Log names below are relative to `/home/orgasmic/.orgasmic/runs/run-01M63MGE24QSBSSE833DFGNQD2/evidence`.

| Gate | Command after timeout | Result | Log |
| --- | --- | --- | --- |
| r3-install | `env NPM_CONFIG_USERCONFIG=/tmp/task-v08en/user.npmrc NPM_CONFIG_GLOBALCONFIG=/tmp/task-v08en/global.npmrc npm_config_audit=false npm_config_fund=false npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass; empty user/global configs | `install.log` |
| r3-runtimes | `bash "$ORGASMIC_EVIDENCE_DIR/runtimes.sh"` | PATH Node 22.23.3; scratch 24.22.1/22.12.0 archives checked against freshly downloaded official SHASUMS256.txt, executable bytes compared to archive | `runtimes.log`, `SHASUMS256-*.txt` |
| typecheck-22.23.3 / 24.22.1 | `npm run typecheck` | Both pass | `typecheck-<version>.log` |
| build-22.23.3 / 24.22.1 | `npm run build` | Both pass | `build-<version>.log` |
| full-22.23.3 / 24.22.1 / 22.12.0 | `npm test` | Each 626 pass / 0 fail | `full-<version>.log` |
| reactions-repeat-1 through 5 | `node --import tsx --test --experimental-test-isolation=none test/reactions.test.ts` | Each 43 pass / 0 fail | `reactions-repeat-<n>.log` |
| changelog | `node "$ORGASMIC_EVIDENCE_DIR/check-changelog.mjs"` | Added-fragment and release grammar pass, scratch only | `changelog.log` |
| diff-check | `git diff --check HEAD^ HEAD` | Pass | receipt indexed in `final-gates.log` |
| r3-mutation-gone | `env NODE_OPTIONS=… python3 "$ORGASMIC_EVIDENCE_DIR/mutate-gone.py"` | Mutation killed by four assertions; restored production file | `mutation-gone.log` |
| r3-final-state | clean-tree, one-commit and trailer assertions | Pass after mutation restoration | `final-state.log` |

Notifiers were disabled from the first command with NO_UPDATE_NOTIFIER=1 and npm_config_update_notifier=false. Tests preloaded the loopback-only listener guard through NODE_OPTIONS. New tests use fresh clients and test-scoped timers, with no global fetch mocks.

### Red/green and inherited evidence

- Red: `reactions-red.log`, 39 pass / 4 fail before production edits. The failed cases correspond exactly to cleanup being dropped for archived-channel refusal, missing scope, shutdown and exhausted retries.
- Green: `reactions-green.log`, 43 pass / 0 fail. The existing successful-join path stays green; a new no_reaction join test ensures it also short-circuits correctly. No unexpected development failures.
- Historical base baseline remains 583 pass / 0 fail on all three runtimes, recorded at the clean unchanged base in `/home/orgasmic/.orgasmic/runs/run-01M63HJ2QJP0J6AYD9X5XRP1DD/evidence/baseline-<version>.log`. Only those base comparison counts are inherited, not passes for the amended implementation. Base source, package and lockfile inputs remain unchanged.
- Runtime archives and the loopback/final-gate/changelog scripts were retained from prior rounds; runtime authenticity was freshly verified and all required gates rerun. Prior source/contribution/scope reads remain context, not substituted regression proof.

## Unmet Criteria

None for this fix round. Follow-up review, PR publication, merge and rollout remain separate actions.

## Residual Risk

No live Slack workspace or external MCPL host was exercised. The pre-existing timeout ambiguity remains: an ACK add whose request times out can still land after removal. Reaction metadata and policy behavior were not redesigned in this narrow fix; the full suite was rerun to check regressions. Future rebases may conflict in the two shared source files listed above.

## PR body

Saved at `/home/orgasmic/.orgasmic/runs/run-01M63MGE24QSBSSE833DFGNQD2/evidence/pr-body.md` and quoted verbatim below.

> ## Problem
>
> Agents can add reactions but cannot inspect existing reactions in history or remove their own, limiting shared reaction-based status conventions.
>
> ## Changes
>
> - History and thread results include up to 20 valid reactions per message, Slack counts, and `reactionsOmitted`, within the existing byte budget. Messages without reactions remain byte-identical.
> - `own: true` means the bot appears in Slack's user list; `false` requires a complete list without the bot. Unknown ownership is omitted. Malformed entries are skipped and invalid counts omitted.
> - Add `remove_reaction` with the same arguments, feature set, scope and write restrictions as `add_reaction`. A missing own reaction gets a clear error.
> - Coordinate manual removal with ACK cleanup. Joining cleanup returns successful “Nothing changed” without another Slack call only when Slack confirmed removal or `no_reaction`. If cleanup gave up after failure, the tool makes its own removal attempt and reports Slack's answer. Manual ACK attempts share the cleanup retry budget and terminal-failure rules.
> - Update agent-facing descriptions, README and changelog. Live incoming messages and backscroll remain unchanged.
>
> No additional scope or reaction lookup is needed: [history includes reactions](https://docs.slack.dev/reference/methods/conversations.history/), [thread replies use conversation history scopes](https://docs.slack.dev/reference/methods/conversations.replies/), and [removal requires `reactions:write`](https://docs.slack.dev/reference/methods/reactions.remove/), already granted by the manifest.
>
> ## Tests
>
> - Node 22.23.3, 24.22.1 and 22.12.0: **626 pass / 0 fail each**, against **583 pass / 0 fail** on base `7274283f`.
> - Typecheck and build pass on Node 22.23.3 and 24.22.1.
> - All 43 reaction tests pass five consecutive runs, with loopback-only listeners and one-process suite isolation disabled.
> - Latest fix-round red run: **39 pass / 4 fail** before production changes. New JSON-RPC tests cover joining cleanup dropped for archived-channel refusal, missing scope, shutdown and exhausted retries; successful and `no_reaction` joins remain green.
> - Mutation setting the new `gone` flag on every cleanup failure is killed by all four failed-join tests.
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
