TASK-T71QC round 1: named group DMs under the explicit access policy. Still dormant.

Repo anima-research/slack-mcpl. Start from `f6e628352013751a8d89b76f93486ff4ac2931fe`: published PR #56, stacked on #55 `62a77616` on upstream main `7274283f`.
- Preflight: `git rev-parse HEAD` must equal it; refuse otherwise.
- Fetch upstream main and report if it moved.

Reference only: the fork (github theaspirational/slack-mcpl main), commits 6a1946d through 685b2de. Rebuild on upstream's shapes; don't copy blindly.

Requirements:
1. Policy model (`src/access-policy.ts`): a group-DM list of exact conversation IDs, with #55's strict parsing (read once, frozen copy, `Array.from` in `idList`, unknown keys refused). If a group-DM ID also appears in the history-membership fallback, refuse it.
2. Adapter: admission, listing, history and thread reads, and writes for named group DMs only. Scope checks for the needed `mpim:*` scopes, refusing before any post. At most one read-only lookup before refusal, which matches the existing pattern. Access must be independent of `readJoinedChannels`.
3. Tests:
   - A row that distinguishes the dedicated group-DM guard from the generic channel check, so removing either is caught.
   - Hostile cases: an unnamed G… ID, a C… ID in the group list, missing scopes, and a framing or label attempt.
   - Legacy and no-policy behaviour byte-identical.
   - Red then green.
   - At least 3 mutations of your own, caught.
4. No setter or env var: the policy is injected as in #56's tests. Labels for group DMs only on the policy path.
5. Stop and report if this needs `server.ts` changes beyond labels or admission, or if it overlaps attachment or file paths. A parallel change owns those.

Rules:
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- A loopback-only guard is in force.
- `npm ci --ignore-scripts` with empty configs.
- Gates through `orgasmic dispatch gate` under `timeout 900`: typecheck and build on 22.23.3 and 24.22.1, the full suite on 22.23.3, 24.22.1 and 22.12.0, and the new tests 5×.
- One commit on f6e62835, with the trailer `Co-Authored-By: GPT-6-Astra`.
- No push, PR or comment. No private names.

Report:
- the sha
- the diff stat
- requirement → evidence
- gates
- a PR body LAST, as plain public text saying it depends on #56. Nothing after it.