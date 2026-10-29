# TASK-ZSA2S — round 1: plan only

## Changed

- No repository files changed; no production code, tests, configuration, commit, push, PR, or public comment created. This report and `preflight.txt` are evidence artifacts outside the worktree. The explicit read-only planning instruction takes precedence over the generic implementation/commit completion template.
- Required starting HEAD verified: `f6e628352013751a8d89b76f93486ff4ac2931fe` (#56), parent `62a77616228cdc7d4eda31a6f1561501e9e484fc` (#55).
- Ran `git fetch --no-tags upstream main`. Fetched main is **unchanged**: `7274283fa719a17328ef8e085336ce25f6f22b08`.
- Read the supplied `.orgasmic/project.org` baseline, `CONTRIBUTING.md`, and applicable skill instructions. No AGENTS.md found in the worktree or applicable ancestor directories. Supplied conventions/gotchas: none.
- Both notifier variables were set from the first shell command and on every subsequent shell command. No application process, live Slack call, test server, or test suite was started; no loopback guard was removed or weakened.

## Summary for the owner

The reported hole is real. Policy mode currently hides attachment lists, but `fetch_attachment` still downloads a caller-supplied Slack URL without checking conversation or file membership. Hiding links does not protect the download tool.

Recommended direction: policy-mode downloads take **conversation ID + file ID**, obtain fresh Slack evidence, and download only Slack's verified private URL without following redirects. Keep the entire legacy URL path unchanged. Restore safe attachment references in all message surfaces without treating those references as permission to download.

The important separate choice is rollback deletion. A file can be readable here and still be shared elsewhere; deleting it is not a conversation-local operation. The conservative recommendation below leaves policy-mode file deletion disabled until the owner explicitly accepts a wider deletion rule. This is a proposed choice, not an implementation made in this round.

## 1. Inventory on the exact requested HEAD

### Common gates today

- In MCPL mode, tool calls require the `tools` capability and their active feature set: `slack.history` for attachment/history/thread reads; `slack.messaging` for upload and message writes (`server.ts:597–640`, `feature-sets.ts:101–116`). Plain MCP has no MCPL grant. Neither grant proves Slack conversation admission.
- Legacy reads use `assertNotDm` only when DMs are disabled. That check may use cached conversation kinds. The legacy incoming DM-user list filters incoming senders, not arbitrary history/file reads. The legacy send-channel list constrains writes, not reads.
- Policy conversation reads use fresh `conversations.info`, exact matching ID and known scope metadata. Joined channels require `readJoinedChannels`, confirmed membership, complete kind flags, and `channels:read` or `groups:read`. DMs require the configured peer and `im:read`. Group DMs are rejected on this HEAD. History/incoming also require the corresponding `*:history` scope. Writes additionally require the configured write target and effect scope and intersect the legacy send list. Policy does not intersect the legacy DM switches (`slack-adapter.ts:1048–1077`; `access-policy.ts:62–91`).
- These policy gates are dormant: no supported setting installs the policy. Tests inject it through `test/adapterAccessFixture.ts`; do not port the fork's activation setting.

| Path and source | Inputs / Slack calls / file data | Legacy gate today | Policy gate today |
|---|---|---|---|
| `fetch_attachment`, `server.ts:877–906`; `content.ts:64–149,158–181`; schema `tools.ts:215–226` | Required `url`; GET with environment bot bearer when present. Returns image blocks, decoded text, or base64. No `files.info`. | HTTPS + exact `files.slack.com` host + no URL credentials; token-header validation; 5 MiB streaming cap, request-time budget and timeout. Redirects followed (cross-origin bearer stripping is not an admission gate). No DM/send-list/conversation gate. | **Identical ungated download branch.** No scope, conversation, or file association check. `tools/list` still requires only `url`. |
| `fetch_history` → `readHistory`, adapter `1507–1527`; formatter `1562–1595`; `history-read.ts:219–239` | `channelId`, range/filter/limit/cursor. `conversations.history` pages contain `files[]` name, MIME and private URL. User lookups may accompany shaping. | DM-disable check before read; attachment names/MIME/URLs emitted as strings. No individual file authorization. | Fresh history gate per invocation, including continuation, not per page. **All shaped attachment refs are suppressed** with `attachments: []`; raw file metadata still arrives in the Slack page. Message text, including pasted file links, is not removed. |
| `fetch_thread` → `readThread`, adapter `1531–1543` | `channelId`, `threadTs`, read options; `conversations.replies`. Same attachment shaper. | Same legacy history gate. | Same fresh conversation/history gate and attachment suppression. No file lookup. |
| Automatic first-interaction backscroll → `fetchHistory`, adapter `1548–1559`; server `164–188,1663–1715` | Incoming conversation and latest timestamp, configured limit; paged `conversations.history`. | Same legacy history gate. Adapter holds names/MIME/URLs; server backscroll text shows **names only**, not actionable URLs. | Same fresh history gate; attachment lists empty. This is a separate pager from bounded tool reads and must not be missed. |
| Incoming Socket Mode message / `file_share` → `prepareMessageEvent`, adapter `1635–1701` | Slack event channel/user/timestamps/text/`files[]`; `conversations.info` in policy, optional `users.info`. No file download. | Self/bot/subtype checks; DM-disable and incoming DM-peer filters. Only entries with `url_private` become refs; name/MIME fallback and image flag added. | Fresh history gate, plus exact DM sender/peer check; failed gate drops event. **All refs suppressed.** Event channel type alone cannot authorize. |
| Host delivery of those refs, server `1570–1577,1740–1820` and following push branch | `attachmentNote`, image/file event tags, and raw `metadata.attachments` feed either `channels/incoming` or `push/event`; backscroll has separate rendering above. | Inherits adapter checks, plus host delivery/grant/subscription routing; no file check. URLs appear in text and metadata. | Inherits suppression. Both delivery routes and metadata must change together when refs return. No extra Slack file API today. |
| `upload_file` validation and adapter upload, server `687–765`; adapter `1310–1357` | Target `channelId`, filename, exactly one inline text/base64 input, optional title/comment/parent message ID. `files.getUploadURLExternal` → POST bytes to returned ticket URL → `files.completeUploadExternal` with the returned file ID and exact `channel_id`/optional `thread_ts`. Completion file metadata supplies matching ID and optional share-message timestamp. | Input/Unicode/base64/5 MiB checks in server; send-list and DM-disable checks before ticket; Slack enforces its scopes. No local path upload. | Fresh writable-target check with `files:write` before ticket. No file association can exist yet for a new file. No recheck between ticket, bytes, and completion. |
| Upload byte transport, adapter `1365–1386` | Only the URL returned by Slack's ticket API, not a tool URL. POST `Buffer`; reads response body, no bearer. Default fetch redirect behavior. | Relies on upload entry gate and trusted API ticket; timeout/budget. | Same transport and earlier gate. New file ID and completion association are checked only as above. |
| Failed upload tracking / rollback, server `754–764,1395–1541`; `state.ts:36–49,105–116` | Successful or partially failed uploads record file ID + intended channel, optional share timestamp/comment state. Rollback reads these in-memory records, calls `deleteFile`, then independently deletes the sharing message if known. | Active messaging feature set; recorded provenance; adapter send-list/DM checks. Rollback is best effort and drops records even after failed cleanup. | Active messaging grant plus fresh write gates. A recorded target is **historical intent**, not current file membership. Failed uploads may never have had a share. |
| `deleteFile`, adapter `1484–1492` | Recorded `channelId` and `fileId`; `files.delete({file})` receives **no channel**. No public delete-file tool, but adapter is callable directly. | Send-list/DM checks on supplied channel. Slack decides whether bot can delete. | Fresh writable channel + `files:write`, but **no file evidence**. Comment explicitly relies on caller's recorded pairing. Can affect a file later unshared or reshared elsewhere. |
| Messages referring to files: send/reply/DM/publish, edit, delete, reactions/ACK | Message text can contain file URLs; message methods and `reactions.*` operate on conversation/message IDs, not `files.*`. Rollback also uses `chat.delete` for upload's share message. | Existing message write restrictions. | Existing fresh message write gates. Does not itself fetch bytes; sending a link is not proof that its file became shared. Removing a share message is not the same as deleting the file. |
| Local filesystem and bookkeeping | `server.ts:107–122` optional debug-log append; `1002–1043` subscription JSON read/write/mkdir; `state.ts` in-memory upload records. | Operator-selected local paths; no Slack API. | Unchanged, not Slack attachment reads. Do not add path uploads or filesystem permissions in A3. Avoid logging raw authorization metadata/private URLs in new code. |

Source-wide search found no other production file downloader and no `files.info`, `files.list`, `files.remote.*`, thumbnail download, file search, public-URL creation/revocation, or file-edit API. Message `attachments`/Block Kit unfurls are not independently fetched; the file-ref sources are the `files[]` arrays above. Exported low-level content helpers are not separate tool routes; the production byte-helper caller is the server branch.

## 2. Threat cases and proposed outcomes

| Case | Required outcome under the recommended policy plan |
|---|---|
| URL pasted from an unadmitted conversation into an admitted message | A URL is not permission. URL-only invocation fails before network; do not scrape an ID out of URL/name/text and call that provenance. Plain message text may still display the link. |
| Known/guessed file ID from an unadmitted conversation | Validate requested conversation first. A readable target plus an unrelated file ID may cause one internal `files.info` authorization lookup, but returns no metadata or bytes and makes no GET. A denied target causes no file lookup. |
| File shared in both admitted and unadmitted conversations | Read allowed through an explicitly requested admitted conversation with positive current association. This does not admit the other conversation or expose its names, IDs, comments, or shares. Deletion is a separate decision below. |
| External/remote file | No external host fetch and no bearer forwarding. Reject external-file download even if a message contains a ref. No new remote-files scopes or API support. |
| Shared-channel / Slack Connect file | Do not reject solely for shared-channel origin; apply existing conversation admission. An event stub can supply an ID but not download authority. Fresh complete file evidence and allowed canonical URL are necessary; unresolved/restricted/incomplete proof denies. |
| Private URL | Use only the private URL returned for the exact file ID by the authorization lookup. Never caller-supplied URL, permalink, public URL, thumbnail, or external URL. No redirects, including same-origin redirects. |
| File ID without URL | Supported input when paired with a conversation ID. Resolve URL through `files.info`; if it has no acceptable URL, deny bytes, not fall back to the message URL. A reference missing an ID is explicitly non-downloadable. |
| Unshare before a later fetch | Fresh association check denies; no cached authorization or earlier-message fallback. |
| Unshare between check and byte GET | There is a time-of-check/time-of-use window. Immediate checks reduce it, but cannot make two Slack requests atomic. Never promise race-free revocation. See decision 6. |
| File moved/reshared after upload, or guessed file ID paired with writable channel | Original target and caller pairing are insufficient for global deletion. Recommended policy deletion refusal prevents a cross-conversation destructive effect. |

## 3. Proposed gates, evidence, scopes and costs

### A. Download: one adapter-owned authorization operation

Introduce a narrow policy-only resolver taking `(channelId, fileId)`; do not expose an ungated public `getFileInfo(fileId)` returning arbitrary metadata.

1. Check argument shape/IDs, known scope metadata, and `files:read` before metadata requests.
2. Reuse `readAccessConversation(channelId)` for fresh exact admission. No cached names/kinds, pinned-channel bypass, URL parsing shortcut, or new group-DM semantics.
3. Call `files.info({file: fileId})` through the existing deadline/retry-aware Web API client. Require a usable object with `file.id === fileId`.
4. Require positive exact association with the requested conversation: a validated `channels`/`groups`/`ims` array contains its exact ID, or a validated own `shares.public`/`shares.private` entry for that ID contains a real share record with a valid timestamp. Mere object key, empty array, substring, `[null]`, or malformed record is not evidence. Missing optional alternatives do not veto a valid proof; malformed present evidence and clearly contradictory state fail closed.
5. Reject unresolved/restricted or external metadata. Select nonempty `url_private_download`, otherwise `url_private`; a present invalid preferred URL is an error, not permission to try a weaker fallback. Validate HTTPS, exact `files.slack.com`, and no credentials. Do not derive URL authority from a caller's file ID or a URL's path.
6. Return only the authorized URL and necessary safe label internally, not the raw file object. Preserve token-header safety, existing byte/time caps and result encoding. Add a transport option whose legacy default remains `redirect: 'follow'`; policy selects `redirect: 'error'`. Refuse even a 3xx returned by a custom transport.

**Cost:** successful fetch = 1 `conversations.info` + 1 `files.info` + 1 byte GET (plus retries already bounded by the client). Required scopes: `files:read` and the conversation's `channels:read`, `groups:read`, or `im:read`. No `*:history` scope is proposed for an ID-based download unless the owner chooses message revalidation. `files.info` requires `files:read`, is Tier 4 (100+ requests/minute), and its pagination concerns file comments; do not crawl comments to authorize a download. [Slack files.info](https://docs.slack.dev/reference/methods/files.info/)

**Fails closed:** bad IDs/scopes, absent API support, unknown/unjoined/unsupported conversation, missing/mismatched file object, no positive association, unusable URL, metadata/API errors, rate-limit/time-budget exhaustion, or redirects. Unknown scopes/bad arguments start no requests; conversation denial starts no file request; file denial starts no GET. A denial should not disclose other share IDs, file names, raw metadata, or credentials.

The authorization lookup necessarily reads control-plane metadata before association can be known. Treat it as an internal decision input, never a user-facing file-info endpoint. If the intended confinement rule forbids even this lookup for a supplied unrelated ID, arbitrary ID-based fetching cannot meet it; that would require a stricter message-provenance design.

### B. History, threads, backscroll and incoming references

Keep #56's conversation/history gates. Policy refs come only from Slack's `files[]` on the admitted message/page/event; never from text URLs, a filename that looks like an ID, or an unfurl. Require known `files:read` before exposing file refs; otherwise keep message content but withhold file fields.

Carry validated `fileId` and its message's `channelId` in a distinct policy reference shape; no private `path`/`url` property. Display only metadata already in the admitted message, with a protected-fetch argument hint. Missing ID yields a non-downloadable label. Slack Connect ID-only stubs get a generic label, not an automatic metadata fetch. Do not silently discard ID-only refs as legacy incoming currently does.

Render the same protected hint in history, thread, backscroll, incoming text, and structured incoming/push metadata. Do not hide executable instructions inside `name` as the fork does: keep filenames as labels and rendering explicit. Make history rendering happen **before** `readBounded` byte accounting (`history-read.ts`), so new hints cannot evade its size limit. Backscroll needs its own policy-only rendering branch because today it displays only attachment names.

**Evidence:** admitted conversation plus Slack-returned message membership establishes the reference's provenance, **not current download authorization**. A later fetch always repeats gate A. No new `files.info` per message/ref under this recommendation.

**Cost/scopes:** retain 1 fresh conversation check per history/thread/backscroll call plus existing page calls; incoming retains its existing fresh check per event. Existing history scopes are `channels:history`, `groups:history`, `im:history`; name resolution may use existing user lookups. Additional file-ref calls: zero. Missing history admission fails the read/drops the event; missing file scope or malformed file entry suppresses file fields, not otherwise admitted text. An adapter-level typed representation must prevent policy refs falling through legacy URL rendering.

### C. Upload target, byte POST and completion

Keep server input validation and `requireWritableConversation(channelId, 'files:write', ...)` before ticket creation. The new file is authorized by **its admitted writable destination and the API-issued upload ticket**, not pre-existing shares. Use only the returned file ID and exact target for completion, never a caller-provided existing file ID.

Recommendation: recheck writable target immediately before `files.completeUploadExternal` in policy mode. Do not complete if membership/scopes have changed while uploading. Preserve failed-upload tracking; an extra failed check after bytes leaves an unshared/incomplete upload and must not be misreported as a successfully shared file. For policy transport, require a well-formed HTTPS ticket URL and reject redirects; retain legacy transport unchanged. This trusts the authenticated Slack ticket response, not arbitrary tool URLs; do not invent an upload-host wildcard or open a new external upload feature.

**Cost/scopes:** current policy upload = 1 conversation check + 2 file API calls + 1 byte POST; recommendation adds 1 conversation check before completion. `files:write` plus conversation read scope, write allow-list and send-list intersection. No `files:read` requirement for creating a new file. The upload APIs require `files:write`; the ticket workflow separates byte upload from completion/sharing. [Upload ticket](https://docs.slack.dev/reference/methods/files.getUploadURLExternal/), [Upload completion](https://docs.slack.dev/reference/methods/files.completeUploadExternal/)

**Fails closed:** denied initial target sends no ticket/bytes/completion; invalid ticket sends no bytes; denied recheck sends no completion. Thread association remains Slack's validation of `channel_id` + `thread_ts`; an additional parent lookup would add history scopes/calls without being a file-read prerequisite.

### D. Delete and rollback

**Recommended conservative A3 gate:** in policy mode, refuse global `deleteFile` before `files.delete`, with an explicit “file may remain” cleanup reason. Preserve the existing legacy branch exactly. Keep sharing-message deletion as a separately gated `chat.delete` in its admitted writable conversation; do not claim this deleted the file. No public file-delete tool is added.

This avoids pretending that readable association proves permission to delete everywhere. `files.delete` takes only a file ID and deletes the file; it needs `files:write`. [Slack files.delete](https://docs.slack.dev/reference/methods/files.delete/)

**Cost:** no file-info/delete calls for the refusal; message cleanup retains its fresh conversation check + `chat.delete`, with conversation read scope and `chat:write`. Keep existing scope/admission checks before the explicit refusal if preserving #56 denial order is desired. The unchanged rollback bookkeeping can still return successful checkpoint movement with incomplete cleanup: test the counts/reason, not only the success boolean. This refusal must not masquerade as `file_not_found` or increment “deleted”.

**Alternative if the owner wants deletion retained:** require server-recorded upload provenance, fresh writable target + `files:write`, fresh `files:read`/`files.info`, exact file identity and positive current target association before `files.delete`. No URL is required for deletion. Cost: 1 conversation check + 1 file lookup + delete, versus today's check + delete. Deny unshared/orphaned/mismatched/unknown files. Checking all *visible* share targets adds one conversation check per distinct target but cannot prove there are no hidden targets. This is a weaker, explicitly accepted global-delete rule, not a complete confinement guarantee. Do not silently add an orphan-cleanup exception based only on a caller's `(channelId,fileId)` pair.

### Slack evidence limits (important to the decisions)

Slack documents current sharing arrays and share records. Private-group/DM lists are visibility-filtered; `has_more_shares` and `skipped_shares` can indicate omitted shares. Remote-file URLs can target external hosts. Slack Connect events can contain only `file_access: check_file_info` stubs. These support positive membership checks, not proof of exclusive sharing. [Slack file object](https://docs.slack.dev/reference/objects/file-object/)

`conversations.info` supports `channels:read`, `groups:read`, `im:read`, and `mpim:read`, and is Tier 3 (50+ requests/minute). A3 must reuse the policy's current kind decisions; scope possession alone is not admission. [Slack conversations.info](https://docs.slack.dev/reference/methods/conversations.info/)

## 4. Real choices for the owner

1. **How callers name a file.** ⭐ Require conversation ID + file ID in policy mode; keep URL-only legacy untouched. Reject an extra policy URL argument rather than suggesting it influences the fetch. Alternative: accept a URL and infer an ID, but URL formats and aliases become another security parser and still cannot prove sharing. No need to preserve a never-activated policy URL contract.
2. **A file shared both inside and outside allowed conversations.** ⭐ Allow reading through one freshly proven admitted share. Requiring every share to be admitted would block ordinary reused files and cannot be proven from visibility-limited metadata. Reading the file does not grant access to the other conversations.
3. **When to verify refs.** ⭐ Show minimal file metadata already supplied in an admitted message; verify current association only on download. This adds no per-file API fan-out and clearly separates a reference from authorization. Alternative: fetch/verify every file before showing even its label (up to one lookup per unique file per read/event, with bounded concurrency and no long-lived positive cache). That is stricter freshness for metadata, but slower and more fragile under rate limits. Do not fall back from a failed current check to an old message.
4. **Global file deletion.** ⭐ Refuse it in policy mode for A3; explain incomplete rollback and leave manual cleanup. Alternative: retain deletion with recorded provenance + current file association and accept that other shares can be affected. A read-authorized file is not automatically safe to destroy. This decision matters before implementation, not just at activation.
5. **External files and redirects.** ⭐ Keep downloads limited to the existing exact Slack file host, reject external files and every redirect. Allow Slack Connect files only when normal gates succeed. Broader external-host/CDN support requires a separately designed credential and origin policy; it is not a mechanical port.
6. **Revocation timing.** ⭐ Fresh checks immediately before each download, with no cross-call authorization cache, and an explicit residual race. Alternative: check again after buffering and discard output if access has gone away (extra conversation/file calls, still already read bytes and still not atomic). If zero bytes after an instantaneous unshare is required, neither design guarantees that; do not enable downloads on that promise.
7. **Long upload.** ⭐ Recheck target before sharing, as C proposes. Alternative: keep #56's one check at the start and accept target changes during upload. Neither creates an atomic Slack operation; the extra check narrows the avoidable window.

## 5. Fork reference: reuse ideas, not semantics

Inspected `src/file-access.ts` and `test/fileAccess.test.ts` at `f565376`/`bb85ee1`, related adapter/server integration, and `test/fileReferences.test.ts`. Also compared the named files against the locally available fork tracking ref; helper blob is unchanged. No claim that the fork tracking ref was freshly fetched.

Useful: exact target association, private URL from `files.info`, channel+file schema, fresh rechecks, no redirects, and missing-file-ID refs. `bb85ee1` fixes schema properties as well as required fields: both list and runtime behavior need tests.

Do not copy wholesale: fork policy activation, recipient routing, pinned-channel behavior, error strings, path-upload work, and filename-embedded instructions are not this spec. The helper accepts any nonempty share array (even malformed entries), does not itself validate file identity, and is not a delete gate. Its adapter `deleteFile` still checks only the supplied conversation. The fork tests are a useful starting list, not a proof of A3 coverage or legacy byte identity.

## 6. Size, files, test plan

### Size estimate

With the starred choices: **medium**, approximately 2–4 engineering days plus review; roughly 200–350 production lines and 400–700 test lines across 10–14 files (estimate, not a commitment). Eager per-file metadata gating or provenance-aware global deletion/orphan cleanup adds approximately 1–2 days and more state/error-path tests.

Expected production files:

- New `src/file-access.ts`: small pure validation/association and protected-hint helpers; keep authorization I/O in adapter.
- `src/slack-adapter.ts`: optional/typed `files.info` boundary, single policy-authorized resolver, file-ID ref shaping, upload final recheck, policy delete refusal. Use an internal read-only policy-mode discriminator if server needs it; **no installer or setting**.
- `src/content.ts`: policy ref types/file ID input types and optional redirect mode, preserving legacy defaults and output encoding.
- `src/history-read.ts`: render typed policy references before budget accounting.
- `src/server.ts`: policy-only schema selection and fetch dispatch, incoming/backscroll rendering, safe policy refusal wording as needed.
- `src/tools.ts` only if schema variant is factored there; do not mutate the shared legacy definition. `src/slack-errors.ts` only for policy-specific errors/new pre-completion-check wording; preserve legacy wording.
- A distinct `changelog.d/access-policy-files.fixed.md` fragment describing dormant preparation. No activation docs/settings, lockfile changes, generated files, or repository-wide cleanup.
- Prefer **no edits** to `src/access-policy.ts` or `src/state.ts` for the recommended design. The alternative cleanup/provenance rule changes that estimate.

Expected tests: new `test/fileAccess.test.ts` and `test/fileReferences.test.ts`; extend `test/adapterAccessFixture.ts`, `test/adapterAccess.test.ts`, and `test/adapterAccessServer.test.ts`; focused additions to download/upload/rollback tests as needed. Use separate fixture helpers to reduce collisions with group-DM work.

### Red/green sequence for the implementation round (not run here)

1. Capture baseline legacy wire/output bytes and request traces at `f6e62835` using deterministic fixtures and fixed clocks/IDs. Add regression tests before fixes. The critical red test sends policy-mode URL-only `fetch_attachment` through the real server and proves it currently performs an unauthorized GET. Add red tests for unrelated file ID, absent protected refs, and policy deletion with a reshared/unshared file.
2. Tests must fail because the data/effect is allowed or required protected behavior is missing—not merely because a new method cannot compile. Record failing test names/counts and assertion evidence under the gate receipt.
3. Implement the narrow gates and refs; rerun identical tests green. Extend denial and positive matrices below. Recheck combined policy paths at the reported implementation commit.
4. Exercise production path: real `SlackMcplServer` + real adapter + real `SlackWebClient` against loopback Slack API fixtures; download boundary intercepted only to route an approved production-shaped URL to a loopback byte server. Do not weaken production host validation to make tests work. Assert canonical request, fake bearer handling, redirect refusal, size/time budgets, and zero byte-server requests for denials. Separately test native redirect behavior with loopback servers. Restore transport mocks (do not stack global-fetch mocks across tests).
5. Byte-identity verification: compare legacy tool list/schema and exact serialized success/error strings/content blocks, decoded image/binary bytes, history/thread/backscroll/incoming metadata, upload payloads and rollback outcomes against baseline. Include invalid URL/header, redirects, HTTP errors, timeout, cap boundary, missing-ID/URL files, empty optional fields. Require zero new legacy `files.info` or conversation calls. Existing tests passing alone is not proof of byte identity.

### Deny/allow matrix to implement

| Dimension | Cases and decisive assertion |
|---|---|
| Arguments / schema | Policy URL only, missing/blank/malformed channel or file ID, wrong types, extra URL; zero unauthorized calls. List requires declared `channelId` and `fileId`. Legacy list/runtime stays URL-only. |
| Conversation / scopes | Unknown scopes, missing `files:read`, each missing kind scope; nonmember; `readJoinedChannels=false`; mismatched/incomplete metadata; denied DM peer, wrong incoming DM sender; group DM denied on this base; API timeout/429/error. No file lookup after failed conversation admission. |
| File evidence | Missing/null/array/wrong-ID object; exact match in each of channels/groups/ims/public-shares/private-shares; prefix collision; empty/malformed records; unrelated shares; unresolved stub, deleted/tombstoned, contradictory metadata. No GET on failed proof. |
| Positive reads | Public/private channel and admitted DM; ID-only ref; file shared both inside/outside; no write pin but readable channel. Every allowed byte GET uses returned canonical URL, not caller/message URL. |
| URLs / bytes | Both private URL alternatives; no URL; invalid preferred URL; HTTP, credentials, ports/lookalikes, workspace host, external mode, same/cross-origin redirects, binary/image/text, empty/over-limit/stalled body, no token in errors. |
| Freshness | Allow → unshare → retry denies; membership revoked after cached label/history/ref; file changes to unrelated ID; no fallback to earlier message evidence. Mid-check/unshare race recorded as a limitation, not a falsely passing atomicity test. |
| Ref surfaces | History, thread, cursor continuation, auto-backscroll, `channels/incoming`, `push/event`, metadata and tags. No legacy URL fields in policy refs; no ID invented from text/name; no label lookup for stub; missing scope suppresses refs; output budget includes hints; framing remains escaped. |
| Upload / rollback | Denied target sends no ticket/POST/complete; final target revocation suppresses complete after bytes; success exact destination/thread; policy delete refusal for arbitrary, tracked, dual-shared, and orphan files; share-message cleanup independent; correct partial-cleanup count/reason. Legacy failed-upload rollback remains identical. |
| MCPL / dormant | Capability/feature-set denial cannot reach authorization or bytes; plain MCP still enforces Slack policy when test-injected. No environment setting activates policy. |

All future checks must retain both notifier variables and the loopback-only guard, and use `timeout 900 orgasmic dispatch gate <name> -- <command> ...`. Suggested gate commands (names are proposals):

```sh
timeout 900 orgasmic dispatch gate a3-red -- node --import tsx --test --experimental-test-isolation=none test/fileAccess.test.ts test/fileReferences.test.ts
timeout 900 orgasmic dispatch gate a3-typecheck -- npm run typecheck
timeout 900 orgasmic dispatch gate a3-green -- node --import tsx --test --experimental-test-isolation=none test/fileAccess.test.ts test/fileReferences.test.ts test/adapterAccess.test.ts test/adapterAccessServer.test.ts
timeout 900 orgasmic dispatch gate a3-legacy -- node --import tsx --test --experimental-test-isolation=none test/fetchAttachment.test.ts test/attachmentUrls.test.ts test/attachmentDownload.test.ts test/uploadValidation.test.ts test/uploadSteps.test.ts test/uploadRollback.test.ts test/historyReadIntegration.test.ts test/senderFraming.test.ts
```

Add the new baseline-comparison tests to the legacy gate. Record exact pass/fail counts and receipt/log paths. These are proposed scoped gates, not receipts or a claim that a full suite/build was run. Any later assigned broader gate must use the same timeout/dispatch wrapper.

## 7. Parallel group-DM overlap

- **`access-policy.ts`: high semantic overlap, avoid textual edits.** File gates delegate to the existing admission decision. Do not duplicate C/G/D prefix classification, peer/member checks, or group scopes inside `file-access.ts`. Group-DM support remains the other change's responsibility.
- **`slack-adapter.ts`: high textual and semantic overlap.** Shared areas include API interfaces, policy discriminator, conversation helpers, message event preparation, history shaping, and fixtures. Put file-specific helper/type work separately; add the resolver beside the conversation gates without rewriting them. When group admission lands, the resolver should inherit it rather than having its own permissive `is_mpim` branch. Group-specific `mpim:read`/`mpim:history` and participant checks belong to that change.
- **`server.ts`: moderate/high overlap.** Tool offering/dispatch, incoming metadata/tags and backscroll are common surfaces. Limit changes to `fetch_attachment` schema/branch and typed attachment rendering; avoid routing or lifecycle refactors.
- Shared policy tests/scopes and positive delete/upload traces will need deliberate integration. The base's “attachments remain suppressed” test must be replaced narrowly, not deleted along with its legacy assertion. Group-DM expected failures must be reconciled after merge, not loosened in advance.
- Proposed integration order: both branches remain dormant on #56; land one, replay the other, resolve these named hunks, then run a combined matrix: allowed group + associated file, allowed group + unrelated file, denied/changed participant set, missing scopes, upload recheck and rollback. Do not enable policy until both independent paths and their combination are checked.

## Verification Gates

- **Preflight: passed by inspection/commands**, not a test gate. `git rev-parse HEAD`, `git fetch --no-tags upstream main`, fetched/tracking SHA comparison, stack log and clean `git status --porcelain=v1`; raw compact evidence: `preflight.txt` alongside this report.
- **Source inventory/reference comparison: completed.** Read the named production paths, current policy tests, both supplied fork commits and reference integration, plus the official Slack documentation linked above. Conclusions distinguish existing behavior from proposals.
- **Tests/builds: not run**, intentionally, in this read-only planning round. No gate receipts, red/green numbers, runtime verification, or live Slack compatibility are claimed.

## Unmet Criteria

- None for the **round-1 planning deliverable**: inventory, threats, proposed gates/evidence/scopes/costs, owner options, size/files/tests, and parallel-change risks are covered.
- Production implementation, one implementation commit, red/green evidence, legacy byte-identity proof, and combined group-DM verification remain future-round work, explicitly not authorized here.
- Owner choices, especially global deletion and metadata-reference strictness, should be settled before implementation. Recommendations here do not silently redefine the acceptance contract.

## Residual Risk

- Policy-mode `fetch_attachment` remains vulnerable on this unchanged commit. Dormancy must remain intact until the gate work lands; no live activation was attempted.
- Slack association visibility and asynchronous revocation prevent claiming complete exclusive-sharing proof or atomic check-and-fetch. Conservative file-deletion refusal sacrifices automatic cleanup rather than claiming unsupported confinement.
- Minimal message metadata under the recommended lazy-ref approach is a snapshot from an admitted message, not a current file-state guarantee. Eager checks are the documented stricter alternative.
- Extra metadata checks consume call time/rate budget; newly supported refs increase bounded output size. Error paths must not leak authorization metadata, and file refs must be covered in structured metadata as well as text.
- Source inspection and public API documentation are not live-workspace validation, especially for Slack Connect stubs, external files, scope/token-specific responses, and metadata completeness. All later tests must remain loopback-only unless separately authorized.
