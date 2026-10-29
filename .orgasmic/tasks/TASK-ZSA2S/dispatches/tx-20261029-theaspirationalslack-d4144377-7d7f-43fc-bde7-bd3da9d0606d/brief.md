TASK-ZSA2S, round 1: PLAN ONLY. No production code in this round.

Repo anima-research/slack-mcpl. Start from `f6e628352013751a8d89b76f93486ff4ac2931fe`: published PR #56 (adapter gates), stacked on #55 `62a77616` on upstream main `7274283f`.
- Preflight: `git rev-parse HEAD` must equal it; refuse otherwise.
- Fetch upstream main and report if it moved.

Context:
- This is the third step of the access-policy series.
- The #56 review found that `fetch_attachment` (`src/server.ts` ~877–905) is entirely ungated in policy mode. A `files.slack.com` link pasted in an admitted channel could fetch bytes from a file shared only in an unadmitted conversation.
- #56's `deleteFile` gate doesn't consider the file itself.
- The fork (github theaspirational/slack-mcpl main) has `src/file-access.ts` and `test/fileAccess.test.ts` (commits f565376 and bb85ee1). Read them as reference only. The fork's semantics are not a spec.

Deliver a report with:
1. An inventory of every path on f6e62835 that reads file bytes or metadata, or touches a file: `fetch_attachment`, file refs in history/thread/incoming, upload targets, delete, anything else. For each: the inputs, the Slack calls, and what is gated today in legacy and in policy mode.
2. The threat cases: a URL or file id from an unadmitted conversation, a file shared in both, an external or shared-channel file, private URLs, a file id without a URL, and a race with an unshare.
3. A proposed gate per path, and the Slack evidence it relies on (`files.info` channels/groups/ims/shares, message membership). Name the scopes and API costs. For each, say what fails closed.
4. Options where a real choice exists, each with a ⭐ recommendation. Plain language, because the owner reads them.
5. The size estimate, the files, and the test plan: red/green, a deny matrix, legacy byte-identity.
6. Overlap risk with a parallel group-DM change (`access-policy.ts`, `slack-adapter.ts`, `server.ts`).

Rules:
- Read-only.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- A loopback-only guard is in force.
- Any test runs go through `orgasmic dispatch gate` under `timeout 900`.
- No push, PR or public comment.
- No private names in the report.