# TASK-XPP3A review — A2 dormant adapter access gates

**Commit reviewed:** `8296d58e7940f69f1334228a18c5c9c0f18b93ff`
**Parent:** `62a77616228cdc7d4eda31a6f1561501e9e484fc` (published A1 / upstream #55) — verified
**Shape:** exactly 1 commit on A1, `git diff --check` clean, required `Co-Authored-By: GPT-6-Astra` trailer present, worktree clean and left as found (only ignored `dist/`, `node_modules/`).

## Verdict

**Approve — no blocker.** All four acceptance criteria are met and independently reproduced, not merely asserted:

- One commit on top of A1 — verified.
- **Legacy parity** — verified empirically, not just by reading the diff: a 58-scenario A1-vs-A2 differential found **0 divergences** in Slack call sequences, payloads, returned outputs, refusal text, getters, inbound delivery and ACK; and the suite minus the new files is **599/599** at this commit, i.e. no existing test was touched.
- **Policy-mode gating** — a deny-all policy with *every* scope granted reaches **no** Slack effect across **70** adapter/server/host/rollback/inbound cases, with exactly one disclosed exception (`find_user`, M2).
- **Tests** — the deny matrix is real, not vacuous: **9 mutations I authored myself**, on nine gates the worker did not mutate, were **all** caught.

The implementer's report is accurate. Its gate map holds up on every claim I tested, including the ones most likely to be overstated (zero-call counting, cursor re-admission, ACK cleanup, DM peer exactness, attachment suppression). I found no HIGH finding.

The two MEDIUM items are **not defects in A2** — both are explicitly disclosed, and both are scope boundaries the approved plan assigns elsewhere. I raise them because they are *sequencing constraints on A4*, and one of them is currently documented only in the internal report, not in the public PR body.

## Findings

### MEDIUM

**M1 — `fetch_attachment` is entirely ungated in policy mode; A4 must not land before A3.** `src/server.ts:877–905`
The handler takes a client-supplied `files.slack.com` URL, attaches the bot token and returns the bytes. It never touches the adapter, the policy, or any conversation admission. Proven on the production path (real `SlackMcplServer` + real `SlackAdapter` with a policy installed; `fetch` stubbed in scratch so nothing left the machine):

```
fetch_attachment offered in policy mode: true
isError                 : false
slack calls made        : []                 <- zero admission calls
outbound fetches        : [{"url":"https://files.slack.com/files-pri/T1-F404/unadmitted-channel-secret.txt",
                            "auth":"Bearer xoxb-REVIEW-PROBE-TOKEN"}]
bytes returned to agent : [{"type":"text","text":"{...,\"content_text\":\"SECRET FILE BYTES\"}"}]
```

The adapter correctly emits no attachment URLs under policy (verified, item 4), so this server hands the agent no URL. But a URL is still obtainable — a `files.slack.com` link pasted as message *text* in a conversation the policy *does* admit reaches the agent, and `fetch_attachment` will then retrieve a file from a conversation the policy never admitted.
*Failure scenario:* A4 ships activation before A3 lands → a policy that confines messages, reads and writes but not file bytes.
*Fix direction:* land A3 first, or have A4's activation refuse to enable policy mode while this path is ungated. At minimum, move the ordering constraint into the **public PR body** — today it appears only in the implementer's internal report ("attachment fetch enforcement is A3 … do not expose this state as configuration early"), which a maintainer will never read.

**M2 — `findUsers` is gated on scope only, never on the policy: the one path that escapes a deny-all policy.** `src/slack-adapter.ts:1598`
`this.accessPolicy?.requireScope(this.scopes, 'users:read')` is the whole gate. With a policy that admits *nothing* (`readJoinedChannels: false, writeChannels: [], dmUsers: []`) but `users:read` granted, `users.list` is still reached and the full workspace directory returned. Across my 70-case deny-all sweep it is the **only** escape:

```
cases=70 undisclosed_escapes=0 known_disclosed_escapes=4   (all four are findUsers/find_user)
```

*Failure scenario:* a policy naming two permitted DM peers still permits enumeration of every non-bot workspace member's id, username, real name and display name.
This is disclosed in the gate map as deliberate ("`users:read` before workspace-global directory lookup"), so it is **not unmet acceptance** — the plan specifies exactly this gate. But "access policy" implies confinement, and the directory is the one systematic exception.
*Fix direction:* either filter results to `dmUsers` ∪ members of admitted conversations, or state the carve-out explicitly in `SlackAccessPolicy`'s doc comment and in the PR body, so a maintainer approving "access policy" knows the user directory is out of its scope.

**M3 — admission metadata is uncached, so policy mode multiplies Slack calls per listing candidate and per inbound event.** `src/slack-adapter.ts:1024`, `src/slack-adapter.ts:1649`
Every listing candidate gets its own `conversations.info` (after the useful non-member pre-skip), every inbound message event gets one, and every read/write call gets one. There is no TTL cache and no in-flight dedupe.
*Failure scenario:* a workspace with many joined channels turns one `refresh_channels` into one `conversations.info` per channel; a busy channel turns every delivered message into an extra metadata call — against Slack's per-method rate limits, on the socket delivery path, where the result is a silently dropped message (`catch { return; }`, `src/slack-adapter.ts:1652`).
The report lists "no load/rate-limit qualification" as residual risk, but the design has no mitigation, and "fresh admission" and "cacheable" are in direct tension.
*Fix direction:* A4 needs an explicit decision here, not a deferral — either a short-TTL admission cache with a stated staleness bound, or a documented call-amplification budget. Worth deciding before activation, because it may change the A2 gate shape.

### LOW

**L4 — `dmsDisabled` diverges from the fork reference under policy, and the divergence is undisclosed.** `src/slack-adapter.ts:806–808`
A2: `return !this.accessPolicy && this.disableDms;` → always `false` under policy. Fork `685b2de:src/slack-adapter.ts:842–845`: `if (this.accessPolicy) return !this.accessPolicy.dmsWritable;`. With a policy naming no DM peers:

```
dmsDisabled          : false   (fork would report true)
dmsWritable          : false
conversationTypes()  : ["public_channel","private_channel"]   <- no "im": DMs are never listed or registered
```

The sole consumer is the agent-facing description at `src/server.ts:1345`, which therefore drops the ", channels only while direct messages are turned off" clause while the listing is in fact channels-only — a factually wrong tool description in a codebase that is otherwise meticulous about agent-facing wording. `send_dm` exposure is unaffected (it uses `dmsWritable`, which is correctly `false`).
The report's deliberate-differences list names the `dmsWritable` change but **not** this one, so it reads as an oversight rather than a decision.
*Fix direction:* adopt the fork's `!dmsWritable` under policy, or derive the description from the effective listing types.

**L5 — the policy cannot be seen at construction, so the startup scope diagnostic is wrong in policy mode (and emits 55 unsuppressed stderr lines).** `src/slack-adapter.ts:836–837`
`accessPolicy` has no constructor path, so the constructor's `leftOutTypes()` diagnostic runs against *legacy* types. Confirmed:

```
constructor-time diagnostic (no policy yet): ["…omits types without a granted read scope: mpim (requires mpim:read)."]
policy-mode conversationTypes(): ["public_channel","private_channel","im"]
policy-mode leftOutTypes()    : []        <- mpim is NOT omitted under policy; it is excluded by design
```

That line appears **55 times** in the new-tests run (only 3 of the new tests mock `console.error`, against the suite's convention).
*Failure scenario:* if A4 installs the policy post-construction the way the fixture does, production logs a startup diagnostic naming types the policy never requests.
*Fix direction:* give A4 a constructor option rather than post-construction assignment — note the current tests therefore do not exercise the eventual wiring — and mock `console.error` in the new tests.

**L6 — the LOW-C change is correct but unobservable, hence untested and untestable through the module's public surface.** `src/access-policy.ts:21`
It is confirmed the **only** A1 production change in the commit. The predicate change is real — `[,].every(…)` is vacuously `true`, `Array.from([,]).every(…)` is `false` — but `parseAccessPolicy` already densifies via `Array.from` at lines 35–36, so A1 and A2 refuse sparse input *identically*:

```
bare every on hole  : true          Array.from on hole  : false
A1 sparse writeChannels : REFUSED   A2 sparse writeChannels : REFUSED
A1 sparse dmUsers       : REFUSED   A2 sparse dmUsers       : REFUSED
```

`idList` is module-private with exactly one caller, so this is defence-in-depth for a second caller that does not exist. Harmless and defensible; just be aware no test can cover it, and the PR body's "Make A1's ID-list predicate independently hole-safe" overstates a behaviour-neutral change.

**L7 — `deleteFile`'s gate constrains a resource the effect does not touch.** `src/slack-adapter.ts:1485–1489`
Admission runs on `channelId`, but the effect is `files.delete({ file: fileId })` — `channelId` is never used. The policy's `writeChannels` therefore does not confine *which* file is deleted. Safe today only because the single caller (`src/server.ts:1464`, rollback) supplies a `(channelId, fileId)` pair the server itself recorded from its own upload; there is no `delete_file` tool.
*Fix direction:* add a comment at the gate recording that it relies on caller-supplied pairing, so A3 does not inherit the assumption silently; if a file tool is ever exposed, verify the file's channel association instead.

**L8 — PR body uses internal chain labels a maintainer has no key to.**
"inert until **A4**" is the body's central dormancy claim, and `A3`, `A4`, `G` appear throughout. A maintainer cannot resolve these.
*Fix direction:* plain language ("inert until a later PR adds the opt-in setting"), plus M1's ordering constraint.

### Operational note (not a defect)

This PR touches `src/` with no changelog fragment, so CI's `changelog` check will fail until a maintainer applies the **`no-changelog`** label (`CONTRIBUTING.md:108–111`). The exemption is correctly justified — nothing externally noticeable changes, and I proved the one A1 production change is behaviour-neutral (L6). The body requests the label; the report is honest that applying it was not attempted.

## Answers 1–9

**1. Legacy parity — confirmed, empirically.** Not inferred from the diff. I exported A1 and A2 to scratch and drove both through the same recording stub over **58 scenarios** (writes, reads, listings, DM send, upload, ACK add/clear/stop, 9 inbound event shapes, getters, and 12 *competing-refusal* cases where two checks race): **0 divergences** in call sequence, payloads, outputs and exact refusal text. I then proved the probe is not vacuous with **3 ordering controls** — swapping allow-list↔text in `sendMessage`, text↔DM-check in `sendMessage`, and write-gate↔DM-check in `uploadFile` — each of which the probe caught (2, 1 and 1 divergences). The extracted post body is **byte-for-byte identical** to A1 (41 lines, `diff` empty), so the `postValidatedMessage` refactor lost nothing. `readableTypes()`'s rewrite is equivalent in legacy mode for both the known- and unknown-scope branches. The only legacy-mode change is microtask timing (`assertWritable` now throws inside an `async` helper); `sendMessage` was already `async`, so no caller observes it. Suite minus the new files is **599/599** — no existing test altered.

**2. Completeness.** Slack Web API call sites: `src/slack-adapter.ts` lines 988 (`auth.test`), 994 (`conversations.list`), 1043 + 1052 (`conversations.info`), 1235 (`reactions.remove`), 1275 (`chat.postMessage`), 1314 + 1337 (`files.getUploadURLExternal`/`completeUploadExternal`), 1447 + 1457 (`conversations.open`), 1474 (`chat.update`), 1480 (`chat.delete`), 1488 (`files.delete`), 1494 (`reactions.add`), 1508 (`conversations.history`), 1532 (`conversations.replies`), 1604 (`users.list`); plus two reached *through* the adapter in `src/content.ts` — 342 (`users.info`) and 411 (`conversations.history`, backscroll's pager). **`src/server.ts` makes no direct Slack Web API call.** Each effect is gated, verified by a deny-all policy with all scopes granted (so a scope gate cannot mask a missing membership gate) across 70 cases: every adapter method, 15 server tools, host publish, rollback, and 3 inbound shapes. **0 undisclosed escapes**; the only escape is M2. Specifically checked and clean: ACK add (via gated `addReaction`), ACK removal and shutdown cleanup (no cleanup exemption), rollback (`deleteMessage`/`deleteFile`), inbound, backscroll, `refresh_channels`, `list_channels` incl. `includeNonMember`, cursor continuation (re-admits per call), thread replies. `users.info` name resolution always follows admission. Cached membership (`dmIds`/`channelIds`) cannot authorize — `assertNotDm` returns early under policy and `requireReadable` demands fresh `is_member === true`.

**3. DM flow — correct.** Early veto order is right: `requireDmUser(userId)` → `im:write`/`im:read`/`chat:write` → text → *only then* `conversations.open`, so no DM is opened just to refuse the post. The returned channel is re-fetched independently via `conversations.info` and must satisfy *all* of: `conversation.id === channelId`, `DM_ID` (`^D…`) shape, `typeof conversation.user === 'string'`, `requireDmUser(conversation.user)` (policy set), `conversation.user === userId` (exact *requested* peer), and the legacy send-list intersection. Crafted metadata cannot spoof it: a `C`/`G` id cannot enter the DM branch (`DM_ID.test`), `is_mpim === true` is rejected by `requireReadable`'s first guard, and a different-but-allowed peer is rejected by the exact-peer check (the worker's `exact-dm-peer` mutation and my `inbound-dm-sender` mutation both die). The only residual race is Slack-side membership change between `open` and `info`, which is disclosed.

**4. Group DMs and attachments — refused / no-op as claimed.** Group DMs: `requireReadable` rejects `is_mpim === true`, the policy listing never requests the `mpim` type, and my deny-all sweep included mpim metadata on every operation with no effect reached. Attachments: **no leak.** All three read surfaces share one suppression point (`shapeHistory`, `src/slack-adapter.ts:1586` — `readHistory`, `readThread` and `fetchHistory` all pass `shape: (messages) => this.shapeHistory(messages)`), and inbound has its own (`src/slack-adapter.ts:1666`). Verified on all four surfaces at once:

```
policy  url_private present in output: {"readHistory":false,"readThread":false,"fetchHistory":false,"inbound":false}
legacy  url_private present in output: {"readHistory":true,"readThread":true,"fetchHistory":true,"inbound":true}
```

The caveat is M1: the adapter emits no URLs, but `fetch_attachment` will still fetch one it is handed.

**5. Dormancy — genuinely inert, verified at the build level.** `accessPolicy` is a `private` field with no setter, no constructor option, and no assignment anywhere in `src/`. No env var, CLI flag, connector setting, startup setting or README row. The adapter imports the policy as `import type` only, so it is erased at compile time — in the built output, the only occurrence of `SlackAccessPolicy` in `dist/src/slack-adapter.js` is inside a **comment**, and `dist/src/access-policy.js` is an **orphan module imported by nothing in `dist/src/`** (only by `dist/test/`). Tests inject through a deliberate, clearly-labelled `as unknown as` cast in `test/adapterAccessFixture.ts:12`. The one caveat is L5: the injection point is post-construction, which no production wiring will use.

**6. Tests — the deny matrix is real, not vacuous.** It counts calls exactly (`assert.deepEqual(f.calls, [])` for scope denial; exact `f.methods()` sequences such as `['info']` for membership denial, so a denial may spend only its authorization probe and never the effect). Importantly the `fresh denial` and `group DM refusal` matrices run with **full scopes**, so they cannot pass by scope short-circuit. **9 mutations I authored, on gates the worker did not touch, all caught:** `can-write` (71/1), `list-candidate-admission` (71/1), `history-attachment-suppression` (71/1), `inbound-attachment-suppression` (71/1), `find-user-scope` (70/2), `inbound-dm-sender` (71/1), `write-sendlist-intersection` (69/3), `admission-id-shape` (71/1), `listing-unknown-scope` (59/13). Mock hygiene: `t.mock.method` is per-test-context and auto-restored; `connectHost` is closed via `t.after`; the shared memoized `uploadEndpoint` is loopback-bound and `unref`'d, and the new test's key (`policy-upload`) cannot collide with the existing `F<n>` keys. No cross-file contamination — the full suite is **671/671 with the new files placed first** instead of in glob order. Under 6-way CPU load the two new files are **72/72 three times** (3.21 s / 3.19 s / 3.18 s — no timing sensitivity). One blemish: L5's 55 unsuppressed stderr lines.

**7. Fresh full suites — all pass, counts exactly as predicted.** Run fresh in *my* worktree, not reused from the implementer's receipts: **671 pass / 0 fail / 0 skipped / 0 cancelled** on Node 22.23.3, 24.22.1 and 22.12.0; typecheck and build pass on 22.23.3 and 24.22.1. The 671-against-599 claim is confirmed from both directions: the suite minus the two new files is **599/599 at this commit**, and the two new files alone are **72** tests (599 + 72 = 671).

**8. The LOW-C change — correct, and the only A1 change.** Confirmed by diff that `src/access-policy.ts:21` is the sole A1 production edit. Correct, but behaviour-neutral through the entire public surface — see L6.

**9. PR body — accurate and public-safe, with two gaps.** Every numeric claim checks out (599 and 671 baselines on three Node versions, typecheck/build, 72 new tests × 5 runs, five caught mutations). `pr-body.md` matches the report's reproduction verbatim (`diff` empty). It satisfies `CONTRIBUTING.md`: Problem/Changes/Tests shape (:36), numeric baselines rather than "all tests pass" (:40–43), a real "Not verified" section (:44–46), an "Out of scope" section, and the stacked-PR declaration with merge order — "depends on #55; review and merge #55 first" (:27–32). It leaks nothing non-public (no tokens, paths, internal URLs or task IDs). **Does it frame dormancy well enough for a maintainer? Not quite.** Two gaps: the central claim is "inert until **A4**", an internal label with no public referent (L8); and the A3-before-activation constraint (M1) — the single most important thing a maintainer should know before approving a security-shaped PR — appears only in the internal report, not the body.

## Verification Gates

All wrapped via `orgasmic dispatch gate <name> -- timeout 900 <cmd>`, run in my worktree at `8296d58e`, tree clean at start and end. Node 22.23.3 on PATH; 24.22.1 and 22.12.0 from `/tmp/task-xpp3a`. Empty npm configs, notifiers off, `NODE_OPTIONS=--require=/tmp/task-xpp3a/loopback.cjs` (loopback-only listener guard) throughout.

| Gate | Command | Result |
|---|---|---|
| `review-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | 51 packages |
| `review-suite-22.23.3` | `env PATH=/opt/node/bin:$PATH npm test` | **671 pass / 0 fail**, 0 skip/cancel |
| `review-suite-24.22.1` | `env PATH=<24.22.1>:$PATH npm test` | **671 pass / 0 fail** |
| `review-suite-22.12.0` | `env PATH=<22.12.0>:$PATH npm test` | **671 pass / 0 fail** |
| `review-typecheck-22.23.3`, `review-typecheck-24.22.1` | `npm run typecheck` | pass both |
| `review-build-22.23.3`, `review-build-24.22.1` | `npm run build` | pass both |
| `review-suite-minus-new` | suite excluding `adapterAccess*` | **599 pass / 0 fail** (existing suite retained intact) |
| `review-suite-newfirst` | full suite, new files first | **671 pass / 0 fail** (no file-order coupling) |
| `review-new-tests-load-1/2/3` | two new files, under 6-way CPU load | **72 pass / 0 fail** ×3 |
| `review-legacy-parity-differential` | A1-vs-A2 differential, 58 scenarios | **0 divergences** (3 ordering controls each caught) |
| `review-deny-all-completeness` | deny-all policy + all scopes, 70 cases | **0 undisclosed escapes**, 4 disclosed (`find_user`) |
| `review-attachment-leak` | 4 read surfaces × policy/legacy | no policy leak; legacy unchanged |
| `review-mutation-can-write` | own mutation | caught — 71 pass / 1 fail |
| `review-mutation-list-candidate-admission` | own mutation | caught — 71 / 1 |
| `review-mutation-history-attachment-suppression` | own mutation | caught — 71 / 1 |
| `review-mutation-inbound-attachment-suppression` | own mutation | caught — 71 / 1 |
| `review-mutation-find-user-scope` | own mutation | caught — 70 / 2 |
| `review-mutation-inbound-dm-sender` | own mutation | caught — 71 / 1 |
| `review-mutation-write-sendlist-intersection` | own mutation | caught — 69 / 3 |
| `review-mutation-admission-id-shape` | own mutation | caught — 71 / 1 |
| `review-mutation-listing-unknown-scope` | own mutation | caught — 59 / 13 |

Each mutation gate applies one anchored source edit, runs the new test files, **requires failure**, and restores the source in a `finally` — these are inverted gates, not green application runs. Probe sources archived beside this report: `nothing-admitted.ts`, `parity.ts`, `mutate.py`, `attachment.ts`.

Unwrapped supporting probes (reported as evidence, not offered as receipts): the `fetch_attachment` production-path probe for M1 (output quoted above), the constructor-diagnostic probe for L5, the `dmsDisabled` probe for L4, and the `parseAccessPolicy` sparse-array probe for L6. Each is reproducible from the archived sources.

## Unmet criteria / test gaps

No acceptance criterion is unmet. Remaining gaps, all of them real but none blocking A2:

- **No test can cover the LOW-C change** (L6) — it is unobservable through `parseAccessPolicy`.
- **The tests' policy-injection shape matches no future production wiring** (L5): post-construction assignment means the constructor-time interaction, including the startup scope diagnostic, is never exercised.
- **`dmsDisabled` under policy has no test** (L4); the fork divergence is consequently invisible to the suite. The new tests assert `dmsDisabled === false` at `test/adapterAccess.test.ts:154`, which pins the *current* behaviour rather than the intended one.
- **`fetch_attachment` has no policy-mode test** (M1), correctly, since it has no policy-mode behaviour yet — but that means nothing will fail when A4 activates ahead of A3.
- **No rate-limit or call-amplification test** (M3); no live Slack workspace, live host, or macOS coverage, as disclosed.
- Admission is not transactional with the effect, and one admission authorizes all internal pages within a single call. Both disclosed.

## Residual risk

- **Ordering risk is the real one:** A4 activation before A3 ships a half-confined policy (M1). Nothing in the code or CI enforces that ordering today — only prose in an internal report.
- **Scope checks read a monotonic cache, not fresh state.** `takeScopes` (`src/slack-adapter.ts:926–929`) only ever grows the set, seeded once from startup `auth.test`. `requireScope` is therefore "a scope was once observed", not "is granted now". Defensible — the code's own comment notes Slack never narrows a token's scopes — but it is weaker than "fresh admission" suggests, and the report discloses it.
- Membership can change between the admission `info` and the effect, and between pages within one call.
- Cleanup after revocation may leave Slack messages, files or reactions; existing rollback/ACK retry semantics are retained with no privileged bypass (verified — the ACK-cleanup gate is real and both the worker's mutation and my deny-all sweep confirm it).
- Under policy, inbound delivery additionally requires a `*:history` scope that Socket Mode itself does not need, so a token with read-but-not-history scopes silently drops every inbound message. Conservative and fail-closed, but worth stating in A4's operator documentation.

## Fix directions (priority order)

1. **Before A4:** land A3 first, or gate activation on the attachment path being enforced; and lift M1's ordering constraint into the public PR body (M1, L8).
2. **Before A4:** decide M3 — a short-TTL admission cache with a stated staleness bound, or a documented call-amplification budget.
3. **In this PR or A3:** adopt the fork's `dmsDisabled` semantics under policy, or derive `howChannelsRegister()` from the effective listing types (L4) — this is a two-line fix for a wrong agent-facing string.
4. **In this PR:** decide M2 explicitly — restrict `findUsers`, or document the user directory as outside the policy's scope in both the policy doc comment and the PR body.
5. **In A4:** supply the policy via a constructor option, not post-construction assignment (L5); mock `console.error` in the new tests to drop 55 stderr lines.
6. **Cosmetic:** soften the PR body's "Make A1's ID-list predicate independently hole-safe" to reflect that it is behaviour-neutral (L6); add a comment at `deleteFile`'s gate recording its reliance on caller-supplied `(channelId, fileId)` pairing (L7).
7. **Handoff:** the maintainer must apply the `no-changelog` label or CI's `changelog` check fails.
