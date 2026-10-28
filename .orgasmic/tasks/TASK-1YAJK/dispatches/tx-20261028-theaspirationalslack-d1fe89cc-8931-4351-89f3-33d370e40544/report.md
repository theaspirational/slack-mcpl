# Review — TASK-1YAJK (merge of fork PR #1 onto b956350d, + group-DM deny tests)

Commit reviewed: `ed377dd911e0b78d2ad4301486ad852d9c3d04d2`
(merge `b567578` of PR head `6a1946d0` onto fork main `b956350d`, plus two test-only commits).
Preflight: `git rev-parse HEAD` == `ed377dd9…` — matched. Tree clean at start and at end
(`git status --porcelain` empty; only ignored `dist/` and `node_modules/`).

## Verdict

**Approve.** No HIGH or MEDIUM finding. The merge is clean and provably test-complete,
the production change set is byte-identical to the PR's own src hunks, the four required
deny cases are real (each shown red under a targeted mutation), and all gates were re-run
fresh at this commit. Three LOW findings below are hardening/documentation items, none of
which blocks the branch.

## Findings

### LOW — `src/access-policy.ts:47` (source-read + run): `groupDms` and `historyMembershipFallbackChannels` may name the same ID, and the fallback then bypasses every group-DM rule

The constructor validates the two lists independently. `readAccessConversation`
(`src/slack-adapter.ts:1139`) checks the fallback **first**, and the fallback fabricates
`{is_im: false, is_mpim: false, is_private: false, is_member: true}` without ever calling
`conversations.info`. So a C-prefixed group-DM ID that an operator puts in `writeChannels`
+ `historyMembershipFallbackChannels` (+ harmlessly in `groupDms`) is read and written with
**no mpim scope at all**, and is presented to the agent as an ordinary public channel.

Failure scenario (PROBE G, `probes/zzprobe4.test.ts`, run on Node 24.22.1):
scopes `['groups:read','channels:history','groups:history','chat:write','users:read']`
(no `channels:read`, no `mpim:read`, no `mpim:history`); policy
`{writeChannels:['CPINNEDMPIM'], readJoinedChannels:true, groupDms:['CPINNEDMPIM'], historyMembershipFallbackChannels:['CPINNEDMPIM']}`;
the Slack stub reports that ID as `is_mpim:true`. Result:
`getConversationMeta` → `{"kind":"channel"}`, `fetchHistory` succeeds, `sendMessage` posts,
and `conversations.info` is **never asked** (`calls: ["history","history","history","history","post"]`).

The fallback list predates this PR, but before it there was no legitimate reason to configure
group DMs, so the combination was unreachable in practice. The repo's own convention treats
C-prefixed IDs as possible group DMs (`groupDms` accepts `/^[CG]/`; the README example is
`"CGROUPDM"`; the tests use `CGROUP`), which is exactly what the fallback's `/^C/` check
cannot distinguish.

Fix direction: reject in the constructor any ID present in both `groupDms` and
`historyMembershipFallbackChannels`, and add one sentence to the new README section saying
the fallback list must never name a group DM.

### LOW — `src/access-policy.ts:81` (source-read + run): `readJoinedChannels:false` still permits group-DM reads and writes without routing, while recipient routing refuses the same conversation

The group branch checks `is_mpim`, `is_im`, `id`, the `groupDms` membership and
`is_member`, but never `readJoinedChannels`. Recipient routing's joined-channel admission
(`src/recipient-routing.ts:169`) and the host-side check (`src/host-compatibility.ts:121`)
both require `readJoinedChannels`, because the adapter maps an allowed group DM to
`kind: 'private_channel'` (`src/slack-adapter.ts:1875`).

Failure scenario (PROBE A, `probes/zzprobe.test.ts`): with
`{readJoinedChannels:false, writeChannels:['CGROUP'], groupDms:['CGROUP']}`,
`fetchHistory('CREAD')` on an ordinary joined public channel is refused
("not a confirmed joined channel") while `fetchHistory('CGROUP')`, `sendMessage('CGROUP')`
and inbound delivery of a `message.mpim` event all succeed. Turn routing on with the same
policy and every group-DM message is instead dropped with a logged error (the new deny test
pins this).

The routing half is documented (README: "With recipient routing, an allowed group DM is
admitted as a joined private channel, so its messages are delivered only when
`readJoinedChannels` is `true`"). The non-routing half is not: nothing tells an operator
that `readJoinedChannels:false` does **not** stop group-DM reads. Behaviour is fail-closed
on the routing side, so this is a documentation/consistency gap, not an escalation.

Fix direction: either state in the README that `groupDms` is independent of
`readJoinedChannels` outside routing, or make the group branch require `readJoinedChannels`
so both paths agree.

### LOW — `src/server.ts:1867` (run): a group DM is rendered to the model with the `#channel` sigil, contradicting `list_channels`

`toDescriptor` labels the same conversation `Group DM: mpdm-…` (`src/channels.ts:27`), but
the delivery path renders it through `channelShown(meta.name)`, so the model is told it is
a channel.

Observed (PROBE D/E, `probes/zzprobe2.test.ts`, verbatim):

```
<system>Auto-subscribed to #mpdm-ann--bob--thebot-1 because you were mentioned. …</system>
<backscroll channel="#mpdm-ann--bob--thebot-1" count="1">
[#mpdm-ann--bob--thebot-1 (Acme) channelId=CGROUP id=700.1] Ann: …
```

`dm="true"` is absent from the backscroll attrs (`src/server.ts:185`) and `chat:dm` /
`chat:private` are absent from the event tags, since `msg.isDM` is false. Impact is limited:
`channelId=CGROUP` is present in every header and is the value the tools take, so no
mis-addressing follows; the cost is that an agent reasoning about who can see a message is
told "channel" where `list_channels` says "Group DM". Consistent with the PR's stated design
("delivered and woken like a private channel"), hence LOW.

Fix direction: give the group-DM case its own label in the location header and
`dm`/`group_dm` attribute in the backscroll block.

## Answers to the brief's questions

**1. Merge integrity — clean; nothing lost, reordered or altered.**
The single conflict hunk in `test/accessPolicy.test.ts` resolved to the exact union of both
sides (`run`):
- `diff <(git show 6a1946d0:test/accessPolicy.test.ts) <(git show b567578:test/accessPolicy.test.ts)` has **zero** `<` lines — every PR-side line survives, in order.
- `diff <(git show b956350d:test/accessPolicy.test.ts) <(git show b567578:…)` has exactly **two** `<` lines, both the shared `fixture()` helper's signature and its `configureAccessPolicy` call, which the PR deliberately widens compatibly (`writeChannels: opts.writeChannels ?? ['CWRITE']`, `groupDms` spread only when supplied). Every base test body is byte-for-byte identical and in its original order (the rest of the diff is one append block at the old EOF).
- Top-level `test(` names: base 19, PR head 29, union 30, merge **30**; `comm` both ways between the union and the merge is empty. HEAD adds one further name (the new hostile-framing test); no base or PR name is missing from HEAD.
- Line counts: merge base `2012bda6` 248, base 287, PR head 401, merge 440, HEAD 531.

**2. Production diff — no path admits, reads, writes or lists an unlisted group DM.**
The src change set is 4 files, +32/-10, and is **byte-identical** to the PR commit's own src
hunks: `diff` of the `[+-]` lines of `git diff 2012bda6..6a1946d0 -- src` against
`git diff b956350d..HEAD -- src` is empty, and `git diff b567578..HEAD -- src` is empty, so
neither the conflict resolution nor the two test rounds touched production code. (The brief's
"+218/-14 across 8 files" is the PR commit's total including tests and docs.)

Every reachable entry point funnels through `readAccessConversation` →
`requireReadable` (`src/access-policy.ts:80`), whose group branch demands
`is_mpim === true`, `is_im !== true`, `conversation.id === channelId`,
`groupDms.has(channelId)`, `is_member === true` and `mpim:read`; anything else with
`is_mpim === true` throws at line 86:
- inbound: `prepareMessageEvent` → `requireHistoryConversation` (`:1870`, `:1171`), which also demands `mpim:history` (`:1172`);
- history / thread reads: `:1704`, `:1728`, `:1747`;
- file association: `requireReadableConversation` (`:1159`), then `associatedFileUrl` re-checks the file's shares against that exact channel (`src/file-access.ts:5`);
- metadata: `getConversationMeta` (`:1126`);
- listing: `conversationTypes` asks Slack for `mpim` only when `groupDmsReadable` (`:961`), and each listed row is re-proved by `readAccessConversation` and dropped on refusal (`:1109`);
- writes (post, edit, delete, reaction, upload, status, file delete): `requireWritableConversation` → `requireWritable` (`:107`), which for a `group_dm` additionally requires the ID in `writeChannels`;
- `sendDM`: unreachable for a group DM, see Q4.
There is no search API (the only Slack calls are enumerated at `:1072–:1943`). An unlisted
group DM never reaches `describeConversation`, so it cannot be cached into `dmIds`/`channelIds`
and slip past later. An ID in `groupDms` that is *not* an mpim grants nothing extra: it falls
to the channel branch and still needs `readJoinedChannels` + `is_member` + `channels:read`/`groups:read`.
The one caveat is the fallback-list interaction in the first LOW finding — that ID is still
"listed by exact conversation ID", just in the wrong list.

**What an operator who lists an ID is trusting.** Membership is not pinned: only `is_mpim`,
`is_member` and the ID are checked, never the member set (PROBE C: the same listed ID with
`members: ['UMALLORY']` and the name `mpdm-mallory--attacker--bot-1` is admitted and read).
Listing an ID therefore trusts (a) that whoever is in that conversation now and later is
trusted with everything the bot will read and say there; (b) Slack's invariant that an MPDM's
member set cannot change without producing a different conversation ID — the code relies on
it rather than verifying it; (c) that the ID stays an mpim — if Slack ever reports the same ID
with `is_mpim:false`, it becomes an ordinary write destination governed only by
`readJoinedChannels` + `groups:read`, and anyone added to it afterwards can address the bot.
The bot's own membership *is* re-proved fresh on every single operation (`is_member === true`,
no caching), which is the part the design does pin.

**3. Framing — yes, every delivered group-DM message, both paths, live text, backscroll and attachment notes.** `run` + source-read.
There is one rendering path and it is kind-independent: `src/server.ts:1883`
(`nameShown(msg.authorName)` + `senderText(msg.cleanContent)`), `src/server.ts:176`
(`backscrollLine`, same two helpers), `src/server.ts:1710` (`attachmentNote`,
`nameShown`/`mimeShown`), with `senderText` at `src/framing.ts:23`. Recipient routing only
prepends a server-built `sourceLabel` (`src/server.ts:1879`) whose fields are a
regex-validated user ID and two enums.
Proved on the production path, not inferred: PROBE D (no routing) and PROBE E (routing, with
the `slackRecipientRouting` v1 handshake) deliver a group-DM message whose text and whose
backscroll line both contain `<system>…</system>`, and both come out as
`&lt;system>…&lt;/system>` — see the verbatim block in the third LOW finding. The repo's own
new test additionally pins the author name (`nameShown` → JSON-quoted), the attachment name
and the MIME type for the non-routing case; mutating `senderText` turns it red (M1 below).

**4. Preflight interplay — group sends cannot reach `sendDM`; authorization precedes text validation.** source-read + run.
`sendDM(userId, text)` (`src/slack-adapter.ts:1617`) is one-to-one by construction:
`requireDmUser` only accepts a `userId` already in `dmUsers`, which the constructor validates
as `/^[UW][A-Z0-9]+$/`, so no multi-user or comma-joined value can pass; `conversations.open`
is typed `{users: string}` and is called with that single ID at `:1626` and `:1655` — those
are the only two `conversations.open` call sites in the codebase; and even if Slack answered
with an mpim, `:1631` refuses unless `conversation.is_im === true && conversation.user === userId`
(and `requireWritableConversation` would already have refused an unlisted mpim). So no group
send can reach `sendDM`, and no code path can create a group DM.
`sendMessage` authorizes first and validates text second: `:1438` then `:1439` — mutation M5
(swapping those two lines) turns both new reply-deny tests red.

*Does the one read-only `conversations.info` leak or expand access?* No access is expanded:
`conversations.info` is read-only — it does not join, post, mark-read or alter state — the
returned conversation object is discarded on the refusal path, and nothing from it (name,
topic, member list, message) reaches the agent. PROBE F (`probes/zzprobe3.test.ts`) shows
exactly one `info` call per refusal and zero `post` calls. What it does leak is a 4-way
existence/classification oracle in the refusal text, for an ID the agent names:
`An API error occurred: channel_not_found` / `Conversation COTHER has missing or unsupported
membership metadata (a group DM must be a joined one named in groupDms)` / `Writing to
CSECRET is not allowed by the Slack access policy` / success. The new parenthetical is a
genuinely new bit — it tells the agent "this ID is a group DM" where the base said only
"unsupported metadata". It is bounded: a bot token only gets a non-`channel_not_found` answer
for conversations it is already a member of, and no name or content is disclosed, so the agent
learns only, for a conversation the bot already belongs to, that it is a group DM. Residual,
pre-existing: each refusal spends one Tier-3 `conversations.info` call, so an agent looping on
bogus IDs can erode the token's budget for real admission checks (base behaviour, every write
already did this).

**5. New deny tests — all five are real; six mutations run, each red then restored green.**
Every mutation was one temporary edit under `src/`, run with the downloaded Node 24.22.1,
then restored from a pre-mutation byte copy and confirmed with `git diff --exit-code -- src`
(printed `RESTORED-CLEAN` each time). Nothing was committed; final `git status --porcelain`
is empty and the four touched files' SHA-256 match their pre-mutation values.

| # | mutation (temporary) | targeted test | result |
|---|---|---|---|
| M1 | `src/framing.ts:24` drop `.replace(OWN_TAG, '&lt;')` | hostile framing | **red** 1 fail → restored → **green** |
| M2 | `src/access-policy.ts:83` drop `requireScope(scopes,'mpim:read')` | missing `mpim:read` | **red** → **green** |
| M3 | `src/slack-adapter.ts:1172` drop the `mpim:history` arm | missing `mpim:history` | **red** → **green** |
| M4 | `src/recipient-routing.ts:169` drop `|| !this.accessPolicy.readJoinedChannels` | routing with `readJoinedChannels:false` | **red** → **green** |
| M5 | `src/slack-adapter.ts:1438-1439` validate text before authorizing | both reply-deny cases | **red** 2 fail → **green** |
| M6 | `src/access-policy.ts:82` drop `this.groupDms.has(channelId)` | reply to an unlisted destination | **red** (the `chat:write` case correctly stays green) → **green** |

M6 is the discriminating one: it shows the "unlisted destination" case is testing the
`groupDms` listing itself and not merely `writeChannels` (the test deliberately puts
`COTHERGROUP` in `writeChannels` but not in `groupDms`). The deny tests also assert the
*absence* of work — no `history`/`replies`/`post` call, no `users.info` before refusal, and
at most one read-only `info` — so they would catch a guard that refused only after acting.
Mutation driver kept at `probes/mutations.py`.

**6. Anything else I would block on: nothing.** Additional checks that came out clean:
`groupDms` cannot be a DM or user ID (constructor `/^[CG]/`, covered by the new
`configuration.test.ts` case); the `SLACK_ACCESS_POLICY` key allow-list was updated, so a
misspelled `groupDMs` is rejected before Slack is contacted; a group DM never lands in
`channelIds`; with `disableDms` the `assertNotDm` path still refuses group-DM writes;
a `mpim:read`-without-`mpim:history` token delivers messages but its backscroll fetch failure
is caught and logged (`src/server.ts:1803-1811`), so delivery degrades rather than breaks;
the read-only `<system>` note fires for a group DM that is in `groupDms` but not
`writeChannels` (`canWrite` → `mayWrite`); the host-side admission check mirrors the
adapter's, so the two cannot disagree.

## Verification Gates

All re-run **fresh at `ed377dd9`** through `orgasmic dispatch gate`; the implementer's
`round2-final-*` receipts were read but **not** reused for any claim in this report.
Each inner command ran under `env -i` with `HOME` pointed at a scratch directory holding
empty user and global `.npmrc` files, `NO_UPDATE_NOTIFIER=1`, and `--registry=https://registry.npmjs.org/`.

| gate | command | result | log |
|---|---|---|---|
| `review-ci-22` | `npm ci --ignore-scripts` (empty user+global npmrc, public registry) | **exit 0** — 51 packages, 19 MB fresh cache; every `resolved` in `package-lock.json` is `https://registry.npmjs.org` | `gate-review-ci-22-01M61CS4HYSZCP46Y3SWB6E3R4.log` |
| `review-build-22` | `npm run build` (tsc) | **exit 0** | `gate-review-build-22-01M61CSKVSQY9BG6MJE9F867TK.log` |
| `review-typecheck-22` | `npm run typecheck` (tsc --noEmit) | **exit 0** | `gate-review-typecheck-22-01M61CSQ35HPF84MYNDKP24DH8.log` |
| `review-test-22` | `npm run test` — full suite, Node **v22.23.3** | **exit 0** — tests 818, pass 791, fail 0, skipped 27 | `gate-review-test-22-01M61CSSXB01NDGJFHMS9X25HR.log` |
| `review-routing-24` | `accessPolicy.test.ts` + `recipientRouting.test.ts` on Node **v24.22.1** | **exit 0** — tests 75, pass 75, fail 0, skipped 0 | `gate-review-routing-24-01M61CV55PK1NB4BN2HCW25JHC.log` |

A first `review-ci-22` attempt exited 1 because npm refuses the same path as both user and
global config ("double-loading config … as global, previously loaded as user"); re-run with
two distinct empty files. That failed receipt is in the evidence directory and is not a
code failure.

Node 24 provenance: `node-v24.22.1-linux-x64.tar.xz` downloaded from
`https://nodejs.org/dist/v24.22.1/` into `/tmp/rev-1yajk/node24` (outside the repository) and
verified against that release's `SHASUMS256.txt` —
`sha256sum -c` → `node-v24.22.1-linux-x64.tar.xz: OK`, digest
`6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`. SHASUMS file copied to
`probes/node24-SHASUMS256.txt`. Exact version: **v24.22.1** (the latest v24 per
`nodejs.org/dist/index.json`).

Base-vs-final counts (`run`, base tree exported with `git archive` to `/tmp`, not a checkout):
`b956350d` on Node 22.23.3 → tests 793, pass 768, fail 0, skipped 25.
`ed377dd9` on Node 22.23.3 → tests 818, pass 791, fail 0, skipped 27. Delta **+25 tests,
+23 passing, +2 skipped, 0 failing**; the two extra skips are the Node-24-only routing tests,
both confirmed passing in `review-routing-24` (`ok 54`, `ok 58`). All 26 group-DM tests
(`ok 37`–`ok 60`) ran and passed on Node 24.

All 6 mutation runs and all 7 probes were run **unwrapped** with the downloaded Node 24
binary, so they have no reusable receipt; their sources are in `probes/`.

## Unmet criteria / test gaps

Acceptance is met: the merge keeps both test blocks, the four requested deny cases exist
(five tests: hostile framing, missing `mpim:read`, missing `mpim:history`, routing with
`readJoinedChannels:false`, and group reply denial in two parameterisations), each is shown
red when its guard is removed, and the gate matrix plus base/final counts are recorded.
No production change was made beyond the PR's own.

Remaining gaps, none blocking:
- The hostile-framing test covers only the non-routing delivery path. I closed this by probe (PROBE E), but there is no committed test for framing under recipient routing.
- No test pins the `groupDms` × `historyMembershipFallbackChannels` interaction (first LOW finding); PROBE G is the only coverage and it lives outside the tree.
- No test asserts that a listed group DM is readable with `readJoinedChannels:false` without routing (second LOW finding); the behaviour is only pinned in its routing-refusal direction.
- No test pins the model-facing label of a group DM (`#mpdm-…` vs `Group DM:`), so the third LOW finding could drift either way unnoticed.
- The group branch tolerates absent `is_im`/`is_private` where the joined-channel branch demands exact booleans (PROBE B: `{id:'CGROUP', is_mpim:true, is_member:true}` → `group_dm`, while `{id:'CREAD', is_mpim:false, is_member:true}` → refused). Harmless while the ID must be explicitly listed, but it is an asymmetry no test records.

## Residual risk

1. Operator trust is the whole security boundary for a listed ID: membership is never verified, only the ID (PROBE C). The design leans on Slack's "an MPDM's member set cannot change without a new ID" invariant without asserting it.
2. An operator who pins a group-DM ID in `historyMembershipFallbackChannels` silently drops to `channels:history`-only access and sees it as a public channel (first LOW finding).
3. `readJoinedChannels` means two different things for group DMs depending on whether routing is on; the routing deployment fails closed, but only an error log says why (second LOW finding).
4. Each refusal still spends one Tier-3 `conversations.info` call, so an agent looping on invalid IDs can erode the admission-check budget. Pre-existing on the base, not introduced here.
5. `npm ci` reports 2 high-severity advisories in the transitive dependency tree. Pre-existing and out of this task's scope; I did not run `npm audit` for detail.

## What I did not run / could not check

- No GitHub interaction of any kind: no push, no merge, no comment, no `gh` call. The branch is untouched and the worktree is exactly as I found it (clean, `dist/` and `node_modules/` ignored).
- I did **not** reuse any implementer gate receipt for a claim; I read the evidence listing and re-ran every gate. I did not re-run the implementer's `round2-final-test-24` (whole suite on Node 24) — the brief scoped Node 24 to the routing test files. So I have no fresh evidence for the other 50 test files on Node 24; that receipt exists at this commit and reported exit 0.
- I did not run lint (the project defines no lint script) and did not execute against a real Slack workspace — every behavioural claim here comes from the production code paths driven by stubbed Slack clients, which is how the repository's own tests work.
- `npm audit` detail for the 2 advisories was not collected.
- Claims about Slack's product behaviour (MPDM ID stability, mpim ID prefixes, conversations.info visibility for non-members) are stated as the assumptions the code relies on, not as verified facts; I had no workspace to confirm them against.

## Fix directions (all optional for this branch)

1. In `SlackAccessPolicy`'s constructor, throw when an ID appears in both `groupDms` and `historyMembershipFallbackChannels`; add a README sentence that the fallback list must never name a group DM.
2. Decide one meaning for `readJoinedChannels` with respect to group DMs — either add `&& this.readJoinedChannels` to the group branch at `src/access-policy.ts:82`, or document that `groupDms` is independent of it outside routing. Pin whichever with a test.
3. Give the group-DM case its own model-facing label: a `Group DM: …` form in `locationHeader` and a `group_dm="true"` (or `dm="true"`) attribute in `backscrollBlock`, so delivery agrees with `toDescriptor`.
4. Add a committed test for sender framing under recipient routing (PROBE E in `probes/zzprobe2.test.ts` is ready to adapt), and one for the `is_im`/`is_private` asymmetry in the group branch.
