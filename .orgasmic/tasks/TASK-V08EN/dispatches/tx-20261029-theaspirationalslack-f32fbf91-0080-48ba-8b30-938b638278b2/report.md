# TASK-V08EN — round 4 polish

## Changed

- SHA: `336c015136a277dbb5acd79015f17d5868398df6`. Amended to ONE local commit on `7274283fa719a17328ef8e085336ce25f6f22b08`, with default author and the requested co-author trailer. Clean worktree.
- Upstream main fetched before changes and before amendment: unchanged at `7274283f`; no rebase needed. No push, PR, comment, merge or rollout.
- Read the review at `/home/orgasmic/.orgasmic/runs/run-01M63MQZF4HSATTEPGP0TF1DQP/evidence/report.md` and its `probe8.ts`.
- LOW-1: added exactly one adapter-level test with a fresh stateful Slack fake and an explicit promise barrier. Two overlapping manual removals return `[true, false]`, the reaction is gone, and exactly one reactions.remove is called. The fake would refuse a redundant second removal with no_reaction. No new global mocks or wall-clock sleeps.
- LOW-2: rewrapped the README ACK paragraph to at most 79 columns and the changelog fragment's short line. Text unchanged, verified by comparing whitespace-separated tokens against `8130e873`.
- **No production code changes.** The scope gate proves `git diff 8130e873 HEAD -- src` is empty and only the two documentation files plus the test changed.
- Overall PR remains independent of #55/#56; overall overlapping source files remain `src/slack-adapter.ts` and `src/server.ts`. Neither source file changed this round.

### `git diff 8130e873` stat

```text
 README.md                            |  7 ++++---
 changelog.d/slack-reactions.added.md |  4 ++--
 test/reactions.test.ts               | 23 +++++++++++++++++++++++
 3 files changed, 29 insertions(+), 5 deletions(-)
```

## Verification Gates

All requested gates were run fresh at `336c015136a277dbb5acd79015f17d5868398df6`. Each check used `orgasmic dispatch gate <name> -- timeout 900 …`. Exact runtime selection, guard and commands are in `final-gates.sh`. Logs below are relative to `/home/orgasmic/.orgasmic/runs/run-01M63N9EXF1NMVD7QT4CZNMT9C/evidence`; wrapper receipt paths are printed in each log.

| Gate | Command after timeout | Result | Log |
| --- | --- | --- | --- |
| r4-install | `env NPM_CONFIG_USERCONFIG=/tmp/task-v08en/user.npmrc NPM_CONFIG_GLOBALCONFIG=/tmp/task-v08en/global.npmrc npm_config_audit=false npm_config_fund=false npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass, user/global configs empty | `install.log` |
| r4-runtimes | `bash "$ORGASMIC_EVIDENCE_DIR/runtimes.sh"` | PATH Node 22.23.3; scratch 24.22.1/22.12.0 archives checked against freshly fetched official SHASUMS256.txt; executables compared to archives | `runtimes.log`, `SHASUMS256-*.txt` |
| typecheck | `npm run typecheck` on Node 22.23.3 | Pass | `typecheck.log` |
| full-22.23.3 / 24.22.1 / 22.12.0 | `npm test` | Each **627 pass / 0 fail** | `full-<version>.log` |
| reactions-repeat-1 through 5 | `node --import tsx --test --experimental-test-isolation=none test/reactions.test.ts` | Each **44 pass / 0 fail** | `reactions-repeat-<n>.log` |
| changelog | `node "$ORGASMIC_EVIDENCE_DIR/check-changelog.mjs"` | Added-fragment and release-grammar checks pass, scratch only | `changelog.log` |
| mutation-M18 | `python3 "$ORGASMIC_EVIDENCE_DIR/mutate-m18.py"` | **Killed by the new test: 43 pass / 1 fail**; original source restored in finally | `mutation-M18.log` |
| diff-check | `git diff --check HEAD^ HEAD` | Pass | receipt indexed in `final-gates.log` |
| scope-check | `python3 "$ORGASMIC_EVIDENCE_DIR/scope-check.py"` | Only three permitted files changed; src unchanged; prose text unchanged; README paragraph <=79 columns; clean one-commit tree and required trailer | `scope-check.log` |

M18 deletes only `entry.gone = true` in removeReaction's confirmed-success branch while retaining dropAck. The new test is the sole failure under that mutation (`not ok 44 - overlapping manual removals share confirmed ACK removal at the adapter`), proving the formerly surviving assignment is now protected. Mutation testing temporarily edits and restores the file; no production edit remains in the commit or working tree.

Notifiers were disabled from the first command (NO_UPDATE_NOTIFIER=1 and npm_config_update_notifier=false). All suites, reaction repeats and mutation tests preload `loopback.cjs` via NODE_OPTIONS. No unexpected failures; the one mutation failure is deliberate evidence.

### Inherited evidence and unchanged scope

- Historical base baseline: 583 pass / 0 fail on each runtime, from the original run's `baseline-<version>.log` at the clean base `7274283f`, under `/home/orgasmic/.orgasmic/runs/run-01M63HJ2QJP0J6AYD9X5XRP1DD/evidence`. Base source and package/lockfile inputs remain unchanged; these counts are comparison evidence, not a final-head pass.
- The failed-cleanup red run mentioned in the PR body is historical evidence from round 3: `/home/orgasmic/.orgasmic/runs/run-01M63MGE24QSBSSE833DFGNQD2/evidence/reactions-red.log`, 39 pass / 4 fail before that production fix. Production source is byte-unchanged from the subsequently approved `8130e873` in this polish round.
- Prior reviewer approval and build passes remain context, not replacements for requested current gates. This narrowed round requests typecheck, not a new build; no fresh build is claimed.
- Retained runtime archives were freshly verified; retained guard/changelog scripts were rerun. No old head-suite receipt was substituted for this round's gates.

## Unmet Criteria

None. Both LOWs are addressed, M18 is killed, all required gates pass, and there is no production change.

## Residual Risk

No new production behavior or risk is introduced by this test/documentation-only polish. Live Slack workspace and external MCPL host behavior remain unverified; the existing ACK timeout ambiguity remains. Publication, merge and rollout are separate owner decisions.

## Final PR body

Saved at `/home/orgasmic/.orgasmic/runs/run-01M63N9EXF1NMVD7QT4CZNMT9C/evidence/pr-body.md` and quoted verbatim below.

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
> - Node 22.23.3, 24.22.1 and 22.12.0: **627 pass / 0 fail each**, against **583 pass / 0 fail** on base `7274283f`.
> - Typecheck passes on Node 22.23.3.
> - All 44 reaction tests pass five consecutive runs, with loopback-only listeners and one-process suite isolation disabled.
> - Failed-cleanup fix red run: **39 pass / 4 fail** before production changes. New JSON-RPC tests cover joining cleanup dropped for archived-channel refusal, missing scope, shutdown and exhausted retries; successful and `no_reaction` joins remain green.
> - The adapter-level overlapping-manual-removal test confirms results `true` then `false`, with exactly one Slack removal. It kills M18, which deletes the manual success path's `gone` assignment.
> - Final polish changes only that test and whitespace wrapping; no production source changes.
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
