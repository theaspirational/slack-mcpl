# TASK-ZSA2S — round 2 implementation

## Changed

**Commit:** `dfbc6ed1d6c412f3696479d56b81dede52c83845` — exactly one commit on `f6e628352013751a8d89b76f93486ff4ac2931fe` (#56). Required trailer: `Co-Authored-By: GPT-6-Astra`.

Preflight matched the required base, initially with a clean tree. `git fetch --no-tags upstream main` again returned `7274283fa719a17328ef8e085336ce25f6f22b08`: **upstream main has not moved**. Final tree is clean. No push, PR, public comment, merge, or policy activation.

Implemented the owner-approved plan, including **keeping deletion**, not the planning round's conservative deletion refusal. No changes to `access-policy.ts`, configuration, startup, or group-DM admission logic. File-specific adapter helpers are beside the upload methods; changes inside event/history paths concern attachment shaping only.

### Diff stat

```text
 changelog.d/access-policy-files.fixed.md |   7 +
 src/content.ts                           |  19 +-
 src/file-access.ts                       |  78 +++++++
 src/history-read.ts                      |   3 +-
 src/server.ts                            |  40 +++-
 src/slack-adapter.ts                     |  77 +++++--
 test/adapterAccess.test.ts               |  21 +-
 test/adapterAccessFixture.ts             |   2 +-
 test/fileAccess.test.ts                  | 352 +++++++++++++++++++++++++++++++
 test/fileReferences.test.ts              |  97 +++++++++
 10 files changed, 661 insertions(+), 35 deletions(-)
```

No dependency/lockfile change. Builds and the archived A/B baseline are under ignored `dist/`, not evidence. Evidence contains scripts, logs and small JSON snapshots only.

### Decision → implementation → evidence

| Owner decision | Implementation and verification |
|---|---|
| **1. IDs in policy; legacy URL-only unchanged** | `server.ts` offers the policy-only `channelId`/`fileId` schema, validates both and rejects a supplied URL before authorization. `resolveFileDownload` owns the new path. Real-server red regression initially permitted URL-only fetching; it now refuses with zero requests. Schema and malformed-argument tests pass. Legacy A/B covers schema and exact successful/error outputs. |
| **2. One admitted share suffices** | `file-access.ts` validates exact file identity and positive exact membership in `channels`, `groups`, `ims`, or nonempty validated public/private share records. Mixed admitted/other shares are accepted; unrelated, malformed and missing evidence denies before bytes. Public/private channels and admitted DMs tested; downloads need no write pin or history scope. |
| **3. Lazy refs, message metadata only** | Policy references carry channel/file IDs and only name/MIME already present in admitted messages. Missing IDs are non-downloadable; ID-only stubs survive with a generic label. No per-ref `files.info`. History, threads, bounded continuation, backscroll, incoming text/metadata, push text/metadata and tags are tested. Hints enter history rendering before byte accounting. Missing `files:read` suppresses refs without suppressing admitted text. |
| **4. Keep provenance-backed deletion** | The adapter records a private file→target entry only from its own upload-ticket response, never from a caller-supplied pair. Deletion requires fresh writable target/`files:write`, this recorded provenance, and fresh `files:read`/`files.info` with exact identity and current association. No private URL is needed for deletion. Success consumes the provenance entry. Tests cover real server upload→rollback, arbitrary/wrong-target pairs, missing scopes, unrelated/mismatched/unshared files, and files shared elsewhere too. A metadata `file_not_found` is wrapped so rollback cannot count it as successful deletion. Sharing-message deletion remains independent. **Deleting an authorized file still deletes its other shares.** |
| **5. Refuse external files and redirects** | Only `files.info` supplies the private URL; exact HTTPS `files.slack.com`, no credentials, no invalid preferred-URL fallback. External/unresolved file metadata fails closed. Policy downloads use `redirect: error`, including rejection of a custom 3xx response. Real loopback tests cover same/cross-origin redirects; bearer and error-leak tests pass. Policy upload tickets also require HTTPS/no credentials and reject redirects. Legacy transport defaults are unchanged. |
| **6. Fresh checks, no cache** | Every download invokes fresh conversation admission and fresh file metadata. Cached labels, earlier refs, prior successful downloads, and message URLs cannot authorize a later fetch. Revocation, metadata/API failures, 429, missing API support and exhausted-call start rule are tested. No claim of atomic unshare/check/fetch. |
| **7. Recheck before completing upload** | After posting bytes, policy uploads re-run the writable-target gate before `files.completeUploadExternal`. Revocation suppresses completion and records the incomplete upload, explaining that nothing was shared and bytes may remain. The original red test caught the missing recheck; the green test and a deliberate recheck-removal mutation prove coverage. |

Authorization errors do not return raw file metadata or other share identities. The current policy's scope/conversation rules remain authoritative: A3 delegates instead of implementing group-DM rules.

## Verification Gates

All checks used `timeout 900 orgasmic dispatch gate <name> -- <command> ...`. Both notifiers were disabled from the first command. Installation used empty user/global npm configs and `npm ci --ignore-scripts --offline --no-audit --no-fund`. The Node preload guard restricts both listeners and outgoing socket connections to loopback; it remained enabled for all Node checks and descendants.

Reproduction inputs: [gate environment](gate-env.sh), [loopback guard](loopback.cjs), [final command script](final-gates.sh), and [combined final transcript](final-gates.log). The script records runtime versions, exact commands and individual receipt/log locations. Installation receipt: `gate-a3-install-01M63Z0ZK2TR0PMP4WFS1AD5C8.log` (51 packages, exit 0). No installation scripts or live Slack requests were run.

### Final committed-code gates

All rows below ran at `dfbc6ed1d6c412f3696479d56b81dede52c83845`. Ordinary gates started/ended clean. The mutation controller restored source byte-for-byte; its individual deliberate-failure gates ran with temporary dirty source.

| Gate / command after wrapper | Result | Log |
|---|---|---|
| `a3-typecheck-22.23.3` / `bash -c 'node --version; npm run typecheck'` | Pass | [log](gate-a3-typecheck-22.23.3-01M63ZY2D95A6SD620HR69YNYC.log) |
| `a3-build-22.23.3` / `bash -c 'node --version; npm run build'` | Pass | [log](gate-a3-build-22.23.3-01M63ZY2WPF4CN0NV57Q8M554X.log) |
| `a3-typecheck-24.22.1` / same typecheck command | Pass | [log](gate-a3-typecheck-24.22.1-01M63ZY3959XCAJ9QBPGYVV9N3.log) |
| `a3-build-24.22.1` / same build command | Pass | [log](gate-a3-build-24.22.1-01M63ZY3QE0PDZ6EMWH6H3ZNWH.log) |
| `a3-suite-22.23.3` / `bash -c 'node --version; npm test'` | **749 pass, 0 fail, 0 skipped** | [log](gate-a3-suite-22.23.3-01M63ZY4070GKQ7NNBGRYSGYDX.log) |
| `a3-suite-24.22.1` / same suite command | **749 pass, 0 fail, 0 skipped** | [log](gate-a3-suite-24.22.1-01M63ZYK3N864090BPCR33GZKM.log) |
| `a3-suite-22.12.0` / same suite command | **749 pass, 0 fail, 0 skipped** | [log](gate-a3-suite-22.12.0-01M63ZZ1Y2RQNAD1CJSF7DX746.log) |
| `a3-new-repeat-1`…`5` / `node --import tsx --test --experimental-test-isolation=none test/fileAccess.test.ts test/fileReferences.test.ts` | **77 pass, 0 fail in each of five runs** | [1](gate-a3-new-repeat-1-01M63ZZGKGR99PMPKZMHFH4BHQ.log), [2](gate-a3-new-repeat-2-01M63ZZGZNVFZ06M9RQQVNCD24.log), [3](gate-a3-new-repeat-3-01M63ZZHARZWEJQDKR47YD6EFA.log), [4](gate-a3-new-repeat-4-01M63ZZHNXRGFEZR5MS43Q85GK.log), [5](gate-a3-new-repeat-5-01M63ZZJ110ZR09BB1F5FX3J1S.log) |
| `a3-legacy-ab` / `bash "$ORGASMIC_EVIDENCE_DIR/legacy-ab.sh"` | **32 snapshots byte-identical** | [log](gate-a3-legacy-ab-01M640ASGCZWC8KG98C7MQPYGY.log) |
| `a3-mutations` / `python3 "$ORGASMIC_EVIDENCE_DIR/mutations.py"` | **6/6 behavioral mutations caught** | [log](gate-a3-mutations-01M63ZZRNXD8QTGHQG5HGR4ASN.log) |
| `a3-changelog` / `bash "$ORGASMIC_EVIDENCE_DIR/changelog-check.sh"` | Added-fragment CI predicate passes; **27 changelog tests pass** | [log](gate-a3-changelog-01M63ZZTWQHCAKZRFGMC6DJZDC.log) |

### Red before green

Before production edits, `a3-red` ran the first four regression tests through the existing adapter/server paths: **0 pass / 4 fail**, all behavioral assertions, not compilation failures. The URL-only tool call incorrectly succeeded; the protected canonical fetch did not exist; a caller-pair-only delete succeeded; an upload completed after target revocation. [Red log](gate-a3-red-01M63Z2T23W9B1NV4S7RW9E26X.log)

The same four cases passed after implementation; they remain in the final 77-test targeted set and all three full-suite runs. The real-server/client production probe uses a loopback Slack API with the actual `SlackWebClient`, a real bounded HTTP byte response, and a transport-boundary rewrite of the already-validated canonical URL to loopback. It verifies exact API/request order and no byte request after file denial; production URL validation is not weakened for tests.

Development-only typecheck failures (new option type and test parameter annotations) and two test expectation mistakes (successful rollback has no reason; legacy push has no structured attachment metadata) were corrected. Final policy push now deliberately includes protected attachment metadata; legacy push remains unchanged. No unresolved regression, flaky gate, or environment-blocked check remains.

### Legacy A/B evidence

`legacy-ab.mts` drives the archived exact base and this commit through the same real server/adapter fixture with explicitly identical granted scopes. It compares 32 snapshots covering initialize/tools schema; history/thread/backscroll; push and incoming; text/image/binary/empty downloads; HTTP, URL, token-header, size and transit failures; upload bytes/payloads; successful/failed-upload rollback; and request traces. Only inherently random checkpoint UUIDs and loopback ports are normalized, not content or wording.

Both output files have SHA-256:

`ba40634a936a4ff4f3fa236a88d64b4f934acfdbddbe27bb7348181f77b6ce81`

Artifacts: [probe](legacy-ab.mts), [runner](legacy-ab.sh), [base bytes](legacy-base.json), [current bytes](legacy-current.json). The exact comparison passes alongside all existing legacy tests. This is fixture-level byte identity, not a claim to have sampled every possible Slack response.

### Mutation evidence

Each own mutation ran `test/fileAccess.test.ts` through its own timeout/dispatch gate and exited 1 with behavioral `not ok` assertions. The controller rejects syntax/transform failures as evidence and restores source in `finally`.

| Removed/weakened invariant | Example caught assertion |
|---|---|
| Positive file association | Subsequent unrelated file fetch is refused; no extra byte request |
| Exact file identity | Mismatched metadata denies download and deletion |
| Recorded upload provenance | Cannot reuse provenance for another writable target or after successful deletion |
| Policy redirect refusal | Canonical server request must set `redirect: error`; production-path probe |
| Final upload target recheck | Revoked target cannot reach completion |
| Fresh conversation admission | Denied/mismatched conversation cannot reach file lookup/download |

Individual gate logs and their names are indexed in the mutation controller log; `mutation-*.txt` preserves each complete assertion transcript. No mutant was committed.

### Inherited evidence and boundaries

Inherited only the planning round's source/reference inventory and policy design discussion, scoped to the unchanged starting base and named fork reference commits. Rechecked affected current source before implementation. The fork was not treated as the specification; no activation or recipient-routing code was ported. **No earlier-round gate pass was reused or implied.** The supplied baseline/conventions and CONTRIBUTING requirements remained unchanged. All numeric test results above are new round-2 executions.

## Unmet Criteria

None for this implementation round. One local commit, required trailer, dormant behavior, red/green, matrix, legacy A/B, six caught mutations, multi-version typecheck/build/full suites, five targeted repetitions, and changelog gate are complete. No remote publication performed.

## Residual Risk

- **Global deletion affects all shares.** Provenance plus a fresh writable admitted share does not confine deletion to that share. This is the owner's expressly selected alternative, documented in code and the changelog.
- Fresh conversation/file checks and the subsequent byte fetch or delete are separate Slack requests. Unsharing/membership can change between them; there is no atomic revocation guarantee and no authorization cache.
- File metadata visibility can be incomplete. Missing/unusable positive proof denies; this may refuse legitimate shared-channel files. Minimal message refs are snapshots, not fresh authorization.
- Orphaned/unshared/unknown files are deliberately not deleted. Rollback may move the checkpoint while cleanup is incomplete; it reports what may remain. Provenance is process-local, not durable across restart, as is existing rollback tracking.
- No live workspace validation, external download support, new setting, or group-DM merge was attempted. The parallel group-DM change must be combined and retested before activation. A3 leaves its policy rules untouched, but attachment/type hunks and shared fixtures can still conflict textually.
- Download authorization adds one conversation check and one `files.info`; deletion adds `files.info` to its fresh target check; upload adds a final target check. These consume existing time/rate budgets and fail closed when unavailable.

## PR body

### Problem

Depends on **#56**; merge #56 first. Its dormant policy hides attachment references but leaves URL-based `fetch_attachment` ungated. File deletion checks only the supplied conversation, not the file's current association.

### Changes

- In policy mode, require conversation/file IDs and fresh admission plus file association before downloading Slack's canonical private URL. Refuse external files and every redirect.
- Restore protected references from admitted-message metadata across history, threads, backscroll and incoming delivery, without per-reference file lookups.
- Keep file deletion, requiring server-recorded upload provenance, a fresh writable target, `files:write`, and fresh `files:read` metadata confirming identity and association. **Deletion still affects the file's other shares.** Unshared/orphaned/unverifiable files remain for manual cleanup.
- Recheck upload targets before sharing. Keep policy dormant and legacy behavior unchanged; add a changelog fragment.

### Tests

- Four behavioral regressions failed before the fix and pass afterward.
- Full suite: **749 pass / 0 fail / 0 skipped** on Node **22.23.3, 24.22.1 and 22.12.0**.
- Typecheck and build pass on **22.23.3 and 24.22.1**.
- **77 targeted tests × 5** pass; **six security mutations** are caught.
- **32 legacy A/B snapshots** are byte-identical after normalizing only checkpoint UUIDs and loopback ports.
- Real server/client loopback probe, deny matrix, native redirect checks and changelog check pass.

### Not verified / out of scope

No live Slack workspace or combined parallel group-DM branch tested. No policy activation or group-DM rule changes. Checks cannot make concurrent unsharing atomic. This PR is stacked on #56 and must remain dormant until the series is complete.

AI-assisted implementation using Codex.
