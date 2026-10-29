# Changed

- Commit: `9592c649e55ba22f08d30765613be653b57fa206`. One commit directly on `f6e628352013751a8d89b76f93486ff4ac2931fe`; required `Co-Authored-By: GPT-6-Astra` trailer present. Clean worktree. No push, PR, or GitHub comment.
- Initial `git rev-parse HEAD` matched the required baseline. `git fetch upstream main` returned `7274283fa719a17328ef8e085336ce25f6f22b08`: upstream main had not moved.
- Read baseline `/home/orgasmic/.orgasmic/ledgers/theaspirational.slack-mcpl/.orgasmic/project.org` and repository `CONTRIBUTING.md`. No applicable AGENTS.md found; no supplied conventions/gotchas. Fork commits `6a1946d` through `685b2de` were reference only; implementation uses the upstream adapter and test injection shape.
- Strict optional `groupDms` exact G-ID list; fresh membership, scope admission, listing, history/thread reads, inbound delivery and write checks. Still dormant: no setter, setting, or environment variable.
- Newly added group-DM labels are policy-only. `server.ts` changes are exclusively labels/framing; existing descriptor labels are unchanged.
- Scope clarification `ask-21a7d3fae3a04478b16fa58cb887a268` explicitly permitted the shared write-guard effect: **named group DMs are writable for uploads and deletes through the same guard**. No upload/delete implementation, attachment reader, file reader, or `fetch_attachment` changes.
- Mechanical effects: build output is ignored under `dist/`; dependency installation is ignored under `node_modules/`. No lockfile changes.

```text
changelog.d/named-group-dm-policy.added.md |   5 +
 src/access-policy.ts                       |  28 +++-
 src/server.ts                              |  17 +-
 src/slack-adapter.ts                       |  10 +-
 test/accessPolicy.test.ts                  |   4 +-
 test/groupDmAccess.test.ts                 | 248 +++++++++++++++++++++++++++++
 6 files changed, 295 insertions(+), 17 deletions(-)
```

## Requirement → evidence

| Requirement | Evidence |
|---|---|
| Exact group IDs, strict parsing, read once, frozen copies, Array.from, unknown-key refusal | `src/access-policy.ts`; `test/groupDmAccess.test.ts:19` covers changing getter, frozen copied list, sparse/null/wrong-kind/whitespace IDs and unknown string/symbol keys. Existing parser tests retained. |
| Refuse overlap with history-membership fallback | The baseline does not support `historyMembershipFallbackChannels`; it remains an unknown key. The parser test explicitly rejects overlapping `groupDms: ['G1']` / fallback `['G1']`, and also an empty fallback. No fallback capability introduced. |
| Admission/listing/history/thread/writes; scopes before effects; ≤1 lookup on refusal | Eight-operation group matrix at test line 70, listing at 101, inbound at 116; assert exact `['info']` on known-scope refusals and no calls for unknown scopes. Write checks require exact write pin, `mpim:read`, `mpim:write`, and effect scope. History/thread/inbound require `mpim:history`. |
| Independent of readJoinedChannels; distinguish both guards | Test at line 42 admits named G1 with joined reads off while refusing ordinary C1. Removing the generic joined-channel guard fails exactly this row; removing dedicated group admission also fails it. Test at 160 uses only mpim read/history scopes and no write pin. |
| Hostile unnamed G, C in group list, missing scopes, framing/labels | Tests at 19, 42, 70 and 129. Real server delivery escapes a newline/system-tag name in auto-subscribe, backscroll and location labels. |
| Legacy/no-policy byte preservation | Tests at 150, 168 and 190. `legacy-probe.mts` runs the real server/adapter against fake Slack and loopback upload bytes on baseline sources and final sources. `legacy-baseline.json` and `legacy-current.json` match byte-for-byte (SHA-256 `1cd0eb9000fcf683a392bab52d0f2cc6224a831cb5467c1335b54e0b69719c48`). Compared tool content, inbound payload/origin/tags, upload/delete requests and upload bytes; generated checkpoint UUIDs are deliberately excluded. |
| Real tool upload and delete admission/refusal | Tests at 190 and 227: named upload succeeds, unnamed upload refuses; rollback deletes a named group's own uploaded file, but refuses after its group pin is removed. File deletion has no standalone tool: rollback is the real exposed server path. Named/unnamed `delete_message` tools also covered. No-policy upload/rollback request bytes remain unchanged, including after membership changes. |
| Red then green | Final 22 new tests on baseline sources: 4 pass / 18 fail (`red-final-owner.log`); final sources: 22 pass / 0 fail, five times. Earlier initial red: 1 pass / 14 fail. |
| At least three caught mutations | Six caught: remove group-name guard (12 failed), generic joined-channel guard (1), mpim write scope (5), mpim history scope (5), leak labels to legacy (2), remove dedicated group admission (17). `probes.py`, `probes-summary.log`, and `mutation-*-owner.log`; all mutations restored before commit. |
| No unsupported activation or ownership expansion | Test-local injection only; source diff restricted to policy, adapter conversation admission/labels and server labels. Manager-approved shared upload/delete guard effect only; file/attachment read paths untouched. |

# Verification Gates

All final gates below ran on clean `9592c649e55ba22f08d30765613be653b57fa206`, with receipts recorded as reusable. No receipts reused. Each command was wrapped in `timeout 900 orgasmic dispatch gate <name> -- ...`.

- `npm ci --ignore-scripts` used separate empty user/global npm configs; 51 packages installed. `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` were set from the first command onward.
- Loopback-only listener guard loaded via `NODE_OPTIONS=--require=/tmp/task-t71qc/loopback.cjs` throughout installs/probes/tests/gates. Copies of `loopback.cjs` and `env.sh` are in evidence.
- `typecheck-*`: `npm run typecheck`; `build-*`: `npm run build` on Node 22.23.3 and 24.22.1.
- `suite-*`: `npm test` on Node 22.23.3, 24.22.1 and 22.12.0: **694 pass / 0 fail on each**.
- `group-repeat-1` through `group-repeat-5`: `node --import tsx --test --experimental-test-isolation=none test/groupDmAccess.test.ts` on Node 22.23.3: **22 pass / 0 fail each**.
- `git diff --check` passed. Commit parent, trailer, one-commit count, source diff boundary and clean status verified.
- Durable command/owner evidence: `final-gates.sh`, `final-gates-owner.log`; probes/mutation script and output are also in this evidence directory. An initial legacy comparison included nondeterministic checkpoint UUIDs and failed only on those UUIDs; corrected comparison explicitly excludes them. Initial scratch probe setup needed an `.mts` extension and the installed package's correct entry path. These were probe setup issues, not product regressions. Red/mutation gate failures are intentional.

Log paths below are relative to this report's evidence directory.

| Gate | Outcome | Log |
|---|---|---|
| `typecheck-22.23.3` | PASS | `gate-typecheck-22.23.3-01M63YJQSZR826G7HV1QJ7NXJY.log` |
| `build-22.23.3` | PASS | `gate-build-22.23.3-01M63YJR27KZYPWMBQDERAGNP9.log` |
| `suite-22.23.3` | PASS | `gate-suite-22.23.3-01M63YJRDEWM0EKAC961JQ4WBD.log` |
| `typecheck-24.22.1` | PASS | `gate-typecheck-24.22.1-01M63YK7EYFMJP74T3D2QWPBWN.log` |
| `build-24.22.1` | PASS | `gate-build-24.22.1-01M63YK7YB5A74YCKQDFF6DBXE.log` |
| `suite-24.22.1` | PASS | `gate-suite-24.22.1-01M63YK89P3BS7JWMB43YDN4T8.log` |
| `suite-22.12.0` | PASS | `gate-suite-22.12.0-01M63YKQ4NQAW5K7P2VAVEGM8J.log` |
| `group-repeat-1` | PASS | `gate-group-repeat-1-01M63YM6RM4KXZ24V3C3M371RN.log` |
| `group-repeat-2` | PASS | `gate-group-repeat-2-01M63YMA1R9W9V9ZZGX929JE33.log` |
| `group-repeat-3` | PASS | `gate-group-repeat-3-01M63YMD7RYMM7TD9AJTJ3ERTM.log` |
| `group-repeat-4` | PASS | `gate-group-repeat-4-01M63YMGHC80ZCZ4D1A72GGVCH.log` |
| `group-repeat-5` | PASS | `gate-group-repeat-5-01M63YMKTX3P0AW9478GTBTA69.log` |

# Unmet Criteria

None. The dormant baseline's unsupported fallback key remains refused rather than gaining fallback behavior.

# Residual Risk

Not exercised against a live Slack workspace. Slack boundaries are stubs or loopback endpoints; production server, adapter, tool dispatch, framing and rollback code are exercised. Activation, directory confinement and file/attachment reads remain separate work.

# PR body

## Problem

The dormant explicit access policy rejects every group DM, including conversations deliberately named by an operator.

## Changes

- Add an optional, strictly parsed `groupDms` list of exact G-prefixed conversation IDs.
- Require fresh joined membership and mpim scopes for admission, listing, history, threads and writes, independently of `readJoinedChannels`. Writes also require an exact write-channel pin and the operation's scope.
- Keep unsupported history-membership fallback input refused, including overlapping IDs.
- Add policy-only group-DM labels with existing framing protections; preserve legacy behavior.
- Named group DMs are writable for uploads and deletes through the same guard. Upload/delete implementations and file/attachment readers are unchanged.
- Remain dormant: no setter, setting or environment variable enables the policy.

## Tests

- Typecheck and build: Node 22.23.3 and 24.22.1.
- Full suite: 694 pass / 0 fail on Node 22.23.3, 24.22.1 and 22.12.0.
- New tests: 22 pass / 0 fail, repeated five times; baseline red run: 4 pass / 18 fail.
- Six security mutations caught, including independent group-DM and ordinary-channel guards.
- Real server upload/rollback and hostile-label tests; baseline/current legacy payload and write-request bytes match, excluding generated checkpoint UUIDs.

## Not verified

Live Slack workspace behavior.

## Out of scope

Policy activation, history-membership fallback support, directory confinement, and file/attachment reads.

## Companion PRs

Depends on #56; merge #56 first. This remains dormant after merging.

AI-assisted implementation with GPT-6-Astra.
