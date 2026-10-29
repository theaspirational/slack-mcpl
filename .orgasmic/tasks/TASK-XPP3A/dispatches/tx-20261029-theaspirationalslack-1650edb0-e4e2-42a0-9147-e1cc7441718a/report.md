# TASK-XPP3A — round 3 wording fixes

## Changed

**SHA: `772317c6badaa9cd999a6020d1e8bc2c9da8de9a`.** Amended into exactly one commit directly on published parent `62a77616228cdc7d4eda31a6f1561501e9e484fc`. Default author and required co-author trailer retained. Clean worktree; local only, with no push, PR, comment, merge or main-checkout edit.

Verified LOW-1 against the supplied reviewer report (`tx-20261029-theaspirationalslack-c8d169b4-c023-40bd-92a4-e34ef72a98c8`) and current source. Replaced the four named sites and the additional “group DMs await G” comment found by whole-diff grep. No changes for the optional, out-of-scope findings.

**No behavior change:** the production delta is exactly three line-comment substitutions. The test delta is one display-name substitution and one fixture-comment substitution. `r3-scope.py` reconstructs the expected files from `9f03ef92` using only those five exact replacements and asserts byte equality with the current files, with no other changed paths.

### `git diff 9f03ef92 HEAD --stat`

```text
 src/slack-adapter.ts         | 6 +++---
 test/adapterAccess.test.ts   | 2 +-
 test/adapterAccessFixture.ts | 2 +-
 3 files changed, 5 insertions(+), 5 deletions(-)
```

### `git diff 9f03ef92 HEAD`

```diff
diff --git a/src/slack-adapter.ts b/src/slack-adapter.ts
index 59fe0bf..80fd578 100644
--- a/src/slack-adapter.ts
+++ b/src/slack-adapter.ts
@@ -898,7 +898,7 @@ export class SlackAdapter {
   // ── Conversations ──
 
   private conversationTypes(): string[] {
-    if (this.accessPolicy) return ['public_channel', 'private_channel', ...(this.accessPolicy.dmsWritable ? ['im'] : [])]; // group DMs await G
+    if (this.accessPolicy) return ['public_channel', 'private_channel', ...(this.accessPolicy.dmsWritable ? ['im'] : [])]; // group DMs come later
     return this.disableDms ? ['public_channel', 'private_channel'] : Object.keys(TYPE_SCOPE);
   }
 
@@ -1585,7 +1585,7 @@ export class SlackAdapter {
       // Missing means unknown, not none.
       ...(typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? { replyCount: count } : {}),
       timestamp: new Date(parseFloat(msg.ts ?? '0') * 1000),
-      // Protected file references arrive in A3; do not offer legacy URLs under policy.
+      // Do not offer legacy URLs under policy; a later PR adds attachment enforcement.
       attachments: this.accessPolicy ? [] : (msg.files ?? []).map((f) => ({
         name: f.name ?? 'attachment',
         mimeType: f.mimetype,
@@ -1665,7 +1665,7 @@ export class SlackAdapter {
     await this.resolveUserNames([event.user, ...mentionIds]);
     const authorName = this.userNameCache.get(event.user) ?? event.user;
 
-    // No unprotected attachment references while the A3 file gates are absent.
+    // No unprotected attachment references; a later PR adds attachment enforcement.
     const attachments: AttachmentRef[] = this.accessPolicy ? [] : (event.files ?? [])
       .filter((f): f is { url_private: string; name?: string; mimetype?: string } => !!f.url_private)
       .map((f) => {
diff --git a/test/adapterAccess.test.ts b/test/adapterAccess.test.ts
index 4862df5..8b36b00 100644
--- a/test/adapterAccess.test.ts
+++ b/test/adapterAccess.test.ts
@@ -217,7 +217,7 @@ test('legacy mode preserves calls, payloads, outputs and exact refusal text', as
   assert.deepEqual(h.calls, []);
 });
 
-test('policy attachment references are dormant no-ops until A3, but legacy URLs remain unchanged', async () => {
+test('policy attachment references are dormant no-ops until attachment enforcement, but legacy URLs remain unchanged', async () => {
   const file = { name: 'note', mimetype: 'text/plain', url_private: 'https://files.slack.com/note' };
   for (const legacy of [false, true]) {
     const f = accessFixture({ legacy });
diff --git a/test/adapterAccessFixture.ts b/test/adapterAccessFixture.ts
index 1aee83a..7d45a0f 100644
--- a/test/adapterAccessFixture.ts
+++ b/test/adapterAccessFixture.ts
@@ -8,7 +8,7 @@ export const joined = (id = 'C1'): AccessConversation =>
   ({ id, is_im: false, is_mpim: false, is_private: false, is_member: true });
 export const accessConfig: SlackAccessPolicyConfig = { readJoinedChannels: true, writeChannels: ['C1', 'G1'], dmUsers: ['U1', 'W1'] };
 
-/** Deliberately test-local: A2 provides no supported way to install policy. */
+/** Deliberately test-local: this change provides no supported way to install policy. */
 export function installPolicy(adapter: SlackAdapter, config = accessConfig): void {
   (adapter as unknown as { accessPolicy: SlackAccessPolicy }).accessPolicy = new SlackAccessPolicy(parseAccessPolicy(config));
 }
```

### Whole committed diff label grep

Ran against the complete final commit diff from its published parent, not just the round delta or PR body:

```bash
git diff 62a77616 HEAD > whole-commit.diff
grep -nE '\b(A1|A2|A3|A4|G|F)\b' whole-commit.diff
```

Output:

```text
405:+test('scope follows fresh metadata, not C/G prefix; history scope is separate from read scope', async () => {
```

The remaining `G` is the literal Slack conversation-ID prefix in `C/G`, **not a chain label**, and is intentionally retained. No chain labels remain in the final committed diff. The removed labels naturally still appear on minus-lines in the round-to-round diff reproduced above.

The same grep against `pr-body.md` returns **no matches** (exit 1). The PR body is **byte-for-byte unchanged** from round 2, as requested. Raw evidence: `r3-diff-and-grep.log`, `whole-commit.diff`, `label-grep.txt`, `round3.diff`, and `r3-scope.log`.

## Verification Gates

All current-round checks ran through **`orgasmic dispatch gate <name> -- timeout 900 <command>`**. Notifiers were off from the first command. `env.sh` sets separate empty npm user/global configs, audit/fund off, and `NODE_OPTIONS=--require=/tmp/task-xpp3a/loopback.cjs`; the guard rejects listeners not explicitly bound to `127.0.0.1` or `::1`. Empty configs were rechecked. Node 22.23.3 is on PATH; other version bins remain in `/tmp/task-xpp3a/node-v<version>-linux-x64/bin`. No build caches are in evidence.

Evidence directory: `/home/orgasmic/.orgasmic/runs/run-01M63CRZCX39P7FPSM65CET916/evidence`. Summary log filenames below are relative to it; each includes the immutable `gate-<name>-<invocation>.log` receipt path. Exact sequential runner: `r3-gates.sh`.

| Gate | Command after wrapper | Result / log |
|---|---|---|
| `r3-install` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass; `r3-install.log`. |
| `r3-typecheck-22.23.3` | `npm run typecheck` | Pass; `r3-typecheck-22.23.3.log`. |
| `r3-suite-22.23.3` | `env PATH=<version-bin>:$PATH npm test` | **672 pass / 0 fail**, no skips/cancellations; `r3-suite-22.23.3.log`. |
| `r3-suite-24.22.1` | same with Node 24.22.1 | **672 pass / 0 fail**, no skips/cancellations; `r3-suite-24.22.1.log`. |
| `r3-suite-22.12.0` | same with Node 22.12.0 | **672 pass / 0 fail**, no skips/cancellations; `r3-suite-22.12.0.log`. |
| `r3-new-tests` | `node --import tsx --test --experimental-test-isolation=none test/adapterAccess.test.ts test/adapterAccessServer.test.ts` | **73 pass / 0 fail**, once as assigned; `r3-new-tests.log`. |
| `r3-scope` | `python3 <evidence>/r3-scope.py` | Exact five wording replacements only; unchanged PR body; exact parent, clean tree, empty configs. `r3-scope.log`. |
| `r3-diff-and-grep` | `bash -c '… git diff --check; git diff --stat; git diff; grep …'` | Pass; complete stat/content and grep output above. `r3-diff-and-grep.log`. |
| `r3-report-check` | `python3 <evidence>/r3-report-check.py` | Checks final receipt heads/results, runtime versions, label-match classification, unchanged body and final verbatim quote; `r3-report-check.log`. |

### Inherited evidence and scope

The plain-language PR body, existing guard/environment script and previously verified runtime installations are retained unchanged. The prior official archive checksum verification and published-parent 599-test baseline remain historical evidence; no earlier application gate pass is substituted for a current-round required check.

The unchanged PR body retains the prior round's two-version build/typecheck and five-repeat test evidence. **This round reran exactly the assigned gates:** Node 22.23.3 typecheck, all three full suites, and one targeted run. Builds, the second typecheck, five repeats, changelog/release checks and earlier reviewer probes are not claimed as freshly rerun. Their source behavior/configuration inputs are unaffected by these comment and test-display-name edits. Round-2 evidence remains at `/home/orgasmic/.orgasmic/runs/run-01M63BQ6N1W8PTSRV1XD32WJ3Z/evidence`.

## Unmet Criteria

None. All requested wording substitutions, whole-diff grep, single-commit amendment and current-round gates are complete. No final gate failed.

## Residual Risk

No new runtime risk is introduced by this wording-only delta. Existing boundaries remain: attachment fetching is not policy-gated, the workspace directory is outside confinement, admission adds uncached metadata calls, and supported activation must wait for attachment enforcement. These caveats remain in the unchanged public body. Live workspace/load/macOS testing is still not performed. The future PR still requires the `no-changelog` label; no public label was applied.

## Final PR body (`pr-body.md`, unchanged)

> ## Problem
>
> Part 2 of the access-policy chain: the internal policy model needs adapter enforcement before supported opt-in can be exposed. This PR **depends on #55**; review and merge #55 first.
>
> ## Changes
>
> - Prepare fresh metadata/identity, read/history, write/scope, listing, inbound, DM-open, upload, rollback and reaction/ACK gates behind private policy state.
> - Retain the early no-D-ID send-list veto for `send_dm`, then verify the opened DM's exact peer and destination. Derive the DM-disabled description from whether the policy allows any peers.
> - Preserve legacy behavior when no policy is supplied. No environment variable, CLI option, connector setting or public installer is added: **inert until a later PR adds the opt-in setting**.
> - A later PR adds attachment enforcement; group DMs come later. Until then, internal policy mode refuses group DMs and suppresses attachment references. No new channel-join API or server `channels/open` change.
> - Make the ID-list predicate hole-safe for future callers (behaviour-neutral today).
> - Document the user-directory exception and file-deletion pairing assumption; silence test-local console diagnostics without changing production logging.
>
> ## Safety boundaries and open questions
>
> **`fetch_attachment` is NOT gated by the policy yet.** Suppressing attachment references does not protect downloads of URLs supplied by callers. **Activation must not land before attachment enforcement.** A later PR must enforce attachment access before another adds the opt-in setting.
>
> **The user directory is outside the policy's confinement.** `find_user` is gated only on `users:read` and returns results from the whole workspace directory, subject to its existing query and result limits—not just admitted DM peers or members of admitted conversations. Whether directory results should be filtered is an open question for the later activation PR; this PR does not change that behavior.
>
> Fresh admission adds one `conversations.info` per listing candidate, inbound event and read or write, with no cache. Whether a short TTL cache or a call budget is needed is open for activation.
>
> Activation should pass the policy at construction so the startup scope diagnostic is policy-aware. These tests intentionally inject private state after construction and do not exercise that future wiring.
>
> ## Tests
>
> - Unchanged published-parent baseline: **599 pass / 0 fail** on Node 22.23.3, 24.22.1 and 22.12.0 (recorded in the initial implementation round).
> - This revision: **672 pass / 0 fail** on each version; no skips or cancellations.
> - Typecheck and build pass on Node 22.23.3 and 24.22.1.
> - All **73 new tests pass five consecutive runs**. The getter regression covers empty/allowed DM peers, both legacy switches, absent policy and send-list/readability separation.
> - Test-local console mocks are scoped to each test; targeted runs emit no Slack diagnostic noise.
> - Real server/adapter tests cover tool refusals, host publish and rollback; a loopback upload exercises the byte-transfer path without mocking fetch.
> - Internal-only changelog exemption checked; scratch release folds the published parent and this revision identically.
>
> ## Not verified
>
> No live Slack workspace, live external host, macOS or rate-limit/load testing. Admission is not transactional with Slack effects; cleanup after revocation may leave artifacts. File deletion relies on the caller's conversation/file pairing recorded from its own upload; a future arbitrary-file tool must verify association.
>
> ## Out of scope
>
> Protected attachment fetching, supported opt-in configuration, group-DM admission, public-pin fallback, routing and typing. These private preparations are not a supported partially enabled security feature.
>
> ---
>
> - [x] Internal-only change: apply `no-changelog` per CONTRIBUTING.md. No fragment is needed while this remains unreachable through supported configuration.
>
> 🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)
