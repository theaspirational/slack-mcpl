# TASK-R4THE round-2 re-review — `95916c48ef8110d1089e92df11f7fee30bdeb0ad`

## Verdict

**Approve.** Both round-1 findings are genuinely fixed, the round-2 refactor is
behaviour-preserving against `8030d418` over a 92-input differential with full
decision fingerprints, the four new tests are load-bearing (six first-party
mutants of the new parser, all killed), and the full suite is **599 pass / 0 fail
on Node 22.23.3, 24.22.1 and 22.12.0** reproduced first-party in this worktree,
plus typecheck. Acceptance holds: one commit on current upstream `main`
(`git ls-remote upstream refs/heads/main` → `7274283fa719…` = `HEAD^`), two new
files, no importers, no operator surface.

Three LOW items, all documentation/maintainability. None blocks ship.

## Findings

### HIGH
None.

### MEDIUM
None.

### LOW-A (docs) — PR body claims a behaviour change in a PR it elsewhere calls inert
`pr-body.md:9` / `report.md` "Changes" bullet 3:

> "Unknown keys and null lists are now rejected where the fork accepted them
> (embedded unknown keys and null optional lists)."

Nothing an operator, host or agent can reach changes in this commit. The existing
permissive allow-list surface is `src/config.ts:16-17` (`dmUsers: string[] |
undefined`, `sendChannels: string[] | undefined`, absent = unrestricted) and
`src/slack-adapter.ts:347-352` (`dmUsers?: string[]`, `sendChannels?: string[]`,
no runtime validation) — and this diff touches neither (verified: `git diff
--stat HEAD^ HEAD` is `src/access-policy.ts` + `test/accessPolicy.test.ts` only;
`grep -rn 'access-policy\|SlackAccessPolicy\|parseAccessPolicy\|AccessConversation'
src test` outside those two files → no hits).

"the fork" is also undefined for the audience: the only use of the word in the
repo's public docs is `CONTRIBUTING.md:18`, about GitHub forks *of* this repo.
An upstream reviewer reads bullet 3 as a user-visible tightening, then bullet 4
as "inert", and has to guess which is true.

Impact: reviewer confusion on a PR whose entire selling point is inertness; a
reader could also look for a changelog fragment that correctly isn't there.
Fix direction: say what it is — *"The new format is deliberately stricter than
today's `SLACK_DM_USERS` / `SLACK_SEND_CHANNELS` handling (all three fields
required, unknown keys and null lists rejected). Nothing reaches that format
yet; A4 carries the operator-visible migration note."*

### LOW-B (docs) — the verbatim PR-body region in the implementer report is unterminated
`report.md` heading layout: `## Final PR body (verbatim)` is followed by the
body, and then `## Evidence log index` at the **same heading level**, listing 26
internal gate log filenames (`gate-r2-final-suite-24.22.1-01M637X0J5W3WHZZ9E23F2934X.log`, …).
A copy-to-end-of-file of the "verbatim" region publishes those. The standalone
`pr-body.md` is clean — I diffed it against the embedded region and they are
identical up to exactly that appended section, and a leak scan of `pr-body.md`
(`orgasmic|/home/|/tmp/|ledger|worktree|TASK-|dispatch|tx-2026|run-01|xoxb|xoxp|
token|secret`) returns nothing.
Fix direction: paste from `pr-body.md`, or fence the verbatim region / move the
evidence index above it.

### LOW-C (design) — `idList` is no longer hole-safe on its own; it now depends on its caller copying first
`src/access-policy.ts:20-21`. Round 2 moved the `Array.from` out of `idList`
(`Array.from(value).every(...)` → `value.every(...)`) and into
`parseAccessPolicy` (`:35-36`). `Array.prototype.every` **skips holes**, so a
sparse array reaches `idList` as vacuously valid; only the parser's copy
normalizes it. Today that is correct and tested — holes are rejected
(`new Array(1)`, `[,'C1']`, `[undefined]` all → `Invalid Slack access policy`),
the sole `idList` call site passes copies, and removing the copy turns three
tests red (mutant `m2-no-array-copy`: tests 3, 11, 15). But A2/A4 add call
sites, and a future `idList(someArray, …)` on an uncopied value accepts holes
silently.
Fix direction: keep the one-line `Array.from` inside `idList` as well (it is
idempotent and cheap), or rename it `idListOfSnapshot` / inline it so the
precondition travels with the helper.

## Answers 1–6

**1. MEDIUM-1 is fixed — yes.** `src/access-policy.ts:17-19` are plain
`/^[CG][A-Z0-9]+$/`, `/^[UW][A-Z0-9]+$/`, `/^D[A-Z0-9]+$/`; the "Absolute end
assertions…" comment is gone (`grep -rn 'Absolute end' src test` → none;
`grep -rn 's\\S' src test` → none). My 11,178-input differential
(`probe-1-regex.mjs`) compares plain `$` against the removed `(?![\s\S])`
lookahead across 3 patterns × 6 prefixes × 27 bodies × 23 terminators (`\n`,
`\r`, `\r\n`, U+2028/2029, NUL, ZWSP, ideographic space, BOM, Plane-16): **0
differences**. The removed comment was simply wrong about JS — without `/m`,
`$` is end-of-input only, so `/^[CG][A-Z0-9]+$/.test('C1\n') === false`
(asserted). No `g`/`y`/`m` flags, so no `lastIndex` statefulness. Mutant
`m6-no-end-anchor` (anchors dropped) turns tests 3, 6 and 7 red, so the
newline rows really pin this.

**2. LOW-1 — yes, and the split is closed.** `probe-2-toctou.ts`, 27/27 ok:
- Reads each field **exactly once**, via `const { readJoinedChannels,
  writeChannels, dmUsers } = config` (`:34`), through `parseAccessPolicy`
  directly (A1) and through the constructor (A2); counters `{r:1,w:1,d:1}`. A
  getter that throws on its second read never trips (A3).
- **Validates the values it retains**: alternating getters that would hand back
  `['G9']`/`['bogus']` on a second read cannot influence the policy —
  `mayWrite('G9') === false`, `requireDmUser('bogus')` throws (A1/A2).
- **Proxy**: a `get`-trap config whose ownKeys trap reports the 3 keys fires
  once per field and cannot swap stored values (A4). A Proxy *list* yields one
  validated snapshot, not the live object (A6).
- **Accessor arrays**: an index getter that changes on re-read is snapshotted
  once (A5); a custom `Symbol.iterator` that disagrees with the indices is
  harmless in both directions — the iterator-sourced copy is the copy that is
  both validated and stored, and the reverse is rejected (A7). A lying `length`
  Proxy either rejects or stores only validated entries (A11).
- **Deep-frozen fresh copy**: result and both arrays frozen; arrays are not the
  input arrays; mutating the input after parse does not reach the copy; writes
  to the copy throw in strict mode (A8).
- **Own-key semantics**: inherited-only rejected, non-enumerable own accepted,
  extra string / extra symbol / symbol *named like a field* all rejected (A9).
- **Constructor is bound to it**: `src/access-policy.ts:48-53` reads only
  `parsed.*`; reverting that (mutant `m1-constructor-rereads`) turns the getter
  test red at 15 pass / 1 fail.
- One residual mechanism, harmless: `Reflect.ownKeys` is snapshotted at `:31`
  *before* the reads, so a getter that **adds** a 4th own key dodges unknown-key
  rejection — but the added key can never enter the result (A10 asserts
  `Reflect.ownKeys(parsed)` is exactly the three fields). Ordering is identical
  to `8030d418`, so it is not a regression. A getter that **deletes** a later
  field fails closed (A10).

**3. Key sets keep the old behaviour — yes, 92/92 identical.**
`probe-3-keyset-diff.ts` runs the old `validateAccessPolicy` (from
`git show 8030d418:src/access-policy.ts`) against the new `parseAccessPolicy`
over **92 cases**: 9 non-objects, all 8 present/absent subsets of the three
required keys, 15 bad-value cases, 12 extra keys × enumerable *and*
non-enumerable (incl. `''`, `'0'`, `'__proto__'`, `'constructor'`, `'toString'`,
`Symbol('writeChannels')`, `Symbol.iterator`), 10 prototype/descriptor shapes,
18 list-content cases, 8 valid variants. Result: **identical 92, divergences 0**
— same accept/reject *and* same error message. For the 18 accepted inputs it
additionally compares a full decision fingerprint (`dmsWritable`, `mayWrite`
and `requireDmUser` over 8 ids, and `requireReadable`/`requireWritable`/
`requireReadable`-with-no-scopes over 10 conversation shapes × 5 ids, 160+
outcomes each): byte-identical. This is expected analytically —
`ALLOWED_KEYS` is a copy of the 3-element `REQUIRED_KEYS` (`:23-24`), so
"all required present ∧ no key outside allowed" ≡ the old "exactly 3 keys ∧ all
in the list", and `Reflect.ownKeys` cannot return duplicates.

**4. The new tests are real.** Six first-party mutants of the new parser
(`mutate.py`, each a copy of the reviewed source with one behavioural change,
run against a verbatim copy of the committed test file; the reviewed worktree
was not touched) — **all killed**:

| mutant | exit | result | red test(s) |
| --- | --- | --- | --- |
| `m1-constructor-rereads` | 1 | 15/1 | 13 getter single-read |
| `m2-no-array-copy` | 1 | 13/3 | 3 ID shapes, 11 snapshot, 15 frozen copies |
| `m3-allow-unknown-keys` | 1 | 14/2 | 2 missing/unknown/null, 16 own keys |
| `m4-no-freeze` | 1 | 15/1 | 15 frozen copies |
| `m5-enumerable-keys-only` | 1 | 15/1 | 16 own keys |
| `m6-no-end-anchor` | 1 | 13/3 | 3 ID shapes, 6 channel metadata, 7 DM prefix |

Getter red/green independently reproduced: `m1` is the old constructor shape and
reproduces the implementer's red exactly — `not ok 13 - construction stores the
values validated from changing getters, reading each field once`, matching
`gate-r2-getter-red` (13 pass / 1 fail at `8030d418`); green is 16/16
(`gate-r2-green`, and five times in `r2-final-policy-1..5`, and in all three of
my first-party suites). `mayWrite('D…')` is pinned by test 14 for `'D'`, `'D…'`
and `'Dnot-an-id'`: `true` with peers, `false` with none, while `requireWritable`
rejects them with `/invalid DM metadata/` — the deliberate laxness is documented
by the test name and by the `:57` comment, and no caller exists to misuse it.
No mocks in the file (`grep -nE 'mock|stub|spy|sinon'` → none).

**5. Full suites and typecheck — reproduced first-party, 599/599 on all three.**
Receipts existed at this commit, but the suite is ~15 s, so I re-ran it in my own
worktree rather than reading only the implementer's logs — same runner
(`npm test` → `node --import tsx --test --experimental-test-isolation=none
test/*.test.ts`), loopback-guard `NODE_OPTIONS`, verified-empty user/global
npmrc, audit/fund/notifier off, under `timeout 900`. 599 pass / 0 fail / 0
skipped / 0 cancelled on 22.23.3, 24.22.1 and 22.12.0; `npm run typecheck`
clean. Baseline 583 is reused from the implementer's receipts
(`r2-baseline-suite-*`, 583/0 on all three, and `verify-baseline.py` asserted all
115 tracked files of the baseline archive byte-identical to upstream `7274283`
*after* the run) — `599 − 583 = 16` = the whole of the new test file, consistent
with a diff that adds only two files.

**6. PR body — accurate and public-safe, except LOW-A.** Everything checkable
checks out: upstream parent `7274283` (`git ls-remote upstream
refs/heads/main`); diffstat 2 files / 359 insertions and round-2 86/−24;
583→599 on three Nodes with typecheck+build receipts for 22.23.3 and 24.22.1 and
an honest "Not requested" for 22.12.0; 16/16 five times; red 13/1 then green;
"no mocks"; loopback guard; no importers in `src`, `test` or `dist`
(`dist/src/access-policy.js` exists and no other built file references it); no
README row; "the package is not published to npm" is the repo's own words
(`.github/workflows/release.yml:38`); the `no-changelog` route is real
(`CONTRIBUTING.md:110`, `.github/workflows/changelog.yml:14`, and
`gate-r2-final-changelog-policy` shows the unlabelled job correctly failing, not
passing); "33 existing fragments" is right (34 files in `changelog.d` minus
`README.md`, which `scripts/release-changelog.mjs:67` skips); scratch Node
tarball SHA-256s match the retained SHASUMS files for 24.22.1 and 22.12.0
(rechecked by me). No internal paths, task/dispatch IDs, tokens or secrets in
`pr-body.md`. The unresolved claims are LOW-A (the "fork" sentence) and LOW-B
(the report's unterminated verbatim region).

## Verification Gates

First-party, all via `orgasmic dispatch gate`, all at
`95916c48ef8110d1089e92df11f7fee30bdeb0ad` with a clean tree before and after:

| Gate | Command | Outcome | Log |
| --- | --- | --- | --- |
| `rv-suite-22.23.3` | `timeout 900 bash $EVID/rv-suite.sh 22.23.3` | exit 0 — 599/0, 0 skipped/cancelled | `gate-rv-suite-22.23.3-01M638QBYP17SJV3ZHR6GDKH74.log` |
| `rv-suite-24.22.1` | `timeout 900 bash $EVID/rv-suite.sh 24.22.1` | exit 0 — 599/0 | `gate-rv-suite-24.22.1-01M638QXHVZDYGQQ86Z1DKD7EK.log` |
| `rv-suite-22.12.0` | `timeout 900 bash $EVID/rv-suite.sh 22.12.0` | exit 0 — 599/0 | `gate-rv-suite-22.12.0-01M638RF5H69E0K0QV3V8D3P11.log` |
| `rv-typecheck` | `timeout 900 npm run typecheck` | exit 0 | `gate-rv-typecheck-01M638S4HG2DDZ38BPESDMMHGK.log` |
| `rv-probes` | `timeout 900 bash -c '… probe-1-regex.mjs; probe-2-toctou.ts; probe-3-keyset-diff.ts'` | exit 0 — PROBE-1 PASS (11,178 inputs, 0 diffs), PROBE-2 PASS (27/27), PROBE-3 PASS (92/92) | `gate-rv-probes-01M638S886WN54DVJKG8TG9TQT.log` |
| `rv-mutation` | `timeout 900 python3 $EVID/probe/mutate.py` | exit 0 — 6/6 mutants killed | `gate-rv-mutation-01M638SB6GENFTRG39V08EVPSE.log` |

Probe sources and mutant trees: `$EVID/probe/` (`probe-1-regex.mjs`,
`probe-2-toctou.ts`, `probe-3-keyset-diff.ts`, `mutate.py`,
`mutants/<name>/run.log`). Runner: `$EVID/rv-suite.sh`, guard
`$EVID/loopback.cjs`, empty configs `$EVID/npmcfg/`.

Reused receipts (read, not rerun; eligible — clean tree, exit 0, this commit):
`r2-baseline-suite-{22.23.3,24.22.1,22.12.0}` (583/0 each),
`r2-final-suite-*`, `r2-final-typecheck-{22.23.3,24.22.1}`,
`r2-final-build-{22.23.3,24.22.1}`, `r2-final-policy-1..5` (16/0 each),
`r2-getter-red` (13/1 at `8030d418`, dirty tree as expected for a red run — used
only as a red-test record, and independently reproduced by my `m1` mutant),
`r2-green`, `r2-final-inertness`, `r2-final-changelog-policy`,
`r2-final-release-dry-fold`, `r2-final-results`.

Unwrapped read-only checks (evidence, not receipts): source/diff reads, import
and leak greps, `git ls-remote upstream refs/heads/main`, tarball `sha256sum`,
`changelog.d` listing, `pr-body.md` ↔ `report.md` comparison.

## Unmet criteria / test gaps

No unmet acceptance criterion. Remaining gaps, all minor:

- **Parser single-read is tested only through the constructor.** Test 13 drives
  `new SlackAccessPolicy(input)`; nothing calls `parseAccessPolicy` directly
  with changing getters. Covered by probe A1, not by the suite. A future caller
  that uses the parser without the class is unguarded.
- **No Proxy in the suite.** Proxy configs and Proxy/accessor list arrays are
  covered only by probes A4–A7, A11.
- **`idList`'s hole precondition is untested at the helper level** (LOW-C) — only
  implied via test 3's `new Array(1)`.
- **The `ownKeys`-before-read ordering is untested** (probe A10). Harmless today,
  worth a line of test if the parser ever grows optional keys.
- **No production-path probe is possible, by design.** A1 has no importers, so
  "one production-path probe for behavioural claims" reduces to the inertness
  scan, which I reproduced. The real production-path proof belongs to A2/A4.
- **`ALLOWED_KEYS` is currently a copy of `REQUIRED_KEYS`**, so test 16 cannot
  distinguish "required" from "allowed". Fine as A-chain scaffolding; it must
  grow a case the moment an optional key appears.

## Residual risk

- The policy is dormant: it protects nothing until A2/A4 land, and a reader of
  `main` sees exported-but-unused code (`dist/src/access-policy.js` ships dead;
  the package is not published, so blast radius is the repo only).
- `mayWrite` is deliberately permissive for any `D`-prefixed string. Documented,
  tested, and currently uncallable — but it is the obvious foot-gun for A2. The
  "never an authorization decision" comment is the only guard.
- The parser is not a sandbox against hostile in-process getters/proxies and
  does not claim to be. Everything I threw at it (27 cases) failed closed or
  snapshotted correctly; the only residual mechanism is the harmless
  add-a-key-after-`ownKeys` dodge (A10). Exotic inputs whose getters *throw*
  propagate that error instead of `Invalid Slack access policy` — a rejection
  either way, and impossible for the JSON callers the format targets.
- Baseline 583 and the Node-tarball SHASUMS provenance are reused from the
  implementer's receipts; I verified tarball→SHASUMS consistency but did not
  re-download the official SHASUMS documents.
- Publication steps remain unverified-by-construction: the `no-changelog` label
  and the `feat/access-policy-model` branch rename are both still to do, and the
  changelog job fails without the label — correctly reported as such.

## Fix directions

1. **LOW-A** — rewrite `pr-body.md` bullet 3 to name the real contrast
   (`SLACK_DM_USERS`/`SLACK_SEND_CHANNELS` handling in `src/config.ts:16-17` and
   `src/slack-adapter.ts:347-352`) and to say the strictness is not yet reachable;
   drop the bare word "fork". One sentence, no code change.
2. **LOW-B** — publish from `pr-body.md`, or fence the verbatim region in the
   report / move `## Evidence log index` above it.
3. **LOW-C** — restore `Array.from` inside `idList` (`src/access-policy.ts:21`)
   or rename/inline it so the "caller must pass a snapshot" precondition is not
   implicit. Cheapest done now, before A2 adds call sites.
4. Optional, cheap: add a direct `parseAccessPolicy` getter-count assertion and
   one Proxy case to `test/accessPolicy.test.ts`, closing the two probe-only
   gaps above.

None of these need another implementer round before this PR goes out; 1 and 2
are PR-description edits and 3 is a one-line hardening that A2 can carry.
