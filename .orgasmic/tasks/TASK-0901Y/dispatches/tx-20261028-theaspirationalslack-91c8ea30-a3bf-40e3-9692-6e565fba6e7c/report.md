# Findings

**MEDIUM — correctness / unmet ordering criterion — `src/slack-adapter.ts:1616–1621`: explicit-policy `sendDM` validates malformed text before all locally knowable scope refusals.** Only `im:write` is checked before `assertSendable`; `chat:write` is checked later, through `requireWritableConversation`, after opening the DM. With an allowed peer and granted `im:read`/`im:write` but no `chat:write`, malformed text returns “remove it” rather than the permanent missing-scope refusal. This changes the fork's refusal precedence and contradicts the specified scope-before-text ordering. Removing the malformed character cannot make this request writable. No malformed text leaks to Slack: the observed merge call count is zero. This is an ordering/diagnostic defect, not a demonstrated authorization bypass.

Reproduction: `node --import tsx --test "$ORGASMIC_EVIDENCE_DIR/adversarial-probe.mjs"`, fourth test (expected scope-refusal assertion fails). `dm-parent-comparison.mjs` independently confirms the fork parent returns `Slack access requires granted scope chat:write` for the same scopes/peer/text; the merge instead returns the lone-surrogate refusal. See the two probe logs below. Fix by preflighting known required DM scopes (including `chat:write`, and the `im:read` prerequisite) before text validation/open, while retaining the fresh opened-conversation/peer authorization before posting. Add missing-scope plus malformed-text tests for explicit-policy DMs.

No HIGH findings; no additional MEDIUM/LOW findings identified.

# Verdict

**REJECT pending the narrow scope-precedence correction above.** Sender framing, protected-fetch references, core compatibility and the conflict resolutions otherwise passed the inspected/probed cases. This verdict is for branch review only, not deployment qualification or approval to merge main.

# Review scope and conflict resolution

Reviewed `e616fe861d14c73618d3bb7513183ec6ffa9ec01`; independently confirmed parents `3302d700c058f9de3a833ab7ee021903dd05cc1c` / `439a81b502388ab3a77b4bbb0e62a380e1b50605` and merge-base `bff8f10c1c3ce493abc10fb9946f0559e2f89e05`. Read the supplied baseline, `CONTRIBUTING.md`, and worker gate/command guidance; supplied conventions/gotchas were absent. No applicable `AGENTS.md` was found.

Recomputed `git merge-tree --write-tree HEAD^1 HEAD^2` (expected conflict exit). Its three conflicted files and seven hunks match the assignment. Artifacts: `merge-tree.txt`, `conflict-resolution-vs-fork.diff`, `conflict-resolution-vs-upstream.diff`, `parent-comparison.json` in this report's directory.

- `server.ts`: both file-access and framing imports retained; attachment note combines protected file-ID references with name/MIME quoting and legacy URL rendering; delivery combines recipient source labels/root tracking with quoted author/indented sender text. Shared rendered blocks feed both push and incoming lanes.
- `slack-adapter.ts`: send/edit retain the fork's fresh scope/membership-aware writability checks, then upstream `assertSendable`, then DM guard/write. The fork-only explicit DM branch receives pre-open text validation, but has the scope-precedence gap reported above.
- `test/harness.ts`: fork status capture and upstream display-name/channel/history/scopes fixtures are all retained and passed in the correct parameter positions.
- All parent test files survive. Every upstream test file is byte-unchanged except the merged harness; fork modifications retain the old cases and add coverage or take upstream's updated expectations. Parent inventories: fork 51 test files, upstream 41; no deletions. Both parents' existing suite logs were inspected (fork 754 tests: 731 pass, 23 skip; upstream 575/575 pass). Universal behavior preservation is not claimed beyond the evidence above.

# Ordering decision

Owner's first sentence: **“Choose A.”** I did not reopen that decision. The approved exception permits the existing read-only `conversations.info` / membership-fallback `conversations.history` authorization lookup before malformed-text validation. Send/edit satisfy that exception, including refusing non-writable destinations first. My production-method probe observed only authorization reads for those rejected requests, with no post/update/open carrying malformed text. Explicit-policy DM validation precedes `conversations.open`. The finding concerns an additional locally knowable scope check, not moving validation ahead of the approved authorization lookup.

# Verification Gates

Reused only the supplied clean-tree receipts at the reviewed commit, after reading their logs. Base directory:
`/home/orgasmic/.orgasmic/runs/run-01M618AXR5KZJTWNW7HNHPNF0Z/evidence/`

| Gate / exact command | Outcome | Log under that base |
|---|---|---|
| merge-ci: `npm ci` | exit 0 | `gate-merge-ci-01M618T28BZ7T4F0ZQ37QM7K5Z.log` |
| merge-build: `npm run build` | exit 0 | `gate-merge-build-01M618T2WV2KZT7FRTP6TTNG30.log` |
| merge-test: `npm test` | 790 total, 765 pass, 25 skip, 0 fail | `gate-merge-test-01M618T3E991AC2X2V57EE8CT6.log` |
| merge-test-node24: `npm exec --yes --package=node@24 -- node --import tsx --test --test-reporter=tap test/*.test.ts` | 790/790 pass | `gate-merge-test-node24-01M618TRT7H1W1YTZ7W8HZWEW3.log` |
| merge-upstream-security: `node --import tsx --test test/loneSurrogate.test.ts test/senderFraming.test.ts test/transport.test.ts test/unnamedPosts.test.ts` | 38/38 pass | `gate-merge-upstream-security-01M618VE2STEW1SXKWZW98EYF5.log` |

Fresh reviewer gates were all wrapped with `orgasmic dispatch gate`. Base directory is this report's directory:

- **review-targeted** — `node --import tsx --test test/slackAdapter.test.ts test/fileReferences.test.ts test/recipientIntegration.test.ts test/recipientRouting.test.ts test/locationHeader.test.ts test/accessPolicy.test.ts test/senderFraming.test.ts test/hostCompatibility.test.ts test/toolClasses.test.ts test/handshake.test.ts test/historyReadPolicyIntegration.test.ts` — 129 total, 104 pass, 25 skip, 0 fail. Log `gate-review-targeted-01M6192WZJB87KHW6XMZD301V2.log`.
- **review-node24** — `npm exec --yes --package=node@24 -- node --import tsx --test test/recipientIntegration.test.ts test/recipientRouting.test.ts test/historyReadPolicyIntegration.test.ts test/sendChannels.test.ts test/operatorControls.test.ts test/fileReferences.test.ts test/loneSurrogate.test.ts test/transport.test.ts` — 63/63 pass, no skips. Log `gate-review-node24-01M6193N7FKMG4CPZESPN2414F.log`.
- **review-adversarial** — `node --import tsx --test "$ORGASMIC_EVIDENCE_DIR/adversarial-probe.mjs"` — 3 pass, 1 fail: the scope-precedence finding, not an environment/flaky failure. Log `gate-review-adversarial-01M6195GHZKV8JRM2Q02328SS3.log`.
- **review-dm-baseline** — `node --import tsx "$ORGASMIC_EVIDENCE_DIR/dm-parent-comparison.mjs"` — exit 0; prints contrasting parent/merge errors and call sequences. Log `gate-review-dm-baseline-01M6197KGD89GZEXT84WYKQZQ8.log`.

The independent scratch adversarial probe uses actual adapter/server methods and core stream transport, not a duplicated renderer. Hostile author/channel/file/MIME/body inputs include line breaks, U+2028, forged source lines, and closing/opening server tags. Both delivery lanes, first-message auto-subscription/location/backscroll and history/thread results retained framing. Protected hints JSON-parsed to the correct channel/file pair and successfully traversed `fetch_attachment` / canonical file metadata / mocked byte download. Missing file IDs remained non-downloadable. Existing recipient-specific production integration tests also ran without skips on Node 24.

`package-lock.json` is byte-identical to upstream: both Git blobs are `2215d88b167d9b5279383cccf0827374a425198d`. Installed core is 0.4.0. Inspected local core connection contracts and fork imports/usages; build receipt plus fresh handshake, feature-policy, recipient envelopes, tool metadata and stream-error tests exercise the fork-only integration. No incompatible core usage was found. The `fetchHint` split keeps sender names/MIME separate from server-built arguments, strips untrusted message URLs under explicit policy and preserves legacy URL references; no protected-reference regression was reproduced.

# Unmet Criteria / test gaps

Scope-before-text ordering is unmet for explicit-policy DM requests missing a later-required scope. Existing DM malformed-text tests use complete scopes and miss this combination. Add that case; rerun the failing scratch case and appropriate adapter/recipient tests after fixing it. Full suites were reused, not redundantly rerun. The older-runtime skips were covered by the fresh Node 24 targeted run and reusable Node 24 full-suite receipt.

# Residual Risk

No live Slack workspace or external host deployment was exercised; Slack responses/downloads were local fakes. Structured provenance/raw metadata intentionally retain sender values; rendered text is the framing boundary reviewed here. npm-ci receipts report two high-severity dependency audit advisories, also present in the parent evidence; this review does not qualify or remediate that pre-existing dependency risk. No blanket guarantee against every possible hostile Unicode string is made.

# Fix Directions

Preflight all locally knowable required explicit-DM scopes before `assertSendable` and `conversations.open`; keep the post-open fresh access and exact-peer checks. Add the missing-scope/malformed-text regression tests. No other code change is requested. Worktree remains unchanged; no commits, pushes, main edits or deployments were performed.
