TASK-ER984, round 1: PLAN ONLY. No production code.

Repo anima-research/slack-mcpl. Start from `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf`. That is A3 (file and attachment gates, under re-review), on the group-DM commit ccbbb766 (published as #58), on #56 and #55, on upstream main 7274283f.
- Preflight: `git rev-parse HEAD` must equal it.
- Fetch upstream main and report if it moved.

Goal: plan the opt-in setting that ACTIVATES the explicit access policy, via upstream's `startupSettings` mechanism (see how disabled tools use it; that work is open as upstream #53). Today nothing assigns `SlackAdapter.accessPolicy`.

Deliver:
1. Activation design:
   - The setting shape, and where it is parsed. Refusing bad values must name the value.
   - The policy is passed at adapter construction, not assigned afterwards.
   - `groupDms` is passed by omission, never as undefined.
   - Startup scope diagnostics run after the policy exists.
   - What happens on partial or invalid config: refuse startup, never fall open.
2. Interaction with the legacy env vars: in explicit mode the policy REPLACES `SLACK_DISABLE_DMS`, `SLACK_DM_USERS` and `SLACK_SEND_CHANNELS` handling, and does not combine with them. Say exactly how that is documented and warned about.
3. Decide each open item, with options and a ⭐ recommendation, in plain words:
   a. Group-DM membership signal: is `conversations.info` `is_member` present for MPIMs? Use Slack docs plus the code's own assumptions. If unknown, name an alternative (`conversations.members`, or listing-implied membership).
   b. The file-mode allow-list (hosted/snippet/post versus a deny-list).
   c. DM file upload and delete without a `writeChannels` entry.
   d. `find_user` exposing the full directory under policy.
   e. Admission call budget or cache, given one `conversations.info` per candidate or event.
   f. `readJoinedChannels:false` plus pinned `writeChannels` silently denying writes: refuse the combination or document it.
   g. Anything else you find.
4. Fork fixes to consider folding in, by reading fork main (github theaspirational/slack-mcpl) commits `fe9297a` (Enterprise Grid W… IDs; only the non-routing parts), `2425f3e` (a stale pinned channel no longer ends listing) and `eb673bb` (check afresh only listed channels), plus the optional pinned-channel public fallback. For each, say whether it applies upstream and whether it should go in A4 or a separate PR.
5. README and migration docs outline, plus a changelog fragment.
6. Size, files, test plan: red/green, a real-server startup matrix, legacy byte-identity with the setting absent.

Rules:
- read-only;
- notifiers off; a loopback-only guard in force;
- any runs via `timeout 900 orgasmic dispatch gate`;
- no push or PR;
- no private names.