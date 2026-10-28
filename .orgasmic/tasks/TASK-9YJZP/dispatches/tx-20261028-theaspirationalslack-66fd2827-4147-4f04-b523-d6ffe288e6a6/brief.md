Task TASK-9YJZP holds the goal and acceptance. This brief is the procedure. Local commits on your task branch only: no push, no GitHub comment, no merge to any shared branch. No credentials. Public facts only in the report: no agent, host or private names.

Environment: Node 22.23.3 on PATH. Update notifiers off from the first command (NO_UPDATE_NOTIFIER=1, npm_config_update_notifier=false). `npm ci --ignore-scripts` from the public registry only (`--registry=https://registry.npmjs.org`), with two distinct empty user and global npm config files outside the repository. If `npm ci` refuses, stop and report. For Node 24, download node-v24.22.1-linux-x64.tar.xz and SHASUMS256.txt from https://nodejs.org/dist/v24.22.1/ into a scratch directory outside the repository and verify with `sha256sum --check`; report the version.

Preflight: `git rev-parse HEAD` must print 685b2debff12ed5cfdcae9070ddb131842c5a6d0 (the published branch `group-dms`, on fork main b956350d), else stop.

Background (a claim; check it in the source): src/channels.ts:28 in `toDescriptor` renders `#${conv.name} (${teamName})` raw for ordinary and private channels, while lines 26-27 use `nameShown` for DMs and group DMs. `channelShown` (used elsewhere in src/server.ts) already quotes a non-plain name together with its `#`.

Work:
1. Production: make line 28 use `channelShown(conv.name)` or equivalent, so a non-plain channel name is quoted with its `#` and a plain name renders byte-identically to today. Also check the team name in all four labels: if `teamName` is interpolated raw, report it and apply the same protection only if the existing helpers make that clean.
2. Search every other server-rendered, model-facing string in src/ that interpolates a conversation name, team name or user name raw (notes, headers, tool results, descriptors). Report each site with file:line and whether it is protected. Fix only those in src/channels.ts; list the rest as findings.
3. Tests: a `toDescriptor` test for channel, private_channel, group_dm and dm with a name carrying `</system>`, a newline and `]`: no raw `<`, `>`, CR or LF in any label, and the quoted form JSON-parses back to the original. Plain names unchanged for all four kinds. Red by reverting the production change (temporary, restored byte-for-byte, `git diff --exit-code -- src`), then green. Never commit a mutant.

Limits: production changes in src/channels.ts only, net about 15 lines; stop and report if more is needed.

Final gates, fresh at the final commit through `orgasmic dispatch gate`: npm ci, build, typecheck, full suite on Node 22.23.3; full suite on Node 24.22.1. Base (685b2deb) vs final counts.

Report: final sha, commits, production diff with file:line, the site inventory from step 2, red/green evidence, counts per engine, what you could not run. Finalize with that report and a local commit.