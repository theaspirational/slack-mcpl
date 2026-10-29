# TASK-ZSA2S — round 3: polish and restack

## Changed

- **Commit:** `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf`.
- **Parent:** `ccbbb766614b3c612887d79060c75fc125c9ebcc`; exactly **one** A3 commit above it.
- Preflight confirmed ccbbb766's parent is `f6e628352013751a8d89b76f93486ff4ac2931fe`. Rebased approved `dfbc6ed1` cleanly onto ccbbb766, then amended with the requested polish. See [restack.txt](restack.txt).
- Retained `Co-Authored-By: GPT-6-Astra`. No push, PR, activation setting, or ledger edits. Worktree clean after verification.
- `src/access-policy.ts` is byte-unchanged from ccbbb766. Group admission implementation is unchanged; A3 uses its existing gates. The requested group upload/rollback fixture is adapted in `test/groupDmAccess.test.ts`.
- Reviewed the full report at `/home/orgasmic/.orgasmic/ledgers/theaspirational.slack-mcpl/.orgasmic/tasks/TASK-ZSA2S/dispatches/tx-20261029-theaspirationalslack-6cb71feb-fc67-4c0a-9fb4-9634b1884ccf/report.md`.

### Diff stat against ccbbb766

```text
changelog.d/access-policy-files.fixed.md |   8 +
 src/content.ts                           |  19 +-
 src/file-access.ts                       |  78 ++++++
 src/history-read.ts                      |   3 +-
 src/server.ts                            |  43 ++-
 src/slack-adapter.ts                     |  82 +++++-
 test/adapterAccess.test.ts               |  21 +-
 test/adapterAccessFixture.ts             |   2 +-
 test/fileAccess.test.ts                  | 466 +++++++++++++++++++++++++++++++
 test/fileReferences.test.ts              | 113 ++++++++
 test/groupDmAccess.test.ts               |  19 +-
 11 files changed, 816 insertions(+), 38 deletions(-)
```

### Fix → evidence

| Item | Change and evidence |
|---|---|
| M1: restacked group upload/rollback | Policy ticket is HTTPS `files.slack.com`; fetch relays to the real loopback upload endpoint. Expected upload order is `info → upload → info → complete`; `files.info` supplies exact identity and G1 association before delete. All four legacy/policy × revoke cases pass. |
| Group file admission | Real-server tests in `test/fileAccess.test.ts`: admitted G1 + associated file downloads; unrelated G2 file does not; unnamed G1 and missing `mpim:read` stop before `files.info`; missing `mpim:write` prevents an upload ticket or bytes. Existing group history/write scope tests also pass. |
| M2: deletion guards | Three provenance-backed `deleteFile` tests reject tombstone mode, `check_file_info`, and `is_external:true`, with no delete API call. Replacing both `associatedFile` guard conditions with false fails **all three**, isolated from download tests: [mutation-reviewer_associated_guards.txt](mutation-reviewer_associated_guards.txt). |
| L1: invalid upload ID | Moved ID validation and provenance insertion below `left`; invalid nonempty IDs throw `left(new Error(...), false)`. Adapter test proves orphan evidence, no bytes, no provenance. Real-server upload/rollback test reports the invalid-ID orphan rather than silently forgetting it. Reverting the wrapper kills both tests: [mutation-invalid_id_orphan.txt](mutation-invalid_id_orphan.txt). |
| L2: bounded provenance | Fixed cap of **1000** insertion-ordered entries; oldest insertion evicted, checks do not refresh its age. A 1001-upload test proves the oldest is denied before metadata lookup and the next/newest remain deletable. Removing the cap is killed: [mutation-provenance_cap.txt](mutation-provenance_cap.txt). |
| L3: return description | Policy `fetch_attachment` again describes image blocks, decoded text-ish files, and base64 binary. Real `tools/list` assertion covers it; legacy description untouched. |
| L5: restricted reference | Explicit non-visible `file_access` suppresses `fileId` and renders a non-downloadable label. Absent access metadata and explicit `visible` retain ordinary ID hints. History, thread, backscroll, push and incoming tests verify no stub download ID/URL or per-ref lookup; malformed/non-visible access values have a focused test. |
| L6: global-delete warning | Policy rollback involving files adds “A file deletion removes the file from every conversation it is shared in”. Successful and refused group rollbacks are covered; legacy reason remains unchanged. |
| L4 + DM-delete observation | No behavior changes. Both remain explicit **Before activation** decisions in the PR body below. |

## Verification Gates

All checks were run this round, with notifiers disabled. Installation used empty user/global npm configs and `npm ci --ignore-scripts --offline --no-audit --no-fund`: [gate-a3r3-install-01M641SDHGM0RGFEB1CGQJC32Y.log](gate-a3r3-install-01M641SDHGM0RGFEB1CGQJC32Y.log). Lockfile unchanged. The loopback-only Node guard was active through inherited `NODE_OPTIONS`; HTTPS mocks relay only to loopback. Environment and guard copies: [environment.sh](environment.sh), [loopback.cjs](loopback.cjs). No live Slack calls.

All gate invocations use `timeout 900 orgasmic dispatch gate <name> -- <command>`. Exact runtime paths, command ordering and arguments are in [final-gates.sh](final-gates.sh); combined output is [final-gates.log](final-gates.log). Final gates below ran at the reported commit; mutant runs deliberately dirtied one production file and restored its original bytes in `finally`.

| Command / check | Node | Result | Log |
|---|---|---|---|
| `npm run typecheck` | 22.23.3 | Pass | [gate-a3r3-typecheck-22.23.3-01M6421EGZ4Y3KV21TH4183NHN.log](gate-a3r3-typecheck-22.23.3-01M6421EGZ4Y3KV21TH4183NHN.log) |
| `npm run build` | 22.23.3 | Pass | [gate-a3r3-build-22.23.3-01M6421ERWT7G73XYX3QP23DRK.log](gate-a3r3-build-22.23.3-01M6421ERWT7G73XYX3QP23DRK.log) |
| `npm run typecheck` | 24.22.1 | Pass | [gate-a3r3-typecheck-24.22.1-01M6421F0ZG2XM66T877Y30B1N.log](gate-a3r3-typecheck-24.22.1-01M6421F0ZG2XM66T877Y30B1N.log) |
| `npm run build` | 24.22.1 | Pass | [gate-a3r3-build-24.22.1-01M6421F8ZHVZFHBTX04HY7FEK.log](gate-a3r3-build-24.22.1-01M6421F8ZHVZFHBTX04HY7FEK.log) |
| `npm test` | 22.23.3 | 785/785 | [gate-a3r3-suite-22.23.3-01M6421FH1Q29DM70F2M7DC44M.log](gate-a3r3-suite-22.23.3-01M6421FH1Q29DM70F2M7DC44M.log) |
| `npm test` | 24.22.1 | 785/785 | [gate-a3r3-suite-24.22.1-01M6421YB0GY8YJBJF5TDM06YA.log](gate-a3r3-suite-24.22.1-01M6421YB0GY8YJBJF5TDM06YA.log) |
| `npm test` | 22.12.0 | 785/785 | [gate-a3r3-suite-22.12.0-01M6422CYQ98B906FZJHC3BSQJ.log](gate-a3r3-suite-22.12.0-01M6422CYQ98B906FZJHC3BSQJ.log) |
| New file + group tests, run 1 | 22.23.3 | 113/113 | [gate-a3r3-new-repeat-1-01M6422VFQ683W7CC5PWFG1ZYZ.log](gate-a3r3-new-repeat-1-01M6422VFQ683W7CC5PWFG1ZYZ.log) |
| New file + group tests, run 2 | 22.23.3 | 113/113 | [gate-a3r3-new-repeat-2-01M6422YW32K898F920P3S19PT.log](gate-a3r3-new-repeat-2-01M6422YW32K898F920P3S19PT.log) |
| New file + group tests, run 3 | 22.23.3 | 113/113 | [gate-a3r3-new-repeat-3-01M642328JBY89YQAXYBYS5X6X.log](gate-a3r3-new-repeat-3-01M642328JBY89YQAXYBYS5X6X.log) |
| New file + group tests, run 4 | 22.23.3 | 113/113 | [gate-a3r3-new-repeat-4-01M64235MHMRWD0GZRMNPVFM7M.log](gate-a3r3-new-repeat-4-01M64235MHMRWD0GZRMNPVFM7M.log) |
| New file + group tests, run 5 | 22.23.3 | 113/113 | [gate-a3r3-new-repeat-5-01M642390WNTEQKRJ23AJV483W.log](gate-a3r3-new-repeat-5-01M642390WNTEQKRJ23AJV483W.log) |
| Legacy A/B vs ccbbb766 | 22.23.3 | 32 snapshots identical | [gate-a3r3-legacy-ab-01M6423CD8H1QTRSFZDKSRJHWZ.log](gate-a3r3-legacy-ab-01M6423CD8H1QTRSFZDKSRJHWZ.log) |
| Nine-mutation controller | 22.23.3 | All nine caught; source restored | [gate-a3r3-mutations-01M6423JT8H7QF46ANJYAG3BS8.log](gate-a3r3-mutations-01M6423JT8H7QF46ANJYAG3BS8.log) |
| Changelog predicate + release tests | 22.23.3 | Pass, 27/27 | [gate-a3r3-changelog-01M6423PPARJ97146HXHJCXQRT.log](gate-a3r3-changelog-01M6423PPARJ97146HXHJCXQRT.log) |

“New file + group tests” command:
```sh
node --import tsx --test --experimental-test-isolation=none   test/fileAccess.test.ts test/fileReferences.test.ts test/groupDmAccess.test.ts
```

### Red/green and failures

- Red, before production polish: **102 pass / 9 fail / 111**; expected failures covered L1, L2, L3, L5 surfaces and L6. [red.txt](red.txt), [gate-a3r3-red-01M641V1MQGBG5M1KKV4VMFBV5.log](gate-a3r3-red-01M641V1MQGBG5M1KKV4VMFBV5.log).
- First green: **112/112**, including the additional explicit-access-label test. [green.txt](green.txt), [gate-a3r3-green-01M641WEBHD5E9MRF01Z3JSEC8.log](gate-a3r3-green-01M641WEBHD5E9MRF01Z3JSEC8.log).
- One subsequently added server-path test initially used the wrong test argument (`text` instead of `content`), causing an absent checkpoint. Classified **test-fixture error**, corrected without changing production behavior. [targeted.txt](targeted.txt).
- Corrected targeted run: **113/113**, [targeted-corrected.txt](targeted-corrected.txt). Final clean-commit runs independently repeat these tests five times and in all full suites.
- Mutations are intentional expected failures, not regressions. [mutations.py](mutations.py) caught association bypass, identity bypass, provenance bypass, redirect following, omitted upload recheck, omitted fresh admission, reviewer's guard removal, lost orphan wrapper, and removed provenance cap. Per-mutant `mutation-*.txt` and `gate-a3r3-mut-*.log` contain behavioral failures, not syntax/transform failures. Final status and diff check were clean.

### Legacy byte-identity A/B

[legacy-ab.sh](legacy-ab.sh) and [legacy-ab.mts](legacy-ab.mts) ran against a fresh `git archive ccbbb766` in ignored `dist/a3r3-baseline` and the final source. Both used the same installed dependencies. The **32** real-server/adapter snapshots cover schema, history/thread/backscroll, push/incoming, fetch return/error shapes, upload bytes, rollback and API/fetch traces. Only random checkpoint IDs and loopback ports are normalized.

Both JSON files have SHA-256:
`ba40634a936a4ff4f3fa236a88d64b4f934acfdbddbe27bb7348181f77b6ce81`.
See [legacy-base.json](legacy-base.json), [legacy-current.json](legacy-current.json). Group-specific legacy delivery and upload/rollback are also covered by the full suite.

### Deny matrix retained and extended

- URL-only or mixed URL policy input: no authorization or byte call.
- Missing file scope, revoked/unnamed conversation, missing group read scope: no file metadata/download; missing write scope: no upload/deletion.
- Mismatched ID, unrelated/unshared file, malformed association, tombstone, restricted or external file: no download/delete.
- Private URL on another host, HTTP, credentials, invalid preferred URL, redirect: no authorized byte transfer to it.
- Caller-only provenance, wrong recorded target, consumed/evicted/unknown provenance, orphan: no deletion.
- Membership revoked after bytes: no completion; invalid upload ID: no bytes, honest leftover report.
- One admitted share among several remains sufficient; deletion still affects every share. Repeated downloads recheck freshly, with no authorization cache.

### Inherited evidence

The approved dfbc6ed1 review/design and ccbbb766 group-admission source were context only, rechecked against the current tree. Earlier A/B and mutation harnesses were reused with the comparison base updated to ccbbb766, **not** their prior outputs or receipts. No earlier gate pass is claimed. Current source, tests and fresh evidence are authoritative.

## Unmet Criteria

None for this dormant polish/restack round. L4 and the DM-delete behavior intentionally remain activation decisions, as requested.

## Residual Risk

- Fresh conversation/file evidence is not an atomic Slack transaction: an unshare, membership change or policy change can race the following download, delete or upload completion.
- Deletion is global, not removal of one share. Positive association does not prove exclusive sharing.
- Provenance is process-local and capped at 1000; restart, eviction, unknown IDs or absent current association fail closed and may leave files for manual cleanup.
- The unchanged strict file-mode list and incomplete Slack metadata can deny legitimate files, including shared-channel cases.
- Existing backscroll is message-count bounded rather than newly byte-budgeted by this patch. Live Slack/workspace behavior and macOS were not exercised.

## PR body

### Summary

Depends on the **group-DM PR**, which is itself stacked on **#56**. This is one commit on `ccbbb766`, preparing dormant attachment/file authorization; no setting enables the policy.

- Policy downloads require conversation ID + file ID, fresh conversation admission and fresh exact file/share evidence. URL-only input, external files and redirects are refused. A file shared in several places needs one freshly proven admitted share.
- Attachment hints use only admitted-message metadata, without per-reference API calls. Explicit non-visible file entries are marked non-downloadable.
- Upload targets are rechecked before completion. Rollback deletion requires server-recorded upload provenance, fresh writable admission and current file association. **A deletion removes the file from every conversation it is shared in**, also stated in policy rollback output.
- Upload provenance is capped at **1000 entries**, evicting the oldest insertion. Evicted, unknown, restarted-away, invalid or unshared files fail closed and can require manual cleanup.
- Restacked group upload/rollback tests, added deletion-guard coverage and corrected invalid-ticket orphan reporting. Legacy behavior is unchanged.

### Verification

- Typecheck/build: Node 22.23.3 and 24.22.1.
- Full suite: **785/785** on 22.23.3, 24.22.1 and 22.12.0.
- File/reference/group tests: **113/113**, five consecutive runs.
- **Nine** mutations caught; the reviewer's guard-removal mutation fails all three new deletion cases.
- Legacy A/B against ccbbb766: **32 byte-identical snapshots** after normalizing checkpoint IDs and loopback ports only.
- Changelog check and **27/27** release tests pass. Empty-config, ignore-scripts install; loopback-only verification.

### Before activation

- Decide the supported file-mode list explicitly. The current allow-list remains `hosted`, `snippet`, `post`; other modes fail closed and may include legitimate Slack-hosted content.
- Decide/document whether admitted one-to-one DMs should allow file upload and rollback deletion without a `writeChannels` entry. The inherited DM write semantics are unchanged here.
- Fresh checks cannot eliminate the race between authorization and Slack's next operation. Provenance-backed deletion still affects other shares; incomplete metadata, lost/evicted provenance and orphaned uploads may require manual cleanup.
