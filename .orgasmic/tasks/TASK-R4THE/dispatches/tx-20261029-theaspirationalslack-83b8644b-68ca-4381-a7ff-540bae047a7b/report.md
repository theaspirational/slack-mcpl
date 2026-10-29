# TASK-R4THE review — A1 internal explicit access-policy model

Reviewed `8030d418cbaed0f55f015c2516eb5e7132b4cd35` (verified `git cat-file -t` = commit;
parent = `7274283fa719a17328ef8e085336ce25f6f22b08` = upstream main; `git rev-list --count` = 1).
Worktree HEAD already equalled the target, so no scratch export was needed. Tree pristine at
start and end (`git status --porcelain --untracked-files=all` empty; only ignored `dist/` present).
Read-only throughout: no edits, commits, pushes or GitHub comments; all mutation work ran on
copies under `/tmp`, never on the tracked file.

## Verdict

**Approve — ship after the one-line comment fix in MEDIUM-1.** No HIGH findings. The commit does
what it claims: a pure, provably inert policy model with a strict validator, correctly ported from
the fork with groups/fallback removed. All acceptance criteria are met and independently
reproduced. Nothing A2–A4 needs is lost, and the validator shape extends to `groupDms` for G
without loosening null rejection (proven, not argued). The findings below are one false source
comment and three notes that matter to later links in the chain; none of them block A1.

## Findings

### MEDIUM-1 — `src/access-policy.ts:17` — false claim in a shipped comment (docs)

```
// Absolute end assertions: unlike $, these reject even a trailing newline.
```

This is wrong for JavaScript. Without the `m` flag, `$` already asserts end-of-input only — the
"matches before a final newline" behaviour the comment ascribes to it is Python/Perl, not JS.

Evidence (`probe` in transcript): `/^a$/.test("a\n")` → `false`;
`/^[CG][A-Z0-9]+$/.test("C1\n")` → `false`. A 16-case sweep comparing the fork's
`/^[CG][A-Z0-9]+$/` against A1's `/^[CG][A-Z0-9]+(?![\s\S])/` over
`["C1","G1","C","c1","C1 "," C1","C1\n","C1\r","C1\n\n","#general","CA0Z9","C1\nC2","D1","U1",""]`
→ **0 differing cases**. The two forms are exactly equivalent; the three regexes at `:18-20` are
character-for-character the fork's classes with only the anchor idiom changed.

Failure scenario: no behaviour change — the cost is a disprovable technical claim in a
security-relevant source file, which also justifies an obscure idiom that costs readability for
zero gain. The same claim is restated in the implementer report ("an absolute end assertion
instead of JavaScript `$`, which admits a final line terminator"). CONTRIBUTING.md:81-83 names
"claims the branch itself disproves" as exactly what earns a changes-requested review, so an
upstream reviewer who knows JS will flag this. It would also propagate a wrong belief into A2–A4
and G, which will copy the idiom.

Fix: either use `$` (shorter, idiomatic, identical), or keep the lookahead and correct the comment
to say it is an explicit end-of-input assertion *equivalent to* `$`, chosen for explicitness. Drop
the claim from the report wording too. The PR body draft does **not** repeat it — leave it that way.

### LOW-1 — `src/access-policy.ts:41-46` — validation does not bind to the snapshotted values (design)

The constructor calls `validateAccessPolicy(config)` — which reads each property once — and then
reads the same three properties *again* to build its sets. For a config with accessor properties or
a Proxy, the validated values and the stored values can differ.

Evidence (`$ORGASMIC_EVIDENCE_DIR/probe/toctou2.ts`), a config whose `dmUsers` getter yields
`['U1']` then `['not-a-user-id']`:

```
construction succeeded; dmUsers getter reads = 2
requireDmUser("not-a-user-id") => ALLOWED   <- validator would reject this ID
requireDmUser("U1")            => denied    <- the ID validation approved
```

Impact today: **none.** A1 is unreachable, and the declared callers — `JSON.parse` output and
object literals (`:24-25`) — never produce getters; a hostile in-process caller could construct any
policy it liked anyway. It matters for A4: if A4 validates an operator config at one layer and
constructs at another, or hands the validated object onward, the "one strict boundary" guarantee is
not binding.

Related ergonomics for A4, same fix: the `asserts value is T` shape works only through an
intermediate annotated variable. `probe/a4ergo.ts` (parse → annotate → assert → use) compiles
clean; `probe/a4ergo-bad.ts:10` calling it through an alias fails with
`TS2775: Assertions require every name in the call target to be declared with an explicit type
annotation`, and the inline form forces a re-parse because nothing is returned.

Fix direction: read the three values into locals once, validate the locals, snapshot from the
locals. Better, and it fixes both symptoms: replace the assertion with
`parseAccessPolicy(value: unknown): SlackAccessPolicyConfig` returning a normalized frozen copy,
and have the constructor consume that. Cheap now while there are no callers; awkward once A4 exists.

### LOW-2 — `src/access-policy.ts:30`, `:65` — two redundant guards; the group-DM test pins the outcome, not the guard (test)

Two of my 16 mutations survived at 12/12. **Both are equivalent mutants, not test gaps** — I proved
each rather than assuming:

- `:30` `keys.length !== 3` → `< 3` survives because the following
  `keys.every(... includes ...)` already rejects every unknown key and the per-field type checks
  already reject missing ones. Differential over a 92-input corpus (symbol keys, non-enumerable own
  keys, prototype-only fields, `__proto__`/`constructor`/`toString` keys, the full power set of the
  three required keys, each with and without an extra key): the single disagreement was an artifact
  of my own stateful getter (LOW-1), not a real difference.
- `:65` `|| conversation.is_mpim === true` → removed survives because `is_im === true` routes to the
  `:69` mpim strictness and everything else to the `:75` `is_mpim !== false` check. Differential
  over **352,947 metadata combinations** (7 ids × 7 channel ids × 7 values for each of
  `is_im`/`is_mpim`/`is_private`/`is_member` × 3 users): **0 behavioural disagreements.**

So both guards are harmless defence-in-depth and no change is needed in A1. The consequence that
*does* matter: `test/accessPolicy.test.ts:143` ("group DMs are unsupported even with membership, a
write pin and mpim scopes") still passes with the dedicated mpim guard deleted. It pins the
*outcome* while its coverage of the dedicated guard is incidental. When G reintroduces the
group-DM branch **ahead** of these checks — where the fork had it (`fork:82-86`) — that test is the
regression net. Fix direction for G: add a row that distinguishes a group DM rejected by the
dedicated guard from one rejected by the generic strictness, so loosening `:69`/`:75` cannot pass
silently.

### LOW-3 — `src/access-policy.ts:83-85` — write admission requires readability: a config trap for A4 (design, no A1 action)

`requireWritable` delegates to `requireReadable`, so `readJoinedChannels: false` denies **every**
ordinary-channel write even for an explicitly pinned `writeChannels` entry. This is inherited fork
behaviour (`fork:108-110`), it is deliberate, and `test:81-87` pins it (`pinned && !readJoinedChannels`
→ throws). DMs are correctly exempt (`kind !== 'dm'`), which `test:95-108` pins across all three
membership values.

Nothing to change in A1. Flagging it because an operator who pins a write channel and leaves
`readJoinedChannels: false` gets a silent total denial with no diagnostic. A4 should either document
this coupling or reject/warn on that combination at config time.

## Verification Gates

Gates I ran (wrapped, reusable receipts in `$ORGASMIC_EVIDENCE_DIR`). The brief asked for fresh
full suites, so I ran my own rather than resting on the recorded receipts:

| Gate | Command | Result | Log |
| --- | --- | --- | --- |
| `rev-suite-22.23.3` | `timeout 900 bash rev-suite.sh 22.23.3` | exit 0 — **595 pass / 0 fail**, 0 skip/cancel/todo | `gate-rev-suite-22.23.3-01M6375AKPHW45RRXN0F83R3ZD.log` |
| `rev-suite-24.22.1` | `timeout 900 bash rev-suite.sh 24.22.1` | exit 0 — **595 pass / 0 fail**, 0 skip/cancel/todo | `gate-rev-suite-24.22.1-01M6376QHXKTDF68SZQ888C77Q.log` |
| `rev-suite-22.12.0` | `timeout 900 bash rev-suite.sh 22.12.0` | exit 0 — **595 pass / 0 fail**, 0 skip/cancel/todo | `gate-rev-suite-22.12.0-01M637A6B9246V5SN9P4RASGZ3.log` |
| `rev-typecheck` | `timeout 900 npm run typecheck` | exit 0 | `gate-rev-typecheck-01M637B4YZM9GJJF0VQ5CQBY8X.log` |
| `rev-build` | `timeout 900 npm run build` | exit 0, tree still clean | `gate-rev-build-01M637B582GZE9CRZVZ6NFT2M0.log` |

Each suite ran under the loopback guard (`NODE_OPTIONS=--require .../loopback.cjs`, re-probed in my
own evidence dir: non-loopback and unspecified binds refused, explicit `127.0.0.1` allowed), empty
npm user/global configs, `npm_config_audit/fund=false`. Node 24.22.1 and 22.12.0 from the
checksum-verified scratch runtimes; 22.23.3 is `/opt/node`.

Scoped probes (unwrapped — evidence, not reusable receipts; sources archived in
`$ORGASMIC_EVIDENCE_DIR/probe/`):

- **Independent baseline.** `git archive 7274283f… | tar -x` into `/tmp/r4the-base`, `npm test` on
  22.23.3 → **583 pass / 0 fail**, with `src/access-policy.ts` confirmed absent. 595 − 583 = 12 =
  exactly the 12 top-level tests in the new file, and no existing test file was touched
  (`git diff --name-status` = 2 files, both `A`). The PR body's table is accurate and the
  "failure count identical to baseline" standard holds at 0 = 0.
- **Mutation set, 16 mutations, 14 killed** (`probe/mutate.py`), run against an isolated copy of
  `src/`+`test/` in `/tmp/r4the-mut` (baseline 12/12 reproduced there first). Killed, with the test
  that caught each: scope-selection swap (1 fail), write-skips-readability (5), dm-peer-any-user (4),
  user-id-unanchored (1), channel-id-unanchored (2), sparse-arrays-allowed (1), null-lists-accepted
  (2), readjoined-ignored (3), is-member-ignored (2), write-pin-ignored (2),
  dm-mpim-strictness-removed (1), scope-string-check-removed (1), list-copy-live (1),
  identity-check-removed (2). Survivors `unknown-keys-allowed` and `mpim-early-guard-removed`
  proven equivalent (LOW-2). Source restored and asserted byte-identical after every run.
- **Vacuity audit** (`probe/vacuity-audit.test.ts`): shimmed `assert.throws` so every *bare*
  single-argument call must observe an `Error` whose message is one of the six policy messages.
  **265 bare calls audited, 12/12 still pass** — no row in the file passes on a `TypeError` or any
  unintended error.
- **groupDms extensibility** (`probe/extend.ts`): a G-shaped successor validator (allowed-key set +
  required-key set + present-means-valid optional) over 15 rows → **0 mismatches**, with
  `groupDms: null`, `groupDms: undefined`, sparse, bad-id and trailing-newline all still rejected.
- **Inertness, production path**: `git grep` for `access-policy|SlackAccessPolicy|validateAccessPolicy|AccessConversation`
  over `src` excluding the file itself → no references. Nothing in built `dist/src/` imports it.
  CI's `Start without credentials` leg replicated verbatim from `ci.yml`:
  `node dist/src/index.js --stdio </dev/null` → exit **1**, stderr an exact `cmp` match to the
  expected missing-token line, stdout empty — i.e. the one real runtime surface is byte-identical.
- **Regex equivalence sweep** and **TS assertion ergonomics** (`probe/a4ergo*.ts`) as cited in the
  findings.

Reused implementer receipts (read, not rerun — all at this commit, clean tree, exit 0):
`final-suite-{22.23.3,24.22.1,22.12.0}` (595/0 each; the 24.x log uses `ℹ` rather than `#` for its
summary, which is why a `#`-only grep looks empty), `final-typecheck-24.22.1`, `final-build-24.22.1`,
`final-inertness-and-guard`, `final-provenance` (115 tracked baseline files byte-identical),
`final-changelog-policy`, `final-release-dry-fold`, `final-policy-5`. My fresh runs agree with all
of them.

## Unmet Criteria / test gaps

No unmet acceptance criteria. Each one checks out:

- One commit on current upstream main, pure model + tests, no connector opt-in — verified.
- Strict format (required core fields, unknown keys rejected, null optional lists rejected) —
  verified, and mutation-killed in both directions.
- Red/green plus a full one-process suite on three Node versions — reproduced independently,
  including the MSRV floor 22.12.0 (`engines: >=22.12.0`), which is also the only leg CI runs the
  suite on.
- A PR body describing inert preparation in a chain — present; see answer 6 for two edits.

Test gaps, all minor and all in later-link territory:

1. The dedicated mpim guard at `:65` is not isolated by any test (LOW-2) — matters for G.
2. No test pins the *reason* for rejection where several guards overlap. The vacuity audit shows
   every bare `assert.throws` sees a genuine policy error, and only `:46` and `:164` match on
   message; a future refactor could shift which guard fires without failing anything. Acceptable
   for a fail-closed model, worth tightening if A2 starts surfacing these messages to agents.
3. `mayWrite` uses `channelId.startsWith('D')` while the DM path uses the stricter `DM_ID`
   (`:52` vs `:70`). Intended — it is documented as a hint and `test:206` pins `mayWrite('D2') === true`
   — but no test pins the inconsistency as deliberate, so A2 could mistake it for a bug.

## Residual Risk

- **Narrow.** A1 is unreachable, so the blast radius of any defect in it is zero until A2 wires it
  up. The real risk sits in the chain: A2 must supply fresh, exact metadata, since the model does no
  I/O and cannot verify freshness (`:35`, `:63`) — correctly disclaimed in the PR body.
- The strictness divergence from the fork (unknown keys and null lists now rejected, where the fork
  silently accepted `null` via `?? []` and ignored unknown keys) is a migration hazard for anyone
  porting a fork config. It is in the implementer report's Residual Risk but **not** in the PR body
  (see answer 6).
- F (history fallback) will need `HISTORY_MEMBERSHIP_PROOF` and its `AccessConversation` symbol slot
  re-added from scratch; A1 dropped them entirely (`fork:17`, `fork:20`). Intended per the approved
  plan, but it is a re-add, not a re-enable.
- `dist/src/access-policy.js` is built but imported by nothing, and CONTRIBUTING.md:139-141 states
  the package is never published to npm — so it is not a consumer API surface. No `exports` map or
  `files` field exists, which would otherwise have made it deep-importable.
- Unverified, as the PR body says: no live Slack workspace, no live MCPL host, no macOS. CI builds
  on two macOS legs; nothing in this change is platform-sensitive.

## Answers to the brief

**1. Correctness versus the fork.** Diffed `fork:685b2deb:src/access-policy.ts` (113 lines) against
A1 (88 lines). Every change is deliberate and correct:

- *Groups and fallback removed* — `groupDms`, `historyMembershipFallbackChannels`,
  `HISTORY_MEMBERSHIP_PROOF`, `groupDmsReadable`, `historyMembershipFallbacks`,
  `usesHistoryMembershipFallback`, the `group_dm` branch and the `channels:history` fallback branch
  are all gone, and the return union narrows to `'channel'|'private_channel'|'dm'`. Clean removal,
  no orphans.
- *Strict validation* — a genuine improvement over the fork, which accepted unknown keys silently
  and turned `historyMembershipFallbackChannels: null` into `[]` via `?? []`. Unknown keys, `null`,
  `undefined`-as-own-key and sparse arrays are now all rejected; `Array.from` at `:22` is what makes
  the sparse case work (plain `.every` skips holes), and the `sparse-arrays-allowed` mutant confirms
  a test catches it.
- *End-anchored id regex* — behaviourally identical to the fork's `$`; see MEDIUM-1 for the false
  comment. Character classes unchanged.
- *U/W ids* — **unchanged from the fork**, which already used `[UW]`. The implementer report
  correctly lists this under "Preserved" rather than claiming it as new; the PR body's mention of
  "U/W peers" describes what the model does, which is fair.

*Is anything A2–A4/G need lost or awkward?* No. A2 has `requireReadable`/`requireWritable`/
`requireScope`/`requireDmUser`/`mayWrite`/`dmsWritable`; A3 has the `writeScope` parameter and
`test:171-181` already exercises `files:write` and `reactions:write`; A4 has the shared validator.
G must widen the return union (a compile error at every call site, which is the good failure mode),
re-add the branch ahead of `:65`, and edit `test:41-42` — keeping the `groupDms: null` row while
changing the `[]`/`['G1']` rows, which the comment at `test:40` already anticipates. The one real
awkwardness is LOW-1's validator shape, best fixed now.

*Is the validator shape extendable for groupDms without loosening null rejection?* **Yes — proven.**
`probe/extend.ts` implements the successor (allowed-key set + required-key set + `present ⇒ valid`
for optionals) and gets 15/15 expected verdicts, with `groupDms: null` and `groupDms: undefined`
still rejected alongside sparse, non-array, bad-id and trailing-newline values. The only edit needed
is replacing `keys.length !== 3` with an explicit required/allowed pair — and LOW-2 shows that
expression is already redundant, so nothing is lost. Critically, G must **not** reintroduce the
fork's `config.groupDms ?? []`, which is precisely what silently accepted `null`.

**2. Is it truly inert?** Yes, at source, build and runtime. No `src/` import (verified by grep);
nothing in `dist/src/` imports it; no exported surface an operator can reach — no config key, no CLI
flag, no README row, no `exports` map, and the package is never published. The only runtime
entrypoint behaves byte-identically: CI's start-without-credentials leg reproduced exactly (exit 1,
exact stderr, empty stdout). Behaviour change for anyone: none. The suite delta is exactly the 12
new tests and no existing test file was touched. The only observable differences anywhere are two
new files in `dist/` that nothing loads.

**3. Tests.** Each matrix row does test what it claims. The channel matrix (`test:71-93`) is a real
2⁵ = 32-row sweep over id prefix × private × readJoinedChannels × membership × pin, and asserts the
returned kind, not just absence of a throw. The DM test (`test:95-108`) correctly varies membership
across `undefined`/`false`/`true` to prove DM access ignores it. The scope test (`test:155-169`) is
the one that proves scope follows metadata rather than the ID prefix — the `['G1', channel('G1'),
'channels:read']` row is the load-bearing one, and it is the test my scope-selection-swap mutant
killed. My own mutations: 16 run, **14 killed**, including all three the brief named — scope
selection (killed, 1 fail), write-requires-readability (killed, 5 fails), DM peer matching (killed,
4 fails) — plus both id anchors, the sparse-array and null-list rules, the write pin, membership,
the read flag, the list snapshot and the identity check. *Can a test pass vacuously?* Not in any way
I could find: the vacuity audit forced all **265** bare `assert.throws` calls to observe a genuine
policy error and all 12 tests still passed, so none of them is satisfied by a `TypeError` from a
malformed fixture. The two survivors are equivalent mutants, proven over 92 and 352,947 inputs
respectively, not blind spots. Residual gaps are listed above.

**4. Fresh full suites.** Ran all three myself: **595 pass / 0 fail** on 22.23.3, 24.22.1 and
22.12.0, zero skipped/cancelled/todo on each, against an independently reproduced baseline of
**583 pass / 0 fail**. Expectation of "595 against 583" confirmed on all three. Typecheck and build
both exit 0 and leave the tree clean.

**5. Changelog.** **The worker is right: no fragment plus the `no-changelog` label is correct.**
CONTRIBUTING.md:112-116 scopes entries to "anything an operator, a host, or an agent on the other
end would notice" and explicitly exempts internal refactors — and I verified by probe that nobody
can notice this change. `changelog.yml:14` skips the job entirely when the label is present, and
:32-36 fails any `src/` touch without a fragment, which the implementer reproduced as a real exit 1.
A maintainer would not want a fragment here; a changelog entry for unreachable code would be noise
and would have to be re-described when A4 actually exposes the setting. Two caveats: the label is a
publication-time action nobody has taken yet, so if the PR is opened before it is applied the
changelog check goes red — the body already asks for it, which is the right handling; and the
exemption rests on A1 staying inert, so A2/A3 (also dormant) can reuse it but **A4 must ship a
fragment**, since that is the PR an operator notices.

**6. PR body draft.** Accurate, public-safe and template-conformant. Every number in it I verified
independently; no internal paths, task IDs or ledger references leak; Problem/Changes/Tests/Not
verified match `.github/PULL_REQUEST_TEMPLATE.md`, the companion-PR declaration satisfies
CONTRIBUTING.md:27-32 with explicit merge-order guidance, and the "Not verified" section is honest
rather than decorative. The AI-footer rule is satisfied on both halves: the
`🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)` footer is the "or equivalent for
your tooling" form CONTRIBUTING.md:77 permits, and the commit carries the required
`Co-Authored-By: GPT-6-Astra` trailer (:79). It frames the chain well enough for a maintainer to
accept dormant code — "inert until a later PR exposes configuration", an explicit list of what does
not import it, and A4 gated on complete enforcement. Two edits before posting:

- **Branch name.** CONTRIBUTING.md:21 wants `feat/<kebab-case>`; the current branch is
  `task-r4the-impl`. Push as something like `feat/access-policy-model`.
- **Add the fork-strictness divergence.** One line in Changes: unknown keys and null lists are now
  rejected where the fork accepted them silently. It is the single thing a maintainer porting a fork
  config would care about, and it currently lives only in the implementer report's Residual Risk.

Optional, to pre-empt the obvious "why merge dead code" question: note that
`dist/src/access-policy.js` is built but imported by nothing and the package is not published.

## Fix Directions

1. **MEDIUM-1 (do before posting):** correct or delete the `:17` comment — either switch the three
   regexes to `$`, or keep `(?![\s\S])` and describe it as an explicit end-of-input assertion
   equivalent to `$`. Remove the same claim from the report wording.
2. **PR body (do before posting):** rename the branch to `feat/<kebab-case>`; add the one-line
   fork-strictness divergence to Changes. Apply `no-changelog` when the PR is opened, or CI goes red.
3. **LOW-1 (best done in A1, cheap while there are no callers):** make validation bind to the values
   actually stored — either snapshot into locals before validating, or replace the `asserts` function
   with `parseAccessPolicy(value: unknown): SlackAccessPolicyConfig` returning a normalized frozen
   copy. This also removes the `TS2775` aliasing restriction A4 would otherwise hit.
4. **LOW-2 (for G):** extend the validator with an allowed/required key-set pair rather than a key
   count, never with `?? []`, and add a test row that distinguishes a group DM rejected by the
   dedicated `:65` guard from one rejected by generic strictness. The two redundant guards need no
   change in A1.
5. **LOW-3 (for A4):** document or reject the `readJoinedChannels: false` + non-empty `writeChannels`
   combination, which silently denies every channel write.
