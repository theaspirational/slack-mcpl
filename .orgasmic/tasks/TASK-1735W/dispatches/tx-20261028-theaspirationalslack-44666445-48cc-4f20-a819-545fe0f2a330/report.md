# Verdict

APPROVE — accuracy review of `docs/FORK-VS-UPSTREAM.md` at `b77a1b021a22a4a94a6bb02610cd2ff389a8c4b8` against fork base `b956350d` and upstream `439a81b5`.

## Findings (HIGH / MEDIUM / LOW)

None. No material unsupported claim, omitted fork-only feature, inconsistent disposition, or private name/context was found in the document.

## Verification Gates

Reused the supplied clean-tree receipts after reading their logs and the receipt rules:

- `build`: `npm run build`, exit 0. Reviewed evidence log `gate-build-01M61A5VH55QK57GSTNEREWH1Q.log`.
- `markdown-only`: `sh -c 'test "$(git diff --name-only b956350d HEAD)" = docs/FORK-VS-UPSTREAM.md && git diff --check b956350d HEAD && test "$(wc -l < docs/FORK-VS-UPSTREAM.md)" -lt 250'`, exit 0. Reviewed evidence log `gate-markdown-only-01M61A5VCC1YTCF541DENSETMJ.log`.
- Additional scoped probe: `orgasmic dispatch gate review-scoped -- node --import tsx --test test/accessPolicy.test.ts test/threadStatus.test.ts test/pathUploads.test.ts`, exit 0; 67 passed, zero failed/skipped. Current evidence log `gate-review-scoped-01M61ABX99J91Q6FV3VFWB39NN.log`. This exercises production adapter methods and protocol-facing server paths with fake Slack transport, including initialization, tool schema/calls, local path reads, typing notifications, reconnect isolation and DM authorization precedence. No live workspace writes.

### Coverage and citation audit

Read the complete document and the production-source delta from `git diff 439a81b5 b956350d -- src`, compared the 44-path diff inventory and the fork-only non-merge history (`git log --no-merges 439a81b5..b956350d`). All 22 non-merge changes map to remaining-feature rows or the historical/shared rows. The delta's policy, routing, file-reference, status, path-reader, configuration and security-integration paths are represented. No additional behavioural feature was found outside those groups.

Confirmed the stated merge base with `git merge-base 3302d700 439a81b5`, the two parents of `e616fe8`, and that the reviewed commit changes only the requested document. Confirmed cited upstream merge/fix commits are ancestors of `439a81b5` using `git merge-base --is-ancestor` (including #3/#25/#26/#32/#38/#39/#45/#47/#48).

Sampled rows across every group, checking cited commit contents and source at the specified snapshots; representative checks below (source lines default to `b956350d`):

| Doc line | Commit/source evidence | Result |
|---|---|---|
| 41 | `f565376`; `src/access-policy.ts:32-96`, adapter policy wrappers | Explicit joined/read/write/DM policy and group-DM refusal supported. |
| 42 | `f565376`; `src/slack-adapter.ts:1017-1036,1127-1153` | Pinned public-channel one-message history proof and independent listing supported. |
| 44 | `eb673bb`; `src/slack-adapter.ts:1095-1105` | Non-member prefilter precedes fresh policy lookup. |
| 46 | `f565376`; `src/file-access.ts:5-21`, `src/server.ts:986-1023`; adapter `1192-1198` | Readable conversation, exact file identity/association, private URL and redirect refusal supported; upstream `src/server.ts:877-906` remains URL-based. |
| 47 | `f565376`, `bb85ee1`; `src/server.ts:431-445`, `src/file-access.ts:24-30` | Required channel/file schema and missing-ID hints supported. |
| 48 | `b956350d`; `src/slack-adapter.ts:1613-1630`, `test/accessPolicy.test.ts:277-287` | Three local scope checks precede text/open; exact-peer verification retained. |
| 49 | `f565376`; `src/recipient-routing.ts:1-7,92-103,152-199` | Identity binding, durable dedup, wake rules, Node/POSIX boundary and at-most-once loss caveat supported. |
| 50 | `f565376`; `src/server.ts:367-382`, `src/host-compatibility.ts:37-45,74-131` | Version/attestation refusal and reusable bridge supported; attestation is not implementation proof. |
| 51 | `f565376`; `src/server.ts:640-658,1494-1523`, `src/slack-adapter.ts:1304-1316` | Frozen verified roots, stale-stop protection and generation checks supported; #20 overlap is qualified correctly. |
| 52 | `fe9297a`; policy/routing/compatibility validators; upstream `src/history-read.ts:91` | W-prefixed optional-mode IDs are distinct from upstream's existing author-filter support. |
| 53 | `f565376`; `src/configuration.ts:47-49`, `src/server.ts:430,681-683` | Unknown-name rejection, hiding and direct-call refusal supported. |
| 54 | `f565376`; `src/server.ts:246-250,1801`; upstream `src/server.ts:234-238` | Zero disables automatic fetch only; upstream instead defaults to 50. |
| 55 | `bdfaab7`; `src/slack-adapter.ts:1323-1350`, feature declarations | Best-effort status, refresh throttling and write gating supported; upstream `src/server.ts:579-583` is a no-op. |
| 56–57 | `2737559`/`f91d73f`, `9396854`/`2d9ac2a`; cited fork and #12 head lines | Reconnect clear and post/stop ownership fixes are present both in fork and open #12. |
| 58 | `23eb4a3`, `3f56b82`; `src/server.ts:800-819`, `src/tools.ts:268-291`, tool classes | Opt-in path interface, cardinality, filename default and guard-before-read supported. |
| 59–62 | `3b372ab`, `161c86a`, `61e322d`, `2726c7a`, `40c2fdf`, `999d8a0`; cited `src/upload-path.ts` ranges | Restricted descriptor checks/platform dependency, unrestricted path preservation, byte cap and diagnostics supported; #31 head retains the cited code. |
| 63 | `e616fe8`; security integration changelog and `src/slack-adapter.ts:1432-1436` | Upstream safeguards versus fork-path integration distinguished correctly. |
| 74–78 | #26/#25/#32/#38/#39 merge ancestry and merged source; `b060b2f` versus `479e809`, subsequent `1a37db3`; `6dd83aa`; `5338519`/`96b6331` | Shared implementations and subsequent reviewed semantics support dropping only the separate fork designation/patch. |

### Public REST verification

Unauthenticated `curl -fsSL -H 'Accept: application/vnd.github+json'` against the [public all-state PR endpoint](https://api.github.com/repos/anima-research/slack-mcpl/pulls?state=all&per_page=100) returned fewer than 100 entries, including exactly three open proposals:

- #12: open, unmerged, head `21a7ebcb38ab901c2e721b325c63fe8407ae7a7a`.
- #20: open, unmerged, head `7afe8df190475c894c1d88c2d638b2eef72539d3`.
- #31: open, unmerged, head `ddf92124e5f120b0576f66c9f989ca13ee9d74b4`.

Saved response: `public-prs.json`. Also checked merged states for #25/#26/#32/#37/#38/#39/#45/#47/#48. Inspected available Git objects for #12/#31 source and the [public #20 files endpoint](https://api.github.com/repos/anima-research/slack-mcpl/pulls/20/files), saved as `pr20-files.json`, because #20's head was not present locally. #20 implements optional exact publish targets (including top-level null), not the recipient ledger/status contract. The document does not incorrectly claim those open proposals are on upstream main.

Recommendations are consistent with their stated reasons: retain protocol/deployment-specific policy and routing glue; propose independent controls and opt-in attachment improvements; use existing status/path PRs rather than duplicate proposals; drop only shared historical patches. The stable-target guidance is explicitly a recommendation rather than an unsupported reliability measurement. Public-content review found only technical identifiers and public upstream references, not private names or deployment context.

## Unmet Criteria/test gaps

None identified for this documentation review. A full suite was neither required nor rerun. The scoped tests use fake Slack transport, not live Slack service verification; routing persistence was inspected rather than newly runtime-tested.

## Residual Risk

PR states can change after the documented 2026-10-28 snapshot. This approves the comparison's accuracy at the pinned commits, not the safety or correctness of all fork implementations or a promise that upstream accepts any recommendation.

## Fix Directions

None required. Retain the snapshot qualification when publishing or updating the table. Worktree remains clean at the reviewed commit; no source/document edits or commits were made.
