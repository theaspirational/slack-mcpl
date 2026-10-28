# Review — TASK-9YJZP round 2 @ 13692e01c58dd65ad74496afda351ed96c72d9e6

Preflight: `git rev-parse HEAD` = `13692e01c58dd65ad74496afda351ed96c72d9e6` ✓, tree clean.
Read `git diff 252365fe..HEAD` in full, then re-read `git diff 685b2deb..HEAD` in full.

## Verdict

**Approve.** All four round-1 findings (1 MEDIUM, 3 LOW) are closed and
independently verified. No HIGH and no MEDIUM findings. Two LOW notes below are
polish, not blockers. The branch applies cleanly to upstream main and its tests
build and pass there with nothing fork-only.

## Findings

### LOW — docs — `changelog.d/channel-label-framing.fixed.md:1` (source-read)

The fragment's closing sentence reads as an exhaustive enumeration of the reach
points — "These labels reach `channels/register`, `channels/changed`,
`channels/open`, `refresh_channels`' `added`, and a write's `to`" — but omits
`channels/list`, which returns `channelManager.getAll()` descriptors verbatim
(`src/server.ts:507-513`, `ChannelsListResult { channels: ... }`), labels
included. Every one of the five named points *is* real (verified below), so the
entry is not wrong, only short by one. Fix direction: add `channels/list`, or
reword to "reach the host wherever a descriptor does" so the list is clearly
illustrative.

### LOW — test — `test/senderFraming.test.ts:325-337` (run)

The only production-path test covers `kind: 'channel'` with the modest hostile
name `</system>\n] forged header` and asserts against the narrow `/[<>\r\n]/`.
The characters the round-1 LOW asked for (U+0085, U+2028, U+2029, U+202E,
U+00A0, U+3000, U+007F, U+009F, U+0600, U+FE0F, U+3164, U+2800), the other three
kinds, and the empty-workspace path are covered by `test/channels.test.ts` unit
tests only — they never travel through `channels/register` or a write's `to`.
The unit tests do pin `toDescriptor` exactly and the server copies
`descriptor.label` without touching it (`src/server.ts:1111`, `:1404`, `:1323`),
so the risk is small. Fix direction: reuse the widened `leak` class in the
harness assertion and parameterize `started(t, { channelName })` over one exotic
name.

## Answers to the brief's questions

### 1. Changelog fragment

- **Filename/format:** `channel-label-framing.fixed.md` matches the workflow's
  `^changelog\.d/[^/]+\.(breaking|added|changed|fixed)\.md$` and
  `changelog.d/README.md`'s `<slug>.<category>.md`; one `- ` bullet, no
  headings, no rules.
- **Would satisfy `.github/workflows/changelog.yml`:** yes. I replicated the
  workflow's shell logic locally against both plausible PR bases — upstream main
  `439a81b5` and the fork branch point `685b2deb`. Both print `OK`: `src/`
  changed and the fragment appears in
  `git diff --name-only --diff-filter=A base...HEAD`, so it is genuinely
  *added*, not renamed. (The implementer's `r2-changelog` receipt used base
  `252365fe`, a weaker base than the real PR's; my check uses the real ones.)
- **Release-time validation:** ran `node scripts/release-changelog.mjs` in the
  scratch clone at the cherry-picked tip — exit 0, folded 34 fragments, and the
  bullet lands intact in the new section (`CHANGELOG.md:186`). The inline
  `` `#` `` does not trip the script's `isHeading` check, since no *line* starts
  with `#`.
- **Category `fixed`:** matches precedent — `sender-framing.fixed.md` files the
  same class of name/label framing change under `fixed`. Not `breaking` by
  `CONTRIBUTING.md`'s test, since no reader "needs to act": nothing in `src/`
  parses a label back (grepped all `label` uses; every one is write-only).
- **Accuracy:** verified claim by claim.
  - "quoted when not plain, with the channel's `#` inside the quotes" ✓
    (`src/framing.ts:53-55`, `channelShown` quotes `` `#${name}` `` as a unit).
  - "Plain names are unchanged" ✓ — proved by the differential probe below:
    across 512 inputs, zero labels changed versus `685b2deb` where both the
    conversation name and the workspace name are plain by the real
    `PLAIN_NAME && !HAS_INVISIBLE` predicate.
  - "an empty workspace name is omitted rather than shown in parentheses" ✓ and
    this is a *reachable* path, not hypothetical: `src/slack-adapter.ts:758`
    sets `teamName` to `(auth.team as string | undefined) ?? ''`.
  - **All five reach points are real:** `channels/register`
    (`src/server.ts:1240`, descriptors sent as-is), `channels/changed` (`:1323`,
    `{ added }` descriptors), `channels/open` (`:1415-1445`,
    `handleChannelOpen` returns `{ channel: desc }`), `refresh_channels`'
    `added` (`:1404`, `added.map((d) => ({ id: d.id, label: d.label }))`), a
    write's `to` (`:1111`, `recipient()`).

### 2. `src/channels.ts:25-29` — empty workspace, and what relied on `()`

- **Empty workspace omits the suffix for all four kinds** ✓. `const team =
  teamName ? ... : ''` is applied uniformly to the `dm`, `group_dm` and channel
  arms. Covered by four tests (one per kind), and mutation 1 below shows all
  four fail without the guard. This also matches the existing convention at
  `src/server.ts:156`, where the location header already does
  `if (loc.teamName) parts.push(...)`.
- **Non-empty plain and hostile names render exactly as at `252365fe`** ✓,
  proved rather than inspected. A differential probe (`r2rev-probe.ts`, outputs
  archived beside this report) evaluates `toDescriptor` over 4 kinds × 16 names
  × 8 workspace names = **512 cases** at both `252365fe` and `HEAD`: **64
  differ, and all 64 are exactly the 64 empty-workspace cases. Zero differences
  for any non-empty workspace name, plain or hostile.**
- **Did anything rely on the older `()` output?** No.
  - *Tests:* no test at `685b2deb` calls `toDescriptor` with an empty or `""`
    team name, and none asserts a bare `()` label (`git grep` at `685b2deb`
    over `test/`).
  - *Docs/README:* the only label examples are `README.md:311`
    (`#support (acme)`, `DM: @Ann (acme)`) — plain names, unaffected.
  - *Consumers:* nothing reads a label back. Every `label` use in `src/` writes
    it out (`server.ts:1111`, `:1323`, `:1404`, `channels.ts:33`); there is no
    parsing, splitting or matching of a label anywhere, and
    `@animalabs/mcpl-core` types it as a bare `label: string`
    (`dist/src/methods.d.ts:278`) with no pattern or length constraint.

### 3. Tests and mutation evidence

All four mutations were temporary edits to tracked production files, reverted
byte-for-byte (`sha256sum -c` OK) with `git diff --exit-code -- src` passing
afterwards and a green full suite. **No commit was made.**

| # | Temporary production edit | Targeted test | Result |
|---|---|---|---|
| 1 | `src/channels.ts:25` → `const team = ` `` ` (${nameShown(teamName)})` `` (drop the empty guard) | `-p 'omits an empty workspace'` | **red 4/4**; actual `DM: @plain-name ("")` — reproduces the round-1 LOW |
| 2 | `src/channels.ts:29` → `` `#${conv.name}${team}` `` (undo `channelShown`) | `-p 'quotes hostile'` (channels) + `-p 'hostile ordinary-channel label'` (senderFraming) | **red 2/8 unit** (`channel`, `private_channel` only — correctly scoped) **and red 1/1 harness** |
| 3 | `src/channels.ts:25` → `` ` (${teamName})` `` (undo `nameShown`) | `-p 'quotes hostile team names'` + `-p 'names its people and workspace by the name rule'` | **red 4/4 unit, red 1/1 harness** |
| 4 | `src/framing.ts:19` `UNSEEN` narrowed to `[<>-  ]` (drop U+2800, the invisibles and the non-ASCII-space branch) | `-p 'quotes hostile'` | **red 8/8** |

Mutation 4 is the direct answer to the round-1 "character class too narrow"
LOW: the widened `leak` class has teeth. Under the old `/[<>\r\n]/` assertion
that narrowing would have passed silently; under the new class all eight
hostile-name tests fail. I also checked by hand that every character in the
widened `hostile` string is matched by the widened `leak` class and escaped by
`quotedLabel` — U+0085, U+007F and U+009F via the `-` range;
U+202E and U+0600 via `\p{Cf}`; U+FE0F and U+3164 via
`Default_Ignorable_Code_Point`; U+00A0 and U+3000 via `(?! )\p{Zs}`; U+2800
explicitly — so the assertion is meaningful for each, not merely wide.

The harness test at `test/senderFraming.test.ts:325` is a genuine
production-path probe: `started()` completes `initialize`, sends a real
`featureSets/update` with `FULL_GRANT`, and waits for a real `channels/register`
over the harness transport; the test then issues a real `tools/call
send_message` and reads `to` out of the tool result JSON. Mutation 2 turning it
red confirms it exercises the fixed line rather than re-deriving it.

### 4. Ready as one small PR against upstream main `439a81b5`?

**Yes.** Verified three ways, not inferred:

- `git merge-base 439a81b5 HEAD` = `439a81b5` — HEAD already descends from
  upstream main.
- `git merge-tree --write-tree --messages --merge-base 685b2deb 439a81b5 HEAD`
  → exit 0, tree `1c445259`, **no conflict messages**. The four touched paths
  (`src/channels.ts`, `test/channels.test.ts`, `test/senderFraming.test.ts`,
  `changelog.d/channel-label-framing.fixed.md`) are untouched by every
  fork-only commit between `439a81b5` and `685b2deb`.
- **Real cherry-pick in a scratch clone outside the worktree**
  (`/tmp/r2rev-upstream`): all three commits applied with no conflicts onto
  `439a81b5`, then `npm ci --ignore-scripts` → `npm run typecheck` → `npm run
  build` → `npm test` all clean. **592 tests, 592 pass, 0 fail, 0 skipped on
  Node 22.23.3, and 592/592/0/0 on Node 24.22.1.** All 13 new tests run and
  pass there (`toDescriptor omits an empty workspace for {channel,
  private_channel, group_dm, dm}`, the eight hostile-name/team-name tests, and
  `a hostile ordinary-channel label survives registration and a write's to`).

**Nothing in the tests is fork-only.** `channelShown`/`nameShown`/`quotedLabel`
all pre-exist in upstream `src/framing.ts` at `439a81b5`, and
`test/senderFraming.test.ts`'s `started(t, { channelName })` harness is upstream
too. The three commits are a reasonable single small PR (one production line
group + tests + fragment), though a squash would read better than `252365fe`'s
"Align framing expectations…", which is a fixup of its parent.

### 5. Anything else to block on

Nothing. One scope observation, not a block: the change also quotes the
*workspace* name, which at `685b2deb` was interpolated raw on the same line
(`#${conv.name} (${teamName})`). That is the same defect class on the same
expression and the round-1 review already approved it; the fragment discloses
it, and the differential probe shows the resulting change is confined to
non-plain workspace names.

## Verification Gates

Fresh at this commit through `orgasmic dispatch gate`; no implementer receipt
reused for any claim. `npm ci` ran with `NO_UPDATE_NOTIFIER=1` and two distinct
empty npm config files (`npm_config_userconfig=/tmp/r2rev-npm/userconfig.ini`,
`npm_config_globalconfig=/tmp/r2rev-npm/globalconfig.ini`).

| Gate | Command | Exit | Counts |
|---|---|---|---|
| `rev2-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | 0 | 51 packages |
| `rev2-build22` | `npm run build` (Node 22.23.3) | 0 | — |
| `rev2-typecheck22` | `npm run typecheck` (Node 22.23.3) | 0 | — |
| `rev2-test22` | `npm test` (Node 22.23.3) | 0 | 840 tests / 812 pass / **0 fail** / 28 skipped |
| `rev2-test24` | `node --version && npm test` (Node 24.22.1 on PATH) | 0 | 840 / 840 / **0 fail** / 0 skipped |
| `rev2-postmutation-green` | `npm test` after restoring all mutations | 0 | 840 / 812 / **0 fail** / 28 skipped |

- **Public registry only:** every `"resolved"` host in `package-lock.json` is
  `https://registry.npmjs.org`; no `.npmrc` in the repo; `npm config get
  registry` under the isolated configs returns `https://registry.npmjs.org/`.
- **Node 24.22.1 provenance:** downloaded `node-v24.22.1-linux-x64.tar.xz` and
  `SHASUMS256.txt` from `https://nodejs.org/dist/v24.22.1/` into
  `/tmp/r2rev-node24` (outside the repository); `sha256sum --check` against the
  line selected from `SHASUMS256.txt` → `OK`
  (`6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`);
  `node --version` → `v24.22.1`, echoed at the top of the `rev2-test24` log.
- **Base vs final counts (Node 22.23.3), both run by me:** base `685b2deb` =
  823 tests / 795 pass / 0 fail / 28 skipped; final `13692e0` = **840 / 812 / 0
  fail / 28 skipped** → **+17 tests** (16 from the four-kind loop, 1 harness
  test; one existing test was renamed, not added).
- **The 28 skips are pre-existing and unrelated**, not a regression: they are
  the `durableTest` block in `test/recipientRouting.test.ts:10-11`, gated on
  `Number(process.versions.node.split('.')[0]) >= 24 && typeof process.geteuid
  === 'function'`. They are 28 at base and 28 at final, and 0 on Node 24. No new
  test is in that block — all 13 ran on both Node versions (confirmed in both
  logs). Upstream shows 0 skips at either version because
  `test/recipientRouting.test.ts` is fork-only.

## Unmet criteria / test gaps

No unmet acceptance criterion. The task's third criterion — "check whether any
other server-rendered label interpolates a conversation name raw; report each
site" — resolves clean: the only remaining raw interpolation of a conversation
name is `src/server.ts:932`, ``name: c.kind === 'dm' ? `DM: @${c.name}` :
c.name`` in `list_channels`. That is a JSON *data* field, not a rendered label,
and it leaves through `toolResultJson` (`src/framing.ts:28-33`), which escapes
the server's own tags and the three line breaks `JSON.stringify` misses — so it
is already covered by a different mechanism and is out of this task's scope.
Every label-shaped site goes through `channelShown`/`nameShown`/`quotedLabel`
(`server.ts:174`, `:176`, `:185`, `:1711`, `:1844`, `:1871`, `:1888`,
`content.ts:134`, `:252`, `:258`, `history-read.ts:233`).

Gaps, both LOW above:

1. `channels/list` is absent from the fragment's reach-point list.
2. Production-path coverage is one kind, one modest hostile name, narrow
   assertion; exotic characters, the other three kinds and the empty-workspace
   path are unit-only.

## Residual risk

- **Low.** The production change is three lines in one pure function with no
  I/O, no state and no caller that inspects its output.
- A conversation whose `name` is the empty string renders `"#"` for a channel
  (seen in the probe matrix). Not reachable today — `src/slack-adapter.ts:1243`
  and `:1250` fall back to `conv.name ?? conv.id` — and unchanged by this
  commit, so not a finding.
- A long-running host keeps the label a conversation was first announced with
  (`src/server.ts:1376-1379`), so a workspace with a non-plain name will show
  old unquoted labels for already-registered conversations until the host
  reconnects. Inherent to any label change, transient, and not parseable state.
- Characters that `UNSEEN` escapes but the test string does not sample (e.g.
  U+200B ZWSP, and U+000B/U+000C — the latter two are C0 and escaped by
  `JSON.stringify` regardless) remain untested here, though
  `test/senderFraming.test.ts`'s `OWN_TAGS` battery covers several of them on
  other paths.

## Fix directions

1. Add `channels/list` to the fragment's reach-point sentence, or reword it so
   the list is clearly illustrative rather than exhaustive.
2. Use the widened `leak` class in the harness assertion at
   `test/senderFraming.test.ts:334` and parameterize `started(t, { channelName
   })` over one exotic name, so at least one non-ASCII hostile character is
   proven through `channels/register` and a write's `to`.
3. Optional, for the upstream PR: squash the three commits, since `252365fe` is
   a fixup of its parent's test expectations.

## What I could not check

- I did not run the GitHub Actions `changelog` job itself; I replicated its
  shell logic locally against both plausible PR bases. I did not run any CI on
  GitHub, and did not push, comment, open a PR, or touch the main checkout.
- I did not verify a GPG signature on `SHASUMS256.txt`. It was fetched over
  HTTPS from `nodejs.org`; the tarball's SHA-256 matches that file, but the file
  itself is trusted on TLS alone.
- There is no lint script in `package.json` (`build`, `typecheck`, `test`,
  `start`, `clean`, `version` only), so no lint gate was run.
- No real Slack workspace was exercised; the empty-`teamName` path is proved
  reachable by source read (`src/slack-adapter.ts:758`) and by unit test, not by
  an `auth.test` response from Slack that omits `team`.
- I left the worktree exactly as found: `git status --porcelain` empty,
  `git diff --exit-code` clean, no commits. Probe artifacts and the scratch
  clone live outside the tracked tree (`$ORGASMIC_EVIDENCE_DIR`, `/tmp/r2rev-*`);
  `dist/` and `node_modules/` are gitignored build output.
