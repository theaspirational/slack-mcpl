# TASK-QPSJF — bounded pagination design (plan only)

## Changed

- Authored only this `evidence/report.md`; no source, tests, configuration, dependency files, or documentation were edited. Gate-generated receipts/logs are additional execution evidence, not implementation artifacts.
- No local commit, push, PR, Node, npm, build, test, mutation, or application launch. No Slack credentials were read or used. Public documentation was browsed without authentication.
- Read the supplied project baseline at `/home/orgasmic/.orgasmic/ledgers/theaspirational.slack-mcpl/.orgasmic/project.org`, the dispatch brief, applicable orgasmic skill instructions, and `CONTRIBUTING.md`. No applicable `AGENTS.md` was found; the supplied conventions/gotchas lists are empty. The baseline adds no substantive constraints.
- This is a proposal for owner selection, not authorization to implement. The explicit plan-only/no-commit brief overrides the generic implementer commit/build instructions.

## Preflight and base

`git rev-parse HEAD` returned **`81657f195e734c1a43ab5bed9ddffe741630e15d`**, exactly the assigned base. Initial and final inspected worktree/index were clean.

Fetched upstream main with:

```sh
git -c core.hooksPath=/dev/null -c credential.helper= fetch --no-tags upstream main
```

Both `FETCH_HEAD` and `refs/remotes/upstream/main` resolved to **`7274283fa719a17328ef8e085336ce25f6f22b08`**. `git merge-base HEAD upstream/main` returned that same SHA. Fetch changed Git metadata only; no checkout, merge, rebase, or commit was performed.

Options:

- **⭐ Stack on #60 at the assigned SHA.** Keep the cursor-cycle behavior and policy admission already present. Declare merge order: #60 first, bounded-pagination follow-up second. The brief supplies the PR-number association; the commit and code were inspected locally, not a separate PR-status check.
- Independent PR on fetched upstream main: smaller conceptual feature, but it must independently add cycle protection and later reconcile policy admission. It cannot demonstrate the required policy-mode behavior on that base alone.

The current stack contains five commits beyond upstream main and differs in 28 files (+2,822/-62). This is not merely a cursor-only base: it includes access policy, named group-DM admission, file authorization, and activation. Expected overlapping edits are `src/slack-adapter.ts` (all three loops, constructor/config plumbing, policy admission), `src/content.ts` (history loop), `src/server.ts` (policy labels and result surfaces), `src/config.ts`, `src/index.ts`, README and migration docs. `test/legacyPagination.test.ts` explicitly expects **1,002 distinct pages to complete** and must change under the proposed defaults. Independent work would conflict semantically with that expectation and with #60's cursor checks. No trial merge was run, so these are inspected overlap/conflict risks, not a claim of measured merge conflicts.

## 1. What is bounded today, and proposed limits

### Repository findings

| Path | Evidence at the assigned base | Remaining hole |
|---|---|---|
| `listConversations` | `src/slack-adapter.ts:973–1080`: requests 200 rows, then filters/adopts candidates; repeated cursors throw; scope changes clear output and cursor history. | Distinct empty, unjoined, or denied pages do not end the loop. Counting returned/admitted conversations would not bound it. Background registration is outside call time. |
| `findUsers` | `src/slack-adapter.ts:1730–1770`: `users.list(limit:200)` until 25 matches or cursor exhaustion. | An absent/rare query, deleted users or bots can consume arbitrarily many distinct pages without reaching 25. |
| `fetchSlackHistory` / adapter `fetchHistory` | `src/content.ts:406–441`, `src/slack-adapter.ts:1677–1690`: asks for `min(200, remaining maxMessages)`, preserves oldest-first output and a `truncated` boolean. | `maxMessages` bounds collected rows, not empty pages. Distinct cursors with empty pages evade both item and cycle checks. |
| Actual `fetch_history` / `fetch_thread` tools | `src/server.ts:850–863` calls `readHistory`/`readThread`, which use `src/history-read.ts:281–415`, not `fetchSlackHistory`. Defaults: 1,000 scanned, 65,536 bytes; maxima: 10,000 scanned, 1,048,576 bytes; match limit max 1,000. | Already bounded: a continuing page advances `scanned` by at least one or stops as `pagination_stalled`; boundary/exhaustion also stops. Thus at most `maxScanned` page fetches, even with no matches. No additional cap needed here. |
| Backscroll delivery | `src/server.ts:238–243,1606–1628,1687–1700,1739–1741`: default 50 messages, configurable to 1,000; delivery races the lookup against five seconds. | The race does **not cancel the pager**. Its discarded promise can keep making requests. The caller also currently discards `res.truncated`. |

`withCallTime` is a request-start check, not an aborting overall deadline (`src/slack-adapter.ts:379–418,598–670`). Foreground calls have 25 seconds from arrival, a 10-second request timeout, and five seconds of shared rate-limit waiting. Fast successful requests have no deterministic count ceiling within that time. SDK streaming/inactivity-timeout behavior can outlive it; direct fake clients do not enforce it. Background registration explicitly leaves this context. Therefore it is useful protection, but not a substitute for the requested pagination work bound.

The old history comments mention an unread cursor; this base has no `lastReadTs` implementation. `forwardedWatermark` records delivery of live messages, not proof that a history range was fully read. Do not invent an unread-state rewrite for this task.

### Public Slack facts (checked 2026-10-29)

- Cursor pages may contain fewer than the requested limit while still having more results. Completion comes from cursor exhaustion, not page length. Slack recommends 100–200 rows; its general ceiling is method-dependent. [Pagination](https://docs.slack.dev/apis/web-api/pagination/)
- `conversations.list` is Tier 2, 20+ calls/minute, default page size 100, with a limit under 1,000. Request-side filters such as archived exclusion apply after the virtual page is selected, so even sparse pages need draining. The method lists accessible workspace conversations; membership filtering in this repository happens afterward. Do not assume a documented ordering that puts joined channels first. [conversations.list](https://docs.slack.dev/reference/methods/conversations.list/)
- `users.list` is also Tier 2, 20+ calls/minute, can return short pages, and includes deactivated/invited users. This code explicitly requests 200; its 25 matches are not a directory-size bound. [users.list](https://docs.slack.dev/reference/methods/users.list/)
- The history reference currently lists Tier 3, 50+ calls/minute, recommends at most 200 per cursor page, and lists a maximum of 999. [conversations.history](https://docs.slack.dev/reference/methods/conversations.history/)
- The updated distribution-specific notice additionally describes **15 objects/request and one request/minute** for affected new commercially distributed non-Marketplace apps/installations. Internal customer-built apps and existing installations described in that notice are exempt. It also describes a 1,000-object ceiling for custom apps, differing from the general method reference's 999; retaining this code's request size of 200 avoids that discrepancy. Do not assume a particular installation's tier or revive an old blanket March-2026 rollout claim. [Updated rate-limit notice](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/)
- Tiers apply per method/workspace/app, are not exact throughput guarantees, and burst capacity is unpublished. Honor `Retry-After`; do not infer a request budget from elapsed seconds alone. [Rate limits](https://docs.slack.dev/apis/web-api/rate-limits/)

### Options and recommendations

These numbers are **product safety-envelope choices informed by those facts**, not Slack-prescribed scan limits or guarantees of Enterprise Grid completeness.

| Path | Options | Recommendation and derivation |
|---|---|---|
| Conversation listing, foreground refresh, background registration | 100 pages (quick but only 20,000 raw slots); 1,000 pages; 5,000 pages (up to one million raw slots, much more retained work). Returned-item cap alone fails for empty/filtered pages. | **⭐ 1,000 successful list pages per invocation**, adjustable upward. At the existing 200 request size this admits up to 200,000 raw rows, not 200,000 joined channels. Nominal Tier-2 arithmetic is 1,000/20 = 50 minutes of page traffic; 5,000 would be 250 minutes. Foreground time/rate checks normally stop earlier. Keep useful partial output, never throw merely for this ceiling. |
| Directory lookup | Match cap alone; 100 pages; 1,000 pages. | **⭐ 1,000 successful directory pages plus the existing 25-match cap.** Up to 200,000 inspected users at full pages and the same nominal 50-minute Tier-2 arithmetic, though foreground time normally dominates. Sparse/no-match queries still terminate. |
| `fetchSlackHistory` / backscroll | Only `maxMessages`; 100 pages; 1,000 pages. | **⭐ 100 successful history pages plus existing `maxMessages`.** A 1,000-message backscroll normally needs five 200-row pages or 67 15-row pages; 100 leaves room for short pages without allowing an endless empty drain. At full pages this is a 20,000-row opportunity, or 1,500 at 15/page, before the smaller message cap. Nominal history rate arithmetic is two minutes at 50/minute or 100 minutes at 1/minute, **not** a promise to wait that long: this path currently propagates rate-limit failures. One-row pages may legitimately truncate before 1,000 messages. |
| Public history/thread read tools | Add another page cap; reuse existing work limits. | **⭐ No new cap or result schema here.** The existing progress rule, `maxScanned`, match and byte bounds already supply the invariant. Preserve `pagination.scanComplete`, `stopReason`, and continuation cursor. |
| All paths: requests/time | Total network-request counter including candidate metadata; new background elapsed deadline; page budget with existing wait/deadline rules. | **⭐ Page budget, existing retry/deadline rules, no new elapsed-time bound this round.** This directly fixes distinct-cursor traversal and avoids workspace-speed-dependent truncation or per-candidate policy starvation. It bounds pages, not strict wall time or response bytes. A separate background elapsed budget would require cooperative cancellation across waits/lookups; a `Promise.race` alone is insufficient. |

Page accounting: increment after each successful pagination response, including an empty response and a response discarded by a scope restart. Keep this invocation counter outside `startOver`; failed calls/retries are not successful pages. Process the last allowed page under existing admission rules. If it is exhausted, return complete even when the count equals the limit. If it has a distinct continuation, return partial and make **no next-page request**. If a scope restart invalidates the last allowed response, discard the old stream exactly as today and return a possibly empty partial result; do not mix results from different type sets or reset the work budget.

Preserve existing item-limit short-circuit precedence in history/directory. Where traversal would otherwise continue, check for a repeated cursor **before** converting a new page-limit stop into partial success. A detected cycle remains the #60 error, not a normal truncation. No exported raw Slack cursor or resumable-listing protocol is proposed.

## 2. Truncation signals by surface

Shared principle: optional metadata exists only for an incomplete answer. Never append an empty array as though it proved absence. Keep truncation separate from omitted types, access denials, retry failure and host registration acceptance.

### `list_channels`

- Option: always replace the legacy array with `{conversations, complete}`. Easier schema, violates below-limit identity.
- **⭐ Preserve the existing array JSON text block and append a separate text block only on truncation**, using the existing `_content` mechanism already used for `leftOut`. Retain the scope-omission note and its existing order; add the truncation note after it. `SlackListing` gains optional `truncation: { reason: 'page_limit', pages, limit }`, absent on complete results.

Draft: `Incomplete conversation listing: stopped after 1000 Slack pages. Additional conversations may be missing, including joined channels or DMs. This is not a complete workspace inventory. Ask the operator to review the pagination limit; repeating this call with the same limit may return the same subset.`

For an empty partial result, keep the empty array **with this explicit note**. Do not say the workspace has no joined channels. No workspace names, raw cursors or candidate identifiers in new diagnostics.

### `find_user`

- Option: always return an adapter envelope, or attach properties to an array. The former changes normal API shape; array properties silently disappear on JSON serialization.
- **⭐ Preserve the adapter's plain array for complete results; introduce a tagged partial-only union**: `SlackUserMatch[] | { matches: SlackUserMatch[]; truncated: true; reason: 'page_limit' | 'match_limit'; pages: number; limit: number }`. Normalize it explicitly in the server. This preserves complete runtime/JSON bytes, while forcing typed consumers to consider partial results. It does widen the TypeScript return type; internal callers/tests must adapt.
- Tool result keeps normal `found/users` output for complete matches. Partial results add `truncated: true`, `stopReason`, and a note. Zero partial matches return `found:false, users:[], truncated:true` with **“No matching users were found in the portion scanned; the directory search is incomplete.”** Never reuse the current unqualified “No users matched” note on this branch.
- Also label the **existing** 25-match early stop when unexamined rows or another cursor remain. It already stops work without exhaustive search. Use `match_limit` with a narrower-query suggestion; for `page_limit`, explain that a narrower query still starts at the same directory prefix and cannot guarantee reaching unseen users. Exactly 25 on the final examined row with no continuation need not be marked incomplete. No lookahead API call merely to prove completeness.

### History and backscroll

- Option: add another public history schema; log only for backscroll; use existing flags and carry them to delivery.
- **⭐ Keep `fetchSlackHistory`/`fetchHistory`'s existing `{messages, truncated}` API.** Set `truncated:true` for a page-budget stop as well as the existing message-budget stop; preserve ordering, latest/oldest/inclusive and request sizes. No extra `false` fields elsewhere.
- **⭐ Propagate that flag into backscroll text**, not just debug logs: conditionally add `truncated="true"` to the `<backscroll>` opening tag and a fixed explanatory line such as `Backscroll is incomplete; older messages may be missing. Use fetch_history to inspect earlier history.` Render the marked block even when it has zero messages, including when bot filtering removes every retained message. Complete blocks remain byte-for-byte unchanged.
- Actual `fetch_history` and `fetch_thread` continue using their existing `pagination.scanComplete:false`, stop reason and next cursor, not the helper's boolean. Their existing time/rate partial results remain unchanged.
- A five-second delivery timeout is still a lookup failure, not a returned complete history. Do not change its behavior in the cap patch. The new page ceiling bounds remaining background pager work after that race; it does not cancel an in-flight response.

### Background registration: log and status

- Options: log only (insufficient machine-visible state); new status tool (unnecessary protocol expansion); generation-scoped status exposed through refresh.
- **⭐ Register only the admitted partial subset, emit one new count-only warning, and retain generation-scoped incomplete status.** Example: `[slack-mcpl] Conversation registration incomplete: enumeration reached 1000 pages; additional conversations may be missing. Enumerated 12 eligible conversations; host acceptance is separate.` Do not call this a full successful registration or a failed enumeration exception.
- Set status even for zero descriptors, before the current early return. Distinguish enumeration truncation from a failed/partial host `channels/register` answer. Do not add unsupported completeness fields to protocol descriptors or the register request. Preserve normal debug/log bytes for complete enumerations.
- Only the current connection/grant generation can publish status or warnings; stale work cannot overwrite a newer status. Revoke/disconnect clears connection-owned status. A complete subsequent enumeration can clear the incomplete marker. The existing in-progress `refresh_channels` refusal remains byte-identical.

### `refresh_channels`

- Options: silently report `visible` count; always change schema; additive incomplete-only fields.
- **⭐ On partial enumeration, retain `visible` and `added`, add `truncated:true`, `stopReason:'page_limit'`, and append the incompleteness note.** Explain `visible` is this scan's observed eligible count, not the workspace total. Preserve unnamed-DM and missing-scope notes. Replace the partial zero-added branch's “No new conversations” opening with “No additional conversations were registered from this incomplete scan.” Apply the marker on the connection-closed branch too if its returned enumeration was partial.
- If the prior current background enumeration was truncated, expose an optional `registration: { enumerationIncomplete:true, reason:'page_limit', pages, limit }` field while that condition remains unresolved. A complete refresh clears it after applying current results; a partial refresh retains it. No extra fields on the all-complete historical path. If a refresh errors, it remains an error, not a claim of complete registration.
- Repeated refresh starts from the beginning. It does **not** resume or guarantee eventual coverage. A larger operator budget may help, but foreground rate/deadline limits may still prevent it. Continuation/background-refresh redesign is out of scope and a documented limitation of this minimal proposal.

## 3. Configuration and refusal

Options:

1. Fixed constants: least plumbing, no runtime parser, but no recovery for a legitimately larger workspace without rebuilding.
2. One global page setting: simple, but listing capacity and small backscroll work have very different needs.
3. **⭐ Three startup settings, with finite defaults and no unlimited sentinel:**

| Proposed variable | Default | Accepted values |
|---|---:|---|
| `SLACK_CONVERSATION_PAGE_LIMIT` | 1000 | decimal integer 1–10000 |
| `SLACK_USER_PAGE_LIMIT` | 1000 | decimal integer 1–10000 |
| `SLACK_BACKSCROLL_PAGE_LIMIT` | 100 | decimal integer 1–10000 |

The upper ceiling is an explicit operational guardrail, not a Slack constraint. At 200 rows/page, the largest conversation override can inspect up to two million raw slots and nominally 500 minutes of Tier-2 page traffic. Document the cost prominently; raising it cannot promise completeness.

Parse once in `startupSettings` before `connectSlack`; use the same validated immutable settings for legacy and policy mode. Absent means default. A present value must match canonical decimal `[1-9][0-9]*` and be a safe integer in range: refuse empty strings, whitespace, leading zeros, signs, fractions, exponent/hex notation, junk suffixes, zero, negatives, `NaN`, `Infinity`, unsafe integers and values above 10000. No `parseInt`, clamping, silently ignored settings or `0=unlimited`.

Return a one-line startup refusal naming the variable and accepted range, without echoing arbitrary input. Exit nonzero before any Slack/WebSocket connection. Thread settings through `SlackAdapterConfig` / `connectSlack` / a trailing optional constructor argument; give library callers the same defaults and validate supplied overrides too. Pass history's page setting explicitly to the helper. A small `src/pagination.ts` may hold types/defaults/validation; do not build a generic pagination framework or read environment variables inside loops.

Do not change the existing permissive `SLACK_BACKSCROLL_LIMIT` message-count parser in this patch. That separate cleanup would break unrelated legacy configuration behavior.

## 4. Interaction choices and invariants

**⭐ Preserve existing retry/error/security semantics; add a distinct successful-page stop.** Alternative: unify all waits, candidate requests, auth probes and pages into one global request/deadline budget. That is broader, changes normal behavior, and requires a separate design.

- **Rate limits:** retain SlackWebClient's one eligible retry and shared five-second foreground wait allowance. A wait/retry is not a successful page; it must not reset the page count. At the page ceiling, do not make the next request or wait for it. Before the ceiling, foreground `OutOfCallTime`, rate-limit and transport failures still produce existing errors. This proposal does not turn every failed listing into partial success, preserving failure bytes below limits.
- **Registration waiter / `GaveUp`:** `REGISTRATION_TRIES=10` counts consecutive failures of one request, resetting after successful pages; it does not bound a long series of successful pages with intermittent 429s. Keep its log wording, nine sleeps and tenth-attempt refusal. Page-level `GaveUp` still ends registration through its existing error path, not through the new truncation path. DM-name `GaveUp` still labels with user ID and disables later name waits for that listing. Preserve supersession before and after waits.
- **No wall-time claim:** finite successful pages plus bounded retry attempts bounds method invocations for conforming page sizes, but `Retry-After` durations and a streaming response are not bounded by this new setting. This is intentional, and must be stated rather than calling it a total-duration limit.
- **Policy per candidate:** retain nonmember-public-channel fast skip, deduplication, fresh `conversations.info`, exact ID/type/scope/membership checks and five admission attempts (four retries) **per candidate**, not one shared retry count. Process all eligible candidates on the final allowed page; only authorized candidates enter a partial result. No cached/unchecked candidate may be admitted to make a partial list look fuller. Missing scopes still fail closed. Counts/notes must not disclose denied names or IDs.
- **Cost multiplier:** up to 200 raw candidates/page means at most `200 × pageLimit` candidate examinations under Slack's requested-size contract. Each policy candidate may make five admission attempts; each can include one info request and up to five membership pages. Thus page limits are not total network-request limits. DM-name lookups and auth probes have separate existing bounds/behavior. The counter includes successful discarded scope-restart pages, so restarts do not multiply the configured page allowance.
- **MPIM members cap:** leave `isGroupMember`'s **five × 200** page cap, cursor validation and fail-closed result untouched (`src/slack-adapter.ts:1107–1124`). This is evidence needed for authorization, not a workspace listing to truncate into an authorized answer. Exhaustion without finding the bot never becomes membership. Finding the bot is sufficient positive proof without draining the roster. New listing settings must not raise or bypass this cap.
- **Cycle guards:** retain all three errors and per-stream seen-cursor sets; a scope restart still clears its stream's set, but not the overall page counter. Test a cycle both below and on the page boundary. Preserve existing match/message-cap precedence where no continuation would have been attempted anyway.
- **Read state:** keep oldest-first partial history and do not use its newest row to mark the skipped older range read. Preserve the existing live-delivery watermark semantics, acceptance gating and revoke/reconnect handling; incompleteness is context metadata, not delivery failure.

## 5. Legacy byte identity contract

Options: always expose `complete:false/true` envelopes (clean but breaking), or incomplete-only branches. **⭐ Use incomplete-only branches and exact transcript comparison against the assigned base.**

For complete operations below **all** applicable limits:

- Same Slack methods, arguments (including absent versus present `cursor`), page size 200, request order, admission/name-cache behavior and retry sequence.
- Same adapter JSON/runtime shapes: listing has only `conversations/leftOut`; complete directory output stays an array; helper retains its existing boolean.
- Same tool JSON property order, text block boundaries, punctuation, whitespace, normal backscroll tags, normal register requests and stderr/debug lines. No per-page progress logs or startup “defaults active” notice. Do not edit tool descriptions/schema merely to advertise the feature; document it in README instead, preserving `tools/list` bytes too.
- Existing refusals, scope notes and normal registration-wait text remain unchanged. No completion inference from output size.

Important boundary clarification for owner approval: fixing already-silent **25-match truncation** and propagating already-true **message-limit backscroll truncation** necessarily changes bytes on those existing limit-hit cases, even if the new page ceiling was not reached. They are not “below all limits.” If identity is instead required whenever only the *new page cap* is unhit, that conflicts with making every truncated result visibly incomplete; choose explicitly rather than hide it. The recommendation prioritizes truthful signals at both old and new limit hits. Exact exhaustion on a boundary remains complete and byte-identical.

## 6. Implementation footprint (future round)

**⭐ Local counters and additive partial-result plumbing**, not a pager rewrite. Alternative: generic resumable pagination/status service; materially larger scope and protocol decisions.

Estimated production changes: **200–320 lines** across `src/pagination.ts` (small new types/defaults/parser), `src/config.ts`, `src/index.ts`, `src/slack-adapter.ts`, `src/content.ts`, and `src/server.ts`. `src/history-read.ts`, access policy evaluation, MPIM cap, dependencies and lockfile should not require changes. Avoid `src/tools.ts` description churn for byte identity.

Estimated tests: **350–550 lines** across a focused new pagination/config test file and updates to `test/legacyPagination.test.ts`, `test/slackHistory.test.ts`, `test/listConversationScopes.test.ts`, `test/registrationRecovery.test.ts`, `test/adapterAccess.test.ts` / `test/accessAdmission.test.ts`, `test/forwardingLifecycle.test.ts`, plus startup/production-path coverage as needed. Reuse existing fixtures instead of broad fixture refactoring.

Estimated docs: **50–90 lines** in README, `.env.example`, `docs/access-policy-migration.md` and `changelog.d/bounded-pagination.fixed.md`. Total approximately **600–960 added/changed lines across 15–20 files**; estimate, not a measured patch. No generated files or dependency changes expected.

### Red/green plan — not executed

1. **Finite red fixtures:** inject small limits (e.g. 2 or 3) and a fake service with a hard emergency ceiling of `N+2` requests so the unfixed implementation fails quickly, never hangs. Test each loop in both legacy and policy mode with distinct cursors; empty pages, sparse pages, all-unjoined channels, all-denied candidates, all-bot/deleted users and no matching user. Assert partial value, stop reason, retained rows, and exactly N page calls, not merely “does not throw.”
2. **Boundaries:** N−1 complete, N complete without cursor, N partial with cursor, N=1, overridden larger limit, empty final page, 200-row and 15-row service pages; real 1,002-page fixture completes under an explicit >=1,002 override and truncates under defaults. Keep unchanged cycle tests. Scope changes must discard stale rows but not reset the count. Never issue request N+1.
3. **Message and match caps:** retain helper's request-size/ordering tests; maxMessages reached before page cap; empty pages leave maxMessages unspent but consume pages; final exact match cap versus unexamined remainder; partial zero-match user result never asserts directory-wide absence.
4. **Actual history reader proof:** existing `historyRead` tests plus explicit empty-distinct-cursor and one-row-per-page/no-match cases; it stops with stalled/scan-limit semantics without a new cap. Keep result bytes and continuation behavior unchanged.
5. **Security and waits:** repeated success/429/success pages; retries do not consume successful pages or reset count; existing tenth-attempt `GaveUp` and name-fallback behavior; independent per-candidate attempts; MPIM membership found within cap versus absent/cyclic/malformed/only-beyond-fifth-page denied. No unauthorized descriptors or content.
6. **Surfaces:** full tool responses and block text for partial list with/without missing scopes; zero/nonzero find matches; refresh complete/partial/zero-added/unnamed-DM/closed-connection; register zero/partial/host rejection; partial status survives until a current complete scan and cannot be overwritten by a stale generation. Capture count-only warning exactly once.
7. **Backscroll production delivery:** fake an incoming addressed message through the real adapter/server; assert `truncated` survives shaping and bot filtering into the host's received block, including zero rows. Verify live event is delivered once; no false full-history claim and no late duplicate after timeout. Complete backscroll bytes unchanged.
8. **Startup refusal:** each malformed env value, default, minimum, maximum and one-over-maximum; both modes; refuse before auth/socket calls; do not echo rejected arbitrary values. Validate library-supplied settings too. Keep missing-token/normal startup output unchanged when new vars are absent.
9. **Legacy differential corpus:** run base and future implementation separately with identical deterministic fake responses, clocks, random IDs and SDK boundary; byte-compare raw MCP tool replies, MCPL registration/backscroll payloads, stderr and ordered API argument traces below all limits. Include empty results, missing types, scope restart, DM names, retries and existing error paths. Do not compare normalized/sorted JSON and call it byte identity.
10. **Production-path probe:** real `SlackWebClient` against a loopback HTTP fake, real adapter/server and host protocol connection, tiny validated budget, synthetic distinct cursors and zero-row pages; separately test source/built startup settings plumbing. Existing startup fixtures mock SDK boundaries and do not by themselves prove real HTTP isolation or client wiring.

Run red tests against the base, implement only after selection, then green targeted tests, typecheck/build, and required broader regressions per the next dispatch. Record numerical pass/fail counts and exact commands. No result in this report is a test pass.

### Mutation plan — not executed

For each mutation, run its narrow test and require failure, then restore the patch before the next one:

- Remove each path's cap; change `>=` to `>`; increment only for nonempty/admitted/matching pages; reset counter on scope changes or successful retries.
- Set truncated on exact exhaustion; suppress the metadata/note or throw at the bound instead of returning partial; drop the last allowed page; issue a lookahead request.
- Lose partial status at adapter/server normalization, return the old complete-empty find note, drop backscroll's flag, or suppress empty marked backscroll.
- Remove each cycle check or check the page cap before a repeated continuation; separately ensure pre-existing item-cap precedence stays as documented.
- Omit policy admission on the final page, share candidate retry counters, increase/remove the MPIM cap, or treat incomplete member evidence as membership.
- Let stale registration overwrite current status/register descriptors; clear partial status despite another partial scan; conflate host acceptance with enumeration coverage.
- Replace strict env validation with `parseInt`/fallback; fail to pass configured values through startup; add `truncated:false` or an unconditional log and require the identity corpus to catch it.

## 7. Documentation/changelog draft (not written to repository)

**⭐ Update existing operator docs and one fragment**, rather than new design/glossary files or editing released changelog sections.

README / `.env.example` proposed content:

```text
SLACK_CONVERSATION_PAGE_LIMIT=1000
SLACK_USER_PAGE_LIMIT=1000
SLACK_BACKSCROLL_PAGE_LIMIT=100
```

“These optional settings bound successful Slack pagination pages per operation, including empty pages. Values must be canonical decimal integers from 1 to 10000; invalid settings refuse startup. Listing/directory pages still request 200 rows. The budget is applied before membership, access-policy and query filtering, so large workspaces may yield incomplete results, even with few returned rows. Limits apply in both legacy and explicit-policy mode.

“On a bound, tools and backscroll explicitly identify incomplete results. Background registration announces only eligible conversations found, logs incomplete enumeration and retains status surfaced by refresh. A visible count is not a workspace total. Repeating a listing or refresh does not resume it and can return the same subset. Review limits with the operator; increasing them costs more requests and memory and does not bypass rate limits or deadlines. `find_user` also identifies the existing match-limit stop. History tools retain their bounded `pagination` results and continuation cursors.

“These are page-count bounds, not strict wall-clock or byte limits. Retry waits and cursor-cycle errors keep their existing behavior. The separate five-page MPIM membership proof cap is unchanged and fails closed.”

Migration doc: append the distinction between normal limit truncation and cursor-cycle/rate/admission errors near its current pagination paragraph. Explicitly retain fail-closed access checks and the unchanged complete-response contract. Explain that truncated backscroll may omit older context; it is not a complete archive.

Proposed `changelog.d/bounded-pagination.fixed.md`:

```markdown
- Bound conversation listings, user-directory searches and backscroll pagination
  in both legacy and explicit-policy mode. Page-limit stops retain eligible
  results and explicitly report incompleteness rather than throwing; background
  registration and refresh distinguish partial enumeration from full coverage.
- Add validated operator page limits, defaulting to 1000 conversation pages,
  1000 directory pages and 100 backscroll pages. Existing match/message limits
  also remain visible when they truncate results. Complete results below all
  limits retain their previous API, tool-text and log bytes.
```

## Verification Gates — preflight only

All gate commands used this envelope:

```sh
XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope \
  -p MemoryMax=4G -p MemorySwapMax=0 -- timeout 900 \
  orgasmic dispatch gate <name> -- bash -c '<read-only inspection body>'
```

Log directory: `/home/orgasmic/.orgasmic/runs/run-01M64J10V0A94VV0TKMQG0BJMF/evidence/`.

| Gate | Commands / inspection | Outcome / log basename |
|---|---|---|
| `preflight` | `git rev-parse HEAD`; `git status --short`; fetch command above; `git rev-parse FETCH_HEAD`; `git diff --stat FETCH_HEAD..HEAD`; attempted heading/guard-source inspection | **Exit 2, tooling failure:** a later Bash `printf` heading beginning with `---` was parsed as an option. SHA inspection and fetch had already succeeded. Not a code/test failure. `gate-preflight-01M64J29S0BFBD1R4WF7ZVAFTH.log` |
| `preflight-inspect` | HEAD/status/upstream SHA; `git log --format="%h %s" upstream/main..HEAD`; `sed` of config, adapter loops/waits/admission, helper | Exit 0. `gate-preflight-inspect-01M64J2G5KYAZM8R2TBCBTT8MD.log` |
| `preflight-surfaces` | `sed`/`rg` of server list/find/registration/refresh, bounded history, client timeout constants, test network fixtures, `CONTRIBUTING.md` | Exit 0. `gate-preflight-surfaces-01M64J2YZDWY54MW1CPTGVXTQ9.log` |
| `preflight-read-bounds` | bounded-reader implementation; adapter/client construction; backscroll and fake SDK fixtures; legacy 1,002-page test; index; `git merge-base HEAD upstream/main`; `git diff upstream/main HEAD -- src/content.ts src/history-read.ts` | Exit 0. `gate-preflight-read-bounds-01M64J39QTYJE3FKJQ2M8NSC9N.log` |
| `preflight-final-details` | remaining delivery/backscroll/tool descriptions/client wiring; `git status --porcelain`; `git rev-parse HEAD` | Exit 0, clean, assigned HEAD unchanged. `gate-preflight-final-details-01M64J4VCC11YXT30PRAVTKC5J.log` |
| `preflight-docs-context` | existing README/migration/history-test comments; delivery watermark; command-ownership instructions; `git diff --quiet`; `git diff --cached --quiet`; `git status --short` | Exit 0, clean. `gate-preflight-docs-context-01M64J69TWA9FK45ZZEGS7KYQW.log` |
| `preflight-report` | report presence/size; HEAD/upstream SHA; `git diff --exit-code`; `git diff --cached --exit-code`; `git status --porcelain` | Exit 0; report present outside worktree, worktree/index unchanged, no local commit. `gate-preflight-report-01M64JJJ8CVM10JGX8671VEK72.log` |

Full command argv/inspection ranges are recorded by the dispatch gate receipts. Public-doc retrieval used the browser tool, not the application or Slack Web API. No runtime receipts were reused; “reusable” labels emitted by the gate wrapper certify only these inspection commands, not behavioral verification.

**Execution caveat:** initial instruction/file discovery used ordinary read-only shell commands before switching to the required systemd/gate envelope. They were not reusable gates and did not launch project code. Under the literal “anything must run” rule, those unwrapped reads were a procedural deviation; do not represent this round as perfect wrapper compliance. The first discovery also searched for an absent `.orgasmic` worktree directory and exited 2; that did not prevent reading the supplied external baseline.

**Runtime safety preflight is not proven:** local tests have loopback listeners and injected/fake SDK boundaries, but that is not proof of deny-by-default network isolation for all child processes. No Node/npm/test invocation was attempted, and no application or application notifier was instantiated. This report does not claim a proven guard or a verified notifier-off harness. Before any future runtime gate, obtain/inspect the approved notifier-off mechanism and demonstrate a guard that rejects non-loopback HTTP/HTTPS, sockets/WebSockets, fetch/redirects and child-process escape while permitting synthetic loopback traffic. Use an allowlisted synthetic environment without inherited Slack credentials, and fail closed if the guard is absent. Never weaken the guard to run a test. Fetch/public-doc browsing are the separately requested upstream/public-source operations, not Slack probes.

## Unmet Criteria

- No implementation, red/green runs, mutations, byte-identity execution or production-path probe: intentionally deferred by the plan-only brief. All behavioral statements about the proposed patch are design requirements, not verified outcomes.
- Owner selection is still needed for default budgets, partial-only API/status shape, and the explicit old-limit-hit identity boundary. Recommendations are marked with ⭐; no implementation choice was silently applied.
- Strict wrapper compliance was not achieved for initial read-only discovery (disclosed above). The requested SHA/fetch evidence exists; the initial preflight wrapper failure is preserved, not erased.
- Runtime notifier-off/loopback-guard proof is a future execution prerequisite, not a passed gate. No private workspace or live Slack validation was attempted.

## Residual Risk

- Finite page limits inevitably omit legitimate late-arriving joined channels/users in sufficiently large or sparse workspaces. Partial registration preserves some usefulness but is not comprehensive discovery; a repeated foreground refresh may never reach the unseen suffix.
- Page counts do not cap response bytes, candidate metadata cost, total cache growth across invocations, concurrent invocations, streaming response duration, or cumulative Retry-After waits. No stronger bound is claimed.
- A widened adapter directory return type needs a caller audit; the additive partial-only tool fields and backscroll marker need exact integration tests. Existing message/match-limit hits will gain visibility, intentionally changing those boundary-case bytes.
- Slack rate documentation has distribution-specific exceptions and differing maximum-page wording. Keep 200-sized requests and react to actual responses; do not choose behavior from an assumed workspace tier.
- Base/PR overlap and status races were inspected, not compiled or merged. All size estimates and test plans remain provisional until the owner's implementation round.
