# Review — TASK-V08EN @ `9b43671e1d4bc69710e730e5c2774502a16eb309`

Base `7274283fa719a17328ef8e085336ce25f6f22b08` (upstream main). Read-only review;
worktree left clean at the reviewed commit (`git status --porcelain` empty, 34 fragments
restored in `changelog.d/`). Probes and scratch trees live in `/tmp/rev-v08en/`.

## Verdict

**Approve with changes — no blocker.** The two capabilities the task asks for work on the
production path, byte-identity for messages without reactions holds under my own A/B
differential, the removal tool carries exactly the gates `add_reaction` carries, and the
suites are green on all three Node versions (605 against 583). Nothing here is a shipping
blocker: no unmet acceptance criterion, no data loss, no security or MSRV problem.

Four findings worth fixing before merge, all in the two places the brief flagged as
risky — the ACK interaction and the honesty of `own`. The riskiest one is real and I
reproduced it through the real server: in the window where the automatic ACK cleanup is
already running, a manual `remove_reaction` of the ACK emoji returns an **error** for an
operation that in fact succeeded.

## Findings

### MEDIUM — bug — `src/slack-adapter.ts:1439`–`1449`: manual ACK removal reports `no_reaction` for a removal that succeeded

`removeReaction` joins an in-flight automatic cleanup (`await entry.removing`) and then
issues its own `reactions.remove` unconditionally. When the automatic cleanup wins, the
reaction is already gone, Slack answers `no_reaction`, and the agent gets
`isError: true` — "No reaction was removed: this bot has no such reaction on that
message" — even though the reaction is off the message and the requested state holds.
A redundant Slack call is spent as well.

Failure scenario, reproduced on the production path (real `SlackMcplServer` +
`SlackAdapter` over JSON-RPC, stateful Slack fake that answers `no_reaction` like Slack
does — `/tmp/rev-v08en/head/test/probe2.ts`):

```
mention arrives        -> add:10.0:eyes            (ACK added)
agent calls reply_message -> post, then clearAck starts (slow remove in flight)
agent calls remove_reaction(C1, 10.0, eyes)
  slack log:   add:10.0:eyes post remove:10.0:eyes remove:10.0:eyes
  result:      isError=true
  text:        "An API error occurred: no_reaction … No reaction was removed:
                this bot has no such reaction on that message."
  reactions still on message: (none)
```

Control (no cleanup running) is correct: `isError=false`, `Reaction removed`, and the
later reply issues no stray removal — log `add:11.0:eyes remove:11.0:eyes post`. So the
retire-the-pending-ACK half of the design works; it is only the join path that misreports.

The window is the whole duration of the automatic removal (up to the 10 s client
timeout), and it opens on *every* bot reply in the conversation — precisely the
"reply, then tidy up my ACK" sequence this code was written for. Note the asymmetry:
`src/server.ts:781`–`786` deliberately maps `already_reacted` on `add_reaction` to a
success-shaped "Nothing changed"; removal has no counterpart.

**Fix direction:** after `await entry.removing`, re-read the map. If the entry is gone,
the joined cleanup removed it — return success (or a "Nothing changed: …" string, the way
`add_reaction` does) instead of issuing a second call. Equivalently, when `entry` existed
and Slack answers `no_reaction`, report it as nothing-to-do rather than an error.

### MEDIUM — correctness — `src/slack-adapter.ts:1555`: `own: false` conflates "not the bot's" with "Slack didn't tell us"

`own: this.botUserId !== null && (r.users ?? []).includes(this.botUserId)`. Slack's
`conversations.history` sends a *truncated* `users` list, so for any reaction with more
reactors than Slack lists, the bot's own reaction reads `own: false`. The information
needed to tell the two apart — `users.length < count` — is right there in the same object
and is discarded.

This is exactly the shape the project's own test fixture produces and asserts:
`test/reactions.test.ts:26` builds `{ name: 'emoji_0', count: 3, users: ['U2'] }` and
`:35` asserts `own: false`. `count` is 3 and one user is listed, so own-ness is genuinely
unknown there; the test locks in the wrong answer as the expected one. My A/B output shows
the same (`{"name":"e_1","count":2,"own":false}` from a one-element `users`).

Impact is bounded — an agent that trusts `own: false` will either add a duplicate (benign,
`already_reacted` → "Nothing changed") or try to remove and get `no_reaction` — but the
task's wanted #1 is specifically "which of them are the agent's own", and in a busy
channel using reactions as a status convention this answers it wrongly rather than
uncertainly.

**Fix direction:** emit `own: true` only when found; when the bot is absent *and*
`(r.users ?? []).length < r.count`, say so (omit `own`, or add `ownUnknown: true`) rather
than asserting `false`. Then fix the fixture at `test/reactions.test.ts:26`/`:35` to use a
non-truncated list for the negative case.

### MEDIUM — test — the ACK coordination the PR advertises is largely unexercised

I ran 10 mutations of my own against the new file; 7 were killed, and all 3 survivors are
in the ACK coordination logic the PR body calls out by name. Each survivor keeps the
**whole 605-test suite green** (verified separately against `test/*.test.ts`):

| Mutation | `test/reactions.test.ts` | full suite |
| --- | --- | --- |
| drop `if (entry?.removing) await entry.removing;` (`:1439`) | SURVIVED | SURVIVED (605 pass) |
| drop `clearTimeout(entry.timer);` (`:1452`) | SURVIVED | SURVIVED (605 pass) |
| drop the re-arm block (`:1457`–`:1459`) | SURVIVED | SURVIVED (605 pass) |
| drop the wait for a pending add (`:1441`) | KILLED | — |
| retire the ACK on any refusal, not just `no_reaction` (`:1447`) | KILLED | — |
| `reactionsOmitted` = raw length, not `length - 20` (`:1557`) | KILLED (2) | — |
| never emit `reactionsOmitted` (`history-read.ts:230`) | KILLED (2) | — |
| drop `remove_reaction` from `WRITES` (`slack-errors.ts:87`) | KILLED | — |
| drop the DM restriction (`:1435`) | KILLED | — |
| reaction metadata escapes the byte budget (`history-read.ts:229`) | KILLED (5) | — |

The existing test "manual removal waits for a pending ACK add and shares cleanup with
clearAck" only covers the direction where the *manual* removal starts first (so `clearAck`
joins it). The reverse — automatic cleanup starts first, manual removal joins — is untested,
which is why MEDIUM-1 above shipped. The timer handling (cancel, and re-arm after failure)
has no coverage at all; the one test that checks "failed manual removal retains ACK
cleanup" drives cleanup by calling `clearAck` explicitly, never through the timer.

**Fix direction:** add a test for the join-the-running-cleanup direction (it will fail
today, which is the point), and one that asserts the pending entry's timer state after a
failed manual removal — e.g. the entry is still present with a re-armed timer, and that a
successful manual removal leaves no armed timer.

### MEDIUM — docs — the new output fields and the `own` caveat exist only in the operator README

`src/tools.ts` is the agent's only view of the contract, and `fetch_history`'s description
(`src/tools.ts:175`–`181`) is otherwise meticulous about output caveats ("replies inside
threads are not returned", "zero bounded matches does not prove absence"). The new
`reactions`, `reactionsOmitted` and `own` fields are documented nowhere an agent reads:
not the 20 cap, not that `own: false` may be a truncation artefact, not that `count` is
Slack's count rather than the length of `users`. All of that is in `README.md:88`–`94`,
which the agent never sees.

Smaller, same file: `remove_reaction`'s `messageId` description is copied verbatim from
`add_reaction` and still reads "Message ID (ts) **to react to**" (`src/tools.ts:113`).
`test/reactions.test.ts:75` asserts `deepEqual(remove.inputSchema, add.inputSchema)`, so
fixing that wording for removal now requires touching the test too.

**Fix direction:** extend the two read tools' descriptions with one sentence on the
reaction fields and the `own` caveat; relax the schema-equality assertion to compare
`required` and property *names* so the two descriptions can diverge.

### LOW — robustness — `src/slack-adapter.ts:1552`–`1553`: unvalidated Slack shape fails the whole read

`msg.reactions?.length ? msg.reactions.slice(0, 20).map(...)` trusts the declared type. A
`reactions` value that is not an array but has a truthy `length` throws a raw `TypeError`
out of `shapeHistory`, and because `scanned === 0` `readBounded` rethrows it, so the entire
`fetch_history` / `fetch_thread` call fails with a non-actionable message
(`/tmp/rev-v08en/head/test/probe3.ts`):

```
FAIL reactions is a string:              TypeError: msg.reactions.slice(...).map is not a function
FAIL reactions is an object with length: TypeError: msg.reactions.slice is not a function
OK   count is a string:                  [{"name":"eyes","count":"7","own":false}]
OK   count is Infinity:                  [{"name":"eyes","count":null,"own":false}]
OK   users is not an array:              [{"name":"eyes","count":1,"own":true}]   <- substring match
OK   name is an object:                  [{"name":{"a":1},"count":1,"own":false}]
```

This is out of step with how the surrounding code treats Slack's answers: `messageTs`
validates `ts` and refuses with guidance, `reply_count` is gated on
`Number.isSafeInteger` (`:1563`), `files ?? []`, and `readBounded:316` turns a non-array
`page.messages` into "Slack's answer for a page of messages held no list of them". The
`users: 'UBOT'` row is worth noting on its own: with a string `users`, `.includes()`
becomes a substring test, so `own` can read `true` on a substring hit.

**Fix direction:** `Array.isArray(msg.reactions)` before the slice, skip non-object
entries, require `typeof r.name === 'string'` and `Number.isSafeInteger(r.count)` (omit
`count` otherwise, as `replyCount` does), and `Array.isArray(r.users)` before `includes`.

### LOW — design — `src/slack-adapter.ts:1455`–`1459`: the manual path re-arms cleanup outside the automatic path's rules

The `.finally` re-arms `ACK_RETRY_MS` after any failed manual removal, without
`entry.tries++` and without the `refusedForGood(err) || this.stopping || tries >=
ACK_MAX_TRIES` drop rule `removeAck:1196` applies. Two consequences, both measured
(`/tmp/rev-v08en/head/test/probe.ts`):

- P5: a manual removal refused for good (`message_not_found`) leaves the entry in the map
  with `tries: 0` and a 60 s timer, where the automatic path drops it at once (`state after
  same refusal: empty`). Costs one extra `reactions.remove` 60 s later; self-healing after
  that.
- P7: 12 failing manual removals produced 12 Slack calls with `tries` still 0, and each one
  replaced the entry's `ACK_TTL_MS` (10 min) deadline with a fresh 60 s timer — so an agent
  repeating a failing removal keeps the pending-ACK entry and its timer alive indefinitely
  past the TTL. One entry per message, agent-driven, so the blast radius is small.

**Fix direction:** route the manual failure through the same decision as `removeAck` —
increment `tries`, and drop rather than re-arm on `refusedForGood` / `stopping` /
`tries >= ACK_MAX_TRIES`.

## Answers 1–7

**1. Byte-identity — confirmed by my own A/B differential.** I extracted base and head to
`/tmp/rev-v08en/{base,head}` and ran one identical driver (`/tmp/rev-v08en/ab.ts`) in both:
a 10-message corpus with no reactions anywhere (bot and user authors, thread parent and
replies, mentions, a file, empty text, a 500-char body, a `root` field, a bogus
`reply_count`, unicode/quotes/newlines) × 10 `fetch_history`/`fetch_thread` argument sets
(default, `limit`, `maxBytes` 2048/4096, `textContains`, `authorIds`, thread by parent and
by non-parent), each followed one page further by its `nextCursor`. The entire plain
section is **byte-identical** between base and head. Only the `withR` (reactions present)
`fetch_history`/`fetch_thread` sections differ — 2 changed lines, as intended.

I also drove live delivery (Socket Mode mention → `channels/incoming` + first-interaction
backscroll) in both trees, with *and* without reactions on every message: all four
delivery outputs are identical. `backscrollLine` (`src/server.ts:162`) ignores the new
field, so the claim "live incoming messages and first-interaction backscroll stay
unchanged" holds even though `shapeHistory` now populates `reactions` for the backscroll
path too.

**2. Rendering bounds.** The 20 cap and `reactionsOmitted` are correct — 31 reactions
render 20 entries and `reactionsOmitted: 11`. Byte accounting is genuine, not asserted:
`historyRecord` (`src/history-read.ts:229`–`230`) emits the fields inside the record whose
`Buffer.byteLength` `readBounded:359` charges against `maxBytes`, and my mutation that
padded reaction metadata past the budget killed 5 tests. Measured on a 20-messages ×
20-reactions corpus: `maxBytes: 2048` → 1,422 bytes returned, 2 messages, `byte_limit`,
cursor given, next page advances; `maxBytes: 4096` → 3,985 bytes, 5 messages; pagination
reaches `exhausted`. No over-budget result and no stall.

Blowing the budget: the cap bounds the *number* of reactions, not their bytes, and Slack's
`users` arrays are not forwarded, so a worst case at realistic emoji-name lengths (~100
chars) is ~2.6 KB per message — under the 65,536 default, though it can exceed the 2,048
`maxBytes` minimum. I forced the pathological case (20 × 4,000-char names = 80,790 bytes):
the read refuses cleanly with the pre-existing actionable guidance ("call again with
maxBytes of at least 80,790; to read past it, … latest set to 1.0"), which is well inside
the 1,048,576 `maxBytes` ceiling. So no unreadable message and no broken pagination — see
Residual Risk.

`own` correctness and honesty: the README wording (`README.md:90`–`91`) is honest —
"`count` is Slack's count, not the length of its potentially partial user list; `own` says
whether that list includes this bot's user ID" — and the PR body's "Not verified" repeats
it. But the *value* asserts `false` where the truth is unknown, and the caveat never
reaches the agent. See MEDIUM-2 and MEDIUM-4.

**3. `remove_reaction` gates — same as `add_reaction`, verified.** Feature set
(`src/feature-sets.ts:109` → `MESSAGING_FEATURE_SET`), tool class
(`src/tool-classes.ts:42` → `['comms']`), send-list (`assertWritable`,
`src/slack-adapter.ts:1434`) and DM restriction (`assertNotDm`, `:1435`) — identical calls
in identical order to `addReaction` (`:1426`–`:1427`), and `remove_reaction` is in `WRITES`
and `NOT_DONE` in `src/slack-errors.ts:67`/`:87`. Refusal order is right: `assertWritable`
is synchronous and runs before any Slack call (the send-list test asserts `calls === []`),
and the feature-set denial refuses before the adapter is reached. Dropping either gate was
caught by my mutations. `assertNotDm` makes a `conversations.info` call, exactly as
`add_reaction` does.

Error mappings: I drove 19 Slack refusals through the real server (`probe4.ts`). All the
mapped codes lead with "No reaction was removed", `no_reaction` gets the fixed
"Only this bot's own reactions can be removed" text, `internal_error`/`fatal_error` get the
removal-specific unknown-outcome text, and the inner-colon `invalid_name` branch correctly
says "can't be **removed** here". No add-reaction wording leaks into any removal message.
Codes that only apply to adding (`already_reacted`, `too_many_reactions`) fall through to
the bare Slack error, which is right.

**4. ACK interaction — one real defect, otherwise sound.** Eight concurrency probes
(`/tmp/rev-v08en/head/test/probe.ts`) plus two production-path probes:

- *No deadlock or unbounded hang.* `removeReaction` waits on `entry.added` and possibly on
  a prior `entry.removing`; both are bounded by the 10 s client timeout, and because
  `acknowledge` is started outside call time there is no rate-limit sleep to extend them.
  Worst case the subsequent `reactions.remove` misses the 25 s call deadline and
  `assertRequestFits` refuses it without sending — degraded, not hung. P4 (`stop()` while a
  manual removal waits on a pending add) settled within a 3 s race guard.
- *No leaked cleanup state in the normal paths.* `ackPending` was empty after every probe
  that completes (P1, P3, P4, P6, P8). Exceptions are the two deliberate retain-on-failure
  cases in LOW-6.
- *Single removal when the manual call starts first* (P1): `clearAck('C1')` and
  `clearAck('C1','1.0')` racing a manual removal yield exactly one `reactions.remove` —
  the reservation through `entry.removing` works in that direction.
- *Double removal when the automatic cleanup starts first* (P2, and the production probe):
  two `reactions.remove` calls, the second answered `no_reaction` and surfaced as an error.
  This is MEDIUM-1.
- *Two concurrent manual removals* (P3): both resolve, two calls, `ackPending` empty. In
  production the loser gets `no_reaction` — the same misreport as MEDIUM-1.
- *Add that did not land* (P8): `added` resolves `false`, `acknowledge`'s `dropAck` wins,
  the manual call issues one removal, gets `no_reaction` (correct — nothing was there), and
  no state is left behind.
- *Successful manual removal retires the pending ACK* (production control): a later reply
  issues no stray removal — `add:11.0:eyes remove:11.0:eyes post`.

**5. Tests are real.** Red/green and mutation evidence checks out and I extended it: 10 of
my own mutations, 7 killed, 3 survivors all in ACK coordination (MEDIUM-3 table). The
byte-identity tests use a literal expected JSON string rather than a self-comparison, which
is the strong form. Mock hygiene in the one-process suite is clean: no `globalThis`,
`process.env`, `mock.*`, `fetch`, `Date.now` or `setTimeout` patching in
`test/reactions.test.ts`; every host gets `t.after(() => h.close())`; the adapter-only
fixtures end by draining `clearAck`, and `armAck` unrefs its timers. Order-independence
checked both ways in one process — `reactions.test.ts` first: 605/605; last: 605/605.

**6. Gates.** All green; see the table below. 605 pass / 0 fail on Node 22.23.3, 24.22.1
and 22.12.0 against 583 pass / 0 fail on the base (I re-ran the base myself: 583/583).
Typecheck and build pass on both versions.

**7. Docs, changelog, PR body.** Accurate and public-safe; no credentials, internal
hostnames, run IDs or orgasmic paths anywhere in `README.md`, the fragment, the commit
message or `pr-body.md`. CONTRIBUTING conformance: `feat:` conventional title ✓;
`Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer naming the model ✓; the
"🤖 Generated with [Codex]" footer as the sanctioned "or equivalent for your tooling" ✓;
Problem / Changes / Tests / Not verified / Out of scope / Companion PRs body shape ✓;
numeric baseline stated as "605 pass / 0 fail … failure count identical to the baseline" ✓;
fragment `changelog.d/slack-reactions.added.md` with a recognized `.added.md` suffix, flat
in the directory, bullets with two-space continuations and no headings ✓, and it correctly
treats tool output and a new tool as changelog-worthy. The fragment folds into
`CHANGELOG.md` cleanly (reused receipt, scratch-only).

Doc accuracy: the README's ACK paragraph ("Removing the configured ACK emoji waits for a
pending ACK add; success or `no_reaction` retires that message's pending cleanup. Other
emojis and other messages' ACKs are unchanged") matches the code and the tests. "Like
additions, removals are not undone by rollback" is accurate — nothing in the rollback path
records reactions, for add or remove.

Slack links: the four `docs.slack.dev` URLs are the first of their kind in this repo (the
only pre-existing Slack link is `https://api.slack.com/apps`), so there is no in-repo
precedent to compare against, and **I could not check them without network**. They are
well-formed canonical Slack method-reference paths. What I *can* confirm in-repo is the
load-bearing half of the scope claim: `README.md:205` shows the manifest already granting
`reactions:write`, which is the scope `reactions.remove` needs, and the implementation adds
no new Slack call — my rendering test asserts `h.reads` holds exactly one read and
`h.reactions` is empty. The unverifiable half is "no `reactions:read` is needed for
`conversations.history` to carry `reactions`"; see Residual Risk.

## Verification Gates

Run by me, wrapped, in the assigned worktree at `9b43671e1d4bc69710e730e5c2774502a16eb309`:

| Gate | Command (after `timeout 900`) | Outcome | Log |
| --- | --- | --- | --- |
| `rev-full-22.23.3` | `npm test` (Node 22.23.3) | exit 0 — 605 pass / 0 fail | `gate-rev-full-22.23.3-01M63JARR2S2WZFB0GE9TR0XVD.log` |
| `rev-full-24.22.1` | `npm test` (Node 24.22.1) | exit 0 — 605 pass / 0 fail | `gate-rev-full-24.22.1-01M63JCX3S47RM4KXMSZ80QB4J.log` |
| `rev-typecheck-22.23.3` | `npm run typecheck` | exit 0 | `gate-rev-typecheck-22.23.3-01M63JDC48PBPXRZ8SMS41XNFD.log` |
| `rev-build-22.23.3` | `npm run build` | exit 0 | `gate-rev-build-22.23.3-01M63JDCCGZ7WXZYJKPNJCW5WC.log` |

Reused receipts from the implementer's run (clean tree, same commit, exit 0; re-read, not
re-run): `full-22.12.0` (605/0), `typecheck-24.22.1`, `build-24.22.1`, `changelog`,
`diff-check`, `final-state`, `reactions-repeat-5` (22/0). All six gates the brief names are
therefore covered — fresh on 22.23.3 and 24.22.1, reused on 22.12.0.

Unwrapped probes (evidence, not reusable receipts), all in `/tmp/rev-v08en/`:

| Probe | What it showed |
| --- | --- |
| `ab.ts` in `base/` and `head/` → `ab-base.txt` / `ab-head.txt` / `ab.diff` | plain section byte-identical; all 4 delivery sections identical; only `withR` read output differs |
| base suite, scratch copy of `HEAD^` | 583 pass / 0 fail — grounds the 605-against-583 claim |
| `head/test/probe.ts` (P1–P8) | ACK concurrency: 7 pass; P2 exposed the third `reactions.remove` |
| `head/test/probe2.ts` | production-path JSON-RPC reproduction of MEDIUM-1 + passing control |
| `head/test/probe3.ts` | Slack-shape robustness of the new field (LOW-5) |
| `head/test/probe4.ts`, `probe4b.ts` | 19 Slack refusals + inner-colon `invalid_name` through the real server |
| `mutate.mjs` + full-suite survivor rerun | 10 mutations: 7 killed, 3 survived both the new file and the 605-test suite |
| `reactions.test.ts` first / last in one process | 605/605 both orders — no cross-file mock bleed |

## Unmet Criteria / test gaps

No acceptance criterion is unmet. Task acceptance, item by item: reactions appear in
history and thread output ✓; removing an own reaction succeeds ✓; removing one that is not
the bot's own or is missing fails with a clear fixed message ✓ (`no_reaction` text,
verified through the server); the access policy blocks read and removal where it should ✓
(feature-set, send-list and DM tests, each mutation-killed); no change to existing output
for messages without reactions ✓ (my A/B differential, not just the implementer's).

Test gaps:

1. The join-the-running-cleanup direction of the ACK coordination, the `clearTimeout`, and
   the re-arm are all mutation-survivable against the full suite (MEDIUM-3).
2. `own` has no test for a reaction whose `users` list is truncated *and* contains the bot
   — the case Slack actually produces in a busy channel. The nearest fixture
   (`test/reactions.test.ts:26`) asserts the conflated answer.
3. No test for a malformed `reactions` value (LOW-5).
4. No test drives the ACK retry through its timer; the failure-retains-cleanup test calls
   `clearAck` directly.

## Residual Risk

- **No live Slack workspace and no network.** Everything behavioral here was proven against
  fakes plus the real server/adapter. The implementer disclosed the same.
- **The `reactions:read` claim is unverifiable offline.** I confirmed `reactions:write` is
  in the manifest (`README.md:205`) and that no new API call is made, but not that
  `conversations.history` carries `reactions` without `reactions:read`. The failure mode is
  benign and silent rather than breaking: if Slack omits the field, `msg.reactions?.length`
  is falsy and the new keys simply never appear — no error, no output change. Worth one
  live check before rollout, since a silently inert feature is the quiet failure.
- **Reaction bytes are bounded by count, not by size.** 20 entries at realistic emoji-name
  lengths is ~2.6 KB, comfortably inside the 65,536 default, but it can exceed the 2,048
  `maxBytes` floor, and the pathological case I forced (80 KB) makes a message unreadable
  until the caller raises `maxBytes`. The refusal is actionable and the ceiling is 1 MiB, so
  this is a usability edge, not a trap.
- **The pre-existing ACK timeout limitation is unchanged**, as the PR body says: an add
  whose request times out can still reach Slack after a removal. The new tool inherits it.
- **Companion-PR independence (#55/#56) could not be checked** — no network. `src/server.ts`
  and `src/slack-adapter.ts` are the declared overlap; the declaration is in the body with
  merge-order guidance, which is what CONTRIBUTING asks for.
- Unrelated to this diff, and flagged only because I tripped over it: `npm run version`'s
  `scripts/release-changelog.mjs` performs a real release on *any* invocation, including
  with a stray argument — it consumed `changelog.d/` in my worktree before I restored from
  git. Pre-existing on main and out of scope here.

## Fix Directions

In priority order:

1. `src/slack-adapter.ts:1439` — after joining `entry.removing`, if the entry is gone from
   `ackPending`, return success rather than issuing a second `reactions.remove`; or map
   `no_reaction` to a nothing-changed result when an entry existed, mirroring
   `add_reaction`'s `already_reacted` handling at `src/server.ts:781`. Add the
   automatic-cleanup-first test that fails today.
2. `src/slack-adapter.ts:1555` — stop asserting `own: false` when `(r.users ?? []).length <
   r.count`; omit `own` or mark it unknown. Fix `test/reactions.test.ts:26`/`:35` to use a
   complete `users` list for the negative case and add a truncated-list case.
3. `src/tools.ts:175` and `:198` — one sentence each on `reactions`, `reactionsOmitted`, the
   20 cap and the `own` caveat, so the agent reads what `README.md:88`–`94` tells the
   operator. Relax `test/reactions.test.ts:75` from full `deepEqual` of the input schemas to
   `required` plus property names, then fix `remove_reaction`'s `messageId` wording
   (`src/tools.ts:113`).
4. `src/slack-adapter.ts:1552` — `Array.isArray` guards on `msg.reactions` and `r.users`,
   and a `Number.isSafeInteger` guard on `r.count` matching `replyCount` at `:1563`.
5. `src/slack-adapter.ts:1455` — route a failed manual removal through `removeAck`'s drop
   rules (`tries++`, `refusedForGood` / `stopping` / `ACK_MAX_TRIES`) instead of an
   unconditional 60 s re-arm, and add a timer-state assertion for it.
