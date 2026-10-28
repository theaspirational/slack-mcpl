# TASK-NNEWZ report

## Changed

- Added and locally committed exactly one file: `docs/FORK-VS-UPSTREAM.md`.
- Final commit: `d63db80fb5998a1d10ddc3e294a2d9391278d828`.
- Audited fork `685b2debff12ed5cfdcae9070ddb131842c5a6d0` against upstream
  `439a81b502388ab3a77b4bbb0e62a380e1b50605`; fetched upstream main was unchanged.
- Mapped all 45 changed paths (+4,761/-138), all 31 non-merge commits and relevant
  merge resolutions. Ancestry is 57 ahead, 0 behind.
- Table summary: nine needs-PR areas (policy, history integration, fallback,
  stale pins, group DMs, operator controls, routing, host contract, Enterprise
  IDs); three rows carried by open PRs (path uploads #31, status and context reset
  #12); one already-upstream/superseded row; two explicit fork-only dispositions
  (obsolete local-option migration guards and historical evidence).
- #12 remains conflicted with changes requested in review content, including
  optional typing. Its formal reviews are COMMENTED. The fork still requires
  typing for messaging; its recipient-mode improvements do not fix legacy mode.
- #31 is mergeable but has no submitted reviews or inline review comments.
  Its core reader, upload limits and path tests already match the fork; remaining
  policy integration is separated in the plan.
- Recipient routing plus the actual agent-framework/connectome-host ingress,
  scheduling, turn-target and typing interfaces is the critical path to equivalent
  recipient-aware operation on upstream main. No deployment identity is included.
- Verified TASK-9YJZP's descriptor-label quoting bug also exists in upstream
  `src/channels.ts`; the fix was not applied in this task.

### Proposed PR order

1. Independent descriptor-label quoting fix.
2. Zero automatic backscroll.
3. Disabled-tool controls.
4. Repair and land #12, including optional typing and its review regressions.
5. Land #31 independently; it can progress while #12 is repaired.
6. Explicit access policy plus inseparable history/file integration.
7. Public-pin history membership fallback.
8. Stale-pin isolation, preferably reviewed within fallback before release.
9. Named group DMs and framing.
10. Inert routing ledger and host-bridge preparation, after interface agreement.
11. Recipient activation plus real framework/host companion integrations.

Enterprise-ID support travels with the introducing policy/routing/bridge PRs;
feature documentation and changelog fragments travel with each feature. The
document specifies scope, base, estimated size, tests, risk and companions.

## Verification Gates

- Read supplied baseline and repository `CONTRIBUTING.md`; no additional
  conventions or gotchas were supplied. No applicable `AGENTS.md` was found.
- Preflight HEAD matched the required fork SHA before any write.
- Read the full baseline diff and non-merge log; inspected source, relevant
  commits and integration merges.
- Public, unauthenticated GitHub REST GETs covered PR metadata, commit/file
  lists, reviews and conversations for #12/#31, the all-state PR list and #20's
  exact-target proposal. No pagination remained.
- Ran at the final commit, on a clean tree:
  `orgasmic dispatch gate audit-document -- python3 "$ORGASMIC_EVIDENCE_DIR/verify-audit.py"`
  — **PASS, exit 0, reusable receipt recorded**.
- Gate log: `gate-audit-document-01M61Q9VGXC1FYYV0YWAXD7TZV.log`
  in the evidence directory. It verifies single-file scope, revisions/counts,
  complete path/commit coverage, saved PR metadata and diff totals, identical
  feature files, upstream descriptor source and public-safe artifact checks.
- Supporting evidence: `fork.diff`, `commits.txt`, `pr12-head-to-fork.diff`,
  `pr31-head-to-fork.diff`, public API JSON snapshots and `verify-audit.py`.
- No dependency install, runtime tests, live Slack, push, PR or GitHub comment.
  No source, lockfile or generated-file changes. No credentials used.

## Unmet Criteria

None for the analysis/documentation assignment.

## Residual Risk

- Could not establish actual companion implementation revisions, their sizes,
  stock framework/host compatibility, or maintainer acceptance of the proposed
  access/routing interfaces. Connector/helper tests alone cannot establish this.
- No runtime or real-host composition results were reproduced. Historical public
  test/live reports are attributed as such, not represented as current receipts.
- PR state can change. #12's remaining behavior fixes, #31's review and refreshed
  platform verification, and exact-target reconciliation with #20 remain future
  landing work, not work performed by this audit.
