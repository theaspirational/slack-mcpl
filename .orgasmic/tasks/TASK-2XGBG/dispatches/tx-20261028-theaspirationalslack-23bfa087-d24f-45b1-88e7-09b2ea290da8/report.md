# Review — TASK-2XGBG at `be7c3af18f95ae14e01dc917a145381ea5fa5896`

Scope: the single commit `be7c3af` on upstream main `ca8f6b1`, rebuilding
anima-research/slack-mcpl#12 (thread status) and answering its review.
Read-only: no edits, commits, push or GitHub comment. All mutation and probe
work was done in a sandbox copy of the tree at `/tmp/task-2xgbg-rev/probe`
(src byte-identical to HEAD, `node_modules` symlinked); the worktree is clean
(`git status --porcelain` empty).

## Verdict

**Approve with changes.** Every review point on #12 that this commit can
answer is answered, and I reproduced the four the brief named (R1-1, R1-2,
R1-4, R1-5) failing on the ported PR approach and passing here. The new
lifecycle code is sound in its core: the per-conversation chain really does
serialize, the throttle really does collapse a refresh storm to one call, and
typing cannot write anywhere a post could not.

Three things should be fixed before this is pushed, all in the peer-teardown
path and none of them required by any review point:

* two of them are one line of `src/server.ts` (the `finally` block), and
  removing that line's two changes leaves all 23 new tests green;
* one is a one-line hardening in `callStatus` against a rejection that is not
  an `Error`, which today exits the process.

No HIGH findings: nothing is a security hole, an MSRV violation, data loss, or
an unmet acceptance criterion.

## Findings

### MEDIUM — bug — `src/server.ts:329-333`: a message arriving during peer teardown is acknowledged although no peer can receive it

`this.conn = null` moved from before `conn.close()` to *after*
`await this.slack.resetThreadStatuses()`. For as long as that await runs the
server still believes a peer is attached, so `setupSlackForwarding`
(`src/server.ts:1565-1570`) passes its first guard and runs
`void this.slack.acknowledge(...)` before `handleSlackMessage`'s
`isCurrent()` drops the message.

Symptom: an addressed Slack message arriving in that window gets the
`SLACK_ACK_REACTION` (":eyes:" — the README's "received") and is then dropped
with `Dropped addressed message 7.0 in C1 before delivery: its peer
disconnected`. The reaction then stays until the bot's next confirmed post in
that conversation or `ACK_TTL_MS` (10 min). The README's `SLACK_ACK_REACTION`
entry promises the opposite: the reaction "means 'received'".

Run — `evidence/probes/zz-rev.test.ts`, gate `review-probes`:

* PROBE A (status clear held open): `acks during window: ["add:C1:7.0:eyes"]`.
* PROBE B (control, nothing in flight): the same message is dropped with
  `no peer is connected` and **no** reaction is added.

Attribution — moving `this.conn = null;` back above `conn.close()` makes PROBE
A report `[]`, and `test/threadStatus.test.ts` still passes 23/23. The
reordering is not needed by anything in this change.

**Fix:** restore `this.conn = null;` as the first statement of the `finally`.

### MEDIUM — bug — `src/server.ts:332`: a reconnecting host is refused while a Slack status call is outstanding

`serveTcp` frees its single serving slot only in `serve()`'s `.finally`
(`src/tcp.ts:60-67`); a client that connects before then has its socket
destroyed with `Refused a client: one client is served at a time`. Adding
`await this.slack.resetThreadStatuses()` to `serve()`'s `finally` puts a Slack
round trip (plus whatever is already queued for that conversation) inside that
window, which previously contained no network I/O at all.

Run — PROBE C in `evidence/probes/zz-rev.test.ts` drives the real `serveTcp`
over real loopback sockets: with the clear held open, the reconnecting client
is refused (`refused reconnect while clear hangs: true`). Replacing the
`await` with `void` makes PROBE C fail (the refusal disappears) and leaves
`test/threadStatus.test.ts` at 23/23, including `R1-5: peer close clears status
and a new peer has no pending thread` — the per-conversation queue, not the
`await`, is what orders the clear before the next peer's set.

How bad: `SLACK_CLIENT_OPTIONS` is `timeout: 10_000, retryConfig: {retries: 0}`
(`src/slack-adapter.ts:378-380`), so one call is ≤ 10 s and an in-flight
move (clear old + set new) plus the teardown clear is ≤ ~30 s. It is **not**
bounded by one timeout, though: PROBE D shows that when Slack keeps failing
transiently, every host refresh queues its own call (10 refreshes → 11 calls,
`maxInFlight: 1`) and the clear lands only behind the whole backlog. At the
host's 7 s refresh cadence against a 10 s-timing-out Slack the backlog grows
without bound, and the teardown waits for all of it.

The implementer's report does disclose "a slow Slack response can delay
reconnect"; what is not disclosed is that the host is actively **refused**
rather than queued, and that the delay is backlog-bounded rather than
timeout-bounded.

**Fix:** null `this.conn` first and either `void` the reset, or `await` it
after the connection has been disowned with a bounded wait.

### MEDIUM — bug — `src/slack-adapter.ts:1196`: `setThreadStatus` can reject, which exits the process and permanently poisons that conversation's queue

`setThreadStatus` is documented "Best effort" and every production caller
`void`s it (`src/server.ts:594`, `:1010`, `src/slack-adapter.ts:1310`), but
unlike `acknowledge` ("Best-effort: never throws") nothing guarantees the
returned promise settles fulfilled. `callStatus`'s catch does
`(err as Error).message`, which itself throws when the client rejects with a
non-object.

Consequences, all reproduced:

1. **Process exit.** `evidence/probes/crash.ts` does exactly what
   `src/server.ts:594` does (`void a.setThreadStatus('C1','1.0')`) against a
   client that rejects with `null`: `TypeError: Cannot read properties of null
   (reading 'message')`, `EXIT=1`, the following `setTimeout` never runs.
2. **Dead conversation.** The rejected turn is left in `statusQueue`, and the
   next call chains `.then` onto it, so it rejects without reaching Slack.
   PROBE F: after the first failure, two further calls (set and clear) both
   reject and `calls` stays at `['C1:1.0:is thinking…']`.
3. **Map that never shrinks.** `void turn.then(() => …delete…)` does not run
   its callback on a rejected turn, so that `statusQueue` entry is never
   removed — and is itself a second unhandled rejection (the probe run emits
   three).

Trigger probability is low: `@slack/web-api` throws `Error` subclasses, so
this needs a transport or an injected client that rejects with a non-object.
The blast radius is what makes it worth fixing.

**Fix:** `String((err as { message?: unknown })?.message ?? err)` in
`callStatus`, and give the turn a terminal `.catch` so `setThreadStatus`
cannot reject and the queue entry is always cleaned up.

### LOW — docs — `README.md:43`: the migration link points at the old method

The link text is `agents.sessions.setStatus` but the URL is
`https://docs.slack.dev/reference/methods/assistant.threads.setStatus/` — the
method being migrated *away* from. The successor page exists (HTTP 200 at
`https://docs.slack.dev/reference/methods/agents.sessions.setStatus/`). R1-8
asked for a pointer that helps whoever does the migration; this one lands on
the wrong page. The `final-prose-green` gate passes because it only checks
that the string `agents.sessions.setStatus` appears in the README.

### LOW — simplification — `src/slack-adapter.ts:1310` duplicates `src/server.ts:1010`

Both the adapter's `sendMessage` and the server's `markOutbound` clear the
status after a confirmed post. All three `slack.sendMessage` call sites
(`src/server.ts:684`, `:694`, `:1394`) and `sendDM` (`:784`) are immediately
followed by `markOutbound`, so the adapter-side clear is reachable only via
paths that already clear. Removing either one leaves `threadStatus.test.ts` at
23/23; `markOutbound`'s is the one to keep, because it also covers
`upload_file`, which does not go through `sendMessage`. (Item 8: −1 line.)

### LOW — design — `src/slack-adapter.ts:1157, 1168`: the ownership identity guards are unreachable

`this.statusOn.get(channelId) === cur` / `=== entry` can never be false:
`statusOn` is written only inside `setThreadStatus` turns, and those turns are
serialized per conversation, so nothing can mutate the entry across the
`await`. Mutation M1 (dropping the `=== entry` check on a failed set) leaves
all 23 tests green — not a test gap, just dead belt-and-braces. Worth saying in
the PR that serialization, not the identity comparison, is what closes R1-5's
race; the review asked for both and the second is now redundant.

### LOW — docs — the `op: 'stop'` clear depends on a field the protocol does not declare

`ChannelsTypingParams` in the pinned `@animalabs/mcpl-core` 0.4.0 is
`{ channelId: string }` (`dist/src/methods.d.ts:395-397`); `op` is an
undeclared extra that agent-framework happens to send. A host that sends only
`{ channelId }` never reaches `src/server.ts:591`, so its statuses are cleared
only by a confirmed post, peer disconnect, shutdown, or Slack's 2-minute
expiry. The behaviour is fine and is what the review asked for, but the README
states the stop path without the caveat.

### LOW — docs — the handshake receipt change is not mentioned in the fragment or the PR draft

A host that grants the old set now gets `mode: 'degraded'` with
`{featureSet:'slack.typing', missingCapabilities:['channels.typing'],
effect:'disabled'}` where it previously got `mode: undefined`
(`test/handshake.test.ts:64-67`). Operators who pin `enabledFeatureSets` must
add `slack.typing` to get the feature at all (`featureSetSelected`,
`mcpl-core/dist/src/capabilities.js:290-296`). The changelog says only "Hosts
without `channels.typing` keep messaging".

### LOW — test — several assertions are "nothing happened after 25 ms"

`test/threadStatus.test.ts:40-41, 61-62, 88-90, 97-98, 111-112, 132-133` assert
`h.statuses` is empty (or unchanged) after a fixed `pause()` of 25 ms. Such an
assertion cannot distinguish "correctly silent" from "merely slower than
25 ms". No flake observed — see Verification Gates — but the shape is fragile
on a slower machine.

### Informational — commit author

The commit is authored `orgasmic worker (devbox) <orgasmic@devbox>`, which is
not a deliverable address. The owner will want to set an author before pushing.
Not a defect in the change.

## Answers to the brief's eight questions

**1. Is each review point really fixed?**

I reproduced the implementer's red run myself: the three `pr-approach/` source
snapshots dropped into the sandbox give **4 pass / 19 fail** of the same 23
tests (`evidence/probes/red-repro.log`), exactly the claimed split, and the
four named points fail for the right reasons, not incidentally:

| Point | Red on the ported PR approach | Green at `be7c3af` |
|---|---|---|
| R1-1 old grant keeps messaging | `unavailableFeatures` names `slack.messaging` disabled | `slack.messaging` active; push + publish; `statuses: []` |
| R1-2 ambient/refused don't move it | `['C1:4.0:is thinking…','C1:4.0:','C1:6.0:is thinking…']` | `['C1:4.0:is thinking…']` |
| R1-4 lasting refusal suppressed | `method_deprecated` → 3 calls / 3 logs | 1 call / 1 log; `internal_error` still 3/3 |
| R1-5 race / shutdown ownership | start after `stop()` still sets; peer close clears nothing | `['C1:1.0:is thinking…','C1:1.0:']`; peer close clears before the next peer |

Against the public review text (fetched read-only from the GitHub API; PR #12
is open, head `21a7ebc`, `mergeable: false` — R1-7's conflict confirmed):

* **R1-1 / bot high / nissa-seru 1** — fixed, by the review's own second
  option (`slack.typing` with `uses: ['channels.typing']`). `FULL_GRANT` in
  `test/harness.ts:13-20` is unchanged, as the review asked.
* **R1-2 / bot high + bot "recorded before taken"** — fixed. The root is
  written in `taken()` and only `if (isAddressed)` (`src/server.ts:1807-1810`),
  retired on `op:'stop'`, confirmed post and peer change.
* **R1-3 / bot medium / nissa-seru 3** — fixed by the review's "no status for
  a top-level message" option; publish routing untouched and tested through
  `channels/publish` both ways.
* **R1-4 / nissa-seru 2** — fixed; tested through the real `SlackWebClient`
  against `test/slackApi.ts`, which is what nissa-seru asked for.
* **R1-5 / bot race + bot shutdown** — fixed: per-conversation chain, epoch for
  queued starts, `stopping` gate, peer and shutdown cleanup. (See the three
  MEDIUMs above for what the *cleanup* path newly costs.)
* **R1-6** — fixed; both named gaps (`SLACK_DISABLE_DMS`,
  `notifications/typing`) now have tests (`:163-171`, `:94-104`).
* **R1-7** — fixed; one commit directly on `ca8f6b1`, which is still upstream
  `main` as of this review (`git ls-remote --heads upstream`).
* **R1-8** — fixed in the tree: ack comment (`:1114-1116`), "The server clears
  it" (README:36), successor named (but see the LOW link defect).
* **Bot lows** — weak DM heuristic now reuses `assertNotDm` (`:1161`) and is
  tested on an uncached `C`-prefixed group DM; the changelog claim is corrected.

**Only partly answered:** R1-8's "the PR body still lists 6 new tests and
110/104 passing" and the bot's matching low. The public PR body is unchanged;
only a draft exists in the report. That is correct per the assignment ("push
and PR update are separate owner decisions"), but the point stays open in
public until the owner applies the draft.

**2. Correctness of the new lifecycle code.** Serialization is real and
effective: PROBE E shows 10 refreshes arriving faster than Slack answers
collapse to **1** call, and PROBE D shows `maxInFlight: 1`. Ownership identity
is sound (and, as noted, now redundant). The queued-start epoch is captured
synchronously at call time and bumped synchronously before the snapshot in
`resetThreadStatuses`, so there is no interleaving hole. No deadlock: the chain
is strictly FIFO per conversation and no turn ever waits on another
conversation. Maps: `statusOn`, `statusRefused` and `lastIncomingRoot` are all
bounded by conversation count and emptied on peer change; `statusQueue` is the
only one that can leak, and only via the rejection path (MEDIUM 3). Shutdown
stays inside `index.ts:70`'s hard `setTimeout(…, 5000)` cap, and statuses run
in parallel with the ack clears (`Promise.all`), so acks are not delayed. The
slow-Slack-blocks-reconnect risk the report admits is real and somewhat worse
than stated — MEDIUM 2.

**3. Security.** No path lets typing write where a post could not. The gate is
four-deep: the typing set must be active (`src/server.ts:588`), a root must
have been recorded from an *accepted, addressed* delivery, `canWrite` must pass
(`:1159`), and `assertNotDm` must pass (`:1161`) — the same
`SLACK_SEND_CHANNELS` / `SLACK_DISABLE_DMS` helpers every write uses. Probed at
the server level, not just the adapter (`evidence/probes/zz-sec.test.ts`):
SEC 1, outside the allow-list, gives `statuses: []`, `posts: 0` and the post is
refused with the standard message; SEC 2, with `SLACK_DISABLE_DMS`, sets only
on the Slack-confirmed channel; SEC 3, typing for `C1`, `D1`, `CZZZ`, `U2` and
`../../etc` — conversations the host never received a message from, in both
`slack:`-prefixed and raw form — produces zero Slack calls.

**4. Feature sets / host compatibility.** `slack.typing` as its own set is
exactly the shape R1-1 proposed. The manifest addition is spec-legal:
`channels.typing` is in mcpl-core 0.4.0's closed `CAPABILITY_PATHS` and
`channels.typing?: boolean` is a declared manifest key. Compatible with
existing hosts: a stock host that grants what the manifest advertises gets the
feature; a host that masks typing or predates it keeps all of messaging (the
whole point of R1-1) and simply gets no status; a host pinning
`enabledFeatureSets` must add `slack.typing`. The `FULL_GRANT` receipt change
is **acceptable** — it is the unavoidable price of declaring the set at all,
which the review explicitly offered as the fix, and §6.7 calls the receipt
testimony about consequences rather than a refusal. It should be mentioned in
the PR body (LOW above).

**5. Tests.** Red/green reproduced in full (4/19 vs 23/0). Four mutations of my
own against `test/threadStatus.test.ts`:

| Mutation | Caught? |
|---|---|
| M1 — drop the `=== entry` ownership check on a failed set | **no** (1 of 2 reasons it is unreachable; see LOW) |
| M2 — record the root for every accepted message, not only addressed (re-introduces R1-2) | yes, 1 fail |
| M3 — stop adding to `statusRefused` (re-introduces R1-4) | yes, 3 fails |
| M4 — gate on `grant.has('channels.typing')` instead of `isFeatureSetActive` | yes, 1 fail |

Flakiness: `test/threadStatus.test.ts` ran **13×** green — 8× idle and 5×
under 16-way CPU saturation (`nproc` 16, 16 spin loops) — 23/23 every time.
Timers are the virtual clock where it matters (`virtualClock`/`elapse` at
`:152-160`); no nested property mocks. The residual risk is the fixed-`pause`
negative assertions (LOW above), not an observed flake.

**6. Docs.** README, fragment, draft reply and PR body are accurate and
honestly scoped — I checked each claim against the code, and the "Not
verified" and "Out of scope" sections are correct, not hedged. One defect (the
mis-targeted migration link) and two omissions (the receipt change; the
`op`-is-undeclared caveat). Nothing is overclaimed; the counts are exact — I
re-measured 607 and 117, and the 584 baseline at `ca8f6b1` is in the
implementer's own clean gate logs.

**7. Suites.** Fresh, by me, at `be7c3af`: Node 22.23.3 **607 pass / 0 fail**,
Node 24.22.1 **607 pass / 0 fail** (both 0 skipped / 0 cancelled), Node 22.12.0
touched files **117 pass / 0 fail**. Matches the expected 607-vs-584 split.

**8. Size.** +100 net production lines for eight review points is proportionate
and I found nothing speculative — no new abstraction, no config surface, no
dependency. Two lines are dispensable (the duplicated post-clear, LOW) and two
conditions are unreachable (the identity guards, LOW). The three MEDIUMs above
would *remove* code rather than add it.

## Verification Gates

Run through `orgasmic dispatch gate`; logs in this evidence directory.
Environment: notifiers off, two zero-byte npm configs at
`/tmp/task-2xgbg-rev/npm-{user,global}`, `NODE_OPTIONS` loading the
loopback-only listener guard (verified: `0.0.0.0` refused, default bind
`127.0.0.1`), all suites under `timeout 900`. Node 24.22.1 and 22.12.0
tarballs re-checked against their `SHASUMS256.txt` (`OK`).

| Gate | Command after `timeout 900` | Result | Log |
|---|---|---|---|
| `review-22.23.3-suite` | `npm test` (Node 22.23.3) | 607 pass / 0 fail | `gate-review-22.23.3-suite-01M6288GPEKT8RE3RREKQXQJ3R.log` |
| `review-24.22.1-suite` | `npm test` (Node 24.22.1) | 607 pass / 0 fail | `gate-review-24.22.1-suite-01M628S36R8AGRVNV3B91NBQWK.log` |
| `review-22.12.0-floor-touched` | touched-file run (Node 22.12.0) | 117 pass / 0 fail | `gate-review-22.12.0-floor-touched-01M628RF4D7F2N77ARHPPCYN6Y.log` |
| `review-probes` | my 9 probes (A–F, SEC 1–3) | 9/9 assert as stated; exit 1 only from PROBE F's deliberate unhandled rejections | `gate-review-probes-01M628YEVAYJ232ZR7GTHW31DW.log` |

Unwrapped scoped probes (no reusable receipt): the 4/19 red reproduction
against `pr-approach/` (`probes/red-repro.log`), 13 repeat runs of
`threadStatus.test.ts` (8 idle + 5 under load), four defect mutations, two
fix-attribution mutations, two redundancy mutations, `crash.ts`, and the
read-only GitHub API reads of PR #12's diff, reviews and comments.

Receipts reused, not re-run (`clean=yes` at `be7c3af`):
`final-24.22.1-install`, `-typecheck`, `-build`, `final-changelog-regex`,
`final-release-fold`, `final-prose-green`, `final-runtime-verification`.
I re-ran `final-24.22.1-suite` and `final-floor-touched` anyway and got the
same numbers.

## Unmet criteria / test gaps

Acceptance is met: rebuilt on current upstream main (still `ca8f6b1`);
`channels.typing` optional with a red-before/green-after test I reproduced;
tests in upstream's homes with red/green and a mutation; full one-process
suite green on both Node versions; fragment and README present and
convention-conformant (`changelog.d/README.md`); text is public-safe (the
`R1-n` ids are from the public review, which invites citing them).

Gaps:

* **No test covers the peer-teardown window.** Both MEDIUM 1 and MEDIUM 2 live
  in `serve()`'s `finally`, and the two changes there can be reverted
  independently with all 23 tests still green. A test that holds a status call
  open across a disconnect would pin both.
* **No test covers `setThreadStatus` rejecting** (MEDIUM 3); the failure
  injections all reject with `Error`s.
* M1 showed the ownership identity check is untestable because it is
  unreachable — fine, but it means R1-5's "compare the object" request is
  satisfied only vacuously.
* The negative assertions behind a fixed 25 ms `pause()` (LOW).
* Not checkable here, and correctly disclaimed by the implementer: live Slack
  rendering, a real workspace's private channels/DMs, and real host end-to-end
  behaviour. I verified Slack's two doc URLs resolve but did not verify the
  2-minute expiry or the `chat:write`-in-channels claim against Slack itself —
  both rest on the public review's checks.

## Residual risk

* Cleanup stays best-effort by design: a failed clear drops ownership, so the
  status then waits for Slack's expiry. Documented.
* With a persistently transiently-failing Slack, every 7 s host refresh queues
  its own call and its own stderr line, per conversation, indefinitely — the
  behaviour R1-4 explicitly asked to keep for transient failures, but worth
  knowing as a log-volume and backlog cost (PROBE D).
* A channel-scoped typing signal still cannot name the host's actual reasoning
  target; "latest accepted addressed pending thread" is the review's own
  conservative proxy and stays ambiguous when several addressed threads are
  pending. Disclosed.
* `agents.sessions.setStatus` migration is not done, correctly out of scope.

## Fix directions

1. `src/server.ts:329-333` — make `this.conn = null;` the first statement of
   the `finally`, then `conn.close()`, then the reset. Kills MEDIUM 1 outright.
2. Same block — do not `await` the reset on the connection-teardown path (the
   per-conversation queue already orders the clear ahead of the next peer's
   set), or bound the wait. Kills MEDIUM 2. Keep the `await` in
   `SlackAdapter.stop()`, where `index.ts:70`'s 5 s timer caps it.
3. `src/slack-adapter.ts:1196` — `String((err as { message?: unknown })?.message ?? err)`,
   and add a terminal `.catch` to `turn` so `setThreadStatus` cannot reject and
   the `statusQueue` entry is always deleted. Kills MEDIUM 3.
4. `README.md:43` — point the link at
   `https://docs.slack.dev/reference/methods/agents.sessions.setStatus/`.
5. Optional, for size: drop `src/slack-adapter.ts:1310` (covered by
   `markOutbound`), and either drop or comment the two unreachable identity
   guards.
6. Optional, for the PR body: say that hosts withholding `channels.typing` now
   receive `mode: 'degraded'` naming `slack.typing`, that
   `enabledFeatureSets` pinners must add the set, and that the `op: 'stop'`
   clear rests on a field `ChannelsTypingParams` does not declare.
7. Add the two missing tests named under "Unmet criteria / test gaps"; my
   PROBE A/C and PROBE F in `evidence/probes/` can be adapted directly.
