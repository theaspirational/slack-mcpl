# TASK-V08EN implementation report

## Changed

- Commit: `9b43671e1d4bc69710e730e5c2774502a16eb309` (one local commit, default author, requested co-author trailer).
- Base: `7274283fa719a17328ef8e085336ce25f6f22b08`. Fetched upstream main read-only before implementation and before commit; unchanged, so no rebase needed. No push, PR, comment, merge or rollout performed.
- History/thread results carry bounded structured reaction metadata: name, Slack count, own-ID membership, first 20 reactions and omitted count. Existing byte accounting includes these fields. Empty/absent reactions add nothing; live messages and first-interaction backscroll remain unchanged. No extra Slack API calls.
- Separate remove tool mirrors add's arguments, feature set, communication class and write checks. Shared error mapping includes a fixed no_reaction explanation. Manual ACK-emoji removal waits for a pending add, coordinates cleanup, and retires only that ACK on success/no_reaction; failures leave cleanup available.
- README tool table and feature-set docs updated; changelog fragment added. Scope evidence and public links appear in the PR body below. The existing manifest already grants reactions:write; reactions:read is not required.
- Overlap with #55/#56: `src/slack-adapter.ts`, `src/server.ts`. Neither open PR is a dependency; no access-policy changes were imported.
- Read the supplied project baseline, CONTRIBUTING, PR template, adapter history, existing formatting/ACK/error paths, scope and feature-set declarations. No additional project conventions or gotchas were supplied; no applicable AGENTS.md was found. No maintainer-level design conflict was identified.
- No package/lockfile changes. Ignored dependency/build outputs remain local. `pr-body.md` is a delivery artifact in this evidence directory, not upstream source.

### Diff stat

```text
 README.md                            |  33 +++++-
 changelog.d/slack-reactions.added.md |   9 ++
 src/content.ts                       |   1 +
 src/feature-sets.ts                  |   1 +
 src/history-read.ts                  |   2 +
 src/server.ts                        |   8 ++
 src/slack-adapter.ts                 |  47 ++++++++
 src/slack-errors.ts                  |  13 ++-
 src/tool-classes.ts                  |   1 +
 src/tools.ts                         |  13 +++
 test/reactions.test.ts               | 214 +++++++++++++++++++++++++++++++++++
 test/slackErrors.test.ts             |   1 +
 12 files changed, 339 insertions(+), 4 deletions(-)
```

## Verification Gates

All final assigned gates ran at the committed SHA with a clean tracked worktree. Each check used `orgasmic dispatch gate <name> -- timeout 900 ...`. Logs and wrapper receipts are in this evidence directory; `final-gates.log` indexes final receipt paths, and `final-gates.sh` contains the exact commands and Node PATH selection.

| Gates | Command after timeout | Outcome | Log files |
| --- | --- | --- | --- |
| node-setup | `bash /tmp/task-v08en/setup.sh` | Node 24.22.1 and 22.12.0 archives verified against official SHASUMS256.txt, unpacked in scratch; default PATH Node 22.23.3 | `node-setup.log`, `SHASUMS256-*.txt` |
| install | `env NPM_CONFIG_USERCONFIG=/tmp/task-v08en/user.npmrc NPM_CONFIG_GLOBALCONFIG=/tmp/task-v08en/global.npmrc npm_config_audit=false npm_config_fund=false npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass; both config files empty | `install.log` |
| baseline-22.23.3 / 24.22.1 / 22.12.0 | `npm test` | Each 583 pass / 0 fail on base | `baseline-<version>.log` |
| typecheck-22.23.3 / 24.22.1 | `npm run typecheck` | Both pass | `typecheck-<version>.log` |
| build-22.23.3 / 24.22.1 | `npm run build` | Both pass | `build-<version>.log` |
| full-22.23.3 / 24.22.1 / 22.12.0 | `npm test` | Each 605 pass / 0 fail | `full-<version>.log` |
| reactions-repeat-1 through 5 | `node --import tsx --test --experimental-test-isolation=none test/reactions.test.ts` | Each 22 pass / 0 fail | `reactions-repeat-<n>.log` |
| changelog | `node "$ORGASMIC_EVIDENCE_DIR/check-changelog.mjs"` | Added-fragment check plus release grammar validated in disposable scratch | `changelog.log` |
| diff-check | `git diff --check HEAD^ HEAD` | Pass | Receipt indexed in `final-gates.log` |

`NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` were set from the first command onward. Test commands preloaded `loopback.cjs` through NODE_OPTIONS: it refuses listeners without an explicit loopback host. No new global fetch mocks or nested per-property mocks were introduced.

### Red/green, mutations and development failures

- `reactions-red.log`: 16 failures / 4 passes on unchanged production sources. The four byte-identity tests passed on the base; rendering and removal tests failed as intended.
- `reactions-green.log`: one test expected the send-list refusal to name its environment variable, whereas upstream names the allowed channels. Corrected that assertion to match the existing refusal, without changing production policy. `reactions-green-fixed.log`: 20 pass / 0 fail before the two additional edge cases.
- `dev-suite.log`: 604 pass / 1 fail because the existing exhaustive Slack-error test table needed the new tool. Added its write classification; `dev-suite-fixed.log`: 605 pass / 0 fail.
- Four deliberately introduced mutations were killed by assertions: own=false, cap 21, missing send-list check, and missing successful ACK retirement. `mutation-{own,cap,send-list,ack}.log` show the failing tests; `mutate.py` restores the original file in a finally block. These are expected test failures, not residual regressions.
- New coverage exercises real JSON-RPC dispatch through the server and adapter with fresh fake Slack clients, including feature denial, send-list-before-any-Slack-call, DM restrictions, shared Slack errors, thread replies, unknown bot ID, byte budgets and ACK ordering. No live Slack credentials were used.

## Unmet Criteria

None for the implementation dispatch. Independent review, opening the PR, merge and rollout remain owner/reviewer actions and were not performed locally.

## Residual Risk

- Not tested against a live Slack workspace or external MCPL host. Reaction counts and user membership depend on the response Slack supplies, which may contain partial user lists.
- The existing ACK timeout limitation remains: an add whose request times out can still land after a removal. No new reconciliation API calls were added.
- Future rebases against #55/#56 may require resolving the two shared source files listed above.

## PR body

Saved as `pr-body.md` in this evidence directory, quoted verbatim below.

> ## Problem
>
> Agents can add reactions but cannot see existing reactions in history or remove their own. This makes shared reaction-based status conventions difficult to use safely.
>
> ## Changes
>
> - `fetch_history` and `fetch_thread` include reaction names, Slack counts, and `own` when Slack's user list includes the bot. Each message lists at most 20 reactions and reports `reactionsOmitted`; metadata counts against the existing byte budget. Messages without reactions remain byte-identical.
> - Add `remove_reaction` with the same arguments, `slack.messaging` feature set, communication tool class, send-list and DM restrictions as `add_reaction`. `no_reaction` explains that only the bot's own reactions can be removed; other errors use the shared Slack error explanations.
> - Manual removal of the ACK emoji waits for its pending add, coordinates with automatic cleanup, and retires only the matching ACK after success or `no_reaction`. Failed removals retain cleanup.
> - Update tool/feature-set documentation and add a changelog fragment. Live incoming messages and first-interaction backscroll are unchanged.
>
> No additional scope is required: [history includes reactions under conversation history scopes](https://docs.slack.dev/reference/methods/conversations.history/), [thread replies use those history scopes](https://docs.slack.dev/reference/methods/conversations.replies/), and [removal uses `reactions:write`](https://docs.slack.dev/reference/methods/reactions.remove/), already in the manifest. No reaction lookup or other extra API call is added.
>
> ## Tests
>
> - Base `7274283fa719a17328ef8e085336ce25f6f22b08`: 583 pass / 0 fail on Node 22.23.3, 24.22.1 and 22.12.0.
> - This commit: 605 pass / 0 fail on each of those versions; failure count identical to the baseline. The full suite runs in one process with loopback-only test listeners.
> - Typecheck and build pass on Node 22.23.3 and 24.22.1.
> - Initial red run: 16 fail / 4 pass against unchanged production code; all four no-reaction byte-identity cases already pass. Final new tests: 22 pass / 0 fail, repeated five times.
> - Four mutations caught: suppress the own marker, exceed the reaction cap, bypass the send-list check, and retain an ACK after successful manual removal.
> - Changelog addition and release-fragment grammar checks pass.
>
> ## Not verified
>
> No live Slack workspace or external MCPL host was exercised. Reaction metadata reflects Slack's response, including potentially partial user lists; no follow-up lookup is performed. As before, an ACK add whose request times out can still reach Slack after a removal.
>
> ## Out of scope
>
> Live reaction events, changes to access policy, rollback of reactions, publishing, merge and rollout.
>
> ## Companion PRs
>
> Independent of #55 and #56; based directly on upstream main, which remained at the requested base when fetched. Shared files to watch during a later rebase: `src/slack-adapter.ts` and `src/server.ts`. No merge-order dependency.
>
> ---
>
> - [x] Changelog fragment added — `changelog.d/slack-reactions.added.md`.
>
> 🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)
