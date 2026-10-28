# TASK-KD7DB — Round 2 report

## Changed

Final local commit: **`685b2debff12ed5cfdcae9070ddb131842c5a6d0`**.
Preflight HEAD matched `ea7a63dfca2d91304072bae5ab3a596fba10ae4e`; the working tree was clean.

Two commits, in order:

1. `553e0ce1abd3b32d25ad08375e043dfd61a0b30c` — `fix: label group DMs consistently in auto-subscribe notes`.
2. `685b2debff12ed5cfdcae9070ddb131842c5a6d0` — `test: distinguish group DM access from joined-channel policy` (tests and README only).

The review finding was verified in current source: the auto-subscribe note used `channelShown(meta.name)` even when the location header used `Group DM: …`.

### Production diff

Only `src/server.ts:1843-1845` changed: named group DMs now use `Group DM: ${nameShown(meta.name)}` in the auto-subscribe note. Ordinary named channels still use `channelShown(meta.name)`; the missing-name fallback remains `conversation ${msg.channelId}`. Every other rendering branch, the note's remaining text, location header, and channelId are untouched.

```diff
-      const where = meta?.name ? channelShown(meta.name) : `conversation ${msg.channelId}`;
+      const where = meta?.name
+        ? (meta.kind === 'group_dm' ? `Group DM: ${nameShown(meta.name)}` : channelShown(meta.name))
+        : `conversation ${msg.channelId}`;
```

Production size: 3 added / 1 removed lines, **net +2**. Kept the change local rather than introducing a helper: the note and header have different missing-name fallbacks, which remain intact. No production change in the second commit.

- `test/accessPolicy.test.ts:548-575`: extended the existing delivery test to check the group-DM auto-subscribe label and the complete, byte-identical ordinary-channel auto-subscribe note.
- `test/accessPolicy.test.ts:536-545`: added the ordinary joined-channel refusal control to the same `readJoinedChannels:false` fixture that permits group-DM reads and writes. The existing call-list assertion also proves the refused channel did not reach history.
- README removes duplicate routing-condition prose and explicitly documents startup rejection of overlapping IDs.

No new test cases, generated files, dependency changes, or lockfile changes. No push, GitHub comment, shared-branch merge, or credentialed Slack operation.

### README text (verbatim)

> Group DMs the list doesn't name are neither listed nor delivered.
> Outside recipient routing, a listed group DM is readable regardless of
> `readJoinedChannels`. With recipient routing, an allowed group DM is admitted
> as a joined private channel and requires `readJoinedChannels: true`.

> An optional `historyMembershipFallbackChannels` list names exact write destinations
> that the operator has independently verified are public.
> The `historyMembershipFallbackChannels` list must never name a group DM.
> Startup refuses an ID listed in both `groupDms` and
> `historyMembershipFallbackChannels`.
> If `channels:read` is absent, each operation proves fresh membership with a successful bot-token
> `conversations.history({ channel, limit: 1 })` call; `fetch_history` and
> `fetch_thread` make it before their first page, and it is not one of their pages.
> A `C` prefix or history success
> cannot establish public visibility. Fallback never caches membership, invents
> scopes, or applies to unconfigured channels, DMs or private-channel metadata;
> normal metadata checks remain when `channels:read` is present. Refusals, rate
> limits and unknown scopes fail closed.

## Verification Gates

All log paths below are relative to this report's evidence directory. All assigned checks ran through `orgasmic dispatch gate NAME -- COMMAND`.

### Fresh final gates

These gates ran at the final commit on a clean tree, exited 0, and recorded reusable receipts:

| Gate | Command | Log |
|---|---|---|
| `r2-final-node22-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | `gate-r2-final-node22-npm-ci-01M61KKXAGY40PZJTAZC20VXC7.log` |
| `r2-final-node22-build` | `npm run build` | `gate-r2-final-node22-build-01M61KKXW48P1DJ1DAKFC44WXJ.log` |
| `r2-final-node22-typecheck` | `npm run typecheck` | `gate-r2-final-node22-typecheck-01M61KKY4VWVPZZPCVWNZEHVGV.log` |
| `r2-final-node22-test` | `npm run test` | `gate-r2-final-node22-test-01M61KKYD9PV2ZBK3E5G5PD61H.log` |
| `r2-final-node24-test` | `npm test` | `gate-r2-final-node24-test-01M61KMKCSME1VB5871JXYAD5D.log` |

### Fresh base versus final counts

| Engine | Base ea7a63df: total / passed / skipped / failed | Final 685b2deb: total / passed / skipped / failed |
|---|---|---|
| Node 22.23.3 | 823 / 795 / 28 / 0 | 823 / 795 / 28 / 0 |
| Node 24.22.1 | 823 / 823 / 0 / 0 | 823 / 823 / 0 / 0 |

Counts are unchanged because existing tests were extended. Node-24-only routing guards account for the 28 Node 22 skips; all tests execute and pass on Node 24. No cancellations or todos. Fresh baseline gates, before editing:

- `r2-base-npm-ci` — `npm ci --ignore-scripts --registry=https://registry.npmjs.org`, exit 0; `gate-r2-base-npm-ci-01M61KGWCXA9KXY41RCCPGAJFJ.log`.
- `r2-base-node22-test` — `npm test`, exit 0; `gate-r2-base-node22-test-01M61KGX1GJBB08EYBJMVWERSJ.log`.
- `r2-base-node24-test` — `npm test`, exit 0; `gate-r2-base-node24-test-01M61KHJA64WS9Z5Z5KM221NXV.log`.

### Red/green evidence

Target command for both rendering mutations:

```sh
node --import tsx --test --test-name-pattern='delivered group DM location' test/accessPolicy.test.ts
```

1. Temporarily restored `src/server.ts` to the complete pre-round production bytes: the group-DM note assertion failed (1 test, 1 failure).
2. Separately replaced only the ordinary-channel note's `channelShown(meta.name)` with `nameShown(meta.name)`: the full ordinary-channel note assertion failed on the missing `#` (1 test, 1 failure).

For each: the mutation script restored original bytes in `finally`, ran `git diff --exit-code -- src` successfully against the committed state, then reran the targeted test green (1 passed, 0 failed, 0 skipped). Red gates exited 1; green gates exited 0. No mutant was committed. Procedure: `mutate.py`; combined transcript: `r2-note-mutations.log`.

- `r2-note-revert`: red `gate-r2-note-revert-red-01M61KK3XRPPB6KTBKCN4GDZN3.log`; green `gate-r2-note-revert-green-01M61KK45TGBY2C5SRNZAEWH0F.log`.
- `r2-channel-note`: red `gate-r2-channel-note-red-01M61KK4EAASD3K9C7Y7H0YWQ4.log`; green `gate-r2-channel-note-green-01M61KK4PNZMQBGE0QWS0XVYJA.log`.

The joined-channel control also passed as a scoped gate: `r2-control-green`, command `node --import tsx --test --test-name-pattern='without recipient routing a listed group DM' test/accessPolicy.test.ts`, 1 passed / 0 failed / 0 skipped, log `gate-r2-control-green-01M61KKHWXKCACHQYPN8QSY1GE.log`. This precommit gate had a dirty test/README tree; the subsequent clean final full suites independently cover it.

### Environment and inherited evidence

- Node versions were checked as exactly **22.23.3** and **24.22.1**.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` were set from the first command. Both installs used `--ignore-scripts`, the public registry, and two distinct empty user/global npm config files outside the repository. Every resolved package URL in the lockfile uses `registry.npmjs.org` (`registry-check.txt`). Neither install refused.
- The inherited official `node-v24.22.1-linux-x64.tar.xz` and `SHASUMS256.txt` remain in scratch outside the repository. Round 1 obtained them from `https://nodejs.org/dist/latest-v24.x/`; this round re-verified the archive against that manifest with `sha256sum --check` and compared the installed Node binary byte-for-byte with the archive member. SHA-256: `6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`. Current evidence: `node24-checksum.log`, `node24-sha256.txt`, `node24-binary-check.txt`.
- Inherited context: the previously read project constraints and absence of supplied conventions/gotchas remain applicable; this round changes none of those inputs. The previously used mutation harness was copied and inspected unchanged. Toolchain provenance is inherited, but integrity and runtime versions were checked again.
- **No earlier gate pass or earlier test count was reused.** Baseline counts and final checks above are fresh for this round. Build output stayed in the worktree, not evidence.

## Unmet Criteria

None. Every requested check ran. Exactly two local commits; final working tree clean. Production scope and line limit satisfied.

## Residual Risk

- Tests use deterministic Slack/protocol fixtures; no live credentialed Slack integration was run.
- Both fresh installs reported two high-severity dependency vulnerabilities, also present before these edits. Dependencies were left unchanged because remediation is outside this rendering/documentation scope.
