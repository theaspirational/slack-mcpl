# Review — TASK-T71QC @ `9592c649e55ba22f08d30765613be653b57fa206`

One commit on `f6e62835` (PR #56), stacked on #55 over upstream main `7274283f`.
Diff: `src/access-policy.ts`, `src/server.ts`, `src/slack-adapter.ts`,
`test/accessPolicy.test.ts`, `test/groupDmAccess.test.ts`,
`changelog.d/named-group-dm-policy.added.md`.

# Verdict

**Approve — no blocking findings.** The acceptance criteria hold on the real
production paths: named `G…` group DMs are admitted only by exact ID, with fresh
`conversations.info` membership, `mpim:*` scopes checked before any effect, at
most one lookup on refusal, independently of `readJoinedChannels`, and writes
additionally need the exact `writeChannels` pin. Legacy and policy-without-
`groupDms` behaviour is byte-identical to the base in my own A/B. Dormancy holds:
no assignment to `SlackAdapter.accessPolicy` exists anywhere in `src/`.

Two MEDIUM follow-ups, neither a defect in shipped behaviour: one test cannot
distinguish the policy-level write pin from the pre-existing send-list guard, and
the `is_member` signal the group guard relies on is unverified for mpim
conversations against a live workspace.

# Findings

## MEDIUM — test — `src/access-policy.ts:111`

The group-DM write-pin check is **not independently covered**. I mutated
`requireWritable` to exempt `group_dm` from the `writeChannels` pin
(`kind !== 'dm' && kind !== 'group_dm' && !this.writeChannels.has(channelId)`)
and the **entire 694-test suite still passed** (`mutate2.py`, evidence
`mutations.json`, probe `M6`). The row meant to cover this
(`test/groupDmAccess.test.ts:80`, `{ config: config({ writeChannels: [] }) }`)
rejects — but through `requireWritableConversation`'s trailing
`assertWritable` → `canWrite` → `mayWrite` (`src/slack-adapter.ts:1140,1146`;
`src/access-policy.ts:71`), i.e. the layer whose own doc comment says
"A synchronous configuration hint, never an authorization decision."

Failure scenario: a later change narrows or removes `mayWrite`'s role (it is
documented as a hint, so this is a plausible refactor), the policy-level pin is
then the only guard for group-DM writes, and no test fails if that pin is dropped.

Fix direction: add a direct unit row that bypasses the adapter, e.g. with
`writeChannels: []` assert
`policy.requireWritable('G1', group(), scopes, 'chat:write')` throws
`/not allowed by the Slack access policy/`, so the two guards are provably
independent — the same shape the existing "independently necessary" row at
`test/groupDmAccess.test.ts:42` uses for the read guards.

## MEDIUM — correctness (unverified, fail-closed) — `src/access-policy.ts:87`

Group-DM admission requires `conversation.is_member === true` from
`conversations.info`. This repo's own mpim handling assumes mpim entries may not
carry that field: `src/slack-adapter.ts:1028` deliberately excludes `is_im`/
`is_mpim` entries from the `is_member === false` prefilter, and
`src/slack-adapter.ts:1120` hard-codes `isMember: true` for mpims instead of
reading `conv.is_member` (contrast `:1130` for channels, `!!conv.is_member`).

Failure scenario: if Slack's `conversations.info` omits `is_member` for an MPIM,
then once the activation PR lands, **every** named group DM is refused with
"missing or unsupported membership metadata" — the feature is a silent no-op for
operators who configured it. I reproduced exactly that refusal shape for the
`is_member`-absent case across all ten channelId-taking tools
(`probe3.out`, rows `named-but-member-missing`). This is fail-closed, so it is
not a security hole, and it is not provable here: no live workspace, and the
implementer states the same ("Not exercised against a live Slack workspace").

Fix direction: confirm the mpim `conversations.info` shape against a live
workspace before activation and record it; if `is_member` is absent there, decide
the membership signal in the activation PR (e.g. `conversations.members`, or
listing-implied membership combined with the exact-ID pin) rather than discovering
it after the setting ships.

## LOW — test — `src/access-policy.ts:87`

`GROUP_DM_ID.test(channelId)` in the guard is unreachable-redundant: removing it
also survived the full 694-test suite (probe `M8`), because
`parseAccessPolicy` already restricts every `groupDms` entry to `^G[A-Z0-9]+$`
(`src/access-policy.ts:42`) and the guard requires `this.groupDms.has(channelId)`.
Worth keeping as defence in depth, but note that if the parser's pattern is ever
widened, this second check silently stops being tested as a gate.

## LOW — design — `src/access-policy.ts:42`

`groupDms` is declared optional (`groupDms?: readonly string[]`,
`src/access-policy.ts:7`) but an **explicitly present** `groupDms: undefined`
throws, because the decision uses `keys.has('groupDms')` over the `Reflect.ownKeys`
snapshot. `tsconfig.json` does not set `exactOptionalPropertyTypes`, so
`{ ...base, groupDms: maybeUndefined }` typechecks and then throws at construction.
This is deliberate (it matches how the required keys treat `undefined`) and tested
(`test/groupDmAccess.test.ts:22`), so no change is needed here — but the
activation PR must spread the key conditionally, not pass `undefined`.

## LOW — docs — PR body ("Tests")

The body states "694 pass / 0 fail" on three Node versions but not the base
comparison `CONTRIBUTING.md` asks for ("failure count identical to `main`
baseline"). I measured it: base `f6e62835` = **672 pass / 0 fail**, this commit =
**694 pass / 0 fail** (+22 new, 0 regressions). Adding that one number matches the
house convention and saves the next reviewer the trip.

## LOW — perf — `src/slack-adapter.ts:1029`

With a non-empty `groupDms`, `conversations.list` now requests the `mpim` type
(`:903`), and the listing issues one `conversations.info` per listed mpim —
including every group DM the bot is in but the operator did **not** name, each of
which is then refused and dropped. A bot in many group DMs pays N extra `info`
calls (and rate-limit exposure) per listing. The per-entry `info` is the
pre-existing policy-listing pattern, but the `mpim` type was previously never
requested under policy, so this widens the blast radius. Worth sizing before
activation.

## Noted, not a defect

- **Uploads and rollback delete into named group DMs are permitted** through the
  shared `requireWritableConversation` / `SlackAccessPolicy.requireWritable` guard
  (`src/slack-adapter.ts:1317`, `:1493`), per the manager's decision on
  `ask-21a7d3fa`. Confirmed the blast radius is exactly that guard: no
  upload/delete implementation changed, and file/attachment **reads** stay empty
  under policy (`src/slack-adapter.ts:1593`, `:1673`). `probe3.out` row
  `named-fresh upload_file` shows `eff=upload+complete`; `no-write-pin` and
  `send-list-elsewhere` show `eff=` (refused, no effect).
- **list_channels label asymmetry.** Under legacy an mpim lists as its raw Slack
  name, while `toDescriptor` (`src/channels.ts:27`) has always labelled it
  `Group DM: …`. The new `Group DM:` prefix in `list_channels`
  (`src/server.ts:823`) is policy-only, which is what byte identity requires;
  flagging the asymmetry only so the activation PR is not surprised by it.

# Answers 1–8

**1. Strict parsing.** Holds. `src/access-policy.ts:37` destructures each key
exactly once; `:40` snapshots with `Array.from`; `:43-44` freeze the copy;
`ALLOWED_KEYS` (`:27`) is `REQUIRED_KEYS ∪ {groupDms}`, so any other string **or
symbol** key is refused via the `Reflect.ownKeys` comparison at `:34-36`. The
history-membership fallback stays unsupported — it is simply an unknown key, with
no fallback capability added; `test/groupDmAccess.test.ts:26-28` refuses both
`historyMembershipFallbackChannels: ['G1']` (overlapping `groupDms: ['G1']`) and
`[]`. My own mutations confirm each limb is load-bearing: widening the ID pattern
to `CHANNEL_ID` (M11), dropping `Array.from` (M12), dropping `Object.freeze`
(M13) and allowing the fallback key (M14) were all caught.

**2. Admission, listing, history/thread, inbound, writes — named `G…` only.**
Verified on the **production path** through the real `SlackMcplServer` over MCPL,
not just unit calls: `probe3.ts` runs all ten channelId-taking tools plus inbound
delivery across 17 configurations (`probe3.out`, 207 rows).

- *Fresh membership:* `requireReadable` is only ever reached via
  `readAccessConversation` (`:1052-1059`), which calls `conversations.info` every
  time; no cached kind or label authorizes. Stale cases all refuse with `eff=`:
  `named-but-not-member`, `named-but-member-missing`, and the two
  post-admission revocations (`stale:slack-says-left`, `stale:policy-unnames`).
- *Scopes before effects:* `no-mpim-read` refuses every operation;
  `no-mpim-history` refuses only `fetch_history`/`fetch_thread` and inbound, while
  writes still pass; `no-mpim-write` refuses only writes, reads pass. Every refusal
  shows `eff=` — no Slack effect call was made.
- *At most one lookup on refusal:* every refused row shows `calls=info`, exactly
  one. With scopes unknown (`scopes: []` → `reportedScopes` yields `undefined`),
  `readAccessConversation:1055` refuses before any request at all — zero lookups
  (`test/groupDmAccess.test.ts:86-88`).
- *Independent of `readJoinedChannels`:* `joined-reads-on` (true) and the default
  fixture (false) both admit G1 identically, while `plain-channel-C1` is refused
  at `readJoinedChannels: false`. Mutation M10 (dropping the `readJoinedChannels`
  limb) is caught by the same row that M1 (removing the group branch) breaks, so
  the two guards are independently necessary for reads.
- *Writes need the exact write pin:* `no-write-pin` refuses all six write tools
  with "Writing to G1 is not allowed by the Slack access policy" and reports
  `writable: false` in `list_channels` — but see the MEDIUM above: the test cannot
  tell this guard from `mayWrite`.
- *Bypass hunt, all refused with one `info` and no effect:* unnamed `G2`
  (`unnamed-mpim`); a `D…` whose metadata claims `is_mpim: true`
  (`dm-id-in-group-path`); a named `G…` whose `info` says private channel, not
  mpim (`named-but-private-channel` — refused as "not a confirmed joined channel");
  a named `G…` also flagged `is_im: true` (`named-but-im-too`); an `info` answer
  whose `id` differs from the requested channel (`named-id-mismatch`); and the
  group list emptied (`group-list-empty`). A `C…` or `D…` **cannot** enter
  `groupDms` at all — the parser refuses it. An mpim reached through generic paths:
  I enumerated every `this.web.*` call site in `src/slack-adapter.ts` — all of
  `readHistory`/`readThread`/`fetchHistory` (`requireHistoryConversation`),
  `sendMessage`/`editMessage`/`deleteMessage`/`addReaction`/`removeAck`/
  `uploadFile`/`deleteFile` (`requireWritableConversation`),
  `getConversationMeta` and `listConversations` (`readAccessConversation`) are
  gated; `:1047` is the legacy-only branch, `sendDM` requires `is_im === true`,
  `findUsers` is `users:read` only, and `subscribe_channel`/`unsubscribe_channel`
  are local bookkeeping with no Slack read.
- *Send-list interactions:* `send-list-elsewhere` (`sendChannels: ['C1']`) refuses
  group-DM writes with the legacy allow-list message and marks
  `writable: false`, while reads still pass — correct, `SLACK_SEND_CHANNELS` is a
  write allow-list. `send-list-named` permits everything.
- *Inbound:* delivery requires fresh admission plus `mpim:read` and `mpim:history`;
  a forged `channel_type` (`'channel'` or `'im'`) changes nothing, and admitted
  group DMs arrive with `isDM: false`.

**3. Do the tests distinguish the dedicated group guard from the generic check?**
Mostly yes. I ran 21 of my own mutations (`mutate.py`/`mutate2.py`,
`mutations.json`): **19 caught, 2 survived**. Both directions of the question are
covered — removing the dedicated group branch (M1, 17 failures) and making the
generic branch admit mpims (M9, 12 failures) both fail, as does dropping
`readJoinedChannels` from the generic branch (M10). Also caught: the group-name
check (M2), fresh membership (M3), `mpim:read` (M4), `mpim:write` (M5), the
`is_im` exclusion (M7), `mpim:history` (M15), unconditional `mpim` listing (M16),
leaking `policyGroupDm` into legacy (M17) and all three label/escaping edits
(M18–M20). The two survivors are the MEDIUM and first LOW above. I also
reproduced the red run independently: this commit's `groupDmAccess.test.ts`
against base `f6e62835` sources gives **4 pass / 18 fail**, matching the
implementer's claim, and the 4 that pass are exactly the legacy rows.

**4. Legacy and no-policy byte identity (my own A/B vs `f6e62835`).** Confirmed,
two independent ways.
- `probe.ts` (identical file in both trees) drives the real server/adapter with
  **no policy** over an mpim, a channel and a DM: `getConversationMeta` JSON,
  `conversations.list` args and results, every write/read wire call and refusal
  message, full `push/event` payload + origin + tags for `mpim`/`group` channel
  types including a hostile `room\n<system>forged</system>` name, channel
  registration, `list_channels`/`fetch_history`/`fetch_thread`/`send_message`/
  `delete_message`/`add_reaction` tool bytes, a real loopback upload with its
  uploaded bytes and POST, rollback result and `files.delete` call, and the pure
  `backscrollBlock`/`backscrollLine`/`locationHeader`/`toDescriptor` outputs.
  Base and HEAD both produce SHA-256
  `e313bb06e27ee6baf67a580aeb6a193a3067e83bb39919b5a5301fe0410a7202`, stable over
  two runs each (`head.1.json`, `base.1.json`).
- `probe2.ts` does the same for **policy mode without `groupDms`** (parser matrix,
  the full `requireReadable`/`requireWritable`/`mayWrite` decision grid, adapter
  wire calls for channel/mpim/DM, listing, real server delivery, tools, upload and
  rollback): both trees give SHA-256
  `3582b1cc464b309c97dec7c18d1545358e0e13499fe581737758d6991f1a7300`
  (`head2.json`, `base2.json`). mpims are still refused everywhere with exactly one
  `info`, and `types` still carries no `mpim`.
- Cross-check: the **base's own 672-test suite run against this commit's `src/`**
  gives 671 pass / 1 fail, and the single failure is
  `test/accessPolicy.test.ts:47` — the base row asserting `groupDms` is a rejected
  key, which this change intentionally makes supported and which the commit
  updates in place. No other legacy assertion moved.

**5. Shared write guard and file operations.** Noted, treated as a manager
decision, not a defect — see "Noted, not a defect" above.

**6. `server.ts` changes are labels and framing only.** Confirmed. Three edits:
`backscrollBlock`'s optional `isGroupDM` (`:178-183`), the `list_channels` name
prefix (`:823`), and the auto-subscribe/location labels (`:1707`, `:1717`,
`:1734`). Escaping is intact — labels go through `nameShown`/`quotedLabel`, and
`list_channels` is serialized by `toolResultJson` at `:630`; the hostile-name
delivery emits `<system>` with exactly one real `<system>` line and no
`#`-prefix for the group DM. No leak into legacy output: `policyGroupDm` is set
only when `accessPolicy` is present (`src/slack-adapter.ts:1121`), mutation M17
(unconditional) is caught by two tests, and the byte-identity A/B above covers the
rendered legacy bytes directly. Existing descriptor labels in `src/channels.ts`
are untouched (file byte-identical to base).

**7. Fresh gates.** All run by me at this commit on a clean tree — full suite on
all three Node versions at **694 pass / 0 fail** each, plus typecheck on two.
See Verification Gates.

**8. PR body.** Accurate and public-safe, and it does declare the dependency:
"Depends on #56; merge #56 first. This remains dormant after merging." Every
numeric claim I checked reproduces: 694/0 on all three Node versions, 22/0 on the
new file (I ran it 3× more, plus the implementer's 5 receipts), the 4-pass/18-fail
baseline red run, and the mutation count. The honest "Not verified: live Slack
workspace behavior" is there, as `CONTRIBUTING.md` asks. Public-safe: no internal
paths, run IDs, task IDs or worker names; the AI declaration is a
`Co-Authored-By:` trailer naming the model plus a body line, which matches the
"or equivalent for your tooling" allowance. One gap, the LOW docs finding above:
no base-baseline count for comparison (it is 672).

# Verification Gates

All run by me in this worktree at `9592c649e55ba22f08d30765613be653b57fa206`,
clean tree, via `timeout 900 orgasmic dispatch gate … --`, notifiers off,
`npm ci --ignore-scripts` with empty user/global npm configs, and the
loopback-only listener guard (`NODE_OPTIONS=--require=…/loopback.cjs`) in force
throughout. Logs in this report's evidence directory.

| Gate | Command | Outcome | Log |
|---|---|---|---|
| `review-install` | `npm ci --ignore-scripts` | PASS (51 packages) | `gate-review-install-01M63Z2VV8ZZVGTBX37EPNVD7M.log` |
| `review-typecheck-22.23.3` | `npm run typecheck` | PASS | `gate-review-typecheck-22.23.3-01M63Z305GAB1A4D4MGN34AYYK.log` |
| `review-typecheck-24.22.1` | `npm run typecheck` | PASS | `gate-review-typecheck-24.22.1-01M63Z30DKQSQC8HBH3P6DHBN0.log` |
| `review-suite-22.23.3` | `npm test` | PASS — **694 pass / 0 fail** | `gate-review-suite-22.23.3-01M63Z33TB6KJGTSVFXCFJXFSA.log` |
| `review-suite-24.22.1` | `npm test` | PASS — **694 pass / 0 fail** | `gate-review-suite-24.22.1-01M63Z3N4E7CPQKWWPK2FN05FH.log` |
| `review-suite-22.12.0` | `npm test` | PASS — **694 pass / 0 fail** | `gate-review-suite-22.12.0-01M63Z492N2FYT89BQQ9NWZNWD.log` |

Reused receipt (read, not re-run): `build-24.22.1` — exit 0, `npm run build`, in
the implementer's evidence. `npm run build` was not in my named gate set; the
reusable receipt plus two fresh typechecks cover it.

Unwrapped scoped probes (no reusable receipt, artifacts in evidence):

- `mutate.py`, `mutate2.py`, `mutations.json` — 21 mutations; 19 caught, 2
  survived (M6, M8). Run on a `/tmp` copy of the tree, never on the worktree.
- `probe3.ts` → `probe3.out` — 207 production-path rows through the real MCPL
  server: 10 tools × 17 configurations, 2 post-admission revocation scenarios, and
  17 inbound-delivery cases.
- `probe.ts` → `head.1.json` / `base.1.json` — no-policy byte-identity A/B
  (`e313bb06…` both trees).
- `probe2.ts` → `head2.json` / `base2.json` — policy-without-`groupDms`
  byte-identity A/B (`3582b1cc…` both trees).
- Base `f6e62835` suite: 672 pass / 0 fail. Base tests × HEAD `src`: 671 / 1, the
  one failure being the intentionally-changed `groupDms`-is-unknown assertion.
- New test file re-run 3× on Node 22.23.3: 22 / 0 each (no flake).

Node 24.22.1 and 22.12.0 were taken from already-extracted official tarballs
under `/tmp/slack-path-rebuild.08IwV0/`; only 22.23.3 is installed system-wide.

Worktree left exactly as found: `git status --porcelain` empty, `git diff --check`
clean, HEAD unmoved at `9592c64`. All probe and mutation work happened under
`/tmp/review-t71qc/`; no tracked file was edited.

# Unmet Criteria / test gaps

No acceptance criterion is unmet. Gaps, all covered by findings above:

1. "Writes need the exact write pin" is behaviourally true but not
   *independently* tested at the policy layer (MEDIUM, M6 survives).
2. The `G…`-prefix limb of the group guard is untested because the parser makes it
   unreachable (LOW, M8 survives).
3. Group-DM admission depends on an mpim `is_member` shape no test or live run in
   this chain has observed (MEDIUM).
4. Ambient (non-mention, non-subscribed) delivery for an admitted group DM is not
   asserted anywhere; only the mention path is
   (`test/groupDmAccess.test.ts:116`, `:129`). Legacy parity makes this very
   likely correct — mpim events already had `isDM: false` — but the subscription
   semantics an operator will actually see for group DMs are unverified.
5. `backscrollBlock`'s group-DM branch is exercised only end-to-end, not in
   `test/senderFraming.test.ts`'s direct framing matrix, which covers only the
   `#`-prefixed form. Low risk: M18–M20 are all caught.

# Residual Risk

- **No live workspace.** Everything here is a stub or loopback endpoint. The mpim
  `conversations.info` shape (notably `is_member`) and real `mpim:*` scope
  behaviour are the substantive unknowns; both fail closed.
- **Activation is where this gets teeth.** The change is genuinely dormant — no
  assignment to `accessPolicy` exists in `src/`, and `src/config.ts` has no
  group-DM or mpim handling — so none of the above can reach an operator today.
  The MEDIUMs are both "resolve before the setting lands", not "fix now".
- **Listing cost** grows with the number of group DMs the bot belongs to, not the
  number named (LOW perf above).
- **`mayWrite` is load-bearing in practice** while being documented as a hint.
  That is pre-existing, but this change adds a second consumer of it.

# Fix Directions

1. Add a direct `requireWritable` unit row with `writeChannels: []` asserting the
   policy-level group-DM write-pin refusal, so M6 is caught without the adapter's
   send-list guard in the path. *(MEDIUM, small test-only change.)*
2. Before the activation PR, observe `conversations.info` for a real MPIM and
   record whether `is_member` is present; settle the membership signal there if it
   is not. *(MEDIUM, no change needed in this PR.)*
3. Add the base-baseline count to the PR body's Tests section — "694 pass / 0 fail
   (base `f6e62835`: 672 / 0, +22 new)". *(LOW, one line.)*
4. Optional, for the activation PR: size the per-mpim `conversations.info` cost in
   listings; spread `groupDms` conditionally rather than passing `undefined`; and
   consider whether `list_channels` should label legacy group DMs consistently with
   `toDescriptor` once byte identity is no longer the binding constraint.
