# Review: changes requested

## Changed
No authored changes to tracked files, commits, pushes, GitHub comments, or shared-branch changes. A throwaway local branch and fetched local PR ref were created. The trial merge was aborted; HEAD remains b956350d4e77f09df76240439b3d35d512061899 and `git status --short` is empty. Baseline project instructions were read; no conventions or gotchas were supplied.

## Findings

### MEDIUM — unresolved merge conflict (run)
`test/accessPolicy.test.ts:251-291` on HEAD conflicts with PR lines `258-401`. Exactly one conflict file and one contiguous conflict hunk: concurrent end-of-file additions after the policy configuration/immutability test. Combined diff header: `@@@ -247,41 -255,147 +255,188 @@@`. HEAD adds send/edit malformed-text authorization-order tests, explicit-policy DM malformed-text tests, and three missing-scope preflight tests; PR adds the group-DM fixture and tests. Both sets need preserving. The merge command exited 1; this is not a clean merge and there is no resolved merged tree to approve. No production-file conflicts were reported. No conflict resolution was attempted.

### LOW — security integration cases are not pinned end to end (source-read)
PR `test/accessPolicy.test.ts:367-401` checks adapter delivery and routing admission, but does not assert final server-rendered hostile group-DM content/name/attachment framing, missing mpim scopes on incoming events, routing denial with `readJoinedChannels:false`, or group-DM send scope refusal before malformed text. Existing generic framing tests do not by themselves prove the new group-DM admission-to-server path. Add integration deny cases when resolving the test conflict. No demonstrated framing or scope bypass is claimed here. The standalone probes below are not substitutes for these integration tests.

No HIGH finding established.

## Verification Gates

### Preflight (run)
Commands, in order:

```sh
git rev-parse HEAD
git fetch origin pull/1/head:pr1-head
git rev-parse pr1-head
git merge-base HEAD pr1-head
git switch -c scratch-pr1-merge
git merge --no-commit --no-ff pr1-head
git diff --name-only --diff-filter=U
git status --short
git diff --cc test/accessPolicy.test.ts
git merge --abort
```

HEAD matched the required full SHA. Origin supplied the requested PR ref. PR head is `6a1946d072bfcc99d67a837d2fcc6132e677fcf7`, matching prefix `6a1946d0`. Merge base is `2012bda630b46a1f029cac61650d3e7efabd359c`.

### Source review
Read `git diff 2012bda630b46a1f029cac61650d3e7efabd359c pr1-head` (all eight files), `git diff --cc test/accessPolicy.test.ts`, baseline `src/access-policy.ts`, `src/configuration.ts`, `src/slack-adapter.ts`, `src/server.ts`, `src/channels.ts`, `src/framing.ts`, `src/recipient-routing.ts`, `package.json`, PR policy/tests via `git show pr1-head:<file>`, `git show b956350d --stat`, `git show c1db65b --stat`, and `git log -6 --oneline`. Used `nl -ba`, `sed`, `head`, `tail`, and `rg -n` to inspect the referenced ranges; an initial search included nonexistent `src/channel.ts` and reported that error, then the actual `src/channels.ts` was read. Repository instruction discovery found no AGENTS.md in the searched worktree parent subtree. Also read the supplied baseline project document and required skill/command-ownership instructions. No resolved merged files were claimed or tested: merge was not clean.

Line references below explicitly distinguish HEAD from PR because there is no resolved merged revision.

### Inbound paths and framing (source-read unless noted)
- Explicit policy: PR `src/slack-adapter.ts:1827-1839` freshly authorizes history before delivery. Group DMs become `private_channel`, joined, `isDM:false`. PR `src/access-policy.ts:80-87` requires exact listed ID, mpim metadata, membership and `mpim:read`; PR adapter `1145-1150` additionally requires `mpim:history`. Unlisted/unjoined/missing-scope events are refused before forwarding.
- Without recipient routing: group messages proceed through the ordinary server callback (HEAD `src/server.ts:1681-1699`). Mentions are addressed; ambient messages require subscription (`1761-1786`). Both use `nameShown` and `senderText` at `1883`; first-interaction backscroll uses shared framing at `165-188`, invoked at `1850-1851`; attachment notes use framed names/types at `1703-1711`; channel location names use `channelShown` at `1867`. Thus upstream #47 applies to delivered group-DM messages, not merely one-to-one DMs.
- With recipient routing: same adapter admission, then HEAD `src/recipient-routing.ts:168-170` requires `readJoinedChannels:true`. With false it refuses, despite the standalone group-DM policy allowing reads. With true, routing permits context/addressed delivery and the same server rendering applies, including bots admitted as routing context. Server `1766` uses routing wake permission. Framing is shared, not bypassed by routing.
- No explicit policy: legacy group DMs remain possible when DMs are enabled, and receive the same server framing. With DMs disabled, mpim events are dropped by PR adapter `1840-1841` (HEAD `1874-1875`). Legacy admission is unchanged; it is not an explicit-policy default-deny promise.

### DM preflight (source-read)
HEAD `src/slack-adapter.ts:1613-1627` preflights `im:write`, `im:read`, and `chat:write` only in `sendDM(userId,text)`, before text validation and conversations.open. It is outbound one-to-one logic, not inbound admission. PR does not remove it. Even if open returned a group conversation, the exact one-to-one check at `1627` refuses before posting.

Group-DM sends/replies instead use `sendMessage`: HEAD `1434-1436` calls fresh `requireWritableConversation` before text validation; HEAD `1182-1186` delegates to policy writability. PR policy `107-110` requires group admission, exact write destination and requested write scope. Consequently group DMs can legitimately receive messages without `im:read`/`im:write`, using `mpim:read` and `chat:write`; these are different conversation permissions, not a bypass of sendDM. Inbound additionally requires mpim history, not im history. The group branch does not inherit the one-to-one pre-open/no-Slack-call guarantee, nor does it open conversations.

### Access semantics (source-read plus standalone run)
“Named” means an exact conversation ID in `groupDms`, NOT a human-readable name. PR `src/access-policy.ts:47-49,80-87` uses a copied Set and exact ID equality; `conv.name` is only presentation (HEAD adapter `1237-1239`, channels `27-29`). Renaming or duplicate display names cannot authorize a different ID. No name canonicalization or Unicode normalization exists or is needed for matching: policy IDs must be uppercase ASCII C/G IDs, lowercase and Unicode variants reject. Metadata must come from the fresh Slack API check (HEAD adapter `1132-1152`), not event text. This trusts Slack metadata; no real Slack API behavior was probed.

Explicit policy with omitted/empty groupDms denies all groups, even if writeChannels contains their ID. `groupDms:null` also becomes an empty list (fail-closed, not a configuration error). Wrong non-null list shapes/ID types reject. Absent entire policy retains legacy controls, not default deny. Malformed policy JSON, unknown fields, missing required fields and invalid required types reject during startup (PR configuration `13-33`, policy `36-49`). A listed group is independently readable even when `readJoinedChannels:false`; routing adds that flag back as described above, consistent with PR README. Writing additionally needs writeChannels and operation scope. This policy pins conversation identity, not a fixed member roster: changed membership is not separately allowlisted.

### Tests and actual results
Node: `v22.23.3` (`node --version`). Dependencies were absent (`ls node_modules` failed). No registry installation attempted: unresolved merge prevents the requested merged-state suite/build.

Standalone probe sources outside the tracked tree were created by extracting PR `src/access-policy.ts` and copying HEAD `src/framing.ts`, plus `probes/review.test.mjs`. Exact execution:

```sh
orgasmic dispatch gate review-probes -- node --experimental-strip-types --test "$ORGASMIC_EVIDENCE_DIR/probes/review.test.mjs"
```

Result: **6 tests, 6 passed, 0 failed, 0 skipped**. Gate log basename: `gate-review-probes-01M61B8384BEHPK1KYTT8BTFDF.log`. Probes cover exact ID vs renamed/colliding/hostile names; lowercase/Unicode policy rejection; omitted/empty/null and malformed group lists; membership/metadata/scope/write-destination refusal; independent readJoinedChannels flag; shared framing of hostile multiline content and names. These execute real policy/framing functions but not the adapter/server integration, and are not merged-suite receipts.

PR deny tests read, not executed: invalid IDs/list shapes (`269-276`); missing mpim read/history with zero history/replies calls (`286-295`); unlisted/unjoined, im+mpim ambiguity, mismatched metadata (`297-309`); omitted list despite write pin, including listing (`311-319`); read-only group writes and unlisted destinations (`321-330`); listing scope omission (`359-365`); unlisted/unjoined inbound and absent-list inbound (`367-386`). Configuration tests also reject malformed/misspelled policy (`test/configuration.test.ts:15-31`). Yes, tests pin deny cases, not only allows. The routing group test is Node-24-gated and only tests successful admission/wake cases.

## Unmet Criteria
Not run: `npm ci`, `npm run build`, `npm test`, typecheck, any resolved-merge suite, Node-24 routing execution, or live Slack/MCPL production-path probes. A clean merged scratch state does not exist; resolving it would edit tracked files, prohibited here. Therefore no build/suite pass or counts claimed. If rerun after resolution, installation must use public registry only, `--ignore-scripts`, empty user npm config and `NO_UPDATE_NOTIFIER=1` as requested. No commit was made, following the specific read-only brief over the generic implementation completion template.

## Residual Risk
Approval requires conflict resolution retaining both test blocks and verification of the resolved tree. Inbound/framing and preflight path conclusions are source-read, not end-to-end run. Standalone probes establish only the extracted functions' behavior. No external source, alternate PR source, credentials, or private deployment data was used.
