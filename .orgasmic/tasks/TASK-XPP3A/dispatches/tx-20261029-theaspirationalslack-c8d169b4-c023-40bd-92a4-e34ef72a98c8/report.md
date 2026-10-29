# TASK-XPP3A re-review — A2 dormant adapter access gates (round 2)

**Commit reviewed:** `9f03ef92b41500092c9a37cf04a284c2f02ced0c`
**Parent:** `62a77616228cdc7d4eda31a6f1561501e9e484fc` (published A1 / upstream #55) — verified exact
**Shape:** exactly 1 commit on A1, `git diff --check` clean, `Co-Authored-By: GPT-6-Astra` trailer present
**Round delta vs. previously-approved `8296d58e`:** 5 files, +38/−10 — matches the brief
**Worktree:** left exactly as found — `git status --porcelain --untracked-files=all` empty at finish, HEAD unmoved. Every source mutation I ran this round was applied in an isolated scratch copy (`/tmp/xpp3a-mut`), never in the tracked tree; the mutation gates record `clean=yes`.

## Verdict

**Approve — no blocker.** All five brief items check out, reproduced rather than taken on the implementer's word.

The round-1 items are addressed as asked: **L4** is a real code fix with a real red control; **L5** is clean; **M2/L7** are accurate comment-only edits; **M1/M3/L6/L8** are disclosure fixes now present in the public body. Legacy parity survived the one behavioural change — 58 scenarios, 0 divergences, with a vacuity control proving the differential actually exercises the changed getter.

Three LOW findings, none blocking, none a regression. The most actionable is that the PR body was cleaned of internal chain labels but **the committed diff was not** — the implementer's own label check scanned only `pr-body.md`.

## Findings

### LOW

**LOW-1 (docs, public-safety) — internal chain labels survive in the committed diff, including in a test name.** The round-1 L8 fix landed in the PR body only. Four sites still carry labels a maintainer has no key to, all of them in the public diff:

| Site | Text |
|---|---|
| `src/slack-adapter.ts:1588` | `// Protected file references arrive in A3; do not offer legacy URLs under policy.` |
| `src/slack-adapter.ts:1668` | `// No unprotected attachment references while the A3 file gates are absent.` |
| `test/adapterAccess.test.ts:220` | test name `'policy attachment references are dormant no-ops until A3, …'` |
| `test/adapterAccessFixture.ts:11` | `/** Deliberately test-local: A2 provides no supported way to install policy. */` |

Root cause is checkable: the implementer's own guard is `r2-report-check.py:8` — `assert not re.search(r'\b(?:A3|A4|G)\b', b)` — where `b` is **`pr-body.md` only**. It never reads the source tree, and its alternation omits `A1`/`A2`, so the fixture's `A2` would have passed even if it had.
*Failure scenario:* a maintainer reviewing #56 reads "arrive in A3" with no public referent; worse, `until A3` is a **test name**, so it is printed in CI output on every run, not just in the diff.
*Fix direction:* same plain-language substitution already applied to the body ("a later PR adds attachment enforcement"), and extend the label check to the tracked tree, with `A1|A2` in the alternation.

**LOW-2 (correctness, pre-existing shape — not a regression) — `dmsDisabled` ignores scope filtering, so the `channels/open` description is imprecise when a policy names DM peers without `im:read`.** `src/slack-adapter.ts:806-809`
`dmsDisabled` is now `!accessPolicy.dmsWritable`, i.e. derived from the policy's DM peers alone. But the listing is driven by `readableTypes()` (`src/slack-adapter.ts:907-909`) = `conversationTypes()` **filtered by granted scopes**. The two therefore disagree when DM peers are admitted but the token lacks `im:read`:

```
policy dmUsers        : ["U1"]            (so policy.dmsWritable = true)
granted scopes        : im:read ABSENT
dmsDisabled           : false
types asked of Slack  : "public_channel,private_channel"
registered by listing : ["C1"]   (DM registered: false)
listing leftOut       : ["im"]
says "channels only"  : false
DESCRIPTION MATCHES REALITY: NO  <-- registration is channels-only, description does not say so
```

**I classify this as pre-existing, not introduced.** The identical shape exists in upstream A1 in legacy mode (`disableDms=false`, no `im:read`), driven through both adapters side by side:

```
A1 (upstream): dmsDisabled=false  asked="public_channel,private_channel"  registered=["C1"]  leftOut=["im","mpim"]
A2 (this PR) : dmsDisabled=false  asked="public_channel,private_channel"  registered=["C1"]  leftOut=["im","mpim"]
```

Round-1 L4 offered two fixes: adopt the fork's `!dmsWritable`, **or** derive the description from the effective listing types. The implementer took the first, which is exactly what I named first and which faithfully mirrors upstream semantics — so this is **not non-compliance and not unmet acceptance**. It is also well mitigated: the listing result already returns `leftOut: ["im"]` and the adapter logs `[slack-mcpl] Conversation listing omits types without a granted read scope: im (requires im:read)`. And the whole path is dormant, so there is no user impact today.
*Fix direction (optional, closes both modes at once):* derive `howChannelsRegister()` from `readableTypes()` rather than from `dmsDisabled`.

**LOW-3 (test observability) — the per-test wrapper mocks `console.error` for every test in both new files, which makes the round's "no diagnostic noise" assertion self-fulfilling.** `test/adapterAccessFixture.ts:62-68`
The fix is correct and is the right call for the 55 stderr lines L5 flagged. But it widens the mock from 2 tests to all 24 in the two files, and no test in either file asserts on console output. The implementer's `r2-audit` check "all five final targeted logs have no `[slack-mcpl]` diagnostic lines" is therefore now true **by construction** rather than by evidence — the mock swallows them regardless of what the adapter logs.
*Failure scenario:* a later change starts logging an unexpected adapter diagnostic inside any of these 24 tests; nothing in the suite or the audit notices.
*Fix direction:* no change needed for this PR. If the signal is wanted back, have `accessTest` collect the mocked calls and let tests that care assert on them, rather than discarding with `() => {}`.

## Answers 1–5

**1. L4 — fixed; the description is correct for all three cases the brief names; legacy parity survived.**

`dmsDisabled` is now `if (this.accessPolicy) return !this.accessPolicy.dmsWritable; return this.disableDms;`. Note the semantics precisely: it is `!`**`policy`**`.dmsWritable`, *not* `!`**`adapter`**`.dmsWritable`. The adapter's own `dmsWritable` getter additionally intersects the legacy send-list (`src/slack-adapter.ts:812-814`), so the two deliberately diverge under a send-list veto — which is the correct behaviour and what the new test's third block pins.

Verified on the **production path**, not by reading the getter: real `SlackMcplServer` + real `SlackAdapter`, capturing the actual agent-facing `channels/open` failure string (`howChannelsRegister()`, `src/server.ts:1343-1347`, the sole consumer of `dmsDisabled`), with a `conversations.list` stub that honours the requested `types` as Slack does. Ground truth = whether a DM is really registered:

| case | `dmsDisabled` | `dmsWritable` | `send_dm` offered | types asked | DM registered | says "channels only" | correct |
|---|---|---|---|---|---|---|---|
| policy, **no DM peers** | true | false | no | public, private | **no** | **true** | ✅ |
| policy, **allowed peer** | false | true | yes | public, private, **im** | **yes** | **false** | ✅ |
| policy, **peer + send-list veto** | false | **false** | **no** | public, private, **im** | **yes** | **false** | ✅ |
| legacy, `disableDms=false` | false | true | yes | public, private, im, mpim | yes | false | ✅ |
| legacy, `disableDms=true` | true | false | no | public, private | no | true | ✅ |

`cases=5 description_mismatches=0`. The send-list-veto row is the interesting one and it is right in both halves: DMs stay readable/listable (so no false "channels only" claim) while `send_dm` is correctly withheld, because tool exposure uses the adapter's send-list-intersected `dmsWritable` (`src/server.ts:393`). This is structurally sound, not just true on my inputs: `dmsDisabled` and the `'im'` entry in `conversationTypes()` (`src/slack-adapter.ts:901`) are derived from the *same* `accessPolicy.dmsWritable` predicate. The one case where that chain is broken by later scope filtering is LOW-2, which is outside the brief's three and pre-existing.

**Legacy parity survived.** Re-ran the 58-scenario A1-vs-A2 differential at this sha: **`scenarios=58 divergences=0`** — call sequences, payloads, returned outputs, exact refusal text, getters, ACK and 9 inbound shapes. Only `src/access-policy.ts` and `src/slack-adapter.ts` differ between the two trees (`diff -rq` over 19 files each). Crucially I proved the probe is **not vacuous for this specific change**: mutating A2's legacy branch to `return false` made the differential report exactly `DIVERGENCE: getters` (`dmsDisabled: true` vs `false`, 1 divergence) — so the suite of scenarios genuinely exercises the line that changed. Independent of that, `git diff` with comments stripped shows the getter is the **only** non-comment production change in the round delta.

**2. L5 — clean on all four counts.**
- **One mock per property per context:** exactly one `t.mock.method(console, 'error', …)` site in the entire new surface, at `test/adapterAccessFixture.ts:65`, inside the `accessTest` wrapper. `grep` over both test files returns no other `mock` usage.
- **None nested:** the two previously inner mocks (at the old lines 162 and 177) are removed in the diff; no wrapped test installs a second one.
- **No global hook:** no file-level `before`/`beforeEach`/`after`/`afterEach` anywhere in the new files. The only `t.after` calls are the three pre-existing context-owned `h.close()` host cleanups in `adapterAccessServer.test.ts:25,38,71`.
- **Convention:** `t.mock.method` is auto-restored at context teardown and is the suite's dominant pattern (`serveAgain`, `inboundOrder`, `unnamedPosts`, `listConversationScopes`, `forwardingLifecycle`). The new code uses the safe pattern, not the raw-reassignment one.
- **New-files-first:** `rev2-suite-newfirst` → **672 pass / 0 fail**, `not ok` count 0. I specifically checked the cross-file hazard the widened mock could have activated: three other tests *assert* on captured `console.error` output (`test/tcp.test.ts:269`, `test/slackClient.test.ts:178,844`) via raw reassignment. All three capture the original **inside the test body**, and in the new-files-first ordering they run *after* both mocking files — `ok 489 - stderrLogger writes info, warn and error to stderr…` and `ok 566 - logs to stderr unless told otherwise`. No leakage.

Also confirmed the fixture is still importable outside the test runner despite its new top-level `import test from 'node:test'` — both of my probes import it from plain scripts and run fine.

**3. Docs and comments — accurate, and behaviour-neutral by construction.**

*Behaviour-neutral:* stripping comment lines from both changed production files and diffing `8296d58`→`HEAD` leaves `src/access-policy.ts` with **no** non-comment change at all, and `src/slack-adapter.ts` with only the `dmsDisabled` getter. The M2 class doc and the L7 `deleteFile` comment are literally comment-only.

*M2 class doc accurate* (`src/access-policy.ts:42-46`): `findUsers` (`src/slack-adapter.ts:1600-1601`) really is gated on `requireScope(this.scopes, 'users:read')` and nothing else, then cursor-pages the whole `users.list` directory with no policy filter on results. "not just admitted DM peers or conversation members" is correct.

*L7 comment accurate* (`src/slack-adapter.ts:1486-1489`): the effect is `files.delete({ file: fileId })` — `channelId` is used only by the gate. There is exactly **one** caller, `src/server.ts:1464` (rollback), which supplies a `(channelId, fileId)` pair recorded from its own upload, and there is no `delete_file` tool. The comment's claim and its caveat both hold.

*Deny-all 70-case sweep re-run at this sha:* **`cases=70 undisclosed_escapes=0 known_disclosed_escapes=4`** — byte-identical to round 1, all four disclosed escapes being `findUsers`/`find_user`. Exactly the one disclosed exception, no new escape introduced by the getter change.

*Two earlier mutations re-run,* both still caught, both in isolated scratch:

| mutation | result | round 1 |
|---|---|---|
| `find-user-scope` (drop the directory-read scope gate) | **caught** — 71 pass / 2 fail | 70 / 2 |
| `write-sendlist-intersection` (drop the legacy send-list intersection from the policy write gate) | **caught** — 70 pass / 3 fail | 69 / 3 |

Both shifted by exactly +1 pass, consistent with 73 tests vs. 72 and unchanged detection.

*Red control on the new test, run independently.* The implementer's `r2-getter-red` used `--test-name-pattern` on a single test; I restored the old getter and ran **both new files in full**: `not ok 61 - dmsDisabled reflects policy peers…`, **72 pass / 1 fail**. So the new test genuinely pins the new behaviour, and exactly one test depends on it — no other test was silently coupled to the old value.

**4. Full suites and typecheck — reusable receipts, read not re-run.** Per the gate-receipts rule, `r2-suite-*` and `r2-typecheck-*` are clean-tree passes recorded at this exact sha in this same shared worktree, so I read the logs rather than burning three more suite runs:

- `r2-suite-22.23.3` → `# tests 672 / # pass 672 / # fail 0`, 0 skipped, 0 cancelled, `clean=yes`
- `r2-suite-24.22.1` → `ℹ pass 672 / ℹ fail 0`, 0 skipped, 0 cancelled, `clean=yes`
- `r2-suite-22.12.0` → `# tests 672 / # pass 672 / # fail 0`, 0 skipped, 0 cancelled, `clean=yes`
- `r2-typecheck-22.23.3`, `r2-typecheck-24.22.1` → both `tsc --noEmit` exit 0

**672 matches the brief's expectation**, and I verified the arithmetic from both directions with my own runs rather than accepting it: suite **minus** the two new files is **599 / 0** at this commit (so no existing test was altered — same 599 as the published parent), the two new files alone are **73**, and 599 + 73 = 672. The five `r2-new-tests-*` repeats are 73/0 each with zero `[slack-mcpl]` lines (see LOW-3 on why that last part is now self-fulfilling).

**5. PR body — accurate, public-safe, label-free, and it states the ordering constraint clearly.**

- **`fetch_attachment` ordering constraint: stated clearly.** The Safety-boundaries section leads with "**`fetch_attachment` is NOT gated by the policy yet.**", explains *why* reference suppression is not protection ("does not protect downloads of URLs supplied by callers" — which is exactly the M1 attack shape I proved in round 1), and states the ordering in the imperative: "**Activation must not land before attachment enforcement.** A later PR must enforce attachment access before another adds the opt-in setting." This fully resolves round-1 M1, whose substance was that the constraint lived only in an internal report.
- **M2 and M3 also surfaced publicly**, as asked — the user-directory carve-out with its `users:read`-only gate, and the uncached per-candidate/per-event/per-read `conversations.info` amplification with "short TTL cache vs call budget" named as open.
- **No internal labels in the body** — `grep -nE '\b(A1|A2|A3|A4)\b|TASK-|orgasmic|xoxb|/home/|tx-[0-9]{8}|run-01|dispatch'` returns nothing. "inert until a later PR adds the opt-in setting" replaces round-1's "inert until **A4**". (The *diff* is a different matter — LOW-1.)
- **Public-safe** — no tokens, absolute paths, internal URLs, task ids or dispatch ids.
- **Accurate** — every numeric claim independently confirmed: 599 parent baseline, 672 on three Node versions, typecheck/build on two, 73 new tests × 5 runs. `pr-body.md` is **identical** to the version quoted at the end of the report (programmatic comparison after stripping `> ` quoting). `depends on #55; review and merge #55 first` is retained. Round-1 L6 is fixed — "Make the ID-list predicate hole-safe for future callers (**behaviour-neutral today**)" no longer overstates it.
- Round-1 L8's substance is resolved for the body; see LOW-1 for the half that was missed.

## Verification Gates

All wrapped via `orgasmic dispatch gate <name> -- timeout 900 <cmd>`, cwd the worktree at `9f03ef92`, tree clean at start and end. Node 22.23.3 on PATH; empty npm configs and `NODE_OPTIONS=--require=/tmp/task-xpp3a/loopback.cjs` (loopback-only listener guard) from `env.sh`; notifiers off. Read-only: no commits, no tracked-tree edits, no network sends.

| Gate | Command | Result |
|---|---|---|
| `rev2-legacy-parity-differential` | `node --import tsx /tmp/xpp3a-rev2/parity.ts` | **`scenarios=58 divergences=0`** |
| `rev2-deny-all-completeness` | `node --import tsx /tmp/xpp3a-rev2/nothing-admitted.ts` | **`cases=70 undisclosed_escapes=0 known_disclosed_escapes=4`** |
| `rev2-dms-description` | `node --import tsx /tmp/xpp3a-rev2/desc-probe.ts` | **`cases=5 description_mismatches=0`** (production path) |
| `rev2-suite-newfirst` | full suite, two new files first | **672 pass / 0 fail**, 0 `not ok` |
| `rev2-suite-minus-new` | full suite excluding `adapterAccess*` | **599 pass / 0 fail** |
| `rev2-mutation-find-user-scope` | own mutation, scratch tree | **caught** — 71 / 2 (inverted gate) |
| `rev2-mutation-write-sendlist-intersection` | own mutation, scratch tree | **caught** — 70 / 3 (inverted gate) |
| `rev2-getter-red-full` | old getter restored, both new files | **red as intended** — 72 / 1 (inverted gate) |

Reused receipts (read, not re-run — clean-tree passes at this exact sha, per the gate-receipts rule): `r2-suite-22.23.3`, `r2-suite-24.22.1`, `r2-suite-22.12.0` (672/0 each), `r2-typecheck-22.23.3`, `r2-typecheck-24.22.1`, `r2-build-22.23.3`, `r2-build-24.22.1`, `r2-new-tests-1…5` (73/0 each), `r2-audit`, `r2-changelog`, `r2-release-fold`, `r2-inherited-evidence`, `r2-report-check`.

Unwrapped supporting probes (evidence, not offered as receipts): the vacuity control on the parity differential (legacy `dmsDisabled → false`, caught, 1 divergence); `legacy-dm-listing.ts` (A1≡A2 on a forced off-contract listing payload); `l4-residual.ts` and `l4-residual-legacy.ts` (LOW-2, incl. the A1-vs-A2 comparison establishing it as pre-existing). Probe sources archived beside this report: `parity.ts`, `nothing-admitted.ts`, `desc-probe.ts`, `l4-residual.ts`, `l4-residual-legacy.ts`, `legacy-dm-listing.ts`, `mutate.py`, `getter-red-full.py`.

Three gate invocations are recorded `failed`/`no-sha` and are superseded — keeping them visible rather than hiding them: `rev2-deny-all-completeness-…C8QC7` (probe outside a `type: module` scope, a harness error, re-run green), `rev2-dms-description-…CD6K3` (the genuine LOW-2-adjacent mismatch under a stub that ignored `types`, re-run with a contract-faithful stub), and `rev2-dms-description-…CECGQ` (`no-sha`: ran from the scratch cwd, re-run from the worktree).

## Unmet criteria / test gaps

No acceptance criterion is unmet; all four hold at this sha. Remaining gaps:

- **No test covers LOW-2** — `dmsDisabled` has no case combining admitted DM peers with a missing `im:read` scope, so the description/listing divergence is invisible to the suite. The new test uses full `accessScopes` throughout.
- **Nothing guards internal labels in the tracked tree** (LOW-1) — the only guard reads `pr-body.md`.
- **The "no diagnostic noise" assertion is no longer load-bearing** (LOW-3).
- Carried from round 1, unchanged and still correctly disclosed: no test can cover the `idList` change (behaviour-neutral); the tests' post-construction policy injection matches no future production wiring; `fetch_attachment` has no policy-mode test because it has no policy-mode behaviour; no rate-limit/load, live-workspace, live-host or macOS coverage.

## Residual risk

- **Ordering remains the real risk**, but it is now *documented publicly* rather than only internally: activation before attachment enforcement ships a half-confined policy. Still nothing in code or CI enforces the ordering — the mitigation is prose in the PR body, which is what this round was asked to deliver and did.
- The workspace user directory stays outside confinement (`users:read` only) — now stated in both the class doc and the body, and confirmed as the single escape across 70 deny-all cases.
- Uncached fresh admission still multiplies `conversations.info` per listing candidate, inbound event and read/write; cache-vs-budget is openly deferred.
- `requireScope` reads a monotonic scope cache ("a scope was once observed"), not fresh state.
- Admission is not transactional with the effect; membership can change between the admission `info` and the effect, and between pages within one call.
- File deletion relies on caller-supplied `(channelId, fileId)` pairing — now commented at the gate (L7).
- Under policy, inbound delivery additionally requires a `*:history` scope Socket Mode does not need, so a read-but-not-history token silently drops inbound messages. Fail-closed, but worth operator documentation at activation.
- **Handoff:** the maintainer must apply the `no-changelog` label or CI's changelog check fails. The body requests it.

## Fix directions (priority order)

1. **LOW-1, before publishing:** apply the body's plain-language substitution to the four source/test sites, and point the label check at the tracked tree with `A1|A2` added to its alternation. The test name matters most — it prints in CI.
2. **LOW-2, optional (closes legacy and policy mode together):** derive `howChannelsRegister()` from `readableTypes()` instead of `dmsDisabled`.
3. **In A4, carried:** supply the policy via a constructor option so the startup scope diagnostic is policy-aware (the body already commits to this); decide the admission-cache-vs-budget question before activation.
4. **LOW-3, optional:** have `accessTest` capture mocked `console.error` calls instead of discarding them, if the diagnostic signal is wanted back.
