Your worktree is this work chain's shared tree, checked out detached at b93646965e3667807fc5e889474ac852084c310d — the commit you review. Leave it exactly as you found it: no commits, no edits, no new files (ignored build output is fine). The next round of the chain runs here, and the daemon records anything you leave behind when your dispatch is closed.

Reviewed implementer evidence ($ORGASMIC_REVIEWED_EVIDENCE_DIR): /home/orgasmic/.orgasmic/runs/run-01M643VD3JNN49H750YV13M2HG/evidence

Review TASK-ER984 (A4: activate the explicit access policy) at b93646965e3667807fc5e889474ac852084c310d, one commit on 3b1a97ac (published as #59). Read the plan (the closed plan dispatch on this task), the owner decision (all ⭐ recommendations) and the implementation report.

**MEMORY SAFETY (mandatory):** an earlier run of this task grew one node to 83–86 GB and OOM-killed the host daemon. Run EVERY node/npm/test/mutation command inside `XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 -- timeout 900 ...`, and add `--max-old-space-size=768`. If the scope fails, stop and say so; never run uncapped.

Hunt for:
1. Activation: presence-only opt-in, invalid input refuses startup, no fallback to legacy, the policy set before auth and listeners, omitted `groupDms` stays omitted, unknown scopes refused before Socket Mode.
2. Replace-not-combine across EVERY effect path, including host publish, rollback, reactions and edits, plus the warning text.
3. MPIM members fallback: the 5-page cap, cursor validation, bot identity, denial on unknown; no trust in event labels.
4. The shared `readableFileState` across hints, association and URL; DM files without pins; `files:read` for delete.
5. Contradictory-pin refusal and the group-only exception.
6. **Scope creep check:** the worker added hard caps (1000 pages and so on) and cursor-cycle refusal to LEGACY listing, directory and backscroll paths, and says this "intentionally changes pathological legacy paging". Is that a legacy behaviour change that should be split out, or acceptably invisible? Show exactly which legacy paths changed.
7. The test mock leak (nested `t.mock.method(globalThis,'fetch')`): is it fixed, and could any test still leak or loop?
8. Legacy byte identity: your own A/B against 3b1a97ac with the policy absent; your own mutations (≥6).
9. Docs (README, `.env.example`, migration guide, changelog) are accurate. The PR body is accurate and public-safe; it should NOT mention the host OOM or internal memory scopes.
10. Gates: the full suite on 22.23.3, 24.22.1 and 22.12.0 (expect 892), plus typecheck.

Rules:
- read-only;
- notifiers off; `npm ci --ignore-scripts` with empty configs;
- a loopback-only guard in force; unset `SLACK_*`.

Report: verdict, findings by severity with file:line, answers 1–10, gates, and peak RSS.

## Gates already passed at this commit

orgasmic recorded these gate runs in the implementer's worktree, each on a clean tree it left clean, at b93646965e3667807fc5e889474ac852084c310d — the commit your worktree is cut at — or at an ancestor of it whose gate inputs are identical to this commit's: the two trees differ only in paths this project marks as not gate inputs. Read the log instead of running the gate again. Run scoped probes and required gates that lack a reusable receipt. The manager names required gates; project policy also applies. Missing receipts do not assign a full suite.

- `committed-legacy-identity` — exit 0 — `bash -c set -e; for side in base candidate; do if [ "$side" = base ]; then R=/tmp/er984-base3; else R="$PWD"; fi; IDENTITY_ROOT="$R" node --import "$PWD/node_modules/tsx/dist/loader.mjs" /tmp/er984-identity.mts > "$ORGASMIC_EVIDENCE_DIR/recovery3-identity-$side.txt" 2> "$ORGASMIC_EVIDENCE_DIR/recovery3-identity-$side.stderr"; done; cmp "$ORGASMIC_EVIDENCE_DIR/recovery3-identity-base.txt" "$ORGASMIC_EVIDENCE_DIR/recovery3-identity-candidate.txt"; cmp "$ORGASMIC_EVIDENCE_DIR/recovery3-identity-base.stderr" "$ORGASMIC_EVIDENCE_DIR/recovery3-identity-candidate.stderr"` (cwd `.`) — at `b93646965e3667807fc5e889474ac852084c310d` — log `/home/orgasmic/.orgasmic/runs/run-01M643VD3JNN49H750YV13M2HG/evidence/gate-committed-legacy-identity-01M645V6DQ98SDN8NADG5QJ843.log`
- `committed-smoke` — exit 0 — `bash -c set -e; test "$(git rev-parse HEAD^)" = 3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf; test -z "$(git status --porcelain)"; git log -1 --format=%B | grep -qx "Co-Authored-By: GPT-6-Astra"; node --import tsx --test --experimental-test-isolation=none test/accessActivation.test.ts test/accessAdmission.test.ts test/release-changelog.test.ts; npm run typecheck` (cwd `.`) — at `b93646965e3667807fc5e889474ac852084c310d` — log `/home/orgasmic/.orgasmic/runs/run-01M643VD3JNN49H750YV13M2HG/evidence/gate-committed-smoke-01M645PVKMAX49W5N2D9H99RZ3.log`
