# Documentation recommendation update

## Changed

- Commit: `71c3ce5044fdf2f0b54f6e6ac1846e2fc5a249f0`; new child of approved `b77a1b021a22a4a94a6bb02610cd2ff389a8c4b8`, not an amendment. No push or merge.
- Only `docs/FORK-VS-UPSTREAM.md` changed: six access-policy rows and one public PR link definition.
- The six recommendations now plan a later reconciled upstream PR together with fork PR #1, as one opt-in contract leaving defaults unchanged.
- The explicit-policy row distinguishes group-DM denial at `b956350d` from the open, unmerged proposal at `6a1946d0` (`feat/group-dms`).
- Attachment rows remain verbatim unchanged. “Which should I use” remains unchanged: its opt-in/deployment guidance does not contradict a planned later upstream proposal.
- Document: **20943 bytes**, **131 lines**.
- SHA-256: `29b4092b8942e5849b1e2926c986326cb2ed97c9964bbdfff55930e97fee3fee`.

## Verification Gates

Fresh gate at `71c3ce5044fdf2f0b54f6e6ac1846e2fc5a249f0`, clean tracked tree, exit **0**, receipt recorded:

```sh
orgasmic dispatch gate markdown-only -- sh -c 'test "$(git rev-parse HEAD^)" = b77a1b021a22a4a94a6bb02610cd2ff389a8c4b8 && test "$(git diff --name-only b77a1b02 HEAD)" = docs/FORK-VS-UPSTREAM.md && test "$(git diff --name-only b956350d HEAD)" = docs/FORK-VS-UPSTREAM.md && git diff --check b956350d HEAD && test "$(wc -l < docs/FORK-VS-UPSTREAM.md)" -lt 250'
```

Log: `gate-markdown-only-01M61AHSF8SDVX791EHAP9PT8V.log`.

Read-only verification: current `src/access-policy.ts:69-73` still denies group DMs; proposed `6a1946d0:src/access-policy.ts:11-13,47-49,78-87` adds the optional exact-ID policy. Public API confirms PR #1 is open and unmerged; sanitized evidence is `fork-pr-1-snapshot.json`. The future upstream submission is the supplied maintainer direction, not a claim of an existing upstream PR or acceptance.

Inherited evidence: the approved inventory/source comparisons and prior build at `b77a1b02` remain relevant because only this Markdown file differs from that commit or implementation baseline `b956350d`. Source, dependencies, lockfile and build configuration are unchanged. Earlier upstream PR states remain the document's dated snapshot, not newly refreshed evidence. The previous build is historical evidence only, not a new gate pass; this narrowed round requires only the fresh Markdown gate, so no build was rerun.

## Unmet Criteria

None.

## Residual Risk

Fork PR #1 remains a proposal, not merged behaviour at `b956350d`. Its eventual reconciliation and upstream submission/acceptance are future work; this commit changes documentation only. PR state is a dated snapshot (`fork-pr-1-snapshot.json`).

## Changed rows (verbatim)

File:line references retain the document's `b956350d` baseline unless another SHA is specified.

| Feature | What it does (user-visible behaviour) | Key commits | Already upstream in another form? | Open upstream PR | Recommendation and reason |
|---|---|---|---|---|---|
| **Access — explicit policy** | `SLACK_ACCESS_POLICY` separates joined-channel reads, writable channels and allowed DM peers; fresh membership/scopes guard events and operations. Group DMs are denied at `b956350d`; open, unmerged [fork PR #1][fork-pr1] (`feat/group-dms`, head `6a1946d0`) proposes support; unset retains legacy controls. | `f565376`; `src/access-policy.ts:31-96` | Partial: operator write/DM controls exist via #3 (`8ebb43a`), but not this fresh, consolidated read/write admission policy (`439a81b5`). | None found. | **Send upstream, later, as one reconciled PR together with [fork PR #1][fork-pr1] (group DMs)**: the policy is planned to go upstream as one opt-in contract; defaults remain unchanged (`f565376`; proposed extension `6a1946d0`). |
| Access — pinned public membership | Explicitly named public write channels can use a fresh one-message history proof when `channels:read` is absent; pins remain listable without wider discovery scopes. | `f565376`; `src/slack-adapter.ts:1017-1036,1127-1153` | No: #25 (`ed3f504`) limits discovery by granted scopes, but does not provide pinned history proofs. | None found. | **Send upstream, later, as one reconciled PR together with [fork PR #1][fork-pr1] (group DMs)**: the policy is planned to go upstream as one opt-in contract; defaults remain unchanged (`f565376`; proposed extension `6a1946d0`). |
| Access — stale pinned channel | A pin whose fresh proof fails is omitted instead of aborting the entire conversation listing. | `2425f3e`; `src/slack-adapter.ts:1021-1030` | No pinned-channel mechanism in `439a81b5`; upstream scope fallback (#25, `ed3f504`) solves a different listing failure. | None found. | **Send upstream, later, as one reconciled PR together with [fork PR #1][fork-pr1] (group DMs)**: the policy is planned to go upstream as one opt-in contract; defaults remain unchanged (`f565376`; proposed extension `6a1946d0`). |
| Access — listing cost | Skip channels explicitly listed as non-members before fresh metadata checks, avoiding an extra lookup for every public workspace channel. | `eb673bb`; `src/slack-adapter.ts:1095-1105` | Partial: upstream already filters non-member results (#25, `ed3f504`); only the fork adds fresh policy lookups whose cost needs this prefilter. | None found. | **Send upstream, later, as one reconciled PR together with [fork PR #1][fork-pr1] (group DMs)**: the policy is planned to go upstream as one opt-in contract; defaults remain unchanged (`f565376`; proposed extension `6a1946d0`). |
| Access — bounded-history integration | Every history/thread call, including cursor continuation, rechecks admission; a pinned proof is outside the read's page budget, and protected attachment hints count toward output size. | `f565376`; `src/slack-adapter.ts:1698-1773` | Partial: bounded reads are upstream #32 (`bff8f10`), but explicit-policy admission and file-reference shaping are not. | None found. | **Send upstream, later, as one reconciled PR together with [fork PR #1][fork-pr1] (group DMs)**: the policy is planned to go upstream as one opt-in contract; defaults remain unchanged (`f565376`; proposed extension `6a1946d0`). |
| Access — explicit DM scope preflight | Before text validation or `conversations.open`, explicit-policy DM sends check the peer plus `im:write`, `im:read` and `chat:write`; fresh exact-peer checks still precede posting. | `b956350d`; `src/slack-adapter.ts:1613-1630` | Partial: #45 (`870027c`, `3a0e992`) rejects malformed text before opening and prioritizes legacy authorization; no explicit-policy branch exists upstream. | None found. | **Send upstream, later, as one reconciled PR together with [fork PR #1][fork-pr1] (group DMs)**: the policy is planned to go upstream as one opt-in contract; defaults remain unchanged (`f565376`; proposed extension `6a1946d0`). |

[fork-pr1]: https://github.com/theaspirational/slack-mcpl/pull/1
