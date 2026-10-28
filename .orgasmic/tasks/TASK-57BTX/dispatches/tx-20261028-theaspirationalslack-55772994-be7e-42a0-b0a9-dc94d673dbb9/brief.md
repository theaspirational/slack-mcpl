TASK-57BTX: PLANNING ONLY. Write no production code and make no commit. Plan how to bring the fork's explicit access policy (and the group-DM support built on it) from theaspirational/slack-mcpl main 685b2debff12ed5cfdcae9070ddb131842c5a6d0 to upstream anima-research/slack-mcpl main (fetch it read-only; it was ca8f6b1193154384e4626921255f86923fc5edf3 recently) as small, separately reviewable PRs.

Rules:
- Read-only. No push, no GitHub comment, no PR edit. Public-safe text.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- If you run anything, use `orgasmic dispatch gate <name> -- timeout 900 …`, with a loopback-only guard in force for any listener.
- Read-only public GitHub reads are fine.

Inputs:
- `docs/FORK-VS-UPSTREAM.md` on fork branch task-nnewz-r2 (a2295638) if reachable; otherwise derive from the code.
- Our open upstream PRs #50, #51, #53 and #12 (being rebuilt), so you don't duplicate them.
- Upstream issue #47 and anything upstream already has on access control (allow-lists such as SLACK_SEND_CHANNELS, SLACK_DISABLE_DMS, readJoinedChannels and similar).

Report:
1. The fork's access-policy surface: settings and format, where checks run (read, history, send, DM, group DM, files, routing), its tests, and the pieces that depend on fork-only features (recipient routing, path uploads, disabled tools).
2. What upstream already covers and where the two differ in behaviour, especially defaults. Would anything change for an operator who doesn't opt in?
3. A proposed sequence of upstream PRs. For each: title, what it contains, estimated net production lines and files (marked as estimates), dependencies, and tests to carry or write. Aim for each under about 300 net production lines and 5 production files. Say which fork tests leak globals in a one-process suite (the known `fileAccess.test.ts` fetch-mock nesting) and how to avoid it.
4. Questions that need a maintainer or owner decision (naming, defaults, format, back-compat), each with options and a ⭐ recommendation.
5. Risks, and what you could not determine.