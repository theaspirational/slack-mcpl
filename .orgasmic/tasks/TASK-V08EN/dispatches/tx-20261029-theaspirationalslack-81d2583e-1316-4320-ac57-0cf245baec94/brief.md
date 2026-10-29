TASK-V08EN: Slack reactions, built as ONE upstream PR for anima-research/slack-mcpl. Read the task body first.

Base: upstream main. Start from 7274283fa719a17328ef8e085336ce25f6f22b08. Fetch upstream `main` read-only; if it moved, rebase onto the new head and report it. This PR is independent of the open access-policy PRs #55 and #56: do not depend on them. Report any files you touch that they also touch (`src/slack-adapter.ts`, `src/server.ts`), so a later rebase is predictable.

Step 0, before coding: read the adapter's history and thread formatting, `add_reaction` and the internal ACK `reactions.remove`, the scope and feature-set tables, the README tool table, and CONTRIBUTING. If the design below conflicts with upstream conventions, or needs a maintainer-level decision, STOP and report the options.

Build:
1. Reactions in `fetch_history` and `fetch_thread` output. Slack's `conversations.history` and `conversations.replies` already return `reactions` (name, count, users). Show the emoji name and count per message, and mark the ones that include the bot's own user id. Keep the output's existing size bounds: cap the reactions listed per message and say how many are omitted. Messages without reactions must produce byte-identical output to today. No extra API calls.
   - Incoming live messages: not requested. Leave them unless it is trivial and consistent, and say which you chose.
2. A new `remove_reaction` tool, mirroring `add_reaction` (same arguments, same feature set, scope `reactions:write`, same send-list and writability checks as `add_reaction`). It calls `reactions.remove`; Slack only removes the caller's own reaction anyway.
   - Map `no_reaction` to a clear fixed message, and the other Slack errors the way `add_reaction` does.
   - It must not interfere with the ACK-reaction bookkeeping: think about removing an emoji that equals the configured ACK reaction, and test it.
3. Docs: the README tool table and feature-set docs. A changelog fragment is required, since this is user-visible.
4. Scopes: say whether `reactions:read` is needed. It shouldn't be, because history carries reactions. Show the evidence.

Tests (fresh, one-process suite safe; one mock per property per context; no nested `globalThis.fetch` mocks):
- red/green for the reactions rendering (with and without reactions, own marked, cap and omitted count, byte-identity without reactions);
- `remove_reaction` success, `no_reaction`, a send-list refusal before any Slack call, and the ACK interaction;
- at least three mutations of your own.

Rules:
- Local only. No push, PR or comment. Public-safe text, no internal names.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with empty user and global configs; audit and fund off.
- Node 22.23.3 on PATH. Node 24.22.1 and 22.12.0 in scratch, checked against the official SHASUMS256.txt.
- A loopback-only guard is in force for test listeners.
- Every check runs as `orgasmic dispatch gate <name> -- timeout 900 …`.
- One commit, default author, trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`.

Gates:
- typecheck and build on 22.23.3 and 24.22.1;
- full suite on all three Node versions, with the base as baseline;
- the new tests 5×;
- changelog check.

Report:
- the sha and diff stat
- the design choices
- gates
- residual risk
- a PR body per the template, in `pr-body.md`, quoted LAST in the report with nothing after it, ending with the footer `🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)`