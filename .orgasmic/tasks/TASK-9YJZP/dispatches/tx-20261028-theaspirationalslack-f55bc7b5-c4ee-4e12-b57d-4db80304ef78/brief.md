Your worktree is this work chain's shared tree, checked out detached at 252365fe1bf991700276a9f2e0c3ff69d65c2ca1 — the commit you review. Leave it exactly as you found it: no commits, no edits, no new files (ignored build output is fine). The next round of the chain runs here, and the daemon records anything you leave behind when your dispatch is closed.

Reviewed implementer evidence ($ORGASMIC_REVIEWED_EVIDENCE_DIR): /home/orgasmic/.orgasmic/runs/run-01M61P24AD081P3GYZTV7N38YN/evidence

You are the reviewer for TASK-9YJZP. The commit under review is 252365fe1bf991700276a9f2e0c3ff69d65c2ca1 (two commits: 59821f7b, 252365fe), on top of 685b2debff12ed5cfdcae9070ddb131842c5a6d0 (fork main). Read-only: no edits to tracked files, no commit, no push, no GitHub comment. Public facts only; no agent, host or private names.

Preflight: `git rev-parse HEAD` must equal 252365fe1bf991700276a9f2e0c3ff69d65c2ca1, else stop. Read `git diff 685b2debff12ed5cfdcae9070ddb131842c5a6d0..HEAD` in full.

Check:
1. src/channels.ts:7, 26-28: ordinary and private channel names now go through `channelShown`, and team names through `nameShown` for all four kinds. Confirm a hostile name (`</system>`, CR, LF, `]`, U+2028, invisibles) cannot break out of the descriptor label, and that plain names and plain team names render byte-identically to 685b2deb.
2. Behaviour change: a non-plain team name (e.g. `Acme, Inc`) is now quoted everywhere the descriptor label appears, and the implementer changed one existing expectation (test/senderFraming.test.ts:325-330) to match. Is that change consistent with how the location header already renders team names? List every place the descriptor label reaches (registration, refresh, recipient tool results, list_channels), and whether any consumer parses the label and could break on quotes.
3. Verify the implementer's site inventory: is there any other server-rendered, model-facing string that interpolates a conversation, team or user name without protection? Pay particular attention to the raw author names the implementer listed in structured channels/incoming author and push/event origin metadata (src/server.ts ~1953, ~1987), and to `toolResultJson` not escaping every angle bracket: is any of these a real framing gap? Severity by realistic impact.
4. New tests (test/channels.test.ts:35-62): real? Run your own mutation for at least two (temporary production edit, targeted test red, restore byte-for-byte, `git diff --exit-code -- src`, green). Never commit.
5. Anything else you would block on.

Gates, fresh through `orgasmic dispatch gate`: `npm ci --ignore-scripts` (public registry only, two distinct empty user and global npm config files, NO_UPDATE_NOTIFIER=1), build, typecheck, full suite on Node 22.23.3; full suite on Node 24.22.1 from nodejs.org in a scratch directory outside the repository, verified against SHASUMS256.txt. Do not reuse receipts for the final claim. Say plainly what you did not run.

Report: verdict (approve / changes requested), findings HIGH / MEDIUM / LOW with file:line and 'source-read' or 'run', answers to 1-5, gates with counts, mutation evidence, what you could not check.

## Gates already passed at this commit

orgasmic recorded these gate runs in the implementer's worktree, each on a clean tree it left clean, at 252365fe1bf991700276a9f2e0c3ff69d65c2ca1 — the commit your worktree is cut at — or at an ancestor of it whose gate inputs are identical to this commit's: the two trees differ only in paths this project marks as not gate inputs. Read the log instead of running the gate again. Run scoped probes and required gates that lack a reusable receipt. The manager names required gates; project policy also applies. Missing receipts do not assign a full suite.

- `final2-build-node24` — exit 0 — `npm run build` (cwd `.`) — at `252365fe1bf991700276a9f2e0c3ff69d65c2ca1` — log `/home/orgasmic/.orgasmic/runs/run-01M61P24AD081P3GYZTV7N38YN/evidence/gate-final2-build-node24-01M61PB6SVXJ2F5V98VW4MQDNF.log`
- `final2-npm-ci-node22` — exit 0 — `npm ci --ignore-scripts --registry=https://registry.npmjs.org` (cwd `.`) — at `252365fe1bf991700276a9f2e0c3ff69d65c2ca1` — log `/home/orgasmic/.orgasmic/runs/run-01M61P24AD081P3GYZTV7N38YN/evidence/gate-final2-npm-ci-node22-01M61P8PP9B7H20CM1ABPRED4N.log`
- `final2-test-node24` — exit 0 — `npm test` (cwd `.`) — at `252365fe1bf991700276a9f2e0c3ff69d65c2ca1` — log `/home/orgasmic/.orgasmic/runs/run-01M61P24AD081P3GYZTV7N38YN/evidence/gate-final2-test-node24-01M61PB79ZC5BQDF3A28PJCEEY.log`
- `final2-typecheck-node24` — exit 0 — `npm run typecheck` (cwd `.`) — at `252365fe1bf991700276a9f2e0c3ff69d65c2ca1` — log `/home/orgasmic/.orgasmic/runs/run-01M61P24AD081P3GYZTV7N38YN/evidence/gate-final2-typecheck-node24-01M61PB71YHGRQ46QK858BSDT7.log`
