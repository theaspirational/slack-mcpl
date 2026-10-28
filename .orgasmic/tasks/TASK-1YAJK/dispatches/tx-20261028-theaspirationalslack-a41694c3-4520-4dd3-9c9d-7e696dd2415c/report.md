# Changed

Completed the corrected round-two brief. Final local commit: **`ed377dd911e0b78d2ad4301486ad852d9c3d04d2`**.

Preflight matched `eb204f8a3450943d1a6d6f6c8e2ec49ea0800f6e`. This round adds only **22 lines** to `test/accessPolicy.test.ts`; no production, lockfile, or other tracked-file changes. All round-one tests remain byte-for-byte intact (`scope-check.log`). No push, GitHub comment, new merge, global installation, or Git identity change.

The existing merge commit remains `b5675782c16eb4a496f664cbda1dcb0896ba848e`, merging PR head `6a1946d072bfcc99d67a837d2fcc6132e677fcf7` onto base `b956350d4e77f09df76240439b3d35d512061899`; its two conflict blocks remain untouched.

## New case (d) tests

Both instances are defined by the loop at **`test/accessPolicy.test.ts:511-530`**, with the test declaration at **line 512**:

- `group DM reply: missing chat:write refusal precedes malformed text without any write`
- `group DM reply: unlisted destination refusal precedes malformed text without any write`

Each sends a reply with a lone surrogate, asserts the specific scope/unsupported-group refusal rather than malformed-text validation, and permits only zero calls or one `conversations.info` call for that destination. Every mutating call is forbidden. Lines 524-525 explicitly say that the metadata lookup is current behaviour, not a pinned requirement. Both destinations are in `writeChannels`, isolating the second case's missing `groupDms` authorization from the separate write-channel check.

**Between the authorization call and refusal, `requireWritableConversation` calls `readAccessConversation`, which invokes Slack's read-only `conversations.info` at `src/slack-adapter.ts:1152` before the policy rejects the destination or missing write scope.** No production change was made for this accepted finding.

# Verification Gates

All gates used `orgasmic dispatch gate <name> -- <command>`. Paths below are relative to this round's `$ORGASMIC_EVIDENCE_DIR`; each log identifies the native gate receipt log. All final gates ran fresh at the final commit, with a clean tree.

## Mutation evidence for (d)

Target command: `node --import tsx --test --test-name-pattern=<pattern> test/accessPolicy.test.ts` on Node **22.23.3**. Gate names are `round2-d-red-<name>` and `round2-d-green-<name>`.

| Mutation | Pattern | Red pass/fail/skip | Restored green pass/fail/skip | Logs |
|---|---|---|---|---|
| (i) `order`: swap authorization and text validation at `src/slack-adapter.ts:1438-1439` | `group DM reply:` | 0 / 2 / 0 | 2 / 0 / 0 | `d-red-order.log`, `d-green-order.log` |
| (ii) `scope`: bypass `requireScope(scopes, writeScope)` only for `group_dm`, at `src/access-policy.ts:110` | `group DM reply: missing chat:write` | 0 / 1 / 0 | 1 / 0 / 0 | `d-red-scope.log`, `d-green-scope.log` |
| (iii) `destination`: remove `this.groupDms.has(channelId)` from group admission at `src/access-policy.ts:82` | `group DM reply: unlisted destination` | 0 / 1 / 0 | 1 / 0 / 0 | `d-red-destination.log`, `d-green-destination.log` |

Every red gate exited 1 with the malformed-text error (`text holds a lone UTF-16 surrogate`) instead of the expected authorization error. Every restored green gate exited 0. The initial unmodified-production gate `round2-d-initial` also passed both cases (`d-initial.log`).

The order mutation swaps two adjacent lines in one temporary edit, rather than changing one physical line. Each other mutation changes one line. Every mutation was restored byte-for-byte in a `finally` block, followed by `git diff --exit-code -- src`, before its green run. No mutant was committed. Exact edits, commands, and restoration checks: `d-mutations.py`, `d-mutant-{order,scope,destination}.patch`, and `d-mutations.log`.

## Fresh final gates

| Gate | Command | Result | Log |
|---|---|---|---|
| round2-final-ci-22 | `npm ci --ignore-scripts` | Pass | `final-ci-22.log` |
| round2-final-build-22 | `npm run build` | Pass | `final-build-22.log` |
| round2-final-typecheck-22 | `npm run typecheck` | Pass | `final-typecheck-22.log` |
| round2-final-test-22 | `npm run test` | Pass | `final-test-22.log` |
| round2-final-routing-24 | `$NODE24 --import tsx --test --test-reporter=tap test/accessPolicy.test.ts test/recipientRouting.test.ts` | Pass | `final-routing-24.log` |
| round2-final-test-24 | `$NODE24 --import tsx --test --test-reporter=tap test/*.test.ts` | Pass | `final-test-24.log` |

Node 22 is **22.23.3**. Update notifiers were disabled from the first command. Dependency installation used the public npm registry and empty separate user/global npm config files; no install scripts or lockfile modifications.

`$NODE24` is the existing scratch installation of official **Node 24.22.1 Linux x64**, outside the repository. Its tarball again matched the previously published checksum, and the installed executable was compared byte-for-byte with the verified archive. Evidence: `node24-verification.log`, `inherited/node24-checksum.txt`. SHA-256:

`6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`

## Base versus final

| Revision / engine / scope | Total | Pass | Fail | Skip |
|---|---:|---:|---:|---:|
| Base b956350d / Node 22.23.3 / full suite | 793 | 768 | 0 | 25 |
| Round-one final / Node 22.23.3 / full suite | 816 | 789 | 0 | 27 |
| Final ed377dd9 / Node 22.23.3 / full suite | 818 | 791 | 0 | 27 |
| Base-to-final difference / Node 22 | +25 | +23 | 0 | +2 |
| Final ed377dd9 / Node 24.22.1 / routing files | 75 | 75 | 0 | 0 |
| Final ed377dd9 / Node 24.22.1 / full suite | 818 | 818 | 0 | 0 |

The PR adds 19 tests, round one adds four, and this round adds two. Both new case (d) instances run on both engines. The two skips added since base are the existing PR group-DM routing test and round one's routing denial test; both pass on Node 24. No final failures, cancelled tests, or todo tests.

## Valid inherited evidence

- The clean, completed `baseline-test-confirmed` gate at immutable base `b956350d4e77f09df76240439b3d35d512061899` was inspected: `npm test`, exit 0, 768 passed / 0 failed / 25 skipped. Therefore the baseline was not rerun, as instructed. Copied evidence: `inherited/baseline-test-confirmed.log` and `inherited/gate-baseline-test-confirmed-01M61BQ8QN535PY55KXHS1PSFP.log`. This supports only the historical baseline, not the final commit.
- Round-one red/green probes for framing, incoming `mpim:read`, incoming `mpim:history`, and routing remain applicable: their production sources and existing test bytes are unchanged. Copies are under `inherited/red-*.log`, `inherited/green-*.log`, and `inherited/mutations.{py,log}`. They are historical targeted-probe evidence, not clean final-gate receipts; all final suites were rerun.
- The round-one suite row is historical comparison only. No previous final-gate result was reused to claim a final pass in this round.

# Unmet Criteria

None under the corrected brief. Every requested check ran; nothing required was unavailable. The baseline rerun was intentionally omitted because its confirmed gate was complete. No extra Node 24 build/typecheck was requested or claimed.

# Residual Risk

- Authorization still performs the accepted read-only metadata lookup before refusal; eliminating that lookup would be a separate production decision. The tests intentionally permit earlier refusal with zero Slack calls.
- `npm ci` again reported two high-severity dependency vulnerabilities. Dependency remediation is outside this tests-only assignment; dependencies and lockfile were not changed.
- Node 22 intentionally skips routing-dependent tests; the complete Node 24 suite passed with no skips.
