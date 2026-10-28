# Changed

- Preflight: clean `e8c6fe530b71ff4b3778ac5fd10256dfb408f32c`. A fresh read-only upstream-main fetch still returned `d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`; no base movement.
- Polish commit on `task-38epn-impl`: **`2ee8bb6a894404a735b63544beb1a66707b3c720`** — Document the zero-backscroll operator migration.
- Squash commit on the new local branch `pr/zero-backscroll`: **`f44d24ac28de9f1491db1858ce14c6bd09915559`** — Allow zero automatic backscroll.
- `pr/zero-backscroll` contains exactly one commit above `d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`. The task branch retains all three implementation/polish commits; it was not reset or amended. The squash branch is checked out and clean.
- Exact tree equality: both branch heads have tree **`ada34e0fe0297b641e74c541306cbdedcf2aadc1`**. See `tree-equality.txt`. Author identity is unchanged, and both new commits carry the requested co-author trailer. The squash body is wrapped at 72 columns.
- Chose the requested plain descriptive title: recent non-merge upstream commits use plain titles, and `CONTRIBUTING.md` explicitly accepts them.
- Reclassified the existing fragment as `zero-backscroll.breaking.md`, rather than adding a second fragment. The deciding rule is `CONTRIBUTING.md`'s audience-scoped breaking-entry requirement: who must act, migration, and unchanged behavior. Existing configurations parsed as zero now change behavior, just as the operator migration in `15-empty-switches.breaking.md` does.
- Updated the `src/index.ts` environment docblock only: range 0–1000, default 50, 0 = off. README now explicitly says “Unset or empty values”. No production logic or tests changed from the approved implementation.
- Local work only: no push, PR, remote comment, version bump, tag, or tracked generated-file/lockfile change.

## Squash diff relative to upstream

```text
README.md                               |  2 +-
 changelog.d/zero-backscroll.breaking.md |  6 +++
 src/index.ts                            |  5 ++-
 src/server.ts                           | 30 ++++++++------
 test/operatorControls.test.ts           | 71 +++++++++++++++++++++++++++++++++
 5 files changed, 98 insertions(+), 16 deletions(-)
```

## Fragment verbatim

`changelog.d/zero-backscroll.breaking.md`:

```markdown
- **Operators:** `SLACK_BACKSCROLL_LIMIT=0`, or a value whose leading base-10
  integer is 0 (such as `0junk` or `0.5`), now disables automatic backscroll
  instead of falling back to 50 messages. To keep the previous automatic
  history read, unset the variable or set it to 50. Non-zero parsed limits,
  the default of 50, and explicit `fetch_history` / `fetch_thread` reads are
  unchanged.
```

# Verification Gates

Every fresh gate ran at `f44d24ac28de9f1491db1858ce14c6bd09915559`, with the tree clean at both ends, using `orgasmic dispatch gate <name> -- timeout 900 <command>`. Log links below are relative to this report.

| Runtime | npm ci | Typecheck | Build | Full one-process suite |
|---|---|---|---|---|
| Node 22.23.3 | pass | pass | pass | 588 pass / 0 fail |
| Node 24.22.1 | pass | pass | pass | 588 pass / 0 fail |

Both suites: zero skipped, cancelled, or todo tests. `npm test` retains `node --import tsx --test --experimental-test-isolation=none test/*.test.ts`.

- Used distinct empty user/global npm config files outside the repository and `npm ci --ignore-scripts --registry=https://registry.npmjs.org`; audit/fund requests disabled. Update notifiers were disabled from the first command.
- Rechecked the previously downloaded official Node 24.22.1 archive against `SHASUMS256.txt`, then freshly extracted it into external scratch. See `node24-checksum.log` and the copied manifest. Both runtime versions were checked before their gate groups.
- Suites used `NODE_OPTIONS="--require=$ORGASMIC_EVIDENCE_DIR/loopback-only.cjs"`, rejecting test listeners not explicitly bound to `127.0.0.1` or `::1`.
- **Release dry fold:** archived the squash commit's package, changelog, fragments, and release script into external scratch; ran the actual `scripts/release-changelog.mjs` CLI there. All 34 fragments folded successfully. Verified the operator bullet appears exactly once under Breaking, consumed fragments are removed, and one Unreleased section remains. No release files in the worktree were modified. See `release-dry-fold.sh` and `dry-fold-CHANGELOG.md`.
- **Changelog CI regex:** ran the exact `.github/workflows/changelog.yml` check body, substituting upstream base and squash HEAD for event SHAs. Its added-file regex recognizes the new `.breaking.md` fragment; result **OK**. See `changelog-ci.sh`.

## Commands and logs

| Gate | Command after `timeout 900` | Result | Log |
|---|---|---|---|
| `r3-node22-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | [gate-r3-node22-npm-ci-01M624JH990H9BE9STSJ6PJ1TA.log](gate-r3-node22-npm-ci-01M624JH990H9BE9STSJ6PJ1TA.log) |
| `r3-node22-typecheck` | `npm run typecheck` | pass | [gate-r3-node22-typecheck-01M624JHTK5FEW8G3WCT66AFSW.log](gate-r3-node22-typecheck-01M624JHTK5FEW8G3WCT66AFSW.log) |
| `r3-node22-build` | `npm run build` | pass | [gate-r3-node22-build-01M624JJ2H445D0FGCRGVKDDTS.log](gate-r3-node22-build-01M624JJ2H445D0FGCRGVKDDTS.log) |
| `r3-node22-suite` | `npm test` | 588/0 | [gate-r3-node22-suite-01M624JJAFVDK1F2TX5MBMV5MN.log](gate-r3-node22-suite-01M624JJAFVDK1F2TX5MBMV5MN.log) |
| `r3-node24-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | [gate-r3-node24-npm-ci-01M624K0EWGTRJHQBK2G46EYT6.log](gate-r3-node24-npm-ci-01M624K0EWGTRJHQBK2G46EYT6.log) |
| `r3-node24-typecheck` | `npm run typecheck` | pass | [gate-r3-node24-typecheck-01M624K13NS2Y8XVFHNX952JQB.log](gate-r3-node24-typecheck-01M624K13NS2Y8XVFHNX952JQB.log) |
| `r3-node24-build` | `npm run build` | pass | [gate-r3-node24-build-01M624K1BPVY984HHVB4FSEGNA.log](gate-r3-node24-build-01M624K1BPVY984HHVB4FSEGNA.log) |
| `r3-node24-suite` | `npm test` | 588/0 | [gate-r3-node24-suite-01M624K1PPGQP1J6Q1QK1VG6SP.log](gate-r3-node24-suite-01M624K1PPGQP1J6Q1QK1VG6SP.log) |
| `r3-release-dry-fold` | `bash "$ORGASMIC_EVIDENCE_DIR/release-dry-fold.sh"` | pass | [gate-r3-release-dry-fold-01M624KFWDFFQX9H8TGBDTA8MV.log](gate-r3-release-dry-fold-01M624KFWDFFQX9H8TGBDTA8MV.log) |
| `r3-changelog-ci` | `bash "$ORGASMIC_EVIDENCE_DIR/changelog-ci.sh"` | pass | [gate-r3-changelog-ci-01M624KG1JBQQGYGA3JMKZQ2RG.log](gate-r3-changelog-ci-01M624KG1JBQQGYGA3JMKZQ2RG.log) |

## Inherited evidence and scope

No earlier gate receipt substitutes for a fresh squash gate. The squash is not a descendant of the implementation commits, and the historical red/green/mutation checks were dirty-tree probes, not reusable clean-tree receipts.

- Historical upstream baseline at the same `d3e4f7c9` commit: 584 pass / 0 fail on both runtimes. Copied logs: `inherited-upstream-node22-suite.log`, `inherited-upstream-node24-suite.log`. This is the unchanged numerical baseline, not a newly run round-three check.
- Approved implementation source `src/server.ts` and `test/operatorControls.test.ts` are byte-for-byte unchanged from `e8c6fe53` (verified with git diff). The metadata regression previously failed 15/1 on its parent, passed 16/0 after the fix, and failed 15/1 when the metadata result was discarded. Copied historical evidence: `inherited-r2-red-operator-controls.log`, `inherited-r2-green-operator-controls.log`, and `inherited-r2-mutation-discard-meta.log`. Those establish test sensitivity; both complete squash suites are fresh.
- The Node archive/checksum manifest and loopback guard were inherited as verification inputs, with archive integrity rechecked. Prior repository instruction reads remain applicable; changelog rules and the breaking-entry precedent were reread for this round.

# Unmet Criteria

None. Both branch heads, exact tree equality, all requested squash gates, the release fold, and the CI regex check are established. The PR body below is a draft only; nothing was submitted.

# Residual Risk

No live Slack workspace or additional operating-system matrix was exercised. Tests use the existing fake Slack API and in-memory integration harness. Unparseable settings still fall back to 50; this deliberate compatibility choice is called out below for maintainer judgment.

# PR body draft

Title: Allow zero automatic backscroll

## Problem

Automatic first-interaction history reads could not be disabled with
`SLACK_BACKSCROLL_LIMIT=0`: zero fell back to 50 messages.

## Changes

- Accept a parsed limit of zero and skip only the automatic history read.
- Keep conversation metadata lookup independent of backscroll, including
  when an outbound write precedes the first inbound mention, so subscription
  notes still name the conversation.
- Cover disabled/enabled automatic reads, explicit history, conversation
  names, and parser boundaries in the existing operator-control tests.
- Align the README, entry-point environment comment, and operator release
  note.

## Operator migration

`SLACK_BACKSCROLL_LIMIT=0`, and values whose leading base-10 integer is zero
such as `0junk` and `0.5`, now disable automatic backscroll instead of falling
back to 50. To preserve the previous automatic read, unset the variable or
set it to 50.

Non-zero parsed limits, the default of 50, and explicit `fetch_history` and
`fetch_thread` reads are unchanged. Unset or empty values still use 50.

## Compatibility choice for maintainer consideration

This deliberately retains the existing delivery-time getter and
`parseInt(..., 10)` behavior: `7junk` reads as 7 and `1.5` as 1. Unparseable
values such as `abc`, and parsed values outside 0–1000, still fall back to
50 rather than refusing startup. Please confirm that retaining this fallback
is preferable to introducing strict startup validation in this change.

## Tests

- Upstream `d3e4f7c9` baseline, measured earlier: **584 pass / 0 fail** on
  Node 22.23.3 and 24.22.1.
- Fresh squash suites: **588 pass / 0 fail** on both runtimes, with no skips
  or cancellations, using the one-process runner.
- `npm ci`, typecheck, and build pass on both runtimes.
- Regression and mutation checks demonstrated failures for unwanted
  automatic history and missing conversation names during implementation.
- The release script's scratch fold and changelog CI regex both pass.

## Not verified

Not exercised against a live Slack workspace or on additional operating
systems. The integration tests use the real server/adapter with fake Slack
responses.

No companion changes or configuration-validation redesign are included.

AI-assisted implementation.
