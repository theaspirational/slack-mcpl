# TASK-ZSA2S review — dormant file/attachment enforcement at `dfbc6ed1`

Reviewed `dfbc6ed1d6c412f3696479d56b81dede52c83845`, one commit on `f6e628352013751a8d89b76f93486ff4ac2931fe` (#56),
against the plan round's report, round 2's decision table, and the owner's `a3:recs:keepdelete` go (deletion KEPT).
Read-only: the assigned worktree is unchanged (`git status --porcelain` empty at `dfbc6ed1`). Every probe and
mutation ran in a scratch clone under `/tmp`, never in the tracked tree.

## Verdict

**Approve for landing as the third dormant step of the series.** No HIGH findings. The reported hole in #56 is real
and is closed: `fetch_attachment` in policy mode no longer accepts a URL, and the only byte-fetch call site in the
tree now requires fresh conversation admission plus a fresh `files.info` showing exact identity and positive
association. Every owner decision 1–7 is implemented as decided, including the kept, provenance-backed deletion
with honest rollback counts. Legacy behaviour is byte-identical under my own independent A/B.

Two things should be settled before the series' activation step, neither blocking this PR: the parallel group-DM
branch's upload/rollback test must be adapted (M1 — the merge is textually clean but two of its tests fail), and
one security guard in `associatedFile` survives mutation (M2).

## Findings

### MEDIUM

**M1 (test/integration) `test/groupDmAccess.test.ts:212` (on the parallel branch `ccbbb766`) — combining the two
branches merges cleanly but leaves 2 failing tests; the conflict is semantic, not textual.**
`git merge ccbbb766` into `dfbc6ed1` auto-merges `src/server.ts` and `src/slack-adapter.ts` with no conflict
markers (`access-policy.ts` is untouched by A3), and the merged tree typechecks. The merged suite is
**770 pass / 2 fail / 772**, both in `real upload tool and rollback file delete: legacy=false, revoke group={false,true}`:
- `src/slack-adapter.ts:1370` now requires an `https:` upload ticket, and that test points `state.uploadUrl` at
  `http://127.0.0.1:PORT/F1`, so the upload is refused at line 212 (`assert.notEqual(uploaded.isError, true)`).
- Behind that, two more expectations are stale: `assert.deepEqual(f.methods(), ['info','upload','complete'])`
  misses A3's pre-completion recheck (`['info','upload','info','complete']`), and its fixture stubs no
  `web.files.info`, so the rollback `deleteFile` would now fail with `Slack file metadata is unavailable`.
Impact: whichever branch lands second breaks CI until its test is adapted exactly as A3 adapted
`test/adapterAccess.test.ts:273-284` (mock `fetch`, keep the ticket `https`, expect the extra `info`).
Fix direction: in that test use `https://files.slack.com/upload/F1` as the ticket with a `fetch` mock relaying to
`uploadEndpoint()`, add the extra `info` to the expected method order, and stub `files.info`.
Evidence: scratch merge in `/tmp/zsa2s-merge`; `rv-combined-probe.test.ts`.

**M2 (test) `src/file-access.ts:15-18` — the external/mode/tombstone/`file_access` guards in `associatedFile` are
only covered through the download path, where `privateFileUrl` duplicates them; the deletion path has no coverage.**
Replacing both guard conditions in `associatedFile` with `false` leaves the full suite at **748 pass / 1 fail** —
only `file evidence denial 14` (`{deleted:true}`) notices. `is_external:true`, `mode:'external'`,
`mode:'tombstone'` and `file_access:'check_file_info'` still pass, because `privateFileUrl` (`src/file-access.ts:45-46`)
re-checks the first two on the way to the URL and the download never reaches a tombstone's absent URL.
`deleteFile` → `readAssociatedFile` never calls `privateFileUrl`, so for deletion these guards are the only line
of defence and are unexercised. Nothing is wrong today; a future edit to `associatedFile` would silently permit
`files.delete` on a tombstoned, `file_access`-restricted or external file.
Failure scenario: drop `src/file-access.ts:15-18`, run `npm test` → green; `deleteFile('C1','F1')` on a file whose
`files.info` answers `{id:'F1',channels:['C1'],mode:'tombstone'}` then calls `files.delete`.
Fix direction: add adapter-level `deleteFile` denials for `{mode:'tombstone'}`, `{file_access:'check_file_info'}`
and `{is_external:true}` (three lines beside the existing provenance cases in
`test/fileAccess.test.ts:258-267`), or assert `associatedFile` directly for those states.
Evidence: `$ORGASMIC_EVIDENCE_DIR/rv-mutation-external_guard.txt` (gate `rv-mut-external_guard`, exit 0 — mutant
survived the targeted set) plus the full-suite run quoted above.

### LOW

**L1 (correctness) `src/slack-adapter.ts:1355` — a non-canonical `file_id` under policy throws before `left()`
exists, so the file Slack has already created is not recorded for rollback and is never reported.**
`uploadFile` validates `FILE_ID.test(fileId)` and throws a bare `Error('Slack upload returned an invalid file ID')`
*above* the `left` helper and above the comment that states the contract: "Slack gave the file its ID at the first
step, so whatever fails from here leaves that file for a rollback to delete." Probe: `fileLeftByUpload(err)` is
`undefined` for that throw, and the agent sees only `Slack upload returned an invalid file ID` — no "may remain"
note, no file ID. Every other post-ticket failure in the method is wrapped in `left(err, false)`.
Real Slack is very unlikely to return such an ID, hence LOW, but the inconsistency is the kind that survives a
refactor. Fix direction: move the `FILE_ID` check (and the `policyUploads.set`) below `left`'s definition and
`throw left(new Error(...), false)`.
Evidence: `$ORGASMIC_EVIDENCE_DIR/rv-behaviour-probes.test.ts`, first probe.

**L2 (perf) `src/slack-adapter.ts:1297` — `policyUploads` grows one entry per policy upload and is pruned only by a
successful `files.delete`.** After three uploads the map holds `[['F1','C1'],['F2','C1'],['F3','C1']]`; a refused or
never-attempted deletion, or an upload that failed after the ticket, leaves its entry forever. Over a long-lived
connector process this is an unbounded per-upload leak (small, but it also keeps provenance alive indefinitely,
which widens the window in which a rollback can delete an old file). Fix direction: cap the map (LRU or a
bounded insertion-ordered eviction) or drop entries once the `stateTracker` no longer holds the upload.
Evidence: `rv-behaviour-probes.test.ts`, second probe.

**L3 (docs) `src/server.ts:396-403` — the policy-mode `fetch_attachment` description drops the return-shape
guidance the legacy description carries.** Legacy says "images as image blocks, text-ish files decoded, other binary
as base64"; the policy override says only "Fetch a Slack-hosted file through a freshly verified admitted
conversation… Max 5 MiB." The behaviour is unchanged (`toFetchResult` is shared), so a policy-mode agent loses
information it needs to anticipate the result shape. Fix direction: keep the legacy sentence and replace only the
URL sentence.

**L4 (design) `src/file-access.ts:16,46` — the `mode` allow-list `['hosted','snippet','post']` also refuses
legitimate Slack-hosted modes.** Slack files can carry `mode: 'email'`, `'space'`/`'docs'`/`'quip'` (canvases) and
others; all are hosted, carry `url_private`, and would be denied even when freshly proven shared in an admitted
channel. It fails closed, and the round-2 report discloses "this may refuse legitimate shared-channel files", but
the concrete list is worth pinning before activation rather than discovering it in a workspace.
Fix direction: decide the mode list explicitly at the activation step (deny-list `external`/`tombstone`/
`file_access` plus a positive `url_private` on `files.slack.com`, rather than an allow-list of three).

**L5 (design) `src/file-access.ts:67` — refs advertise `fetch_attachment(...)` for Slack Connect stubs whose
download is always denied.** `policyFileRefs` emits `fileId` for any `F…`-shaped id, including a
`{id:'FSTUB', file_access:'check_file_info'}` entry (the fixture's own case,
`test/fileReferences.test.ts:9`), but `associatedFile` denies `file_access !== 'visible'`. The agent is handed a
call that cannot succeed. Fix direction: when the message entry already says `file_access !== 'visible'`, emit the
generic non-downloadable label instead of a `fileId`.

**L6 (docs) — the "deletion still affects the file's other shares" warning reaches no runtime surface.** It is in
`src/slack-adapter.ts:1542`, the changelog fragment and the PR body, but not in the `upload_file` tool description,
the upload result, or the rollback `reason`. An operator reading only tool output never learns it. Fix direction:
one clause in the rollback reason or the `upload_file` description at the activation step.

### Observation (not a finding)

`deleteFile` is reachable for an admitted **DM** target under policy: `assertNotDm` returns immediately when a
policy is installed (`src/slack-adapter.ts:1442-1444`) and `requireWritable` exempts `kind === 'dm'` from the write pin.
Probe: `uploadFile('D1',…)` then `deleteFile('D1','F1')` runs `['info','fileInfo','deleteFile']`. This is #56's
write-gate semantics, not A3's — A3 only adds the provenance and association gate on top of it. Flagging so the
activation step decides deliberately whether DM file writes are intended.

## Answers to the brief's hunt list

**1. Download paths without fresh admission / fresh `files.info` / exact identity / positive association — none found.**
`fetchAttachmentBytes` has exactly one call site in `src/` (`server.ts:922`), reached only from the
`fetch_attachment` case. In policy mode that case takes `channelId` + `fileId`, refuses a `url` key before any
network call (`server.ts:896`), and gets its URL only from `resolveFileDownload` → `requireScope('files:read')` →
`readAccessConversation` (fresh `conversations.info` + `requireReadable`) → `readAssociatedFile`
(fresh `files.info` + `associatedFile`) → `privateFileUrl`. Checked and clear for: URL params (refused);
refs (`PolicyFileRef` carries no `path`/`url` — declared `never` and asserted at
`test/fileReferences.test.ts:62-63`); ID-only Slack Connect stubs (ref offered, download denied by the
`file_access` guard); push/incoming metadata (`channelId`/`fileId` only; I re-verified no `https://` anywhere in
the delivered params); cursors (`requireHistoryConversation` runs per call including continuation, and refs are
re-derived from each fresh page — never a stored authorization); retries (no retry wrapper around the byte GET;
the Slack client's own retries are on the authenticated `files.info`/`conversations.info` calls).
Caching: there is no authorization cache — a previously successful download is re-gated
(`test/fileAccess.test.ts:154-166`).

**2. URL validation — correct.** `privateFileUrl` reads only `url_private_download` (preferred) or `url_private`
from the `files.info` answer, with **no fallback** when the preferred field is present but unusable
(`Object.hasOwn` + type check, asserted at `test/fileAccess.test.ts:103-106`; my `url_fallback` mutation was
caught), and routes it through `parseSlackAttachmentUrl`, so HTTPS + host exactly `files.slack.com` + no
credentials (my `url_host` mutation was caught by 5 assertions). Policy downloads set `redirect: 'error'`
(`server.ts:921`), verified both against a synthetic 302 and against two real loopback servers (same-origin and
cross-origin) in `test/fileAccess.test.ts:236-245`. The bearer goes only to the validated `files.slack.com` URL and
the no-redirect policy removes the cross-origin case entirely. Error text leaks nothing: `associatedFile` and
`privateFileUrl` throw one fixed sentence; `fetchAttachmentBytes`'s `!resp.ok` message names the status, never the
URL; `inTransit` reports the transport cause only. Tests assert the token and other share IDs are absent from
results. The policy upload ticket is also required to be HTTPS without credentials (`slack-adapter.ts:1370`) and
uses `redirect: 'error'` for the byte POST.

**3. Deletion — as decided, with correct rollback counts.** Provenance is written in exactly one place,
`uploadFile` from `target.file_id` of the adapter's own ticket (`slack-adapter.ts:1356`); there is no setter and no
caller-pair path (`test/fileAccess.test.ts:49-52` rejects a bare pair, and `:325-333` rejects reuse against a
*different* writable target). `deleteFile` re-runs `requireWritableConversation` (fresh `conversations.info` +
`files:write`), then provenance, then a fresh `files:read` `files.info` with exact identity and current
association. Success consumes the entry (`policyUploads.delete`; my `provenance_consumed` mutation was caught).
No private URL is involved. **Rollback counts are honest:** a `files.info` refusal is wrapped in a plain
`Error(..., {cause})`, so `slackRefusal()` — which reads `err.code`/`err.data.error`, not `cause` — returns
`undefined` and `file_not_found` cannot be mistaken for `files.delete`'s already-gone answer (my `metadata_wrap`
mutation was caught). I reproduced the end-to-end wording for an orphan:
`Rolled back (1/1 messages and 0/1 files deleted). May remain: file F1 in C1. No rollback tries these again: no
tool here deletes a file, and whoever runs this host can delete it with Slack's files.delete, by its id`.
The "a delete still affects the file's other shares" statement is in the code comment
(`slack-adapter.ts:1542`), the changelog fragment and the PR body — but see L6: no runtime surface.

**4. Upload recheck and incomplete-upload reporting — present and accurate.** After the bytes are posted,
`requireWritableConversation(channelId,'files:write','Nothing was shared')` runs before
`files.completeUploadExternal` (`slack-adapter.ts:1377-1382`); my `upload_recheck`-equivalent is covered by the
implementer's mutation, and my `ticket_https` mutation was caught. A revoked target suppresses completion and the
agent sees, verbatim: `Nothing was shared: the upload target could not be reauthorized after uploading bytes; the
unshared file may remain.` The file is still recorded for rollback (`left(err,false)` → `recordUploaded`), and the
rollback then reports `0/1 files deleted. May remain: file F1 in C1` with a remedy — verified by probe. The one gap
is L1 (the non-canonical-ID branch, which bypasses `left`).

**5. Lazy refs — confirmed on all five points.** No per-ref `files.info`: `policyFileRefs` is pure and every
ref-surface test asserts `!methods().includes('fileInfo')`. Hints count toward the byte budget: `historyRecord`
renders `policyFileNote` *inside* the record whose `Buffer.byteLength(toolResultJson(returned))` is compared with
`skeleton + recordBytes + records.length` in `readBounded` (`history-read.ts:353-365`), i.e. accounting happens
after rendering — and `test/fileReferences.test.ts:79-89` shows a ref-heavy read stopping with `byte_limit` and a
cursor. Missing `files:read` suppresses refs but not text: `messageFileRefs` catches the scope error and returns
`[]` while `msg.content` is still delivered (my `ref_scope` mutation was caught). Framing is escaped:
`policyFileNote` goes through `nameShown`/`mimeShown`, the IDs through `JSON.stringify`, and
`toolResultJson`/`quotedLabel` escape `<system>`/`<backscroll>` — my A/B snapshot shows
`"pic<system>.png"`. A `url` leaked into a ref is caught by three assertions (my `ref_url_leak` mutation).
Note the exception in L5: stubs still get a `fileId` they cannot use.

**6. Legacy byte identity — independently confirmed, two ways.**
- *My own A/B* (`$ORGASMIC_EVIDENCE_DIR/ab.mts`, written from scratch, not the implementer's `legacy-ab.mts`):
  36 snapshot keys driven through the real `SlackMcplServer` + `SlackAdapter` with **no** policy installed —
  `tools/list` in MCP and MCPL plus the DM-dependent tool list; every `fetch_attachment` argument and URL refusal;
  12 real-loopback transport answers (text/image/binary/204/no-content-type/404/403/408/429/500/declared-oversize/
  streamed-oversize) with the captured `fetch` init (URL, `redirect`, `Authorization`); redirect *following*;
  history/thread/backscroll records with attachments; three `maxBytes` boundaries; `push/event` and
  `channels/incoming` params; four upload outcomes with their request payloads and rollbacks; four `files.delete`
  refusal codes' rollback reasons. Base `f6e62835` vs `dfbc6ed1`: **byte-identical**,
  `sha256 35b4c96dd27386db51d897af45bb3165544ff3ac04bd948cb77015acb817fa37` for both
  (`rv-legacy-base.json`, `rv-legacy-head.json`).
- *Base tests × new source:* the **exact** `test/` tree from `f6e62835` run against `dfbc6ed1`'s `src/` gives
  **670 pass / 2 fail / 672**. Both failures are policy-mode expectations the owner's decisions deliberately
  changed: `positive write/read paths…` (deleteFile now needs provenance — decision 4) and
  `policy upload gates the real byte transfer before sharing…` (https ticket + the recheck — decisions 5 and 7).
  **Zero legacy-mode assertions changed.** Worth noting: the base's `policy attachment references are dormant
  no-ops…` test still passes against the new source only because the base fixture's `accessScopes` lacked
  `files:read`; A3 correctly added it (`test/adapterAccessFixture.ts:6`) so the replacement assertion is real.
- *My own mutations:* 10 reviewer-chosen faults, deliberately disjoint from the implementer's six, each run through
  its own `timeout 900 orgasmic dispatch gate` against `test/fileAccess.test.ts` + `test/fileReferences.test.ts` in
  a scratch clone. **9 caught, 1 survived** — see the gate table below and M2 for the survivor.

**7. Overlap with the parallel group-DM PR (`ccbbb766`).** Likely conflicts: both touch `src/slack-adapter.ts`
(the `SlackWebLike.files` interface and `requireHistoryConversation` vs A3's `files.info?` member and the
file helpers) and `src/server.ts` (`backscrollLine`/`backscrollBlock` and the incoming-delivery label block vs
A3's `policyFileNote` branches). In practice **`git merge` resolves all of them with no conflict markers** and the
merged tree typechecks — the real cost is the two stale tests in M1. **File gates do inherit group admission
correctly once combined:** my 6-case probe on the merged tree passes 6/6 — a file associated via `groups: ['G1']`
or `shares.private.G1` downloads for an admitted, named group DM; an unassociated file and an un-named group both
deny with no byte request; `mpim:read` is required before `files.info` is called; upload to a group DM runs
`['info','upload','info','complete']` and its delete runs `['info','fileInfo','deleteFile']`; revoking the group
after upload blocks deletion at the admission step (`['info']`); and group history refs carry `channelId: 'G1'`.
That works because `associatedFile`'s `CONVERSATION_ID` is `^[CGD][A-Z0-9]+$` and Slack reports mpim shares under
`groups`/`shares.private`, while admission is delegated wholly to `requireReadable` — A3 added no `is_mpim` branch
of its own, as the plan required.

**8. Fresh gates — run myself, all green.** Table below. Full suite **749 / 749 / 0 fail / 0 skipped** on
**22.23.3, 24.22.1 and 22.12.0**, exactly the expected 749; typecheck clean on 22.23.3 and 24.22.1.

**9. PR body — accurate, public-safe, and it does say it depends on #56.** It opens with
"Depends on **#56**; merge #56 first." Every number I could check is right: 749×3 (reproduced), typecheck and
build on both versions (build receipts `gate-a3-build-22.23.3`/`-24.22.1`, exit 0), 77 targeted tests
(69 in `fileAccess` + 8 in `fileReferences`, confirmed), 32 legacy A/B snapshots (`legacy-base.json` holds 32
entries and `legacy-ab.mts:88-94` normalizes only `chk_<uuid>` and `127.0.0.1:<port>`), six caught mutations,
four red-before-green regressions (`gate-a3-red`, 0 pass / 4 fail, behavioural not compile failures). It states the
global-deletion consequence in bold, and its "Not verified / out of scope" names the untested combined group-DM
branch — which M1 now quantifies. Public-safe: no task ID, worker name, owner-button name, path or credential in
the commit message, the diff, the changelog fragment or the PR body; the tracked diff greps clean for
`TASK-|orgasmic|dispatch|prudence` and the internal reviewer/owner names. The required trailer
`Co-Authored-By: GPT-6-Astra` is present on the single commit.

## Verification Gates

All of mine ran through `timeout 900 orgasmic dispatch gate <name> -- …`, with both notifiers off from the first
command, `npm ci --ignore-scripts --offline --no-audit --no-fund` against empty user/global npmrc, and the
loopback-only `--require` preload in force for every Node process and descendant
(`env.sh`, `loopback.cjs`, `gates.sh` in this evidence directory).

| Gate | Command | Result | Log |
|---|---|---|---|
| `rv-install` | `npm ci --ignore-scripts --offline --no-audit --no-fund` | 51 packages, exit 0 | `gate-rv-install-01M640P6QY8W81ETHMQ2PHDJ6D.log` |
| `rv-typecheck-22.23.3` | `bash -c 'node --version; npm run typecheck'` | pass | `gate-rv-typecheck-22.23.3-01M640PFA68NNRQ7YQX61ZY1A9.log` |
| `rv-typecheck-24.22.1` | same | pass | `gate-rv-typecheck-24.22.1-01M640PFJEAYJRG0PVDN46BAE8.log` |
| `rv-suite-22.23.3` | `bash -c 'node --version; npm test'` | **749 pass / 0 fail / 0 skipped** | `gate-rv-suite-22.23.3-01M640PFTTG6GGFX54WBZCFMCR.log` |
| `rv-suite-24.22.1` | same | **749 pass / 0 fail / 0 skipped** | `gate-rv-suite-24.22.1-01M640PYMVERYBWCKRQW27R0GS.log` |
| `rv-suite-22.12.0` | same | **749 pass / 0 fail / 0 skipped** | `gate-rv-suite-22.12.0-01M640QCZ7RT18XPM3EWHPZH6E.log` |
| `rv-mut-smoke` | `node --import tsx --test … test/fileAccess.test.ts` (unmutated scratch clone) | 69 pass, exit 0 | `gate-rv-mut-smoke-01M64112446J8FQRRDNW18QW6E.log` |
| `rv-mut-url_fallback` | targeted set, `url_private_download` falls back on an invalid value | **caught** (1 not ok) | `gate-rv-mut-url_fallback-01M6411KWTCCG72NWGZR9AKG07.log` |
| `rv-mut-url_host` | `privateFileUrl` skips `parseSlackAttachmentUrl` | **caught** (5 not ok) | `gate-rv-mut-url_host-01M6411M7YWR84SK7EZP60J3JE.log` |
| `rv-mut-empty_share` | an empty `shares` entry list counts as association | **caught** (1) | `gate-rv-mut-empty_share-01M6411MK2RXEFVEAEN3632GVH.log` |
| `rv-mut-external_guard` | `associatedFile` drops external/mode/tombstone/`file_access` | **SURVIVED** (exit 0) — M2 | `gate-rv-mut-external_guard-01M6411N1CJ0J5E68DA1FJ5MZJ.log` |
| `rv-mut-url_argument` | policy `fetch_attachment` accepts a `url` argument too | **caught** (1) | `gate-rv-mut-url_argument-01M6411NCGJ4P98NAQF0TNXGKG.log` |
| `rv-mut-provenance_consumed` | success no longer consumes the provenance entry | **caught** (1) | `gate-rv-mut-provenance_consumed-01M6411NQJY1W444SHY4VCNY2K.log` |
| `rv-mut-ticket_https` | upload ticket HTTPS/credential check removed | **caught** (2) | `gate-rv-mut-ticket_https-01M6411P2WMVDP1W7MZ25BZ2RH.log` |
| `rv-mut-metadata_wrap` | `files.info` error rethrown raw (so `file_not_found` counts as deleted) | **caught** (1) | `gate-rv-mut-metadata_wrap-01M6411PE3EG2MZ8R9WDZ3B0P4.log` |
| `rv-mut-ref_url_leak` | `policyFileRefs` re-adds `url_private` | **caught** (3) | `gate-rv-mut-ref_url_leak-01M6411PW7EVVBJWR5SV57SHK3.log` |
| `rv-mut-ref_scope` | refs exposed without `files:read` | **caught** (1) | `gate-rv-mut-ref_scope-01M6411Q7C7A4MZ3B95NBMY9S1.log` |

Unwrapped scoped probes (no reusable receipt; scripts archived here, all run in `/tmp` clones with the same
env and loopback guard):
- **Independent legacy A/B** — `ab.mts` against `f6e62835` and `dfbc6ed1`: 36 keys, byte-identical,
  `sha256 35b4c96d…fa37` (`rv-legacy-base.json`, `rv-legacy-head.json`).
- **Base tests × new source** — `f6e62835`'s exact `test/` on `dfbc6ed1`'s `src/`: 670/672, 2 intended
  policy-mode diffs (listed in answer 6).
- **Combined group-DM merge** — `git merge ccbbb766`: clean, `tsc --noEmit` exit 0, suite 770/772
  (the 2 failures are M1); `rv-combined-probe.test.ts` 6/6 pass.
- **Behaviour probes** — `rv-behaviour-probes.test.ts`: L1's abandoned orphan, L2's growing provenance map, the
  DM-delete observation, the verbatim incomplete-upload text, and the orphan's rollback reason.
- **Full-suite mutation of `associatedFile`'s guards** — 748/749, confirming M2's scope.

Reused implementer receipts (read, not re-run): `gate-a3-build-22.23.3` and `gate-a3-build-24.22.1` (exit 0, the
only gate the brief names that I did not re-run), `gate-a3-red` (0 pass / 4 fail before the fix),
`gate-a3-changelog` (I confirmed `changelog-check.sh` mirrors `.github/workflows/changelog.yml:22-35` exactly, and
the added fragment `changelog.d/access-policy-files.fixed.md` satisfies the `added`-filter predicate).

## Unmet Criteria / test gaps

No unmet acceptance criterion. The task's acceptance — plan round first, then one commit on #56, legacy
byte-identical, red/green tests, a deny matrix — is met, and I verified the byte-identity and deny-matrix claims
independently rather than on the implementer's word.

Test gaps:
1. **M2** — `associatedFile`'s external/mode/tombstone/`file_access` guards are unexercised for the deletion path.
2. **M1** — no test covers the combined group-DM + file-gate tree; A3's own suite cannot, since the branches are
   separate. `rv-combined-probe.test.ts` is a ready starting point for the integration round.
3. L1's non-canonical-`file_id` branch has no test, which is why the missing `left()` went unnoticed.
4. `backscrollLine` under policy now emits a full `fetch_attachment({…})` per attachment, and backscroll has only a
   message-count limit (`SLACK_BACKSCROLL_LIMIT`, default 50, max 1000) — no byte budget. Nothing is broken, but the
   first-interaction block can grow substantially for attachment-heavy channels and nothing measures it.
5. macOS is in CI's matrix (`.github/workflows/ci.yml:29-30`) and cannot be run here.

## Residual Risk

- **Global deletion.** Provenance plus a fresh writable admitted share does not confine `files.delete` to that
  share. This is the owner's expressly chosen alternative; it is documented in code, the changelog and the PR body,
  but reaches no runtime surface (L6).
- **No atomicity.** Admission, `files.info` and the byte GET (or `files.delete`) are separate requests; a concurrent
  unshare between them is unguarded by design, and the implementer claims no atomicity.
- **Fail-closed false negatives.** Incomplete `files.info` visibility, the three-mode allow-list (L4) and the stub
  case (L5) will refuse some legitimately shared files. Dormant now; expect noise at activation.
- **Orphan accumulation.** A failed recheck or an unverifiable file is deliberately not deleted and is reported as
  "may remain"; cleanup is manual. `policyUploads` is process-local and unbounded (L2), and `stateTracker` is not
  reset per connection, so a later connection holding an earlier checkpoint ID can still roll back an earlier
  connection's upload — inherited from #55/#56, not introduced here.
- **No live workspace.** Slack Connect stubs, external files, canvas/email modes, and scope- or token-specific
  `files.info` shapes are unvalidated against the real API; everything here is fixture- and loopback-level.
- **Added call cost.** A policy download is +1 `conversations.info` +1 `files.info`; a deletion +1 `files.info`; an
  upload +1 `conversations.info`. All consume the existing per-call time/rate budget and fail closed when exhausted
  (asserted by `policy fetch retains streaming cap and exhausted-call start rule`).
- **Series ordering.** This PR is dormant and stacked on #56; it must not be activated before the group-DM branch is
  combined and M1 resolved.

## Fix Directions

1. **M1** — adapt `test/groupDmAccess.test.ts`'s upload/rollback case the same way A3 adapted
   `test/adapterAccess.test.ts:273-284`: an `https://files.slack.com/upload/F1` ticket with a `fetch` mock relaying
   to `uploadEndpoint()`, `['info','upload','info','complete']` as the expected order, and a `files.info` stub for
   the rollback. Do this in whichever branch lands second, then run `rv-combined-probe.test.ts` as the combined
   matrix the plan round asked for.
2. **M2** — add three deletion-path denials (`mode:'tombstone'`, `file_access:'check_file_info'`,
   `is_external:true`) beside the existing provenance cases, or assert `associatedFile` directly for those states.
3. **L1** — move the `FILE_ID` check and `policyUploads.set` below `left`'s definition and
   `throw left(new Error('Slack upload returned an invalid file ID'), false)`.
4. **L2** — bound `policyUploads`, or drop an entry when the `stateTracker` stops holding its upload.
5. **L3/L6** — restore the return-shape sentence in the policy `fetch_attachment` description, and state the
   other-shares consequence once in a runtime surface.
6. **L4/L5** — settle the `mode` policy and the stub-ref label as part of the activation step, not here.
