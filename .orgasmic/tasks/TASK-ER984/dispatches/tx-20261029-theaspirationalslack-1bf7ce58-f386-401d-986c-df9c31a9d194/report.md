# Review — TASK-ER984 (A4: activate the explicit access policy), round 3 @ `81657f195e734c1a43ab5bed9ddffe741630e15d`

Reviewed: one commit on `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf`, amended from the
`b93646965e3667807fc5e889474ac852084c310d` I requested changes at. Round-only delta 15 files,
+157/−59. Worktree clean at start and end; no commits, edits or new tracked files (only ignored
`dist/`, `node_modules/`).

## Verdict

**Approve.** All three round-2 blockers are fixed, and each fix is load-bearing against my own
mutants rather than merely present in the diff. Nothing I found in the round-3 delta is a
regression; the four remaining items are LOW and none blocks ship.

Every round-2 finding, with what I verified:

| Round-2 finding | State | My evidence |
|---|---|---|
| **HIGH** H1 DM-name cap disabled the give-up path | **Fixed** | `slack-adapter.ts:1163-1181` is **byte-identical** to `3b1a97ac` (811 bytes, `python3` compare of the comment-through-`}` block). Probe P1 re-run: base and candidate both 10 waits `[1..10]`, `users.info` U1:10/U3:1/U4:1, one "Gave up on the name". Mutant **R2** (reinstating `inARow < 5`) is caught. |
| **HIGH** H2 per-candidate retry shared the page counter | **Fixed** | `slack-adapter.ts:1049` is now `for (let attempts = 0; ; attempts++)` passing `attempts + 1` (`:1055`); page-level `limited` untouched. Probe P3 re-run at **9, 10 and 25** candidates: all complete (9/9, 10/10, 25/25), waits = N, no `GaveUp` — where `b936469` gave up at 10 and 25. Mutant **R3** (restoring `++limited`) is caught. |
| **MEDIUM** three 1000-request/page count caps were scope creep | **Resolved as recommended** | All three removed (`slack-adapter.ts`, `content.ts`); all three cursor-cycle guards kept (`slack-adapter.ts:1069`, `:1760`, `content.ts:435`). Probe P2 re-run both sides: the three distinct-cursor cases are now **identical to base** (1002 pages complete); the three repeated-cursor cases throw at the candidate and **never terminate at base**. New `test/legacyPagination.test.ts` covers all six in **legacy** mode — the gap I named. Mutants **R4/R5/R6** each caught by the matching legacy test. |
| **MEDIUM** `mpim:write` test masked by `writeChannels: []` | **Fixed** | `test/fileAccess.test.ts:431` restored to `writeChannels: ['G1']`, so `requireWritable` reaches `requireScope(scopes, 'mpim:write')` (`access-policy.ts:130`) instead of throwing on the pin check at `:129`. Mutant **R1** (deleting the `mpim:write` gate) now fails **`real group file upload requires mpim:write before a ticket or bytes`** — it is load-bearing again. |
| **MEDIUM** PR body mentioned the host OOM and the internal memory scope | **Fixed** | The sentence is gone. `grep -iE 'oom\|memory\|systemd\|recovery\|infrastructur\|4G\|cgroup'` over the report's `## PR body` section: no match. The operational account stays in the run report only. |
| **LOW** retry wording / name cap undocumented | **Fixed** | README `:392-397`, `docs/access-policy-migration.md:87-96` and the changelog fragment now distinguish "five attempts per candidate (four retries), each with its own counter" from the DM-name give-up, and drop every count-cap claim in favour of the cycle fix. Each claim checks out against the code. |
| **LOW** `src/index.ts` header omitted "ignored under policy" | **Fixed** | `src/index.ts:14-25`: all three of `SLACK_DM_USERS`, `SLACK_SEND_CHANNELS`, `SLACK_DISABLE_DMS` now say "Ignored under SLACK_ACCESS_POLICY." |
| **LOW** unbounded bad-value echo | **Fixed** | `config.ts:13-17` `policyValue()`. My echo probe over 10 pathological inputs (10 000 newlines, 1 000 backslashes, 500 surrogate pairs, lone surrogates, tabs, accents): every refusal is **one line, ≤ 267 bytes**, with the true character count; short values are byte-unchanged (`got "{"` still matches the README sample). Mutant **R7** caught. |
| **LOW** M2/M13 suppressions untested | **Fixed** | Mutant **R8** (config keeps `list(env.SLACK_DM_USERS)`/`SLACK_SEND_CHANNELS` under policy) is caught by `accessActivation.test.ts:68`. Mutant **R9** (`index.ts:61` passes `dmUsers`/`sendChannels`/`disableDms` alongside `accessPolicy`) is caught by both real-startup rows, stdio and TCP. |
| **LOW** G-prefix accepted-but-dead config | **Documented, not changed** | `docs/access-policy-migration.md:27-30` now spells out that a legacy private channel named in `groupDms` passes syntax but can never gain access. Owner-approved as documentation-only; the schema is unchanged. |
| **LOW** M10 surviving mutant | **Still survives, correctly** | Equivalent as I established in round 2 (`requireWritableConversation`'s extra legacy assertion uses the policy-aware `canWrite`). Disclosed in the round-3 report rather than papered over. |

`test/accessEntryLoader.mjs` is test-only, as claimed and as I verified: `git grep accessEntryLoader`
has exactly one hit, `test/accessStartupChild.ts:8`, gated behind `scenario.inspectEntryOptions`.
`src/`, `scripts/` and `package.json` contain no `module.register`/loader hook at all; the published
entry is `dist/src/index.js`. **No production hook.**

## Findings

No HIGH. No MEDIUM.

### LOW

**LOW (design, perf) `src/slack-adapter.ts:1049`** — the H2 fix is correct, but the per-candidate
counter leaves policy-mode background registration with **no aggregate wait budget**. Each candidate
may wait 4 times, and nothing bounds the sum across candidates.

Measured (probe `aggregate.mts`, policy mode, `Retry-After: 30`, 200 listed candidates):

| scenario | waits | aggregate wall-clock | `conversations.info` | outcome |
|---|---|---|---|---|
| each candidate fails 1× | 200 | 1.67 h | 400 | completed 200/200 |
| each candidate fails 4× | 800 | **6.67 h** | 1000 | completed 200/200 |
| each candidate fails 5× (persistent) | 4 | 0.03 h | 5 | aborts — `ratelimited` thrown |

The persistent case is properly bounded (the 5th failure with a `wait` rethrows at `:1056`, so one
permanently-broken candidate cannot spin). The unbounded case is the recoverable one. This is still
the right trade — at `b936469` the same 200-candidate run aborted after 10 waits with **zero**
conversations registered — and `refresh_channels` answers immediately meanwhile, so nothing is
blocked on it. But the docs disclose only the per-candidate bound ("at most five attempts per
candidate"), not that a sustained throttling window can stretch registration to hours.

*Fix direction:* add one sentence to README `:392` / the migration guide stating that total
registration time scales with candidates × retries × `Retry-After`, or give the candidate loop an
aggregate wall-clock budget that stops listing (not `GaveUp`) once exceeded. Documentation is
sufficient; an aggregate *count* budget would reintroduce H2.

**LOW (robustness) `src/config.ts:16`** — `quoted.slice(0, 200)` cuts the JSON-escaped string at a
fixed byte offset, so it can split an escape sequence or a surrogate pair and always drops the
closing `"`. My probe's emoji case ends `…😀\ud83d…(1000 chars)` — a bare surrogate half in a stderr
line — and the backslash case ends on a dangling `\`. Harmless (the line stays single-line and
bounded, which is what the fix was for), but the preview is no longer valid JSON.

*Fix direction:* trim the slice back to the last complete escape/code point, or slice `raw` before
stringifying and append the closing quote.

**LOW (test) `test/accessActivation.test.ts:75`** — both iterations of the `for (const raw of [...])`
loop register the same test name, `'long invalid policy has a bounded, escaped value preview'`. Both
run (mutant R7 reports `fail 2`), but a failure does not say which input produced it.

*Fix direction:* interpolate the case into the name, as the sibling loop at `:22` does.

**LOW (test) `test/accessAdmission.test.ts:146`** — the round-3 delta moved cursor-cycle coverage out
of `accessAdmission` (policy mode) into `legacyPagination.test.ts` (legacy mode only), so no test now
asserts the guards in policy mode. Not a real gap: the three guards sit outside every
`if (this.accessPolicy)` block (`slack-adapter.ts:1069`, `:1760`, `content.ts:435`), and legacy was
the mode I said was uncovered — so this is a net improvement. Noting it only so the asymmetry is
deliberate rather than accidental.

## Fresh check of the rest of the round-3 delta

I read the complete `git diff b9364696 81657f1` (all 15 files) and the `git range-diff`. No new
regressions. Specifically checked:

- **Removed `pages`/`requests` counters** leave no dead code or unused locals (typecheck clean);
  `limited` is still used and still reset per successful page (`:1032`, `:1038`).
- **`fetchSlackHistory`** (`content.ts:415-438`) keeps `truncated`, the `maxMessages` short-circuit
  and the cycle guard in the same order; only the cap line is gone.
- **Deleted `accessAdmission` tests** (6 tests) were the four pagination-bound blocks: two asserted
  the removed caps (correctly deleted), three cycle cases moved to `legacyPagination`. Test count
  reconciles exactly: 892 + 2 (`accessRetry`) + 6 (`legacyPagination`) + 3 (`accessActivation`) − 6 = **897**.
- **`test/accessRetry.test.ts`** drives real registration through `SlackMcplServer` and the real
  `server.waitToAskAgain`, so it models the production `REGISTRATION_TRIES = 10`, not a smaller
  test-local threshold — the exact weakness I flagged in `slackClient.test.ts:852`.
- **`accessStartupChild.ts`** only adds the `register(...)` line behind `scenario.inspectEntryOptions`;
  the scenario is set on one row, and both `A4_ENTRY_POLICY_ONLY` assertions are real-startup.
- **Commit hygiene:** one commit on `3b1a97ac`, `Co-Authored-By: GPT-6-Astra` retained, message
  accurate (it names the cursor-rejection behaviour change).
- **Order/state independence:** the new tests mock `console.error`, `clock.sleep` and
  `f.adapter.listConversations`, and run 6 × 1002-page loops. Reversed file order and two repeats are
  all 897/0 (below).
- **Scale note, not a finding:** removing the count caps restores base's unbounded accumulation on an
  infinite *distinct*-cursor stream. The new `cursors` Set adds per-page memory base lacked, but it is
  dwarfed by the `out`/`collected` accumulation base already had, so there is no regression.

## Verification Gates

All run from this worktree at `81657f195e734c1a43ab5bed9ddffe741630e15d`, each inside
`XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 --
timeout 900 …` with `--max-old-space-size=768`. **No scope failed, no OOM, no uncapped run, no
fallback.** Notifiers off (`NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`,
`npm_config_audit=false`, `npm_config_fund=false`), empty user/global npmrc, all inherited `SLACK_*`
unset (probe reports `SLACK_ vars in env: 0`), and my own loopback-only Node preload
(`loopback.cjs`) in force from the first command. Read-only: no tracked file touched, no commit, no
push, no PR/comment, no dispatch close; `git status --porcelain` empty at start and end.

| Gate | Result | Log |
|---|---|---|
| `r3rev-guard-2` — `node guardprobe.cjs` | **PASS**: net/TLS/HTTP/HTTPS/DNS/`fetch`/WebSocket/non-loopback-listen all refused, child inherits the guard, loopback allowed, 0 `SLACK_*` | `gate-r3rev-guard-2-01M6491P5F37HTTS48PTA7PP6B.log` |
| `r3rev-install` — `npm ci --ignore-scripts` | PASS, 51 packages, empty configs | `gate-r3rev-install-01M6491TK92KC8FYM39S1Y5AHN.log` |
| `r3rev-suite-22.23.3` — `node --import tsx --test --experimental-test-isolation=none test/*.test.ts` | **897 pass / 0 fail**, max RSS 383 620 KiB | `gate-r3rev-suite-22.23.3-01M64929D4YN845K0SB2WCMPCH.log` |
| `r3rev-suite-24.22.1` — same | **897 pass / 0 fail**, max RSS 401 140 KiB | `gate-r3rev-suite-24.22.1-01M6493A1Z338Y02XX539DAF7Q.log` |
| `r3rev-suite-22.12.0` — same | **897 pass / 0 fail**, max RSS 380 104 KiB | `gate-r3rev-suite-22.12.0-01M6494HMTEKEY18EHHZS8WX56.log` |
| `r3rev-typecheck` — `npm run typecheck && npm run build && git status --porcelain` | PASS, tree clean after build (`dist/` gitignored) | `gate-r3rev-typecheck-01M649C9WEG8ZJCDPX2XMABNK7.log` |
| `r3rev-probes` — P1 name-retry A/B, P3 shared-counter at 9/10/25, P2 legacy pagination A/B (6 cases × 2 sides) | all reproduce as tabulated above | `gate-r3rev-probes-01M6494WM4QD6BP8WZJG2C41MR.log` |
| `r3rev-legacy-identity-2` — my own legacy byte A/B against a freshly archived, verified `3b1a97ac` | **262 336-byte stdout and 565-byte stderr, `cmp`-identical** on both sides | `gate-r3rev-legacy-identity-2-01M649J927X9QMJVS74F4RFJ3M.log` |
| `r3rev-mutations-2` — my 9 mutants, each in a fresh `/tmp` copy, 15 targeted suites | **9 / 9 caught** (R1–R9) | `gate-r3rev-mutations-2-01M649C5RV1053NKMGEC10QZC1.log` |
| `r3rev-echo-probe` — 10 pathological `SLACK_ACCESS_POLICY` values through the real `startupSettings` | every refusal one line, ≤ 267 bytes, true char count | `gate-r3rev-echo-probe-01M649E3JR3YWBF4E6S2CYP7Y8.log` |
| `r3rev-aggregate` — aggregate admission cost, 200 candidates × 3 failure profiles | as tabulated in the LOW above | `gate-r3rev-aggregate-01M649N8GMHABFPY08T34FTQKH.log` |
| `r3rev-order-repeat` — full suite in reversed file order, then ×2 in normal order | **897 / 0** each; max RSS 383 684 / 380 708 / 395 908 KiB | `gate-r3rev-order-repeat-01M649KS8RD1GTH5REWYBP063E.log` |

**Legacy A/B method.** I archived `3b1a97ac` myself and verified all **126** tracked paths
`cmp`-identical to the commit, then added exactly two **test-only** harness files this commit
introduces (`test/accessStartupChild.ts`, `test/accessEntryLoader.mjs`) that no production code
reaches — `src/` and every other base path remained byte-identical to `3b1a97ac` after the copy. The
round-3 driver now also records the **1002-page legacy listing/directory/history** paths and the
**real `server.waitToAskAgain`** DM-name waiter (`waits [1..10]`, 9 sleeps of 30 000 ms,
`U1:10/U3:1/U4:1`, one give-up line) — precisely the coverage I said round 2's identity claim
lacked. Both sides are byte-identical including those records.

Two of my own gates failed first and were re-run; **both were reviewer tooling, not product
defects**, and both are classified with evidence:

- `r3rev-guard` — my probe asserted the child process would exit 0 via a rejection handler, but the
  guard throws *synchronously* at the `fetch` call site, so the child died with the refusal
  uncaught. The guard was stricter than my assertion. Fixed the assertion → PASS.
- `r3rev-legacy-identity` — my base archive lacked `test/accessStartupChild.ts` (a file this commit
  adds), so the base side's CLI spawn failed with `ERR_MODULE_NOT_FOUND` and the stdout differed
  (269 534 vs 262 336 bytes). Copying the two test-only harness files in → byte-identical. Classified:
  reviewer environment.

An earlier `r3rev-mutations` attempt was recorded as failed because my *shell tool* timed out at
120 s while the gate itself kept running; re-run as `r3rev-mutations-2`, 9/9.

**Reused implementer receipt, read not re-run:** `r3-committed-smoke`
(`gate-r3-committed-smoke-01M648Q3VS65W7FBB3DSY2F9H2.log`) — parent `3b1a97ac`, clean tree,
`Co-Authored-By: GPT-6-Astra` trailer, typecheck, 168/0. I independently re-verified every one of
those properties (parent, trailer, clean tree, typecheck) plus the full suite on all three versions,
so nothing in this review rests on it.

**Peak RSS, every command of this review: 401 140 KiB (≈ 392 MiB)**, on the 24.22.1 full suite —
about a tenth of the 4 GiB scope limit. The three per-version suites measured 380/384/401 MiB,
unchanged from round 2 despite +5 tests.

## Unmet criteria / test gaps

No unmet acceptance criterion. The task's "admission call budget/cache" item, which I reported unmet
at `b936469`, is now met: the per-candidate budget is five attempts with an independent counter, the
page-level counter keeps its "in a row" meaning, and both halves are mutation-tested (R3, plus the
retained `accessAdmission.test.ts:141-147` single-candidate bound).

Remaining gaps, all carried over and all acknowledged:

- **M10 survives all 897 tests** — behaviourally equivalent (verified round 2), so the
  `requireWritableConversation` early `return` is untested defence-in-depth. The config layer (R8)
  and entry layer (R9) are now covered, which was the round-2 gap.
- **No aggregate-budget test** for the LOW above; `accessRetry.test.ts` uses 25 candidates that each
  recover once, not candidates that each burn all four retries.
- **Cursor-cycle guards are asserted in legacy mode only** (LOW above). Shared code path, so not a
  behavioural gap.
- **Not verified at all** (acknowledged, out of scope): a live Slack workspace, macOS, and real
  rate-limit throughput. No test drives Slack's actual 429 pacing.

## Residual risk

- **Aggregate registration latency** (the LOW above): a sustained Tier-3 throttling window can
  stretch policy-mode background registration to hours on a large workspace. Bounded per candidate,
  unbounded in total, and now only partly documented.
- **Fresh admission cost** (owner-approved, unchanged): one `conversations.info` per listed candidate
  with no positive cache. `prepareMessageEvent` still acks and drops on any admission failure, and
  the aggregate stderr notice is capped at one per minute, so a throttling window silently loses
  messages. The design trades event delivery for revocation speed.
- **One persistently-failing candidate aborts the whole listing** (`slack-adapter.ts:1056` rethrows),
  registering nothing until a `refresh_channels`. Pre-existing from round 2, documented as
  "exhausted budgets deny", and the alternative — skipping the candidate — would weaken the
  fail-closed property.
- **`noteAdmissionFailure` counts legitimate denials**, so a policy admitting 1 of 100 candidates logs
  "Access admission denied 99 … candidates" each listing. Bounded and documented, but noisy.
- **Unbounded distinct-cursor pagination** is back to base behaviour now that the count caps are
  gone. Repeated cursors fail explicitly (the genuine infinite loop is fixed); a stream of
  endlessly *distinct* cursors still accumulates, exactly as at `3b1a97ac`.
- **`policyUploads` 1000-entry eviction** and `diagnosticScopes()` warning-only behaviour leave
  long-lived processes and under-scoped tokens with failure modes that surface only at runtime.
  Owner-approved; operators must read startup stderr.
- **Byte identity covers a deterministic driver**, now including the three 1002-page legacy paths and
  the real DM-name waiter. Any legacy path it still does not drive remains unverified by that method
  — though probes P1/P2 closed the three families I had found.

## Fix directions (ordered, none blocking)

1. Document the aggregate registration cost (candidates × 4 × `Retry-After`) in README `:392` or the
   migration guide, or add a wall-clock budget that stops listing. Do **not** add an aggregate
   *count* budget — that is H2.
2. Trim `config.ts:16`'s slice to the last complete escape/code point and keep the closing quote.
3. Interpolate the case into the duplicated test name at `test/accessActivation.test.ts:75`.
4. Optional: re-add one policy-mode cursor-cycle assertion so the guards are pinned in both modes.

Probe sources and artifacts in `$ORGASMIC_EVIDENCE_DIR`: `loopback.cjs`, `guardprobe.cjs`, `safe.sh`,
`probes.sh`, `mutate.py`, `echo.mts`, `aggregate.mts`, `identity.sh`, `order.sh`,
`suite-{22.23.3,24.22.1,22.12.0}.txt`, `id-{base,candidate}.{txt,stderr}`, `mut-R1…R9.txt`.
