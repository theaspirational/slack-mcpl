# Changed

Created exactly one local merge commit on `task-0901y-impl`:

- Commit: `e616fe861d14c73618d3bb7513183ec6ffa9ec01`.
- Subject: `Merge upstream main 439a81b5 into fork main`.
- First parent: `3302d700c058f9de3a833ab7ee021903dd05cc1c`.
- Second parent: `439a81b502388ab3a77b4bbb0e62a380e1b50605`.
- Verified merge-base `bff8f10c1c3ce493abc10fb9946f0559e2f89e05` and parent divergence 45/10. Required upstream object was already present; no fetch was needed.
- `git rev-list --count 3302d700..HEAD --first-parent` returned **1**. `main` remains `3302d700`; worktree is clean. No rebase, history rewrite, push, main-checkout edit, or deployment.

Read the supplied project baseline (no additional substantive constraints), repository `CONTRIBUTING.md`, and applicable worker guidance. No repository `AGENTS.md` or additional convention/gotcha references were present. The exact requested commit subject and public-only naming requirement take precedence over the contribution guide's style and model-attribution conventions.

## Resolved ordering decision

The fork's `requireWritableConversation` performs a fresh `conversations.info` or membership-fallback `conversations.history` lookup. Therefore its complete refusal cannot precede every Slack API call. This contradiction was raised before resolution. The answer's first sentence was: **“Choose A.”**

Approved interpretation: preserve full existing writability-refusal precedence, allowing the existing read-only authorization lookup (which carries no message text), then validate text before any subsequent DM check, text-carrying call or write. This is an explicit deviation from the brief's literal “before any Slack API call,” not a claim that malformed text suppresses authorization reads. Explicit-policy `sendDM` validates after its existing local peer/scope authorization and before opening; the existing fresh opened-conversation/peer checks still precede posting.

## Conflict hunks

The original seven hunks are preserved in `merge-conflicts.diff`; resolved changes are in `merge-resolution.diff`.

| File / hunk | Fork behavior | Upstream behavior | Resolution |
|---|---|---|---|
| `src/server.ts`: imports | Protected-file association and fetch-hint helpers | Sender-framing helpers | Keep both imports; both feature families remain active. |
| `src/server.ts`: attachment note | Explicit policy uses channel/file IDs, never message URLs; legacy path uses URL | Quote name/MIME and sanitize displayed URL | Preserve both policy branches; apply `nameShown`/`mimeShown` in both, and `urlShown` in legacy branch. Protected fetch arguments remain usable. |
| `src/server.ts`: delivery rendering | Recipient source/authority label and wake-root tracking | Quote author name and indent/sanitize sender text | Keep source label and root tracking, and apply upstream helpers to the shared body used by both recipient and legacy delivery lanes. |
| `src/slack-adapter.ts`: send | Scope-aware fresh writability check and shared validated-post helper | Allow-list refusal, then malformed-text refusal, then DM check | Keep `requireWritableConversation`, append `assertSendable`, retain DM check and post helper, in the approved order. |
| `src/slack-adapter.ts`: edit | Scope-aware fresh writability check | Allow-list refusal, then malformed-text refusal | Keep fork check, then upstream text check, then DM check/update. |
| `test/harness.ts`: fake-client arguments | Status/typing instrumentation and DM fixtures | Display-name/channel-name/history fixtures | Retain all arguments and instrumentation in consistent order. |
| `test/harness.ts`: adapter construction | Status collector and fork fixture wiring | New fixture inputs and scope metadata | Pass both sets of fixtures and `opts.scopes`; retain returned statuses. |

## Fork-path security coverage

- **Recipient framing:** both `push/event` and `channels/incoming` retain source/authority framing, but hostile author names and continuation lines now pass through upstream quoting/indentation. Routing source IDs are validated and authority/kind fields are enum values, not sender display text. Added end-to-end protocol-fixture tests for both lanes, including bot-origin delivery and a forged source line.
- **Protected live attachment notes:** quote filename and MIME type without losing the fork's channel/file fetch arguments. Legacy URL notes retain upstream URL treatment.
- **Protected history/backscroll:** the fork had concatenated sender filename/MIME and server fetch JSON into `name`. Simply applying upstream quoting to that composite would escape the fetch JSON again and break usable references. `shapeReadable` now separates raw name/MIME from a server-built `fetchHint`; both history rows and backscroll quote sender fields while preserving the hint. This extends the framing fix to a fork-only path beyond mechanical conflict resolution. Adversarial tests verify both framing and successful reauthorized fetches.
- **Explicit-policy DM sends:** automatic merge left this fork-only early-return branch bypassing upstream text validation. Added `assertSendable` after local authorization and before `conversations.open`; valid pairs and fresh opened-peer checks remain intact.
- Audited remaining framing consumers: shared delivery/backscroll, location and auto-subscription labels, mention formatting, channel descriptors, image-fetch captions, both tool-result JSON routes, history attachments and JSON byte accounting retain upstream protections. Structured metadata remains structured data; core 0.4.0 preserves embedded Unicode separators on the transport.

Six new regression tests cover send/edit refusal precedence, explicit-policy DM opening, protected attachments, and both recipient delivery lanes. All six fail when their relevant guards/framing are deliberately disabled and pass after restoration. The temporary mutation was restored before commit.

## Dependency and API notes

- Manifest now requires `@animalabs/mcpl-core ^0.4.0`; lock resolves **0.4.0**. Updated using npm, not hand editing. A clean full regeneration was examined, but it also upgraded unrelated packages; the final scoped `npm install --package-lock-only`, with no installed dependency tree, preserved unrelated pins. Final lock is byte-identical to upstream's lock, includes platform optional packages, and passes `npm ci`.
- Inspected installed 0.3.0 versus 0.4.0 declarations and implementation (`core-api-diff.txt`). Checked every fork-added core usage: typing method dispatch; initialization experimental recipient capability; error/response methods; publish's frozen-thread extension; push origin/incoming metadata extensions; tool-definition responses; lifecycle/connection checks. Existing capability/tag declarations and relevant parameter shapes remain compatible. Additive toolset/error APIs are unused.
- **No fork-only API adaptation was required.** Core queues a request before emitting its request event in 0.4.0, but the synchronous arrival listener still runs before the awaiting serving continuation. Upstream's corresponding transport comments are retained. New stream-close/error behavior and Unicode-line handling pass upstream transport tests; fork typing/recipient behavior passes under 0.4.0.
- Added `changelog.d/merge-fork-security.fixed.md`. Other changelog fragments, `src/framing.ts`, and upstream tests come from the merge. No generated build output is tracked. Exactly 23 paths differ from the first parent; the full list is in `changed-paths.txt`.

# Verification Gates

All commands below were run through `orgasmic dispatch gate NAME -- COMMAND`. Each table supplies the exact `NAME` and `COMMAND`; logs are relative to `$ORGASMIC_EVIDENCE_DIR`. Required parent gates ran on each exact clean parent; final merge gates ran on the clean merge commit above. Node **22.23.3**, npm **10.9.9**; supplemental Node **24.22.1**. Build command runs `tsc`.

| Gate name | Command after `--` | Result / tests total, pass, fail, skip | Log |
|---|---|---|---|
| `fork-ci` | `npm ci` | exit 0 | `gate-fork-ci-01M618BSEE81X29ZA4B7JD0549.log` |
| `fork-build` | `npm run build` | exit 0 | `gate-fork-build-01M618BT2XQ70QQG64G6GFRSDH.log` |
| `fork-test` | `npm test` | 754, 731, 0, 23 | `gate-fork-test-01M618BTE1QXT67XQ39Q9WG4ZC.log` |
| `upstream-ci` | `npm ci` | exit 0 | `gate-upstream-ci-01M618D7DDE5MBVN8P0NHA12GB.log` |
| `upstream-build` | `npm run build` | exit 0 | `gate-upstream-build-01M618D7YTH8PEF4QKKJ2A95EP.log` |
| `upstream-test` | `npm test` | 575, 575, 0, 0 | `gate-upstream-test-01M618D89YCQY92SJXCE4CWC76.log` |
| `merge-ci` | `npm ci` | exit 0 | `gate-merge-ci-01M618T28BZ7T4F0ZQ37QM7K5Z.log` |
| `merge-build` | `npm run build` | exit 0 | `gate-merge-build-01M618T2WV2KZT7FRTP6TTNG30.log` |
| `merge-test` | `npm test` | 790, 765, 0, 25 | `gate-merge-test-01M618T3E991AC2X2V57EE8CT6.log` |
| `merge-test-node24` | `npm exec --yes --package=node@24 -- node --import tsx --test --test-reporter=tap 'test/*.test.ts'` | 790, 790, 0, 0 | `gate-merge-test-node24-01M618TRT7H1W1YTZ7W8HZWEW3.log` |
| `merge-upstream-security` | `node --import tsx --test test/loneSurrogate.test.ts test/senderFraming.test.ts test/transport.test.ts test/unnamedPosts.test.ts` | 38, 38, 0, 0 | `gate-merge-upstream-security-01M618VE2STEW1SXKWZW98EYF5.log` |

All suites reported zero cancellations and zero TODOs. Parent comparison: fork **754 total / 731 pass / 0 fail / 23 skip**; upstream **575 / 575 / 0 / 0**; merge Node 22 **790 / 765 / 0 / 25**. Node-24-gated tests account for the skips, including the two added recipient framing tests; supplemental merge Node 24 runs **all 790 with no skips or failures**.

**Tests red on the final merge: none. Tests red on either tested parent: none.** Test-name inventory verifies that all 754 fork tests and all 575 upstream tests remain present. All **30 upstream-added tests** pass on the merge, plus the six new merge regressions (`test-inventory.json`). Upstream's three added test files and modified `unnamedPosts.test.ts` are byte-identical to upstream and pass as a separate 38-test gate.

## Development probes and independent review

These dirty-tree receipts document development rather than replace the final clean-commit gates:

| Gate name | Command after `--` | Result / tests total, pass, fail, skip | Log |
|---|---|---|---|
| `merge-prebuild` | `npm run build` | exit 2 (fixed before commit) | `gate-merge-prebuild-01M618HXRKF333K9KBGDEHMCHH.log` |
| `merge-targeted` | `node --import tsx --test test/accessPolicy.test.ts test/fileReferences.test.ts test/loneSurrogate.test.ts test/senderFraming.test.ts test/transport.test.ts` | 66, 66, 0, 0 | `gate-merge-targeted-01M618HY3QGT95EFA8SA40K4GD.log` |
| `merge-prebuild-fixed` | `npm run build` | exit 2 (fixed before commit) | `gate-merge-prebuild-fixed-01M618N375P5XCQRCCT5RKPWP5.log` |
| `merge-fork-security` | `npm exec --yes --package=node@24 -- node --import tsx --test test/accessPolicy.test.ts test/fileReferences.test.ts test/recipientIntegration.test.ts` | 49, 49, 0, 0 | `gate-merge-fork-security-01M618N3K59WJS4ZZM5G8VJX44.log` |
| `security-red-probe` | `npm exec --yes --package=node@24 -- node --import tsx --test --test-reporter=tap --test-name-pattern='writability refusals&#124;explicit-policy DM validates&#124;protected attachment names&#124;recipient source framing' test/accessPolicy.test.ts test/fileReferences.test.ts test/recipientIntegration.test.ts` | 6, 0, 6, 0 | `gate-security-red-probe-01M618PGX4WXKZB5N4GNYW8YJ0.log` |
| `merge-pretest` | `npm test` | 790, 765, 0, 25 | `gate-merge-pretest-01M618PHPQMVXT98M9Q5PTMW0Q.log` |
| `merge-prebuild-final` | `npm run build` | exit 0 | `gate-merge-prebuild-final-01M618Q8R6NEDR534B656H49PP.log` |
| `merge-pretest-node24` | `npm exec --yes --package=node@24 -- node --import tsx --test --test-reporter=tap 'test/*.test.ts'` | 790, 790, 0, 0 | `gate-merge-pretest-node24-01M618Q906MHG1HDRMBGHKWN4R.log` |
| `merge-review-probes` | `node --import tsx --test test/accessPolicy.test.ts test/fileReferences.test.ts test/threadStatus.test.ts` | 57, 57, 0, 0 | `gate-merge-review-probes-01M618Q3G8FNR08YZAD467HZ0Y.log` |

The two early build failures were test-only typing diagnostics introduced during this implementation: assertion narrowing of an empty call array to `never[]`, and an implicit-any callback in the new attachment test. Both were corrected; final build passes. The red probe intentionally disables text guards and sender framing; its six failures are expected, not final-merge failures. Exact failing test names are the six `merge_added_tests` entries in `test-inventory.json`. No other development test failures occurred.

Independent read-only review found **no blocking findings** and ran 57 targeted adapter/server/typing tests (all passed). It inspected the Node 24 security and red-probe evidence and core API differences without repeating the full suite. See `independent-review.md`. The review preceded commit; no source changes followed the reviewed tree. Final topology and clean-commit gates are supplied here.

Production-path evidence uses actual adapter/server and MCPL transport paths with recorded fake Slack endpoints/clients, not helper-only assertions: policy refusal ordering, no malformed-text writes or DM opens, both recipient lanes, hostile protected attachments and successful authorized fetches. No live Slack credentials were used.

# Unmet Criteria

None for this branch-only merge, under the explicitly approved authorization-lookup interpretation. The required independent review is complete. Main-branch integration and deployment remain separate decisions and were not performed.

# Residual Risk

- No live Slack workspace was exercised; fixtures cannot certify external service behavior.
- `npm ci` reports two high-severity advisories, for the existing pinned `axios` and `follow-redirects` dependency versions. Both parent installs report the same count. No unrelated dependency upgrades or `npm audit fix` were bundled. Details: `npm-audit.json`.
- Parent full suites were measured on Node 22; the supplemental no-skip Node 24 full suite was run on the merge only. No other platform/runtime matrix was run.
- Authorization-only lookups may occur before rejecting malformed message text, as explicitly approved. No such lookup carries the malformed text.
