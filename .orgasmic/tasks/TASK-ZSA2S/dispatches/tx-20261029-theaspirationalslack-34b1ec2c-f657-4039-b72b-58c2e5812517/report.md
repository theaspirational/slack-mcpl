# Review — TASK-ZSA2S round 3 (`3b1a97ac`)

## Verdict

**Approve.** `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf` is one commit on `ccbbb766`, still dormant,
and every item the brief scoped (M1, M2, L1, L2, L3, L5, L6) holds under my own probes. Legacy
behaviour is byte-identical to `ccbbb766` by an independent A/B with a verified negative control, the
restack carried no hidden production drift, and the suite is 785/785 on all three Node versions.

No HIGH and no MEDIUM findings. Three LOW items below; none blocks ship and none is a regression
against the approved `dfbc6ed1`.

### Restack is faithful, and the production delta is exactly the seven requested items

`git range-diff f6e62835..dfbc6ed1 ccbbb766..3b1a97ac` reports one commit pair and 205/16 changed
lines. I proved the restack independently in a throwaway clone rather than trusting the range-diff:

```
git merge-tree --write-tree --merge-base f6e62835 ccbbb766 dfbc6ed1  # -> 40927a3b
git diff 40927a3b 3b1a97ac
```

`dfbc6ed1` rebased onto `ccbbb766` differs from the reviewed tree in exactly four production/doc
files and three test files, and the whole production delta is the six documented changes:

| File:line | Change | Brief item |
|---|---|---|
| `src/slack-adapter.ts:1366` | invalid ticket ID now `throw left(err, false)` | L1 |
| `src/slack-adapter.ts:1367-1372` | provenance `set` after validation; insertion-order cap at 1000 | L1, L2 |
| `src/server.ts:399` | policy tool description regains the inline return shapes | L3 |
| `src/server.ts:1543-1545` | policy-only global-deletion rollback note | L6 |
| `src/file-access.ts:67` | `file_access` suppression of the `fileId` hint | L5 |
| `src/file-access.ts:77` | note wording for a suppressed hint | L5 |
| `changelog.d/access-policy-files.fixed.md:6-7` | cap and eviction stated | L2 |

`src/content.ts` and `src/history-read.ts` are unchanged from the approved `dfbc6ed1`;
`test/adapterAccess.test.ts` and `test/adapterAccessFixture.ts` likewise. `src/access-policy.ts` is
unchanged from `ccbbb766` — the group-admission implementation is reused, not re-cut.

### Scoped items, each checked against the code and reproduced

- **L1 — `src/slack-adapter.ts:1366-1367`.** `FILE_ID.test(fileId)` precedes
  `policyUploads.set(...)`, and the refusal is wrapped so the orphan rides the error. My probe P4
  drove seven malformed IDs (`invalid-id`, `f1`, `F`, `F1 `, `F-1`, `C1`, `''`) through
  `uploadFile`: every one left `policyUploads.size === 0`, shared nothing, and (except the empty ID,
  which is the pre-existing legacy refusal where Slack created no file) reported
  `fileLeftByUpload(err) === { fileId, mayHaveShared: false }`. Two of my mutations kill it —
  dropping the wrapper (2 tests fail) and moving the `set` above the validation (1 test fails).
- **L2 — `src/slack-adapter.ts:1370-1372`.** Fixed cap of 1000, evicting `keys().next().value`.
  Probe P3 confirms the three properties the brief asked about: nothing is evicted *at* exactly 1000
  entries, the map never exceeds 1000, and **re-inserting a known ID does not refresh its eviction
  age** (`[...map.keys()][0]` stays `F0` after re-uploading `F0`, and `F0` is still the first
  evicted). Eviction only ever *removes* authority, and an evicted entry cannot be revived by a read:
  `deleteFile('C1','F0')` then rejects with `/recorded upload/` after a single `conversations.info`
  and no `files.info`. Three distinct cap mutations are caught (remove the cap, evict the newest
  instead of the oldest, raise the threshold to 100000).
- **L3 — `src/server.ts:399`.** The policy description now carries "images as image blocks, text-ish
  files decoded, other binary as base64", matching `src/tools.ts:215-219`, whose legacy text is
  untouched. Asserted against a real `tools/list` (`test/fileAccess.test.ts:404`).
- **L5 — `src/file-access.ts:67`.** The `fileId` hint survives only for `file_access === undefined`
  or exactly `'visible'`; everything else is suppressed, so odd values fail closed. Probe P1 drove
  this through the **production read path** — real `SlackWebClient` against a loopback
  `fakeSlackApi`, through `tools/call fetch_history` — with `check_file_info`, `null`, `''`, an
  object, and `'Visible'` (wrong case): all five IDs are absent from the rendered history, each is
  labelled `not downloadable`, no private URL appears, and no `files.info` is called. Both a full
  removal and a *loose* predicate (suppressing only `check_file_info`) are killed by the tests.
- **L6 — `src/server.ts:1543-1545`.** The note is gated on `this.slack.hasAccessPolicy`, so legacy's
  `reason` is untouched. Probe P2 confirms it over the **production rollback path** with a real
  Slack client: `conversations.info → files.getUploadURLExternal → conversations.info →
  files.completeUploadExternal` (the target really is rechecked between bytes and completion), then
  a rollback whose `reason` matches the global-deletion wording after `files.info` and `files.delete`.
  Making the note unconditional is caught by the two `legacy=true` group tests, which pin
  `reason === undefined`; removing it is caught by three policy tests.
- **M1 — combined group+file tests are real.** `test/groupDmAccess.test.ts:200-244` drives the real
  `SlackMcplServer`, ships real bytes to a loopback endpoint through a `fetch` stub that *asserts*
  the adapter posted to the HTTPS `files.slack.com` ticket, and supplies exact `files.info` identity
  plus `groups: ['G1']` before the delete. All four legacy × revoke cases pin the call order
  (`info, upload, info, complete`; then `info, fileInfo, deleteFile` or `['info']` when revoked).
  `test/fileAccess.test.ts:411-442` adds four real-server group download scenarios (admitted,
  unrelated, unnamed, missing `mpim:read`) and an `mpim:write` upload refusal, each pinning both the
  byte count and the call trace. These are genuine policy exercises, not assertions on mocks.
- **M2 — the reviewer's guard mutation is dead. Rerun by me.** Gate `zsa2s-rev-mut-m2`, in a
  pristine copy of the commit outside the worktree: replacing both `associatedFile` guard conditions
  (`src/file-access.ts:15-18`) with `if (false)` fails **3 of 3** under
  `--test-name-pattern=policy deletion rejects restricted associated file`, behaviourally (no
  transform/syntax error). I also split the mutation: killing only the external/mode guard fails the
  `is_external` case, and killing only the tombstone/`file_access` guard fails the
  `check_file_info` case — so the three tests discriminate between the two guards rather than
  passing as a block.
- **Legacy byte-identity, my own A/B.** I wrote an independent harness
  (`reviewer-gates.sh`/`rev-legacy-ab.mts`) with a different operation set from the implementer's:
  71 snapshots over `tools/list`, `fetch_history`/`fetch_thread`, `fetchHistory`, `historyRecord`,
  `backscrollLine`, three `backscrollBlock` shapes, `locationHeader`, bounded `readHistory`,
  `readThread`, `push/event`, `channels/incoming`, 28 `fetch_attachment` cases (return shapes, 11
  HTTP statuses, both caps, transport failure, 10 malformed URLs, and the policy-only argument
  names), the five write tools, and five upload/rollback shapes including a refused delete, a
  retryable delete and an already-gone delete. `ccbbb766` and `3b1a97ac` are byte-identical:
  `c0fe3d67559e260faa8f760fff712fd5b048c7d37c1c9b9ccdaa19079830cc64`. **Negative control:** making
  the L6 note unconditional makes the harness differ at the first rollback reason, so the identity
  result is live, not vacuous.

## Findings

### LOW — design/usability — `src/file-access.ts:67`

The hint suppression covers `file_access` only, so a reference still advertises
`fetch_attachment(...)` for files whose download `associatedFile` (`src/file-access.ts:15-18`)
refuses unconditionally. Probed directly against the reviewed tree
(`reviewer-hint-probe.mts`):

```
F1  hint=offers fetch_attachment  download-gate=DENIED   (mode: 'tombstone')
F2  hint=offers fetch_attachment  download-gate=DENIED   (deleted: true)
F3  hint=offers fetch_attachment  download-gate=DENIED   (is_tombstoned: true)
F4  hint=offers fetch_attachment  download-gate=DENIED   (is_external: true, mode: 'external')
F5  hint=suppressed               download-gate=DENIED   (file_access: 'check_file_info')
```

Failure scenario: under the policy, an admitted channel whose history contains Slack's tombstone
entries for deleted files renders `gone.txt — fetch_attachment({"channelId":"C1","fileId":"F1"})`.
The agent spends a tool call per such reference and gets back
`Slack file access could not be verified for this conversation`, which says nothing about the file
being gone. The gate itself holds, so this is wasted work and a confusing denial, not an access leak.
Fix direction: extend the suppression predicate to the states `associatedFile` already rejects
(`deleted`, `is_tombstoned`, `mode` outside `hosted|snippet|post`, `is_external`), reusing one
predicate for both so the hint and the gate cannot drift again — or, if advisory hints are the
intent, say so in the note instead of singling out `file_access`.

### LOW — docs — `src/slack-adapter.ts:1549`

Policy rollback deletion now needs `files:read` as well as `files:write`: `deleteFile` calls
`readAssociatedFile`, whose first statement is `requireScope(this.scopes, 'files:read')`
(`src/slack-adapter.ts:1305`). `test/fileAccess.test.ts:296-305` pins this at the adapter level.
README's recommended manifest already lists `files:read` (`README.md:177`), but neither the changelog
fragment nor the PR body's **Before activation** says that an app granted `files:write` without
`files:read` will fail *every* policy rollback deletion and leave an orphan per upload — a
configuration that works fine today in legacy mode. Fix direction: add one line to the activation
checklist (and ideally the changelog fragment) stating that the policy requires `files:read` for
uploads to be rollback-deletable.

### LOW — docs — PR body (report `## PR body`)

Accurate and safe to publish — I verified every number against a receipt (785/785 on 22.23.3 /
24.22.1 / 22.12.0; 113/113 × 5; nine mutations; 32 snapshots; 27/27 changelog) and found no path,
run ID, evidence link, token or internal URL in it. Three readability defects remain for a public
reader:

1. "Depends on the **group-DM PR**, which is itself stacked on **#56**" never names that PR (#58),
   so the dependency is unfollowable from the PR page.
2. "Legacy A/B against ccbbb766" pins a SHA that moves the moment #58 is rebased or lands; naming
   the PR instead keeps the claim true.
3. "the reviewer's guard-removal mutation" and "Restacked group upload/rollback tests" are
   internal-process vocabulary; a reader cannot resolve "the reviewer" or "restacked". Describe the
   mutation by what it removes ("removing both restricted-file guards fails all three deletion
   cases") and drop "restacked".

## Verification Gates

Run with notifiers off (`NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`), empty
user/global npm configs, my own loopback-only Node guard in force through inherited `NODE_OPTIONS`
(`reviewer-loopback.cjs` — refuses any non-loopback `listen`, `connect` or DNS lookup), and
`timeout 900` on every gate. Install was `npm ci --ignore-scripts --offline --no-audit --no-fund`;
the lockfile is unchanged. No live Slack call was made.

| Gate | Command | Node | Result | Log |
|---|---|---|---|---|
| `zsa2s-rev-install` | `npm ci --ignore-scripts --offline --no-audit --no-fund` | 22.23.3 | exit 0 | `gate-zsa2s-rev-install-01M642F7K5EH0ZVSKVDNAVP9BD.log` |
| `zsa2s-rev-typecheck-22.23.3` | `bash -c 'node --version; npm run typecheck'` | 22.23.3 | exit 0 | `gate-zsa2s-rev-typecheck-22.23.3-01M642FHTYR6NP72WPXM8YW1NM.log` |
| `zsa2s-rev-suite-22.23.3` | `bash -c 'node --version; npm test'` | 22.23.3 | **785/785** | `gate-zsa2s-rev-suite-22.23.3-01M642FJ2Y796JZDTPHC1M1AQR.log` |
| `zsa2s-rev-typecheck-24.22.1` | `bash -c 'node --version; npm run typecheck'` | 24.22.1 | exit 0 | `gate-zsa2s-rev-typecheck-24.22.1-01M642G0X5Z81M5FRS2DV3NG01.log` |
| `zsa2s-rev-suite-24.22.1` | `bash -c 'node --version; npm test'` | 24.22.1 | **785/785** | `gate-zsa2s-rev-suite-24.22.1-01M642G18WQNP0PP8670E0PHK4.log` |
| `zsa2s-rev-typecheck-22.12.0` | `bash -c 'node --version; npm run typecheck'` | 22.12.0 | exit 0 | `gate-zsa2s-rev-typecheck-22.12.0-01M642GFD178M5AZRZKWT5NMHN.log` |
| `zsa2s-rev-suite-22.12.0` | `bash -c 'node --version; npm test'` | 22.12.0 | **785/785** | `gate-zsa2s-rev-suite-22.12.0-01M642GFP5EJ1TSSM709GANE9S.log` |
| `zsa2s-rev-mut-m2` | `python3 reviewer-mutations.py m2_guards` | 22.23.3 | 3/3 fail, behavioural | `gate-zsa2s-rev-mut-m2-01M642JVYV2RCQ8NCNHG344VAV.log` |
| `zsa2s-rev-legacy-ab` | `bash` my A/B, `ccbbb766` vs `3b1a97ac` | 22.23.3 | 71 snapshots byte-identical | `gate-zsa2s-rev-legacy-ab-01M642R6Z73NCA680VGNMEA5KG.log` |
| `zsa2s-rev-probes` | `node --import tsx probes.mts` | 22.23.3 | P1–P4 all pass | `gate-zsa2s-rev-probes-01M642Y2SSK8M5AZATYCAE0QX1.log` |

Typecheck ran on 22.12.0 as well, beyond the brief, because the suite ran there.

Unwrapped scoped probes (evidence, not receipts), each run from a pristine `git archive` copy of the
commit outside the worktree and restored byte-for-byte in a `finally`:
eleven reviewer mutations — `m2_guard_external_only`, `m2_guard_tombstone_only`, `l1_orphan`,
`l1_provenance_before_validation`, `l2_cap`, `l2_evict_newest`, `l2_cap_offbyone`, `l5_access`,
`l5_access_loose`, `l6_note`, `l6_note_legacy` — **all eleven caught behaviourally**, per-mutant
output in `reviewer-mut-*.txt`; plus `reviewer-hint-probe.mts`. Artifacts: `reviewer-probes.mts`,
`reviewer-mutations.py`, `rev-legacy-ab.mts`, `ab-base.json`, `ab-current.json`,
`reviewer-loopback.cjs`, `reviewer-gates.sh`.

Reused receipts, read rather than rerun (clean tree at `3b1a97ac`, per
`## Gates already passed at this commit`): `a3r3-typecheck-24.22.1`, `a3r3-build-24.22.1`,
`a3r3-suite-22.12.0` (785/785), `a3r3-new-repeat-5` (113/113), `a3r3-legacy-ab` (32 snapshots, both
JSONs `ba40634a…`), `a3r3-mutations` ("Caught all nine behavioral mutations; production source
restored byte-for-byte"), `a3r3-changelog` (27/27). The implementer's `a3r3-suite-22.23.3` and
`a3r3-suite-24.22.1` were not listed as reusable, so I ran both myself; both are 785/785.

No failures to classify: every gate and probe I ran passed, and every mutation failure was an
intentional, behavioural kill.

The worktree is as I found it: `git status --porcelain --untracked-files=all` is empty at
`3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf`, with no commit, edit or new file. All mutation and probe
work happened in `/tmp` copies. The clone used for the restack proof was deleted.

## Unmet criteria / test gaps

The round's acceptance criteria are met: one commit on #58's head, legacy byte-identical, red/green
evidence, and a deny matrix. Remaining gaps, all LOW:

1. **No test pins the hint/gate relationship for tombstoned, deleted or external files.** Nothing
   fails if that behaviour flips in either direction, which is how the finding above arose and how it
   could silently change again. `test/fileReferences.test.ts:103` covers only `file_access`.
2. **The cap test does not cover re-insertion.** `test/fileAccess.test.ts:380` inserts 1001 distinct
   IDs; nothing pins that re-uploading a known ID neither adds an entry nor refreshes its age, nor
   that nothing is evicted at exactly 1000. My P3 covers all three today; the repo does not.
3. **The `files:read`-less deletion path is pinned only at the adapter.**
   `test/fileAccess.test.ts:296` calls `adapter.deleteFile` directly; no test shows what a *server*
   `state/rollback` reports when the scope is absent, which is the shape an operator would see.
4. **`chat:has-image` is still set for a suppressed image reference** (`src/server.ts:1787` reads
   `a.isImage`, which `policyFileRefs` sets from `mimetype` regardless of suppression), so a host wake
   gate can be tripped by an image the agent cannot fetch. Pre-existing for ID-less references in
   `dfbc6ed1`, untested either way, and not a round-3 regression.

## Residual risk

Carrying the implementer's list, which I found accurate, plus two items it does not name:

- **A re-uploaded file ID keeps its original insertion age** (`src/slack-adapter.ts:1367`): `Map.set`
  on an existing key does not reorder, so the newest upload can be the first evicted, and its
  rollback deletion then fails closed and orphans the file. Demonstrated by probe P3. Slack does not
  reissue a file ID for a new upload, so the preconditions should not arise in practice.
- **`FILE_ID = /^F[A-Z0-9]+$/` is applied to the upload ticket's `file_id`**
  (`src/slack-adapter.ts:1366`). Slack has already created the file by then, so any future ID shape
  outside that regex would refuse every policy upload *after* creating an orphan, while legacy
  accepts it. Fail-closed but operator-visible, and the strictness is a dormant bet on Slack's ID
  format.
- Fresh evidence is not an atomic Slack transaction: unshare, membership change or policy change can
  race the next download, delete or upload completion.
- Deletion is global. Positive association proves admission, not exclusive sharing.
- Provenance is process-local, capped at 1000 and consumed on success: restart, eviction, unknown IDs
  or a changed association all fail closed and can require manual cleanup.
- The strict `hosted|snippet|post` mode list and incomplete Slack metadata can deny legitimate files,
  including shared-channel cases.
- Live Slack, a real workspace and macOS were not exercised; all byte transfer stayed on loopback.

## Fix directions

Ordered by value; none is a ship blocker, and all three can wait for the activation step, which must
land before any setting enables the policy.

1. Collapse the hint predicate and the download gate onto one shared "could this file ever be
   fetched" helper in `src/file-access.ts`, so `policyFileRefs` suppresses exactly what
   `associatedFile` refuses. Pin it with a table-driven test over `file_access`, `deleted`,
   `is_tombstoned`, `mode` and `is_external` asserting hint and gate agree for every row — which
   closes test gap 1 as well.
2. Add `files:read` to the PR body's **Before activation** list and to the changelog fragment: under
   the policy it is required for an upload to be rollback-deletable, and an app with `files:write`
   alone will orphan every upload. Add a server-level `state/rollback` test for that configuration
   (test gap 3).
3. Tidy the PR body: name #58 instead of "the group-DM PR", describe the A/B base as that PR's head
   rather than `ccbbb766`, and replace "the reviewer's guard-removal mutation" and "Restacked" with
   wording a reader outside this process can resolve.
4. Optional, cheap: extend `test/fileAccess.test.ts:380` with the re-insertion and exactly-1000 cases
   my P3 covers (test gap 2), and decide whether `chat:has-image` should be withheld for a
   suppressed reference (test gap 4).
