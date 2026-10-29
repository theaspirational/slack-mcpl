# Review — TASK-ER984 (A4: activate the explicit access policy) @ `b93646965e3667807fc5e889474ac852084c310d`

Reviewed: one commit on `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf`. Worktree clean at start and
end; no commits, edits or new tracked files (only ignored `dist/`, `node_modules/`).

## Verdict

**Request changes.** The policy activation itself is well built and well covered: presence-only
opt-in, construction-time policy before `auth.test` and listener registration, replace-not-combine
across every effect path I could reach (including host publish, rollback, ack reaction removal and
edits), the shared `readableFileState` predicate, the bounded MPIM members fallback, and the
contradictory-pin refusal all hold up against 18 of my 22 mutants and against the full suite on
three Node versions (892/892/0 each). The four surviving mutants are behaviourally equivalent in
production.

Two defects block ship, both in the bounding work the implementer added on its own initiative
rather than from the approved plan:

1. **HIGH** — the new DM-name-lookup cap silently replaces an existing, documented degradation path
   on the **legacy** path with a worse one (5 waits per DM forever instead of 10 waits once).
2. **HIGH** — the new per-candidate admission retry shares the page-level `limited` counter, so ten
   conversations that each recover after a single transient failure abort the whole background
   registration in policy mode.

Both are reproduced by probes below. The "legacy byte identity" claim is true as far as its driver
goes (I reproduced it byte-for-byte independently), but the driver exercises none of the paths the
new caps changed, so it is not evidence that the caps are invisible — and probe P1/P2 shows they
are not.

## Findings

### HIGH

**HIGH (bug, regression) `src/slack-adapter.ts:1170`** — `for (let inARow = 0; conv.user && inARow < 5;)`
caps the DM-name lookup retry at 5, but `server.ts:95` sets `REGISTRATION_TRIES = 10`, so
`waitToAskAgain` can no longer throw `GaveUp` from this loop. The cap therefore **disables** the
existing hold-once degradation (`src/slack-adapter.ts:1176-1184`) instead of bounding anything: that
`console.error` and the `names.waitOut = undefined` short-circuit are now dead code in production.
This is on the legacy (no-policy) path.

Reproduced (probe P1, `namecap.mts`, waiter copied verbatim from `server.ts:1157-1170`, three DMs
whose `users.info` always fails retryably, no access policy):

| | waits | `users.info` calls | "Gave up on the name" logged |
|---|---|---|---|
| `3b1a97ac` (base) | 10 total | U1:10, U3:1, U4:1 | 1 |
| `b936469` (candidate) | 15 total | U1:5, U3:5, U4:5 | 0 |

*Failure scenario:* a workspace with N registered DMs during a `users.info` outage or Tier-4 rate
limit. Base: the listing waits ~10 × `Retry-After`, logs once, labels the remaining DMs with their
user IDs immediately, and finishes. Candidate: it waits 5 × N × `Retry-After` with no give-up
notice — for 200 DMs at a 30 s `Retry-After` that is a background registration that takes ~8 hours
instead of ~5 minutes, plus 5× the `[slack-mcpl] users.info failed (try N of 10)` stderr volume.
The code comment at `1164-1168` ("later DMs in it are looked up once, without waiting, so a lookup
that keeps failing holds it once") is now false.

The existing regression test cannot see this: `test/slackClient.test.ts:852-863` supplies a
test-local waiter that gives up at `inARow >= 3`, below the new cap, and its own comment
(`:850`) says "Registration's wait gives up at its tenth try; here, at the third."

*Fix direction:* drop the `inARow < 5` cap — the loop was already bounded by `GaveUp` at
`REGISTRATION_TRIES` and probe P1 proves base termination at 10. If a belt-and-braces cap is
wanted, put it **above** `REGISTRATION_TRIES` and keep the give-up branch reachable, and assert the
real constant in a test instead of a smaller test-local one.

**HIGH (bug) `src/slack-adapter.ts:1056`** (with `:980`, `:1040`) — the new per-candidate admission
retry passes `++limited` to `waitOut`, reusing the counter that means "the same request failed N
times in a row" at the page level. `limited` is reset only after a successful `conversations.list`
page (`:1040`) or `startOver()` (`:996`) — never after a successful candidate admission. So N
different conversations that each fail once and succeed on the first retry accumulate to
`limited = N`, and at `N = REGISTRATION_TRIES` the registration waiter throws `GaveUp`, which
`server.ts:1124-1133` turns into "registration stopped; refresh_channels can announce the
conversations later" with **zero** conversations registered.

Reproduced (probe P3, `limited.mts`, policy mode, every candidate fails exactly once with a
`RateLimitedError` then succeeds, waiter identical to `server.ts`):

```
candidates= 9  waits=9   -> completed with 9/9 conversations
candidates=10  waits=10  -> GaveUp: Slack rate-limited or failed the same request 10 times in a row
candidates=25  waits=10  -> GaveUp: Slack rate-limited or failed the same request 10 times in a row
```

*Failure scenario:* background registration runs under `outsideCallTime`, so `callTime.getStore()`
is undefined and `SlackWebClient.send` (`:655-673`) cannot absorb a 429 itself — every rate-limited
`conversations.info` surfaces to this loop. Policy mode issues one `conversations.info` per listed
candidate, and `conversations.info` is Tier 3 (~50/min), so any workspace with more than ~10
admitted conversations will routinely collect 10 such 429s in one page and register nothing at
startup, even though each individual candidate was fine on retry. The `GaveUp` message is also
factually wrong in this case: those were ten different requests, each tried twice.

This also misses the approved plan item it implements — the plan (plan report line 119) says
"Propagate to a foreground caller; **background registration uses its existing wait/retry path**",
i.e. reuse the page-level waiter's semantics, not fold candidate retries into its counter.

*Fix direction:* give the candidate loop its own `inARow` counter (reset per candidate), or reset
`limited = 0` after each successful admission so the page counter keeps its "in a row" meaning. Add
a regression test with ≥ `REGISTRATION_TRIES` candidates that each recover after one retry; the two
existing bound tests (`test/accessAdmission.test.ts:85-93`, `:141-147`) use a single candidate and
cannot see it.

### MEDIUM

**MEDIUM (design, scope) `src/slack-adapter.ts:1002`, `:1741`; `src/content.ts:422`** — answering
brief item 6 directly: the hard 1000-request/page caps are a real legacy behaviour change, not
invisible, though they are disclosed. Probe P2 (no access policy on either side), base vs candidate:

| path | file:line | base `3b1a97ac` | candidate |
|---|---|---|---|
| `listConversations` >1000 requests | `slack-adapter.ts:1002` | completes (1002 pages, 1002 conversations) | throws `Slack conversation listing request limit exceeded` |
| `listConversations` repeated cursor | `slack-adapter.ts:1071` | **never terminates** (25 s timeout) | throws `…cursor cycle` |
| `findUsers` >1000 pages | `slack-adapter.ts:1741` | completes (1002 pages) | throws `Slack directory page limit exceeded` |
| `findUsers` repeated cursor | `slack-adapter.ts:1764` | **never terminates** | throws `…cursor cycle` |
| `fetchSlackHistory` >1000 pages | `content.ts:422` | completes (1002 pages) | throws `Slack history page limit exceeded` |
| `fetchSlackHistory` repeated cursor | `content.ts:437` | **never terminates** | throws `…cursor cycle` |

Assessment: the three **cursor-cycle** guards fix genuine infinite legacy loops and are strictly
better — keep them. The three **1000-request/page** caps are the scope creep: at 200 items/page they
impose a hard 200 000-conversation / 200 000-user ceiling on `list_channels` and `find_user`, where
`conversations.list` returns all public channels (membership is filtered after the fetch, at
`:1067`). Enterprise Grid workspaces do exceed that, and the failure mode is a throw, not a
truncation. Neither the approved plan nor the task record asked for these; the plan's only
budget item (line 116) says to *use the existing* `withCallTime`/`SlackWebClient` limits, and the
implementer's own report calls these paths "found … independently".

*Failure scenario:* an operator on a 250 000-channel Grid workspace upgrades; `list_channels`
and background registration now fail outright with "Slack conversation listing request limit
exceeded" where they previously returned a listing.

*Fix direction:* either split the three count caps into their own PR with a truncation (rather than
throw) design — README already concedes "unusually large workspaces may need a separately reviewed
pagination strategy" — or keep them and add legacy-mode regression tests. Note every bound test in
`test/accessAdmission.test.ts:148-176` runs through `accessFixture()` (policy mode); nothing asserts
the caps apply in legacy mode, which is what P2 had to establish.

**MEDIUM (test) `test/fileAccess.test.ts:429-440`** — `test('real group file upload requires mpim:write before a ticket or bytes')`
had its config changed from `writeChannels: ['G1']` to `writeChannels: []`. With no write pin,
`SlackAccessPolicy.requireWritable` (`src/access-policy.ts:129`) throws on the `writeChannels` check
**before** reaching `requireScope(scopes, 'mpim:write')` at `:130`, so the test no longer exercises
what its name claims and would still pass if the `mpim:write` gate were deleted.

Unlike the sibling edits in this commit, this one was not forced by the new parse rule:
`{readJoinedChannels: false, writeChannels: ['G1'], groupDms: ['G1']}` is still a valid policy
(every pin is in `groupDms`), and the asserted `f.methods() === ['info']` is unchanged either way.
The scope gate is still covered on the adapter path by `test/groupDmAccess.test.ts:83-90`, so this is
a lost real-upload assertion rather than an uncovered gate.

*Fix direction:* restore `writeChannels: ['G1']` in that one test.

**MEDIUM (docs) implementer `report.md` → "## PR body" → "### Not verified"** — the proposed PR body
reads "Historical host OOM's exact allocation path is unproven; all recovery runtime work used a 4G
memory scope." The brief requires the PR body to be public-safe and to **not** mention the host OOM
or internal memory scopes. Everything else in the body checks out against the code and my gate runs
(892 on three versions, both builds/typechecks, dependency on #59).

*Fix direction:* delete that sentence from the PR body; keep the OOM/memory-scope account in the
run report only.

### LOW

**LOW (docs) `changelog.d/access-policy-activation.added.md:10` and `docs/access-policy-migration.md:84-85`**
— both describe the new retry bound as "admission retries stop after five attempts". That covers
`slack-adapter.ts:1056` but not the DM-name-lookup cap at `:1170`, which is a different retry, applies
in legacy mode, and is documented nowhere. (README `:392-395` does correctly disclose the
pagination caps as applying "including in legacy mode"; the name cap is missing there too.) Moot if H1 is fixed
by removing the cap.

**LOW (docs) `src/index.ts:14-22`** — the CLI header still documents `SLACK_DM_USERS`,
`SLACK_SEND_CHANNELS` and `SLACK_DISABLE_DMS` with no "ignored when `SLACK_ACCESS_POLICY` is set"
note, although `README.md` and `.env.example` both add it. `:10` only says the policy "replaces
legacy DM/write controls".

**LOW (test) 3 surviving mutants** — `M2` (config.ts keeps `list(env.SLACK_DM_USERS)` under policy),
`M10` (`requireWritableConversation` drops its early `return` so `assertWritable` also runs) and
`M13` (`index.ts:58` passes `dmUsers`/`sendChannels`/`disableDms` alongside `accessPolicy`) all
survive the complete 892-test suite. I traced each and all three are behaviourally equivalent in
production — every legacy consumer in `slack-adapter.ts` is guarded by `!this.accessPolicy` or an
early return, and `canWrite`/`mayWrite` agree wherever `requireWritable` passes. That is a good
result (replace-not-combine is enforced redundantly at the config, entry and adapter layers), but it
means the config-layer and entry-layer suppressions are untested defence-in-depth: if the adapter
guards were ever relaxed, nothing fails. `M3` (`canWrite` intersects) *is* caught by the full suite.

**LOW (robustness) `src/config.ts:43,46`** — both refusals embed
`JSON.stringify(env.SLACK_ACCESS_POLICY)` with no length bound, so a large malformed value prints
itself whole on one stderr line. The migration guide (`:93-94`) already states the value is echoed
and must be secret-free, so this is only a log-volume nit.

**LOW (design) `src/access-policy.ts:42-45`** — `GROUP_DM_ID` and the legacy private-channel ID space
are both `/^G[A-Z0-9]+$/`, so `{readJoinedChannels:false, writeChannels:['G1'], groupDms:['G1']}`
where `G1` is a legacy private channel parses successfully but can never admit anything
(`requireReadable` needs `is_mpim === true`, and `readJoinedChannels` is false). Accepted-but-dead
config, no refusal. The migration guide does warn "A G prefix alone is not MPIM proof" (`:28`).

## Answers to brief items 1–10

1. **Activation.** Holds. Presence-only: `src/config.ts:40` tests `env.SLACK_ACCESS_POLICY !== undefined`,
   so `''`/`' \n'` refuse rather than selecting legacy (`test/accessActivation.test.ts:21-30`, real
   startup matrix `test/accessStartup.test.ts:50-59` over both transports). Invalid input exits 1 on
   one line with the quoted value and **no** Slack call (`doesNotMatch /A4_CALL|A4_SOCKET/`).
   No fallback: mutant M1 (`catch { accessPolicy = undefined }`) is caught, 21 failures. Policy is
   constructed in `connectSlack` (`slack-adapter.ts:731`) *before* `auth.test` (`:733`) and is a
   constructor parameter (`:845`), so it is in place before the constructor-body diagnostics
   (`:848-851`) and the `socket.on` registration; mutant M9 is caught. Omitted `groupDms` stays
   omitted — `access-policy.ts:47` spreads conditionally, `test/accessActivation.test.ts:18` asserts
   `Object.hasOwn(..., 'groupDms') === false`, and mutant M5 (explicit `undefined`) is caught by the
   double-parse in the `SlackAccessPolicy` constructor. Unknown scopes refuse before Socket Mode:
   `reportedScopes` (`:121-126`) returns `undefined` for a missing or all-empty list, `connectSlack:734`
   throws, and `main()` exits 1 before `slack.start()` and before any listen
   (`test/accessStartup.test.ts:61-67` asserts exactly one `A4_CALL` and no `A4_SOCKET`). Mutant M9
   caught.
2. **Replace, not combine.** Holds on every effect path I checked. `canWrite:1212`, `dmsWritable:822`,
   `dmsDisabled:816`, `conversationTypes:916`, `requireWritableConversation:1145-1148` (early
   `return`), `assertNotDm:1523` (`if (this.accessPolicy) return`), `sendDM:1555,1563` and
   `prepareMessageEvent:1795-1796` are all policy-first with no intersection. `sendMessage`,
   `editMessage`, `deleteMessage`, `deleteFile`, `uploadFile`, `addReaction` and ack-removal
   (`removeAck:1311`) all route through `requireWritableConversation`; host `channels/publish` and
   `state/rollback` reach Slack only through `sendMessage`/`deleteMessage`/`deleteFile`
   (`server.ts:1399,1485,1489,1504`). Mutants caught: M3 (canWrite intersects, full suite), M15 (ack
   removal skips the recheck), M21 (publish bypasses admission, 27 failures), M22 (edit bypasses
   admission). Real-startup proof with conflicting legacy env:
   `test/accessStartup.test.ts:101-109` (`SLACK_SEND_CHANNELS=COTHER`, `SLACK_DISABLE_DMS=true`) →
   publish delivered, rollback deletes. Warning text (`index.ts:50-53`) names only the variables, never
   their values, is emitted exactly once (`accessStartup.test.ts:96`), and `ignoredLegacySettings`
   (`config.ts:65-66`) lists only the three legacy names actually present — `SLACK_SUBSCRIBE_MEMBER_CHANNELS`
   and `SLACK_ACK_REACTION` are correctly still honoured and still validated
   (`test/accessActivation.test.ts:31-34`).
3. **MPIM members fallback.** Holds. `isGroupMember:1101-1118`: 5 pages × `limit: 200`
   (`test/accessAdmission.test.ts:54-62` asserts exactly 5 non-cyclic and 2 cyclic pages; mutant M12
   raising the cap to 50 is caught), cursor validated for type and surrounding whitespace and against
   a repeat (`seen`), members validated against `/^[UW][A-Z0-9]+$/` so Enterprise Grid `W…` IDs work
   and non-strings do not (mutant M20 caught), bot identity required via `this.botUserId` (mutant M7
   — `members.length > 0` instead of `includes(botUserId)` — caught; `accessAdmission.test.ts:63-74`
   covers a null identity), and every unknown/malformed/exhausted outcome returns `false`, which
   `requireReadable` then denies. Cursor-cycle removal is caught (M19). Event labels are not trusted:
   `prepareMessageEvent:1789-1791` derives `isDM` from the fresh `conversations.info` answer, not
   `event.channel_type`; mutant M16 is caught. The fallback is only reached when `is_member` is
   genuinely absent and the ID is in `groupDms` (`:1094-1097`); any conflicting metadata skips it
   (`accessAdmission.test.ts:36-44`), and mutant M6 (trusting absence as membership) is caught with 13
   failures. Members requests share the real client deadline (`accessAdmission.test.ts:106-114`,
   via `SlackWebClient.send → assertRequestFits`).
4. **Shared file state and DM files.** Holds. `readableFileState` (`file-access.ts:12-19`) is the single
   predicate for `associatedFile:24`, `privateFileUrl:51` and the `policyFileRefs:72` download hint;
   mutant M17 (un-sharing it in the URL gate only) is caught with 5 failures, and M8 (re-allowing an
   absent `mode`) is caught. `policyFileRefs`/`policyFileNote` are reached only via
   `messageFileRefs:1394`, which is policy-only (`:1721`, `:1806`), so the stricter predicate and the
   reworded note do not touch legacy references — confirmed by the byte-identity A/B. DM files need an
   allowed peer, not a `D…` pin: `requireWritable` skips the `writeChannels` check for `kind === 'dm'`
   (`access-policy.ts:129`), and `test/accessAdmission.test.ts:122-139` uploads to `D1` through the
   real server with `writeChannels: []` plus conflicting `disableDms: true` and
   `sendChannels: ['COTHER']`. Deletion needs `files:read`: `deleteFile:1615-1620` →
   `readAssociatedFile:1375`; mutant M11 is caught with 9 failures, and the same test asserts rollback
   deletes only when `files:read` is granted.
5. **Contradictory pins.** Holds. `access-policy.ts:43-45` refuses `readJoinedChannels: false` with any
   `writeChannels` entry not also in `groupDms`; an absent `groupDms` makes `?.includes` yield
   `undefined`, so the refusal fires. The group-only exception
   (`{readJoinedChannels:false, writeChannels:['G1'], groupDms:['G1']}`) is explicitly allowed
   (`test/accessActivation.test.ts:35-38`) and exercised end-to-end as the `group only` /
   `group read only` real-startup rows. Mutant M4 (removing the refusal) is caught.
6. **Scope creep.** It is a legacy behaviour change, not invisible — see MEDIUM above for the exact
   six legacy paths with base-vs-candidate probe results, plus H1, which is a seventh and the only
   one that is a *degradation*. My recommendation: keep the three cursor-cycle guards (they fix
   genuine infinite loops, probe P2 shows the base never terminates), revert the `inARow < 5` cap
   outright, and split the three 1000-request/page count caps out so their truncate-vs-throw design
   gets its own review. The caps are disclosed in README (`:392-395`, explicitly "including in legacy
   mode"), the changelog fragment and the migration guide (`:85-88`); the name cap is disclosed
   nowhere.
7. **Test mock leak.** No nested `globalThis.fetch` mock exists in the committed tests. A static scan
   of every top-level `test(...)` block in `test/*.ts` finds no block installing
   `t.mock.method(globalThis, 'fetch')` more than once, and the one deep-indented site
   (`test/groupDmAccess.test.ts:206`) sits in a `for` loop that is **outside** `test(...)`, so each
   iteration is a separate test with its own `t` and its own automatic restore — and it has that shape
   at `3b1a97ac` too, so the leak the implementer describes existed only in an uncommitted
   intermediate state, not in what landed. Verified at runtime: a preload capturing `globalThis.fetch`
   at startup reports `identical=true hasMockProp=false` at process exit for every suite process and
   every spawned startup child (224 records). No test can loop unboundedly either — every new bound
   test carries its own fixture ceiling that throws (`test/accessAdmission.test.ts:57,144,150,158,166,173`).
   Order sensitivity checked: the full suite in **reversed** file order is 892/892/0, and three
   back-to-back repetitions are 892/892/0 each, with peak RSS 379–394 MiB.
8. **Legacy byte identity and mutations.** Reproduced independently, not reused: running the
   implementer's driver myself against an archived `3b1a97ac` tree (which I verified is byte-identical
   to that commit for all of `src/`, `test/`, `scripts/`, plus three added test-only files that no
   production code sees) gives **30 511-byte stdout and 153-byte stderr, `cmp`-identical** on both
   sides — matching the implementer's figures exactly. Coverage of that driver: `startupSettings` for
   six legacy variable combinations, real CLI stdio startup (status/stdout/stderr), MCP and MCPL
   framing, `tools/list`, `list_channels`, `send_message`, `fetch_history`, `upload_file`,
   `state/rollback`, `channels/publish`, and channel/DM/MPIM inbound events. It exercises **none** of
   the retry or pagination paths the new caps changed, which is why probes P1/P2 were needed.
   Mutations: **22 run, 18 caught, 4 survived** (3 of them behaviourally equivalent — see LOW). Caught:
   M1 invalid-policy-falls-back-to-legacy, M4 contradictory-pin-refusal-removed,
   M5 omitted-groupDms-becomes-explicit-undefined, M6 absent-mpim-membership-trusted,
   M7 mpim-members-ignores-bot-identity, M8 absent-file-mode-readable,
   M9 unknown-scope-metadata-no-longer-refuses, M11 delete-skips-files-read,
   M12 mpim-member-page-cap-raised, M14 listing-admission-retry-unbounded,
   M15 ack-removal-skips-policy-recheck, M16 event-dm-label-trusted,
   M17 url-gate-unshares-file-state-predicate, M18 upload-skips-post-bytes-reauthorization,
   M19 mpim-members-cursor-cycle-removed, M20 mpim-member-id-format-unvalidated,
   M21 host-publish-bypasses-admission, M22 edit-bypasses-admission, and M3
   canWrite-intersects-legacy-send-list (full suite only).
9. **Docs.** README (`:328`, `:330-333`, `:339-396`), `.env.example` (`:10`, `:23-28`),
   `docs/access-policy-migration.md` and the changelog fragment are accurate against the code on every
   claim I spot-checked: field table and ID shapes, `dmUsers` as a read **and** write grant, empty
   lists deny, omission/empty `groupDms` denies, "with joined reads off every write pin must also be
   named in groupDms", unknown scope metadata refuses startup while limited known grants warn and
   deny, `files:read` for policy reads and rollback deletion, exact `hosted/snippet/post` modes,
   redirect refusal, global deletion across all shares, 1000-entry provenance eviction, 200/page × 5
   pages for the members fallback, `find_user` remaining workspace-wide even under conversation-deny-all,
   no hot reload, and the quoted stderr samples (both the startup notice and
   `SLACK_ACCESS_POLICY must be valid JSON, got "{"`). Three gaps: the two LOW docs findings above and
   the MEDIUM PR-body finding (the body mentions the host OOM and the internal 4G memory scope, which
   the brief forbids). The changelog fragment passes `test/release-changelog.test.ts`.
10. **Gates.** See below — 892/892/0 on all three Node versions plus typecheck and build, run fresh
    by me.

## Verification Gates

All run from this worktree at `b93646965e3667807fc5e889474ac852084c310d`, inside
`XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 --
timeout …` with `--max-old-space-size=768`. No scope failed, no OOM, no uncapped run, no fallback.
Notifiers off (`NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`,
`npm_config_audit=false`, `npm_config_fund=false`), empty user/global npmrc, all inherited `SLACK_*`
unset (verified `env | grep -c '^SLACK_'` → 0), and the loopback-only Node preload in force —
re-verified before any other command: net/TLS/HTTP/HTTPS/DNS/`fetch`/WebSocket/non-loopback listen
all refused, guard inherited by child processes, loopback allowed. Read-only: no tracked file
touched, no commit, no push, no PR/comment, no dispatch close. Logs in `$ORGASMIC_EVIDENCE_DIR`.

| Gate | Result | Log |
|---|---|---|
| `rev-full-suite-22.23.3` — `node --max-old-space-size=768 --import tsx --test --experimental-test-isolation=none test/*.test.ts` | **892 pass / 0 fail**, max RSS 385 764 KiB | `gate-rev-full-suite-22.23.3-01M6466BMGKF5ZBXRVX0NM9YSA.log` |
| `rev-full-suite-24.22.1` — same | **892 pass / 0 fail**, max RSS 402 168 KiB | `gate-rev-full-suite-24.22.1-01M64671K2V7Z7KXD511RH41SX.log` |
| `rev-full-suite-22.12.0` — same | **892 pass / 0 fail**, max RSS 381 312 KiB | `gate-rev-full-suite-22.12.0-01M6467Q4S5RPJ7M1Y0R55W8KK.log` |
| `rev-typecheck-build-22.23.3` — `npm run typecheck && npm run build` | PASS | `gate-rev-typecheck-build-22.23.3-01M646JCAQRRYWR2S2WGE2MQ0E.log` |
| `rev-typecheck-build-24.22.1` — same | PASS | `gate-rev-typecheck-build-24.22.1-01M646JCS5YKNTMKQWF3QPPYJ4.log` |
| `rev-suite-reversed-order-2` — full suite, file order reversed, with the `fetch`-identity preload | **892 / 0**, max RSS 384 464 KiB, `identical=true hasMockProp=false` | `gate-rev-suite-reversed-order-2-01M647674JGGZP7EP2TKPRDDX0.log` |
| `rev-suite-repeat-2` — full suite ×3 in one process group | **892 / 0** each, max RSS 393 700 / 390 476 / 379 384 KiB | `gate-rev-suite-repeat-2-01M6476XY022B845TV5GSQEP9H.log` |
| `rev-mutations` — 14 mutants in a `/tmp` copy, targeted suites | 10 caught, 4 survived | `gate-rev-mutations-01M646NY48QBP6V5A06806J86Y.log` |
| `rev-mutations-2` — 8 effect-path mutants | **8 / 8 caught** | `gate-rev-mutations-2-01M646Z99SH1SF4XVNVTNKZV2Z.log` |
| `rev-mutations-survivors-full` — the 4 survivors re-run on all 892 tests | M3 caught; M2/M10/M13 survive (equivalent) | `gate-rev-mutations-survivors-full-01M6471K6TZ64R2DCYJG75C8VR.log` |
| `rev-review-probes` — P1 name-retry A/B, P2 legacy-cap A/B (6 cases × 2 sides), P3 shared-counter, P4 byte-identity `cmp` | all four reproduce as reported above | `gate-rev-review-probes-01M647AB21XC3GKMJPNA91TP35.log` |

Reused implementer receipts, read not re-run: `committed-smoke`
(`gate-committed-smoke-01M645PVKMAX49W5N2D9H99RZ3.log`, 84/0 plus typecheck after a fresh
`npm ci --ignore-scripts`, clean tree, parent SHA and `Co-Authored-By: GPT-6-Astra` trailer
verified) and `committed-legacy-identity`
(`gate-committed-legacy-identity-01M645V6DQ98SDN8NADG5QJ843.log`) — which I then reproduced myself
as probe P4 rather than relying on it.

Two gates of mine failed and were re-run: `rev-suite-reversed-order` and `rev-suite-repeat` each
reported 871/892 with 21 failures. **Self-inflicted instrumentation, not a product defect** — my
first `fetch`-identity preload wrote its line to stderr via `process._rawDebug`, and 21 tests assert
on exact stderr content (the diffs show `+ '[fetchwatch] identical=true …'` as the only delta).
Rewriting the preload to append to a file instead gave 892/0 in both. Classified: environment /
reviewer tooling.

Peak RSS, every command of this review: **402 168 KiB (≈ 393 MiB)**, on the 24.22.1 full suite.
Nothing came near the 4 GiB scope limit.

## Unmet criteria / test gaps

- Task acceptance "admission call budget" is not met as implemented: H2 makes the new per-candidate
  retry abort background registration at 10 cumulative single-retry candidates, and the plan item it
  implements (plan line 119) asked it to reuse the existing waiter's semantics.
- No test covers `src/slack-adapter.ts:1170` at all. `test/slackClient.test.ts:852` deliberately uses
  a give-up threshold of 3, below the new cap of 5, so the production constant
  (`REGISTRATION_TRIES = 10`) is never modelled and H1 is invisible to the suite.
- No test uses ≥ `REGISTRATION_TRIES` listing candidates; `test/accessAdmission.test.ts:85-93` and
  `:141-147` both use one, so H2 is invisible to the suite.
- Every new pagination-bound test runs in policy mode (`accessFixture()`); nothing asserts that the
  caps and cursor-cycle guards also apply on the legacy path, which is where they are a behaviour
  change.
- `test/fileAccess.test.ts:429` no longer exercises the `mpim:write` gate on the real upload path
  (MEDIUM above).
- Surviving mutants M2, M10, M13 show the config-layer and `index.ts`-layer replace-not-combine
  suppressions are untested; only the adapter-layer guards are load-bearing today.
- Not verified at all (acknowledged by the implementer, out of scope here): a live Slack workspace,
  macOS, and throughput/throughput-loss behaviour under real rate limiting.

## Residual risk

- Fresh admission multiplies `conversations.info` traffic by one call per listed candidate with no
  positive cache (owner-approved). Beyond H2, the design still trades event delivery for revocation
  speed: `prepareMessageEvent` acks and drops on any admission failure, and the aggregate stderr
  notice is capped at one per minute, so a throttling window silently loses messages.
- `noteAdmissionFailure` also counts legitimate policy denials, so a policy admitting 1 of 100 DM
  conversations logs "Access admission denied 99 … candidates" on each listing. Bounded and
  documented, but noisy.
- The 1000-item ceilings (MEDIUM) and the `policyUploads` 1000-entry eviction leave large deployments
  and long-lived processes with failure modes that only surface at scale; neither has a scale test.
- `diagnosticScopes()` only warns on missing scopes; a policy running with, say, no `chat:write`
  starts and fails every write at call time. Owner-approved ("limited known grants start
  fail-closed"), but operators must read stderr at startup.
- Byte identity is established only for the deterministic driver in P4; any legacy path it does not
  drive — and P1/P2 found three families of those — is unverified by that method.

## Fix directions (ordered)

1. Remove `inARow < 5` at `src/slack-adapter.ts:1170`; the loop is already bounded by `GaveUp` at
   `REGISTRATION_TRIES` (probe P1 proves base termination at 10). Add a test that uses the real
   constant so the give-up branch stays reachable.
2. Give the candidate loop at `src/slack-adapter.ts:1050-1061` its own per-candidate counter, or reset
   `limited = 0` after each successful admission. Add a ≥10-candidate regression test where every
   candidate recovers on its first retry.
3. Restore `writeChannels: ['G1']` in `test/fileAccess.test.ts:431`.
4. Drop the host-OOM / 4 GiB-memory-scope sentence from the PR body's "Not verified".
5. Decide on the three 1000-request/page caps: split them out with a truncation design, or keep them
   and add legacy-mode regression coverage plus a changelog line that says the name-lookup retry
   changed too (moot if 1 lands). Keep the three cursor-cycle guards either way.
6. Add the "ignored when `SLACK_ACCESS_POLICY` is set" note to the three legacy variables in the
   `src/index.ts` header comment.

Probe sources and artifacts copied into `$ORGASMIC_EVIDENCE_DIR`: `namecap.mts`, `legacycaps.mts`,
`limited.mts`, `probes-all.sh`, `safe.sh`, `mutate.py`, `mutate2.py`, `mutate3.py`,
`rev-identity-base.txt`, `rev-identity-candidate.txt`.
