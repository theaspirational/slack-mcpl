# Re-review — TASK-2XGBG at `17275b846dfb4ce7abec93d9c17514de026d03e0`

Scope: the single commit `17275b8` on upstream main `ca8f6b1`, replacing
`be7c3af1`, which my previous review (dispatch
`tx-20261028-theaspirationalslack-23bfa087-…`) rated "approve with changes"
with 3 MEDIUMs and several LOWs. Read-only: no edits, commits, push or GitHub
comment; the worktree is clean (`git status --porcelain --ignored` shows only
ignored `dist/` and `node_modules/`). All mutation and probe work ran in
sandbox copies under `/tmp/task-2xgbg-rev2/` (`src` byte-identical to HEAD,
`node_modules` symlinked).

**Upstream main has not moved**: `git ls-remote --heads upstream main` →
`ca8f6b1193154384e4626921255f86923fc5edf3`, checked at the start and end of
this review. `17275b8`'s only parent is that SHA, so it is still one commit
directly on current upstream main.

## Verdict

**Approve.** All three MEDIUMs are fixed, and I verified each by re-running my
own round-1 probes rather than by reading the diff: PROBE A, PROBE C and
PROBE F — which were written to *assert* the defects — now fail, and the
inverted forms (A′, C′, F′) pass; `crash.ts` exits 0 and prints "still alive".
The four actionable LOWs are also fixed (migration URL now resolves to the
successor page; the duplicated post-clear and both unreachable identity guards
are gone, and I proved the invariant they encoded still holds under
concurrency; every fixed 25 ms wait is replaced by a barrier that I showed is
*not* vacuous by mutation).

The new tests are genuinely red-before/green-after: HEAD's test tree against
`be7c3af1`'s `server.ts` + `slack-adapter.ts` gives **23 pass / 5 fail**, and
all 5 fail for the right reasons (false ack; rejected TCP reconnect;
`Cannot read properties of null (reading 'message')` → process exit;
`UnhandledPromiseRejection … "undefined"` → process exit; new peer suppressed
by the old peer's refusal). Suite counts check out, measured by me on three
Node versions. Nine mutations of my own on the new code: seven caught.

Nothing blocks the push. Three LOWs remain, two of them one line of prose; I
would fix the first before the PR text goes public, because R1-8 was itself a
complaint about inaccurate claims in the PR body.

## Findings

### LOW — docs/correctness — `src/slack-adapter.ts:1188` + `README.md:44`, `changelog.d/feat-slack-thread-status.added.md:13`: a lasting refusal can now outlive the peer change the docs promise will end it

Round 2 moved `this.statusRefused.clear()` from *after* the teardown clears to
*before* them, and added an epoch guard to refusal recording
(`src/slack-adapter.ts:1203`). Together those change what happens when a set
succeeded and the teardown clear is then definitively refused: the clear's
failure is recorded under the **new** epoch, so the next peer is suppressed in
that conversation for its whole session.

README:44 and the fragment's last line both say "lasting API refusals …
until the peer changes" / "suppress further attempts until the peer changes".
In this interleaving the peer has changed and status stays off.

Run — `evidence/probes/zz-r2.test.ts`, gate `review2-probes`:

* **P2** (clear refused at teardown): calls are
  `['C1:1.0:is thinking…','C1:1.0:']` and `statusRefused` still holds `C1`
  *after* `resetThreadStatuses()` returned — the new peer's set makes no Slack
  call at all.
* **P7** (the realistic shape: one `no_permission` that refuses both the set
  and the clear, released after the peer retires): same result —
  `statusRefused: ["C1"]`, the new peer gets no attempt.
* Attribution: mutation **M7** (restore round 1's `statusRefused.clear()`
  position) makes P2 report `['C1:1.0:is thinking…','C1:1.0:','C1:2.0:is
  thinking…']` and `refusedAfterReset: false` — the new peer is served. M7
  leaves `test/threadStatus.test.ts` at **28/28**, so no test pins the
  reorder (gate `review2-mutations`).

A second, smaller effect of the same pair: because the epoch guard suppresses
recording the old in-flight set's definitive refusal, that turn now takes the
`else entry.at = -Infinity` branch and **retains** ownership of a status Slack
never set, so the teardown issues a clear for it — exactly the "pointless stop
call" that `test/threadStatus.test.ts:229` exists to prevent, and the call
whose failure re-arms the suppression.

How bad: cosmetic only, and in the common codes it is arguably the right
outcome — `not_in_channel`, `is_archived` and `channel_not_found` mean the bot
really cannot write there any more, and the codes that would be wrong
(`method_deprecated`, `method_not_supported_for_channel_type`) refuse the set
too, so `statusOn` is dropped and no clear is issued. Round 2's ordering is
also a net improvement over round 1's: with the reset no longer awaited,
clearing refusals *last* would leave the new peer suppressed by the **old**
peer's refusals for an unbounded window, which is both likelier and worse.

**Fix:** either (a) don't let a clear (`status === ''`) record into
`statusRefused` — `statusRefused` exists to stop pointless *sets*, and the
clear is issued once and dropped either way; or (b) soften the two prose lines
to say a refusal that recurs on the teardown clear carries into the next peer.
Either way, extend `test/threadStatus.test.ts:386` ("a late old-peer refusal
cannot disable the new peer status") so the injected refusal applies to the
clear as well — as written, its fake only throws when `status` is truthy,
which is why the gap is invisible.

### LOW — test — `src/slack-adapter.ts:1200`: the non-`Error` hardening in `callStatus` has a real effect but no test pins it

`err instanceof Error ? err.message : err` replaced `(err as Error).message`.
It matters: without it a non-`Error` rejection makes `callStatus` throw, the
turn aborts into the new terminal `.catch`, and `entry.at` keeps `clock.now()`
instead of `-Infinity` — so the 60-second refresh throttle swallows the host's
next refresh for a minute, and in the move branch `statusOn.delete` and the new
set never run.

Run — mutation **M9** (revert only that line) leaves
`test/threadStatus.test.ts` at **28/28** (gate `review2-mutations`), because
the terminal `.catch` absorbs the `TypeError` and the R2-M3 'Slack rejection'
variant's assertions (queue size, later set reached Slack, maps empty) cannot
tell the two apart. My **P1** does distinguish: green it reports
`['C1:1.0:is thinking…','C1:1.0:is thinking…']` (retry allowed), under M9
`['C1:1.0:is thinking…']` (retry lost).

**Fix:** add P1 verbatim — four lines against the existing `adapter()` helper.

### LOW — docs — the draft reviewer reply undercounts the new tests and calls a committed test a mutation

The draft reply says "The four new regression cases fail on be7c3af and pass
after the fixes. An old-peer-refusal mutation also fails." **Five** committed
test cases are red on `be7c3af1` (gate `review2-red-on-be7c3af1`): the four
`R2-M*` cases plus `a late old-peer refusal cannot disable the new peer
status`, which is a test in `test/threadStatus.test.ts:386`, not a mutation.
The separate mutation (removing the epoch guard) is a different artefact. The
implementer's own red log measured only 4 of the 5.

This matters because R1-8 was itself a complaint that the PR body's test
claims were wrong; a second inaccurate count in the reply invites the same
point again. The PR body proper carries no number and is accurate.

**Fix:** "five new regression cases fail on `be7c3af1`", and describe the
epoch-guard mutation separately.

### Informational — not findings

* **Fragment wrapping.** Line 6 of `changelog.d/feat-slack-thread-status.added.md`
  is 34 columns against 69–80 elsewhere — a leftover from the round-2 edit. It
  violates no rule: `changelog.d/README.md` and `CONTRIBUTING.md:95-106`
  require only a flat file, a `<slug>.<category>.md` name, markdown bullets
  and two-space continuation lines, and state no width. Several existing
  fragments are worse (`feat-upload-file.added.md:10` is 25 columns;
  `fix-slack-calls-answer-at-once.changed.md` is one 1489-column line). The
  release fold (`final-release-fold`) reproduces the bullet verbatim.
* **Commit author** is still `orgasmic worker (devbox) <orgasmic@devbox>`; the
  owner will want a deliverable address before pushing. The body is wrapped
  ≤72 columns and carries the requested
  `Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer.

## Answers to the brief's eight questions

### 1. Is each earlier finding really fixed? Round-1 probes re-run

Gate `review2-round1-probes-inverted` runs my probes **as written** (they
assert the defects), gate `review2-probes` runs the inverted forms.

| Probe | Round 1 | At `17275b8` |
|---|---|---|
| **A** status clear held open across disconnect | `acks during window: ["add:C1:7.0:eyes"]`, `serve()` pending | **fails now** → defect gone. `serve()` settles while the clear hangs; the message is dropped with `no peer is connected` and `h.reactions` gains nothing. **A′** asserts that and passes |
| **B** control, nothing in flight | pass | pass (unchanged) |
| **C** `serveTcp` reconnect during a held clear | `refused reconnect: true` | **fails now** → `refused reconnect: false`; logs show `Client connected` for the second socket. **C′** asserts acceptance and passes |
| **D** persistently failing Slack, no coalescing | `calls=11 maxInFlight=1`, clear behind the backlog | unchanged: `calls=11 maxInFlight=1`, clear after 443 ms |
| **E** healthy Slack collapses a refresh storm | `calls=1` | `calls=1` |
| **F** non-object rejection poisons the queue | 3 rejections, `calls` frozen at 1, 3 unhandled rejections | **fails now**; **F′**: `rejected: 0`, `calls` = `['C1:1.0:is thinking…','C1:1.0:','C1:2.0:is thinking…','C1:2.0:']`, `statusQueue.size 0`, `statusOn.size 0` |
| **crash.ts** (`void a.setThreadStatus` against a client rejecting `null`) | `TypeError … (reading 'message')`, `EXIT=1`, timer never ran | `[slack-mcpl] thread status on C1 failed: null`, `still alive`, `EXIT=0` |
| **SEC 1** outside `SLACK_SEND_CHANNELS` | `statuses: []`, `posts: 0`, post refused | same |
| **SEC 2** `SLACK_DISABLE_DMS` | sets only on the Slack-confirmed channel | same |
| **SEC 3** typing for never-seen conversations (`C1 D1 CZZZ U2 ../../etc`, prefixed and raw) | zero Slack calls | same |

Round-1 LOWs: migration URL now points at
`…/agents.sessions.setStatus/` (HTTP 200; the old target also 200, so the fix
is a real retarget, not a dead link swap). The duplicated adapter post-clear
and both identity guards are removed — see Q4. The 25 ms waits are gone — see
Q5. The `op:'stop'`, degraded-receipt and `enabledFeatureSets` omissions are
documented in both README and fragment — see Q6.

### 2. The non-awaited reset and per-peer refusal state

**Ordering is sound, in every case I can construct.** `resetThreadStatuses` is
`async`, so the `void` call at `src/server.ts:335` runs its body
*synchronously* up to the first `await`: `statusEpoch++`,
`statusRefused.clear()`, the `channels` snapshot, and — because `.map()`
evaluates `this.setThreadStatus(id, undefined)` eagerly while building the
array passed to `Promise.all` — every clear is enqueued onto its
per-conversation chain before `serve()`'s `finally` returns.

There is also no window for a new peer: between `this.conn = null` and
`void this.slack.resetThreadStatuses()` the only statements are
`conn.close()` and `this.lastIncomingRoot.clear()`, both synchronous, so no
turn boundary exists. `serveTcp` independently frees its single slot only in
`serve()`'s `.finally` (`src/tcp.ts:58-66`), after the reset has enqueued.

Every path that can enqueue status work is inside the serve loop:
`handleNotification` (`src/server.ts:597`) is synchronous and `void`-returning;
all five `markOutbound` sites (`:688, :698, :778, :788, :1402`) sit inside
`handleRequest`, which `src/server.ts:313` **awaits**, so the `finally` cannot
run while a write is in flight. Probed, not just read:

* **P6**: hold `chat.postMessage`, drop the host's stream underneath it.
  `server['conn']` is still non-null while the write is in flight (so
  `markOutbound`'s clear is enqueued first); the old peer leaves
  `['C1:4.0:is thinking…','C1:4.0:']`, and the new peer's set lands last:
  final `[…,'C1:8.0:is thinking…']` with `statusOn.get('C1').ts === '8.0'`.
* The repo's own `R2-M2` proves the same over real loopback TCP with the old
  clear held: `['C1:4.0:is thinking…']` while held, then
  `['C1:4.0:is thinking…','C1:4.0:','C1:8.0:is thinking…']` on release.
* My deliberate deadlock while writing P6 is itself the proof: awaiting
  `close()` before releasing the held post hangs forever, because the
  `finally` is downstream of the awaited request.

**Can an old peer's late call set a status for the new peer?** No. Two epoch
checks cover it — at the top of the turn (`if (threadTs && (… epoch !==
this.statusEpoch …)) return`) for a queued-but-unstarted turn, and again
immediately before `statusOn.set` + `callStatus` for a turn that was mid-await
when the epoch bumped. There is no `await` between that second check and the
Slack call, so it is atomic.

**Can it clear one?** Only if an old-peer clear could be enqueued after the new
peer's set, which the enqueue analysis and P6 rule out.

**Stale status?** The snapshot is `statusQueue.keys() ∪ statusOn.keys()`, and
an in-flight turn is always in `statusQueue` (the tail-identity cleanup only
deletes when the entry *is* that turn). I found no reachable state that leaves
a status owned and unclear after a peer change. A *failed* clear drops
ownership and leaves the status to Slack's 2-minute expiry — by design and
documented.

**Is the refusal-per-peer work correct?** The epoch guard does stop an old
call's refusal from poisoning the new peer (mutation **M4** removing it turns
`test/threadStatus.test.ts:386` red). But it only half-closes the hole: if the
refusal also applies to the teardown clear, the new peer is suppressed anyway
— the LOW above, with P2/P7 as evidence.

### 3. The terminal catch and unhandled rejections

**`setThreadStatus` can never reject** and **the queue entry is always
removed.** Verified, not inferred:

* **P3** installs a `process.on('unhandledRejection')` listener and drives
  five shapes — a non-object Slack rejection; an unexpected local failure
  inside the turn (`canWrite` throwing `undefined`); a reset across a queued
  set *and* an owned status against a failing Slack; `stop()` with an
  in-flight failure; and `resetThreadStatuses()` fire-and-forget exactly as
  `src/server.ts:335` calls it. Result: **0 unhandled rejections**, and
  `statusQueue.size === 0` on all five adapters.
* **P8** pins the tail-identity check: three chained turns give one map entry
  which *is* the tail (`q.get('C1') === t3`), it is not deleted while later
  turns are pending, it is removed once they all settle, and a later standalone
  turn is removed again. Starvation is impossible — the chain is strictly FIFO,
  so the tail always settles last.
* Reading the remaining `void`s: `src/server.ts:335` (`resetThreadStatuses`
  cannot reject — `statusEpoch++`, `Set` construction and a `Promise.all` of
  non-rejecting promises), `:597`, `:1013`, and
  `src/slack-adapter.ts:1181` (`void turn.then(…)`, whose callback is two map
  operations). `src/slack-adapter.ts:891` awaits inside `stop()`. The terminal
  `.catch` even wraps its own `console.error` in `try/catch`.

Mutation **M3** (delete the terminal `.catch`) turns the
'unexpected turn failure' case red — the fix is load-bearing and tested. The
`instanceof` half is not; see the second LOW.

### 4. Removed code — did anything rely on it?

**Adapter post-clear (`sendMessage`).** No. All five write paths call
`markOutbound`, which clears: `send_message` (`:688`), `reply_message`
(`:698`), `upload_file` (`:778`), `send_dm` (`:788`, with the resolved
`result.channelId`), `channels/publish` (`:1402`). `sendDM` reaches Slack
through `sendMessage` on the same resolved channel, and nothing else in `src/`
calls `sendMessage`/`uploadFile`/`sendDM`. `markOutbound` is strictly wider
than the removed line, which never covered uploads. **P5** confirms it end to
end on `reply_message`, `send_message` and `upload_file` (each
`['C1:4.0:is thinking…','C1:4.0:']`); the repo already covers `publish` and
the `tool` path at `test/threadStatus.test.ts:74-90`.

**Both `statusOn` identity guards.** Nothing relied on them, and the invariant
they encoded really holds. `statusOn` is written only inside `setThreadStatus`
turns, and turns for one conversation are strictly serialized, so no other
writer can intervene across either `await`. **P4** piles a move, a stop, a
reset and a second move onto a held in-flight set and watches `statusOn` for
`C1`: **0 violations**, queue drained, calls
`['C1:1.0:is thinking…','C1:1.0:','C1:3.0:is thinking…']`. The *queue-tail*
identity check was correctly kept — it is the one that is reachable (P8).

### 5. Tests: red reproduction, barriers, repeats, mutations

**Red reproduced.** Gate `review2-red-on-be7c3af1`: HEAD's test tree with only
`src/server.ts` and `src/slack-adapter.ts` reverted to `be7c3af1`
(`diff -rq` confirms the test tree is identical to HEAD) →
**23 pass / 5 fail**, the 5 being exactly the new cases, each for its own
defect. Green at HEAD: 28/28.

**Are the barriers real, or can a test pass vacuously?** Real. Both are
protocol/promise joins, not time guesses:

* `settled(h)` sends `tools/list` — the serve loop reads messages in order and
  `handleNotification` is synchronous, so the typing notification (and its
  synchronous `statusQueue` enqueue) has definitely been processed when the
  response arrives — then joins `statusQueue.values()`. When nothing was
  enqueued, `Promise.all([])` is correct rather than lazy, because every
  enqueue path is synchronous inside the loop (Q2).
* `mention(h)` joins `server['forwarding'].values()`, which is populated
  synchronously in `onMessage` (`:1580`) before `delivered()` can flip and
  removed only after `taken()`/`notTaken()` — so it genuinely waits for
  acceptance, which is what the old 25 ms `pause()` was approximating.
* `nextTurn()` is one `setImmediate`, used only where a held promise already
  pins the interleaving.
* R1-5 needed, and got, the extra `await Promise.all(statusQueue.values())`
  after `close()`, because `close()` no longer awaits the reset.

Proven by mutation rather than by argument: **M5** (record the root for every
accepted message, re-introducing R1-2) turns the `settled`-based
`R1-2: ambient delivery…` red; **M6** (drop the `isFeatureSetActive` gate)
turns two `settled`-based negative tests red. A vacuous barrier would have
stayed green in both.

**Repeats.** `test/threadStatus.test.ts` ran **10×** green at 28/28:
6× idle (gate `review2-thread-idle-6`) and 4× under 16-way CPU saturation
(`nproc` 16, 16 busy loops; gate `review2-thread-load-4`), where duration rose
only from ~1.4 s to ~1.8–2.0 s. No flake, no cancellation, no skip.

**My nine mutations** (gate `review2-mutations`), all on round-2 code:

| Mutation | Caught? |
|---|---|
| M1 — `conn = null` back after the reset (re-introduce MEDIUM 1) | yes, 2 fails (R2-M1, R2-M2) |
| M2 — `await` the reset again (MEDIUM 2 only) | yes, 1 fail (R2-M2) |
| M3 — delete the terminal `.catch` | yes, 1 fail (R2-M3 'unexpected turn failure') |
| M4 — drop the epoch guard on refusal recording | yes, 1 fail (late old-peer refusal) |
| M5 — record the root for every accepted message | yes, 1 fail (R1-2 ambient) |
| M6 — drop the typing feature-set gate | yes, 2 fails (both R1-1 cases) |
| M7 — restore round 1's `statusRefused.clear()` position | **no** (LOW 1) |
| M8 — drop `statusRefused.clear()` from the reset entirely | yes, 1 fail (R1-4 permanent refusal) |
| M9 — revert the `instanceof` read in `callStatus` | **no** (LOW 2) |

### 6. Docs

Each claim checked against code or the network, not against the report:

* `mode: 'degraded'` naming **only** `slack.typing` — exact: the receipt is
  `[{featureSet:'slack.typing', missingCapabilities:['channels.typing'],
  effect:'disabled'}]` (`test/handshake.test.ts:64-67`, which the suite pins).
* `enabledFeatureSets` pinning — correct. mcpl-core 0.4.0:
  "present `enabled` is an allowlist that can only narrow"
  (`dist/src/capabilities.js:221-222`). The PR body's parenthetical "(the wire
  selection field is `enabled`)" is right.
* `op: 'stop'` extension — correct. `ChannelsTypingParams` in the pinned
  mcpl-core is exactly `{ channelId: string }`
  (`dist/src/methods.d.ts:395-397`); README and fragment now both say so and
  name the fallbacks (post, disconnect, shutdown, expiry).
* Migration link — `https://docs.slack.dev/reference/methods/agents.sessions.setStatus/`
  returns **200**.
* "transient failures may retry on the next refresh" — true, and P1 is the
  mechanism (`entry.at = -Infinity`).
* "lasting API refusals … until the peer changes" — **not always true**; LOW 1.
* Fragment conventions — conformant; the uneven wrap breaks no stated rule
  (see Informational). `final-release-fold` folds it verbatim into a
  `## 0.1.1` section and consumes the file; `final-changelog-regex` reproduces
  CI's exact added-fragment regex from `.github/workflows/changelog.yml:32-34`.
* Draft PR body — accurate; its numbers (612/584, 122, 28, five repeats) all
  reproduce. Draft reviewer reply — one miscount; LOW 3.

### 7. Suites

Fresh, by me, at `17275b8`:

| Node | Scope | Result |
|---|---|---|
| 22.23.3 | `npm ci --ignore-scripts` → typecheck → build → `npm test` | **612 pass / 0 fail** (0 skipped, 0 cancelled) |
| 24.22.1 | typecheck → build → `npm test` | **612 pass / 0 fail** |
| 22.12.0 | typecheck → build → `npm test` + CI's "Start without credentials" | **612 pass / 0 fail**; start check OK |
| 22.12.0 | the five touched test files | **122 pass / 0 fail** |

Baseline measured by me at `ca8f6b1` in a sandbox: **584 pass / 0 fail** on
both 22.23.3 and 24.22.1 (`baseline-ca8f6b1.log`). 612 − 584 = 28, exactly the
`threadStatus.test.ts` case count; the other touched test files gained no
cases. The expected 612-vs-584 split is confirmed on both versions, not
inherited.

I added the **full suite on 22.12.0** because `.github/workflows/ci.yml:26`
marks `{ubuntu, 22.12.0, suite: true}` as the only matrix row that runs the
suite — the brief's floor-touched run would not have covered CI's actual gate.

### 8. Anything new introduced by round 2?

Two things, both LOW and both above: the `statusRefused.clear()` reorder
(with its epoch-guard side effect of a pointless teardown clear), and the
untested `instanceof` line. Nothing else:

* The reset's promise is now unhandled by design; proven non-rejecting (P3).
* `statusOn.delete` is now unconditional in the move branch; invariant proven
  (P4).
* `statusRefused` is cleared before the clears, so a refused channel's
  teardown clear failure now **logs** where round 1 suppressed it — one extra
  stderr line per affected conversation per teardown. Not a defect.
* `setThreadStatus` can no longer surface a failure to `stop()`; `stop()` is
  already best-effort under `index.ts:70`'s 5 s cap.
* The three other touched test files only add `setThreadStatus`/
  `resetThreadStatuses` no-op stubs to existing fake-slack objects
  (`test/forwardingLifecycle.test.ts:35`, `test/registrationRecovery.test.ts:28`,
  `test/serverVersion.test.ts:28`). No assertion is weakened.
* Size: +6 net production lines over `be7c3af1`, and the MEDIUM fixes removed
  more than they added.

## Verification Gates

Run through `orgasmic dispatch gate`; logs in this evidence directory.
Environment: notifiers off (`NO_UPDATE_NOTIFIER=1`,
`npm_config_update_notifier=false`), two zero-byte npm configs at
`/tmp/task-2xgbg-rev2/npm-{user,global}`, `npm_config_audit=false
npm_config_fund=false`, `NODE_OPTIONS` loading the loopback-only listener
guard, installs via
`npm ci --ignore-scripts --registry=https://registry.npmjs.org`, every suite
under `timeout 900`. Node 24.22.1 and 22.12.0 re-verified against freshly
fetched `SHASUMS256.txt`: tarball `sha256sum -c` → `OK`, and each extracted
`bin/node` matches its archive (`SHASUMS-*.txt` in `probes/`). Node 22.23.3 is
the preinstalled `/opt/node` toolchain and has no tarball to check.

| Gate | Command after `timeout 900` | Result | Log |
|---|---|---|---|
| `review2-full-22.23.3` | `npm ci --ignore-scripts --registry=…` → `npm run typecheck` → `npm run build` → `npm test` | 612/612; install, typecheck, build pass | `gate-review2-full-22.23.3-01M62AFGVR2ZB74EN5NYXZRTNK.log` |
| `review2-full-24.22.1` | typecheck → build → `npm test` (Node 24.22.1) | 612/612 | `gate-review2-full-24.22.1-01M62AG7QBVMQ00KF9HDX9MDZY.log` |
| `review2-full-22.12.0` | typecheck → build → `npm test` + CI's start-without-credentials step (Node 22.12.0) | 612/612; start check OK | `gate-review2-full-22.12.0-01M62AQ3659YVEZN0AXDDG0T5Q.log` |
| `review2-floor-22.12.0` | the five touched test files (Node 22.12.0) | 122/122 | `gate-review2-floor-22.12.0-01M62AGXQ8BAAP4MAXZMM8JFKT.log` |
| `review2-thread-idle-6` | `threadStatus.test.ts` ×6, idle | 28/28 each | `gate-review2-thread-idle-6-01M62A3Y138BV5Z1MMG3WS45H2.log` |
| `review2-thread-load-4` | `threadStatus.test.ts` ×4 under 16 busy loops | 28/28 each | `gate-review2-thread-load-4-01M62A4A1RH68R7SGSRCQASCSC.log` |
| `review2-probes` | `crash.ts` + 18 probes (A′, C′, F′, P1–P8, D, E, SEC 1–3) | crash exit 0; **18/18** | `gate-review2-probes-01M62AN5B9XP6RPNSE55B7GPVP.log` |
| `review2-round1-probes-inverted` | round-1 probes **as written** | A, C, F fail (defects gone); B passes | `gate-review2-round1-probes-inverted-01M62ARV6TXA8GJK71CHYN0SHQ.log` |
| `review2-red-on-be7c3af1` | HEAD tests against `be7c3af1` server + adapter | 23 pass / **5 fail** | `gate-review2-red-on-be7c3af1-01M62ANM97QF0ENB9FW4YCFE3V.log` |
| `review2-mutations` | my nine mutations M1–M9 | 7 caught; M7, M9 not | `gate-review2-mutations-01M62ANT3ZCWP6SRDW7E3PYSV9.log` |

Receipts **read, not re-run** (clean tree at `17275b8`, exit 0):
`final-changelog-regex` (its script reproduces
`.github/workflows/changelog.yml:32-34` verbatim, plus parent-SHA and clean
`merge-tree` checks) and `final-release-fold` (real release script, scratch
only, fragment consumed). `final-runtime`'s checksum work I redid myself.
`final-24.22.1-install/-typecheck/-build` and both suite gates I re-ran rather
than reused.

Unwrapped scoped probes (no reusable receipt, outputs quoted above):
the 584 baseline at `ca8f6b1` (`baseline-ca8f6b1.log`), the Node tarball
checksum verification, `git ls-remote --heads upstream main` twice, HTTP
status checks on both Slack doc URLs, and source reads of `src/`, `test/`,
`.github/workflows/`, `changelog.d/README.md`, `CONTRIBUTING.md` and the
pinned `@animalabs/mcpl-core` 0.4.0 declarations.

Probe sources and scripts are in `probes/` (`zz-r2.test.ts`,
`zz-fixed.test.ts`, `mutate.sh`, `mut9.py`, `red-repro.sh`, the gate scripts
and the environment files).

## Unmet criteria / test gaps

Acceptance is met. Rebuilt on current upstream main (`ca8f6b1`, re-confirmed
unmoved); `channels.typing` optional with a red-before/green-after test I
reproduced (23/5 vs 28/0); tests in upstream's homes with red/green and
mutations; full one-process suite green on 22.23.3, 24.22.1 **and** 22.12.0;
fragment and README present and convention-conformant; text is public-safe.
The two round-1 test gaps I named are now closed by committed tests (the
peer-teardown window by R2-M1/R2-M2; a rejecting `setThreadStatus` by the two
R2-M3 subprocess cases).

Remaining gaps:

* **M7**: the `statusRefused.clear()` position is unpinned, and the test that
  targets that area is scoped so the teardown clear succeeds. LOW 1.
* **M9**: the `instanceof` read in `callStatus` is unpinned. LOW 2.
* No test covers the backlog behaviour PROBE D measures (one queued call per
  refresh against a persistently failing Slack). Unchanged from round 1 and
  deliberate per R1-4.
* R1-8's public-side items — the PR body and reviewer reply exist only as
  drafts. Correct per the assignment ("push and PR update are separate owner
  decisions"), but the point stays open in public until the owner applies
  them; PR #12 was `mergeable: false` against the old head.
* Not checkable here, and correctly disclaimed: live Slack rendering, a real
  workspace's private channels and DMs, real host end-to-end behaviour, the
  2-minute expiry, and the `chat:write`-in-channels claim. I verified both
  Slack doc URLs resolve; the behavioural claims behind them rest on the
  public review's checks.

## Residual risk

* Cleanup stays best-effort by design: a failed clear drops ownership and the
  status waits for Slack's 2-minute expiry. Documented.
* With a persistently transiently-failing Slack, every host refresh still
  queues its own call and its own stderr line per conversation, and a clear
  lands only behind the whole backlog (PROBE D: 10 refreshes → 11 calls,
  `maxInFlight: 1`, clear after 443 ms at 40 ms per call). Unbounded in
  principle; unchanged from round 1 and the behaviour R1-4 asked to keep.
* A new set in the same conversation still waits behind an old in-flight call,
  though the reconnect itself no longer does (C′, R2-M2). Disclosed by the
  implementer.
* A channel-scoped typing signal cannot name the host's actual reasoning
  target; "latest accepted addressed pending thread" is the review's own
  conservative proxy and stays ambiguous with several addressed threads
  pending. Disclosed.
* LOW 1's suppression can outlive a peer change in a narrow interleaving.
* `agents.sessions.setStatus` migration is not done, correctly out of scope.
* `src/slack-adapter.ts:1437` (`assertNotDm`) still does `(err as Error).message`
  on a `conversations.info` failure. Pre-existing on upstream main, untouched
  here, and harmless in the status path (the caller wraps it in `try/catch`);
  noted only because it is the same shape as the bug round 2 fixed.

## Fix directions

1. `src/slack-adapter.ts:1203` — don't record a *clear*'s refusal:
   `if (status && epoch === this.statusEpoch && refusedForGood(err))`. That
   keeps the "until the peer changes" promise literal and removes the
   epoch-guard side effect that issues a pointless teardown clear. Alternative:
   soften `README.md:44` and the fragment's last line. Either way, widen
   `test/threadStatus.test.ts:386`'s injected refusal to cover the clear.
2. Add P1 from `probes/zz-r2.test.ts` to `test/threadStatus.test.ts` so
   `callStatus`'s `instanceof` read is pinned.
3. Draft reviewer reply — "five new regression cases fail on `be7c3af1`", and
   describe the epoch-guard mutation as a separate artefact.
4. Optional: re-wrap line 6 of the fragment for evenness (no rule requires it).
5. Owner, before pushing: set a deliverable commit author.
