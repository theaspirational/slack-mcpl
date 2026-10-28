# Changed

## Fix round 2

Created new commit **`b956350d4e77f09df76240439b3d35d512061899`**, `fix: preflight explicit DM scopes before text validation`, directly on merge commit `e616fe861d14c73618d3bb7513183ec6ffa9ec01`. The merge was not amended. Branch: `task-0901y-impl`. Working tree is clean; `main` remains `3302d700c058f9de3a833ab7ee021903dd05cc1c`. No push or deployment.

Verified the review finding against the current source and reproduced it before changing production code. Explicit-policy `sendDM` checked only `im:write` before text validation. The `im:read` prerequisite and `chat:write` were checked after opening the DM, so malformed text masked these locally knowable scope refusals.

Changes are limited to three files:

- `src/slack-adapter.ts`: retain peer authorization and `im:write`, then preflight `im:read` and `chat:write`, in the same relative scope-refusal order as the fork parent. All three scope checks precede `assertSendable` and `conversations.open`. Reuse `requireScope`, preserving the exact `Slack access requires granted scope <scope>` refusal. Post-open fresh access and exact-peer checks remain unchanged before posting.
- `test/accessPolicy.test.ts`: three regression tests, one for each missing scope. Each checks a lone high surrogate, a lone low surrogate and valid text, requiring the exact scope refusal and **zero Slack calls**, including zero open/post calls.
- `changelog.d/explicit-dm-scope-preflight.fixed.md`: document the corrected refusal order.

No dependency, lockfile, framing, routing, or transport changes. See `fix-round2.diff` and `final-topology.txt`.

# Verification Gates

All commands below use `orgasmic dispatch gate NAME -- COMMAND`; the tables give the exact gate name and command after `--`. Logs are relative to `$ORGASMIC_EVIDENCE_DIR`. Node 22.23.3 and supplemental Node 24.22.1; npm 10.9.9. Required final gates ran on the clean fix commit, not merely on the earlier merge.

| Gate | Command after `--` | Result | Log |
|---|---|---|---|
| `round2-build` | `npm run build` | exit 0 | `gate-round2-build-01M619EDT5WJ817T7W9V4B31TE.log` |
| `round2-test-node22` | `npm test` | 793 total / 768 pass / 0 fail / 25 skip | `gate-round2-test-node22-01M619EE26YJF4D02N89EZNWPA.log` |
| `round2-test-node24` | `npm exec --yes --package=node@24 -- node --import tsx --test --test-reporter=tap 'test/*.test.ts'` | 793 total / 793 pass / 0 fail / 0 skip | `gate-round2-test-node24-01M619F404V76F65TV7NQWSM1C.log` |
| `round2-review-probe` | `node --import tsx --test "$ORGASMIC_EVIDENCE_DIR/adversarial-probe.mjs"` | 4 total / 4 pass / 0 fail / 0 skip | `gate-round2-review-probe-01M619FT80D8BJGBXSZTXVEX1F.log` |
| `round2-parent-comparison` | `node --import tsx "$ORGASMIC_EVIDENCE_DIR/dm-parent-comparison.mjs"` | exit 0; two observations, not a test suite | `gate-round2-parent-comparison-01M619FTG09JNAQTHADZD999PD.log` |

All final test runs had zero cancellations and zero TODOs. **No tests are red on the fix commit.** The 25 Node-22-gated skips are all exercised by the Node 24 full suite, which passes all **793** tests. The three new missing-scope tests pass in both full suites. The build is the repository's `tsc` command.

## Red-to-green evidence

| Gate | Command after `--` | Result | Log |
|---|---|---|---|
| `round2-parent-probe-ci` | `npm ci --prefix dist/round2-fork-baseline` | exit 0 | `gate-round2-parent-probe-ci-01M619CY10T90WZBDENH4PE66D.log` |
| `round2-review-probe-red` | `node --import tsx --test "$ORGASMIC_EVIDENCE_DIR/adversarial-probe.mjs"` | 4 total / 3 pass / 1 fail / 0 skip | `gate-round2-review-probe-red-01M619CYNJQABA6JWNC2090XVH.log` |
| `round2-parent-comparison-red` | `node --import tsx "$ORGASMIC_EVIDENCE_DIR/dm-parent-comparison.mjs"` | exit 0; two observations, not a test suite | `gate-round2-parent-comparison-red-01M619CYXJ5JPEQ5H84PCYXAS5.log` |
| `round2-regression-red` | `node --import tsx --test --test-name-pattern='explicit-policy DM refuses missing' test/accessPolicy.test.ts` | 3 total / 1 pass / 2 fail / 0 skip | `gate-round2-regression-red-01M619D87Y1ES284WSVY0F39S7.log` |
| `round2-regression-green` | `node --import tsx --test --test-name-pattern='explicit-policy DM refuses missing' test/accessPolicy.test.ts` | 3 total / 3 pass / 0 fail / 0 skip | `gate-round2-regression-green-01M619DW5SMBQK7SEGP237F18A.log` |

The review probes were copied unchanged into this round's evidence directory. SHA-256:

- `adversarial-probe.mjs`: `6b6c6f8a84b3c37df68d4820da2b9927667b1b5c0bc527a0ea53766a87e53c61`.
- `dm-parent-comparison.mjs`: `8b6f6ae01cac486aa058fd35fbfeb496430109a19ec48dbbd66718ec29938b5f`.

Both review probes were rerun on the clean rejected merge before production changes, then on the clean fix commit. The parent-comparison script uses a fresh `git archive 3302d700c058f9de3a833ab7ee021903dd05cc1c` snapshot under `dist/round2-fork-baseline`, with its own `npm ci`. Its path input is recorded in `baseline-scratch-path.txt`; no baseline build/cache was placed in evidence.

Baseline results on `e616fe86`:

- Adversarial probe: **3 pass / 1 fail**. Failing test: `explicit DM: known chat:write scope refusal must precede malformed-text refusal`.
- Three new regressions, added without changing baseline production code: **1 pass / 2 fail**. Failing tests:
  - `explicit-policy DM refuses missing im:read before malformed text without opening or posting`
  - `explicit-policy DM refuses missing chat:write before malformed text without opening or posting`
- The corresponding `im:write` test already passed, because that preflight existed on the rejected merge.

After the fix, all three regressions pass, and the unchanged adversarial probe passes all four tests. The small green regression receipt was taken before commit; both clean-commit full-suite receipts subsequently verify the same tests. No unexpected failures occurred this round.

The comparison script emits observations rather than assertions. Its inspected output confirms:

| Version | Refusal for malformed text with missing `chat:write` | Calls |
|---|---|---|
| Fork parent `3302d700` | `Slack access requires granted scope chat:write` | `open`, `info` |
| Rejected merge `e616fe86` | Lone-surrogate text refusal | None |
| Fixed `b956350d` | `Slack access requires granted scope chat:write` | **None** |

Thus the fix restores the fork parent's refusal text while moving the known scope refusal ahead of DM opening, as requested. Existing full-suite tests still verify fresh opened-conversation access, exact-peer checks, valid sends and zero-open malformed-text refusal when all required scopes are granted.

## Inherited evidence and limits

Inherited evidence is limited to unchanged inputs and historical parent characterization:

- The exact fork and upstream parent commits are unchanged. Their original clean-parent `npm ci`, `npm run build` and `npm test` logs are copied into `inherited-parent-gates/`: fork **754 total / 731 pass / 0 fail / 23 skip**; upstream **575 total / 575 pass / 0 fail / 0 skip**, on Node 22. These establish the same parent baselines; they do not certify the fix commit.
- The existing merge topology, upstream 0.4.0 dependency/lockfile and all non-DM-preflight production paths are unchanged this round. `git diff HEAD^ -- package.json package-lock.json` is empty. A new main-worktree `npm ci` was not assigned or rerun; the separate parent snapshot install was for the comparison probe.
- No earlier merge gate pass or earlier review conclusion is reused as approval of this fix. In particular, the rejection supersedes the initial no-blocking-findings review. This round freshly ran every assigned gate and both supplied probes; a subsequent review decision remains separate.

# Unmet Criteria

None for the narrowed fix-round brief. The fix is a new local commit, the regression is demonstrated red on the rejected merge and green after correction, and all assigned final gates and both review probes completed successfully.

# Residual Risk

- No live Slack workspace was exercised; adapter/server production paths were tested with recorded fake Slack clients and protocol fixtures.
- The Node 22 suite skips 25 runtime-gated tests; the complete Node 24 suite covers them without skips.
- Dependency files are unchanged. The baseline install still reports two high-severity dependency advisories; unrelated dependency remediation was not included.
- No push, main-branch integration, or deployment was performed.
