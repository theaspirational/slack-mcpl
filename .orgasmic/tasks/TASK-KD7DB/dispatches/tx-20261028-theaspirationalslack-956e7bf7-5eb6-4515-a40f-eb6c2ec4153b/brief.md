Task TASK-KD7DB holds the goal and acceptance. This brief is the procedure. Local commits on your task branch only: no push, no GitHub comment, no merge to any shared branch. No credentials. Public facts only in the report: no agent, host or private names.

Environment: Node 22.23.3 on PATH. Update notifiers off from the first command (NO_UPDATE_NOTIFIER=1, npm_config_update_notifier=false). `npm ci --ignore-scripts` from the public registry only, with two distinct empty user and global npm config files. If `npm ci` refuses, stop and report. For Node 24, download the official Node 24.x Linux x64 tarball from nodejs.org into a scratch directory outside the repository and verify it against SHASUMS256.txt; report the exact version.

Preflight: `git rev-parse HEAD` must print ed377dd911e0b78d2ad4301486ad852d9c3d04d2, else stop.

Background (from the approving review of ed377dd9; treat it as a claim and check it in the source):
- LOW-1: readAccessConversation (src/slack-adapter.ts ~1139) checks historyMembershipFallbackChannels first and fabricates non-mpim metadata without conversations.info. An ID present in both groupDms and that fallback list is then read and written as an ordinary public channel with no mpim scopes.
- LOW-2: the group branch of requireReadable (src/access-policy.ts ~80-87) does not check readJoinedChannels, while recipient routing (src/recipient-routing.ts ~169) requires it.
- LOW-3: delivery renders a group DM with the #channel sigil (src/server.ts ~1867 location header, ~185 backscroll attributes), while list_channels says 'Group DM' (src/channels.ts ~27).

Work, in this order, one commit each:
1. LOW-1 (production change allowed): in the SlackAccessPolicy constructor, reject a configuration where any ID appears in both groupDms and historyMembershipFallbackChannels, with a fixed error message that names the field, not the value's meaning. Add one README sentence that the fallback list must never name a group DM. Test: such a configuration is refused at startup; show red by temporarily removing the check.
2. LOW-2 (documentation and test only, NO behaviour change): add a README sentence that outside recipient routing a listed group DM is readable regardless of readJoinedChannels, while recipient routing requires readJoinedChannels:true. Add a test that pins the non-routing behaviour (a listed group DM with readJoinedChannels:false is readable and writable without routing).
3. LOW-3 (production change allowed, rendering only): label a delivered group DM as a group DM in the location header and add a group-DM attribute in the backscroll block, consistent with list_channels. Keep channelId exactly as now. Do not change one-to-one DM or channel rendering: existing tests for those must pass unchanged. If an existing test asserts the old group-DM text, update only that assertion and say so. Show red by reverting the change.
4. Test gaps (tests only): sender framing under recipient routing for a hostile group-DM message (body, name, attachment); and a test recording the group branch's tolerance of absent is_im/is_private.

Limits: production changes only in src/access-policy.ts, src/server.ts, and the location-header helper if it lives elsewhere; stop and report if anything else in src needs to change, or if production net lines exceed about 60. README changes are allowed.

Mutation evidence for every new test: one temporary production edit, the targeted test run through `orgasmic dispatch gate`, restore bytes in a finally block, `git diff --exit-code -- src` against the committed state, rerun green. Never commit a mutant.

Final gates, fresh at the final commit through `orgasmic dispatch gate`: npm ci, build, typecheck, full suite on Node 22.23.3; full suite on Node 24. Report the counts and a base (ed377dd9) vs final table.

Report: the final commit sha, the commits, a short diff summary of every production change with file:line, the README sentences verbatim, the tests with red/green evidence, counts per engine, what you could not run. Finalize with that report and a local commit.