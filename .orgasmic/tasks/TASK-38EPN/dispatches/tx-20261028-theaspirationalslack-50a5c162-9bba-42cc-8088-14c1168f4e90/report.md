# Review — TASK-38EPN @ e8c6fe530b71ff4b3778ac5fd10256dfb408f32c

Re-review of the fix round on `d5a84bcc` (which this reviewer rejected for MEDIUM-1 and LOW-2).
Read-only: no edits, no commits, no push, no GitHub comment. Worktree left clean at
`e8c6fe53` (`git status --porcelain` empty before and after).

# Verdict

**Approve.** Both prior findings are fixed and independently reproduced. MEDIUM-1 is
resolved exactly as specified: the `backscrollLimit > 0` guard now wraps only the history
fetch and its `isCurrent()` re-check, and `lookUpMeta` runs under the original
first-interaction condition. The cumulative `d3e4f7c9..e8c6fe53` change to `src/server.ts`
is provably confined to the limit-0 feature. Full suites are green on both runtimes
(588/0 each). Two LOW docs findings remain; neither blocks.

# Findings

## LOW — docs — `changelog.d/zero-backscroll.added.md:1`
The fragment is categorised `added` and does not mention that values which previously fell
back to 50 now disable backscroll. `SLACK_BACKSCROLL_LIMIT=0` (and `0junk`, `0.5`, `0x10`,
anything whose `parseInt(raw, 10)` is 0) used to be rejected by the `n > 0` clamp and read
as 50; at this commit they mean "no automatic backscroll". An operator who has `0` set
today silently loses backscroll on upgrade with no release-note warning. Project precedent
treats exactly this shape of operator-visible config reinterpretation as breaking —
`changelog.d/15-empty-switches.breaking.md` ("Before, an empty value read as off"), and
`changelog.d/README.md:24` plus `CONTRIBUTING.md:118` require breaking bullets to open
`- **Operators:** …` and cover who acts / migration / unchanged.
*Evidence:* source read of `src/server.ts:240` (`n >= 0`) vs `d3e4f7c:src/server.ts`
(`n > 0`); `git show d3e4f7c:src/server.ts`.
*Fix direction:* add one `- **Operators:** …` bullet (new `.breaking.md`, or `.changed.md`
if the maintainers judge the old fallback accidental) saying `0` used to read as 50 and now
means off, and that non-zero values are unchanged.

## LOW — docs — `src/index.ts:28`
The CLI entry point's environment block still reads "messages fetched on first interaction
with a conversation (default 50)" and is silent on 0 and on the 0–1000 range. It is a
docblock, not printed help, and it already omits `SLACK_MCPL_DEBUG_LOG`, so it is not
strictly maintained; the assignment named only the README row. Flagged because it is the
other canonical env-var list in the repo and is now the only one that disagrees with the
behaviour.
*Evidence:* `sed -n '1,30p' src/index.ts`; compare `README.md:335`.
*Fix direction:* one-line amendment, or deliberately leave it to a separate docs pass.

## Test gap (no finding filed) — `test/operatorControls.test.ts:31`
No test asserts that a *non-zero* limit value actually reaches `fetchHistory`. The harness
records only `history:${channel}` (`test/harness.ts:132`), so `reads` cannot distinguish
limit 7 from limit 50, and a mutant that hardcoded `limit: 50` would survive the whole
suite. Pre-existing (upstream had no such assertion either) and not widened by this change,
since the only edit is hoisting the same getter read into a local. Noted under Residual Risk.

# Answers to the brief

**1. MEDIUM-1 is fixed — confirmed.**
`src/server.ts:1666-1685`: `if (isFirstInteraction && isAddressed) { if (backscrollLimit > 0) { …fetch…; if (!isCurrent()) return abandon(); } if (!msg.isDM) { meta = await this.lookUpMeta(msg); if (!isCurrent()) return abandon(); } }`.
The guard covers the fetch and its re-check only; the metadata lookup and its own lifecycle
check run under the original condition.

- *Dropped `isCurrent()` at limit 0 is provably a no-op.* On the limit-0 path nothing is
  awaited between the function's top-level `if (!isCurrent()) return abandon();`
  (`src/server.ts:1645`) and `lookUpMeta`: `ensureSubscriptionsLoaded()` is synchronous
  (`src/server.ts:1011`, `: void`, `readFileSync`), as are `forwardedWatermark.has`,
  `isChannelSubscribed` and `dbg`. Single-threaded, no microtask yield, so `isCurrent()`
  cannot have changed value. For a DM at limit 0 the block does nothing at all.
- *Probe passes.* `meta-lookup-probe.test.ts` from the previous run's evidence, run against
  a scratch copy of `e8c6fe53` (tracked tree untouched):
  `node --import tsx --test --experimental-test-isolation=none test/operatorControls.test.ts test/zz-probe.test.ts`
  → **18 pass / 0 fail** (both `PROBE limit=0` and `PROBE limit=50` name `#general`).
  Log: `probe-final-e8c6fe53.log`; probe copy: `meta-lookup-probe.test.ts`.
- *New test is red on `d5a84bcc`.* Same tests, `src/server.ts` replaced with
  `git show d5a84bc:src/server.ts` → **16 pass / 2 fail**: `not ok 3 - zero backscroll keeps
  the auto-subscribe conversation name after an outbound write` and `not ok 17 - PROBE
  limit=0`. The committed regression test and the reviewer probe fail together, so the new
  test targets the real defect, not an artefact.
  Log: `probe-red-d5a84bcc.log`.
- *One mutation of my own* (independent of the implementer's discard-meta mutant): weaken
  the guard, `if (backscrollLimit > 0)` → `if (backscrollLimit >= 0)` at `src/server.ts:1667`,
  so limit 0 still issues a 0-message fetch. → **14 pass / 2 fail**: `not ok 1 - backscroll
  limit 0 controls automatic history without disabling explicit reads` (actual `['history:C1']`,
  expected `[]`) and `not ok 3`. Mutant killed by two tests.
  Log: `probe-mutation-ge0.log`; patch: `reviewer-mutation.patch`.

**2. No new behaviour change beyond limit 0 — confirmed.**
`git diff d3e4f7c9..e8c6fe53 -- src/server.ts` is exactly two hunks. Whitespace-normalised
diff of the two full files (strip leading indentation, drop brace-only lines) yields only:

```
229c229,230  doc comment: "clamped to [1, 1000]" -> "zero disables …; Accepts [0, 1000]"
234c235      return Number.isFinite(n) && n > 0 …  ->  … n >= 0 …
1526a1528    + const backscrollLimit = this.backscrollLimit;
1527a1530    + if (backscrollLimit > 0) {
1530c1533    limit: this.backscrollLimit  ->  limit: backscrollLimit
```

Nothing else in the file changed; the `if (!isCurrent()) return abandon();` statement keeps
its position in the statement sequence and only changes brace nesting. Every other
first-interaction path — the `limit > 0` fetch, the bot-message filter, the
`backscroll:fetch-failed` debug, the DM branch, the `contextChanged` meta lookup at
`src/server.ts:1693`, `autoSubscribe`, the backscroll block, the read-only note, the
location header — is byte-identical to upstream.
One behavioural nuance, verified harmless: the getter is now read on **every** inbound
message rather than only on first-interaction+addressed. `backscrollLimit`
(`src/server.ts:236`) is pure — one `process.env` read plus `parseInt`, no side effects, no
throw — so this is unobservable.
Other files touched: `README.md` (one row), `changelog.d/zero-backscroll.added.md` (new),
`test/operatorControls.test.ts` (tests only). No lockfile, no generated files.

**3. README row is now accurate for parseInt — confirmed; boundary test is meaningful.**
`README.md:335` states: 0–1000, default 50; 0 disables automatic backscroll while explicit
history tools remain; "Parses a leading base-10 integer (`7junk` as 7, `0junk` as 0, `1.5`
as 1)"; unset / no leading integer (`abc`) / out of 0–1000 fall back to 50. Each claim matches
`src/server.ts:236-241` and is exercised: `test/operatorControls.test.ts:67-85` asserts
`undefined→50, ''→50, '0'→0, '1000'→1000, '-1'→50, '1001'→50, 'abc'→50, '0junk'→0,
'7junk'→7, '1.5'→1`.
The test is meaningful rather than tautological: it reads the getter on the real
`SlackMcplServer` instance (`Reflect.get(h.server, 'backscrollLimit')`, harness builds the
production class at `test/harness.ts:310`), so a clamp regression is caught, and the
end-to-end consequence of 0 vs 7 is separately covered by the limit-parameterised
integration test at `test/operatorControls.test.ts:23`. My `>= 0` mutation was killed by
that integration test, confirming the pair is not purely white-box.
One wording nit, not filed as a finding: the row says "Unset values … fall back to 50" and
does not say "empty included", though an empty string does fall back to 50 (`!raw`) and the
test covers it; other README rows in this table are explicit about empty.
The env mutate/restore-in-`t.after` pattern the new tests use is established in this suite
under the same one-process runner (`test/toolRefusals.test.ts:145`,
`test/forwardingLifecycle.test.ts:977`), so no cross-file env leakage concern.

**4. The cumulative diff as one PR — appropriate.**
`git diff --stat d3e4f7c9..e8c6fe53`: 4 files, +91 / −14 —
`README.md` 2, `changelog.d/zero-backscroll.added.md` 2 (new), `src/server.ts` 30,
`test/operatorControls.test.ts` 71. Squashing the two commits gives the single small commit
the assignment asks for; only the files needed are touched.
Fragment naming matches `changelog.d/README.md` / `CONTRIBUTING.md:95`
(`<slug>.<category>.md`, flat, bullets only, continuation indented two spaces) and the
release scanner's fail-closed rules. Its *content* is accurate as far as it goes — see the
LOW finding on the missing operator-facing note about `0` previously reading as 50.
**Upstream main has not moved:** `git fetch upstream main` → `FETCH_HEAD` =
`d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`, the same base. The squash is a fast-forward onto
upstream main; no clean-apply check was needed.

**5. Fresh full suite on both runtimes — green.**

| Runtime | npm ci | `npm test` |
|---|---|---|
| Node 22.23.3 (npm 10.9.9) | pass | **588 pass / 0 fail / 0 skipped / 0 todo / 0 cancelled** |
| Node 24.22.1 (npm 11.19.1) | pass | **588 pass / 0 fail / 0 skipped / 0 todo / 0 cancelled** |

Counts match the implementer's claim exactly, and the +2 delta is accounted for. Extracting
and diffing the `ok N - <name>` lines from the implementer's round baseline suite
(`gate-r2-base-node22-suite-…log`, 586) against my fresh Node 22 run (588) gives exactly two
added names and zero removed or renamed:

```
> backscroll limits preserve integer-prefix parsing and fallback bounds
> zero backscroll keeps the auto-subscribe conversation name after an outbound write
```

The round baseline is `d5a84bcc`, not upstream `d3e4f7c9`, so it already carried the two
`backscroll limit 0 / 7 controls automatic history…` cases (both present in the 586 list).
This round adds exactly the MEDIUM-1 regression test and the LOW-2 boundary test. Nothing is
skipped, cancelled or todo on either runtime.

# Verification Gates

All through `orgasmic dispatch gate <name> -- timeout 900 <cmd>`, in the worktree at
`e8c6fe53`, clean tree, with `npm_config_userconfig` / `npm_config_globalconfig` pointing at
two empty files in `/tmp/review-38epn/npmcfg/`, `npm_config_audit=false`,
`npm_config_fund=false`, `npm_config_update_notifier=false`, `NO_UPDATE_NOTIFIER=1` set from
the first command, and
`NODE_OPTIONS=--require=$ORGASMIC_EVIDENCE_DIR/loopback-only.cjs` on every suite.

| Gate | Command | Result | Log |
|---|---|---|---|
| `rv-node22-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | exit 0 | `gate-rv-node22-npm-ci-01M623QKN8CWPVS1PFEP7C22AD.log` |
| `rv-node22-suite` | `npm test` | exit 0 — 588/0 | `gate-rv-node22-suite-01M623QRQHXT1HB42Q82KE1ERB.log` |
| `rv-node24-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | exit 0 | `gate-rv-node24-npm-ci-01M623RC8PVMXVSNV1J53XR47Q.log` |
| `rv-node24-suite` | `npm test` | exit 0 — 588/0 | `gate-rv-node24-suite-01M623RHCCJ3VK82MNW4M2C5DV.log` |

Scoped probes (unwrapped, run in scratch copies of the tree at `/tmp/review-38epn/`, logs in
this directory): `probe-final-e8c6fe53.log` 18/0, `probe-red-d5a84bcc.log` 16/2,
`probe-mutation-ge0.log` 14/2. Sorted test-name lists for the count reconciliation:
`suite-names-d5a84bcc.txt` (586) and `suite-names-e8c6fe53.txt` (588).

Environment provenance:
- Node 24.22.1 was **re-downloaded and re-verified by this review**, not reused: the previous
  run's tarball was gone, so `node-v24.22.1-linux-x64.tar.xz` and `SHASUMS256.txt` were
  fetched fresh from `https://nodejs.org/dist/v24.22.1/` and checked with
  `sha256sum -c` → `node-v24.22.1-linux-x64.tar.xz: OK`, then extracted to
  `/tmp/review-38epn/node24/` outside the repository. See `node24-checksum.log` and the
  copied `SHASUMS256.txt`.
- Loopback-only guard in force for every suite: `loopback-only.cjs` (copied into this
  evidence directory) wraps `net.Server.prototype.listen` and throws unless the host is
  `127.0.0.1` or `::1`. Call-site read confirms the harness's HTTP server binds
  `server.listen(0, '127.0.0.1', …)` (`test/harness.ts:77`). No suite tripped the guard.
- Reused gate receipts: the implementer's `r2-final-node24-{build,typecheck}` (exit 0 at this
  exact commit) were read rather than re-run; the suites were re-run fresh as the brief
  requires. Node 22 typecheck/build were likewise read from the implementer's
  `r2-final-node22-*` logs.
- Scratch trees were built with `git archive <sha> | tar -x` into `/tmp`, with `node_modules`
  symlinked — no `git worktree`/`git stash`/checkout touched the shared tree.

# Unmet Criteria / test gaps

No unmet acceptance criteria. Acceptance is met: single squashable commit on current upstream
main, only the needed files; regression test red without the change (reproduced);
one independent guard mutation red (reproduced); typecheck + build + full one-process suite on
Node 22.23.3 and 24.22.1; changelog fragment; README row; public-safe text throughout
(no tokens, workspace names, internal hosts or private identifiers in any changed file).

Gaps, all pre-existing or minor:
- No assertion that a non-zero limit value reaches `fetchHistory` (harness records only the
  channel). A `limit: 50` hardcode would survive the suite.
- No test covers a DM first interaction at limit 0 (the path where the whole guarded block
  does nothing). Proven equivalent to upstream by source read rather than by test.
- The 5-second `deliveryLookup` give-up path interacting with limit 0 is untested; at limit 0
  no backscroll lookup happens at all, so there is nothing to time out.

# Residual Risk

- No live Slack workspace was exercised; all integration coverage is the in-memory transport
  plus the fake Slack API.
- Operators with a currently-meaningless `SLACK_BACKSCROLL_LIMIT=0` (or `0junk`, `0.5`,
  `0x10`) silently change behaviour on upgrade, and the release notes as written will not warn
  them (LOW finding 1). This is a configuration surprise, not a defect.
- `src/index.ts` and `README.md` will disagree about the variable until the LOW-2 nit is
  addressed.

# What I could not check

- **Build and typecheck were not re-run by me**; I reused the implementer's exit-0 receipts at
  this exact commit (`gate-r2-final-node22-typecheck`, `-build`, `gate-r2-final-node24-typecheck`,
  `-build`). The brief named suites, not these.
- **No GitHub-side check** of how the squash renders as a PR (title, body, CI) — read-only
  scope, no PR exists yet.

# Fix Directions

1. (LOW, optional before opening the PR) Add an operator-facing bullet to the changelog —
   either reclassify as `changelog.d/zero-backscroll.breaking.md` or add a sibling
   `.changed.md` — opening `- **Operators:**` and saying: `SLACK_BACKSCROLL_LIMIT=0` used to
   fall back to 50 and now disables automatic backscroll; the same applies to any value whose
   leading base-10 integer is 0 (`0junk`, `0.5`); non-zero values and the 50 default are
   unchanged; explicit `fetch_history` / `fetch_thread` are unaffected.
2. (LOW, optional) Update the `SLACK_BACKSCROLL_LIMIT` line in `src/index.ts:28` to match
   `README.md:335`, or leave both `src/index.ts` omissions to a separate docs pass.
3. (nit) In the README row, say "Unset or empty values …" to match the tested behaviour and
   the sibling rows' phrasing.

None of the three blocks landing the change as it stands.
