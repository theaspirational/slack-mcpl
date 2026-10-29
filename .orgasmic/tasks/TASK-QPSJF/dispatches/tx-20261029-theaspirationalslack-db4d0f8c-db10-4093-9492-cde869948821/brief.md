TASK-QPSJF: PLAN ONLY, read-only. Write only evidence/report.md and make no commit (finishing with no local commit is fine for this round).

Base: `81657f195e734c1a43ab5bed9ddffe741630e15d` (published as upstream PR #60, which adds the cursor-cycle guards). Preflight with `git rev-parse HEAD`, and fetch upstream main to report its sha.

**Problem.** `listConversations` (list_channels and background registration), `findUsers` (find_user) and `fetchSlackHistory` (history and backscroll) page through distinct cursors without bound. An earlier draft used hard 1000-page caps that threw. That was rejected, because a throw would break listings on very large Enterprise Grid workspaces (`conversations.list` returns all public channels before the membership filter).

**Design a truncate-not-throw bound, with options and one ⭐ recommendation for each of these:**
1. The limit per path (requests, pages, items, time). Derive it from Slack's real pagination sizes and rate tiers, citing public docs. Is a limit even needed where `maxMessages` or the `withCallTime` deadline already bounds the path? Show where they don't.
2. The truncation signal per surface:
   - the `list_channels` text;
   - `find_user` results;
   - history and backscroll (the existing `truncated` flag?);
   - background registration (log and status);
   - `refresh_channels`.
   A truncated result must never be presented as complete.
3. Configurability: an env var or a fixed constant? Defaults, and validation with refusal of bad values.
4. Interaction with rate-limit waits, the registration waiter (`REGISTRATION_TRIES` / GaveUp), the cycle guards, the policy-mode admission per candidate, and the MPIM members cap.
5. Legacy byte identity below the limits: the API, tool text and log bytes are unchanged.
6. The base: stack on #60, or an independent PR on upstream main? Note the conflicts.
7. Files, size estimate, the red/green test plan, the mutation plan and the docs/changelog draft.

**Rules:**
- no node, npm or test runs this round;
- if anything must run, it must be inside `XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 -- timeout 900 orgasmic dispatch gate ...`, with notifiers off and a proven loopback guard;
- no Slack credentials, no push, no PR;
- no private names.

**Report:** the plan, the options with ⭐, and the gates (preflight only).