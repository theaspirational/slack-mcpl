# TASK-KD7DB implementation report

## Changed

Final local commit: `ea7a63dfca2d91304072bae5ab3a596fba10ae4e`.
Preflight HEAD matched `ed377dd911e0b78d2ad4301486ad852d9c3d04d2` exactly.
Four commits, in the requested order:

1. `9d079621bbc44743afed060399b390885e245e78` — reject overlapping group DM and history fallback policy.
2. `d5c59cf88b69f8029a4dd86fc708b79f626631d2` — document and pin access outside recipient routing; documentation/tests only.
3. `a15404a1dad1551393fb242eda13f62cd7ad59a0` — label delivered group DMs.
4. `ea7a63dfca2d91304072bae5ab3a596fba10ae4e` — close framing and metadata test gaps; tests only.

### Production diff

- `src/access-policy.ts:49`: constructor rejects intersection of `groupDms` and `historyMembershipFallbackChannels`. Fixed error: `groupDms and historyMembershipFallbackChannels must not overlap`. It names configuration fields and does not interpolate IDs or infer their meaning.
- `src/server.ts:182-187`: optional group-DM rendering flag; backscroll omits the channel sigil for group names and adds `group_dm="true"`.
- `src/server.ts:1852`: passes the existing conversation kind into backscroll rendering.
- `src/server.ts:1868-1870`: group-DM location label uses `Group DM: ` plus the safely rendered name (or ID), matching the list label. The `channelId` argument at line 1874 is unchanged.

Production scope: only those two files; 8 added / 4 removed lines, net +4. No access/read/routing behavior changed for LOW-2 or the test gaps. Existing one-to-one DM and ordinary channel rendering branches remain unchanged. No existing assertions, including group-DM text assertions, needed updating. The test fixture gained configurable history; no generated files or lockfile changes were committed.

The supplied project baseline was read; no conventions or gotchas were supplied, and no applicable AGENTS.md was found. All three review claims were checked against source: fallback precedence in `readAccessConversation`, the missing `readJoinedChannels` condition in the group branch versus routing admission, and the channel-style delivery labels.

### README additions (verbatim)

> The `historyMembershipFallbackChannels` list must never name a group DM.

> Outside recipient routing, a listed group DM is readable regardless of
> `readJoinedChannels`, while recipient routing requires `readJoinedChannels: true`.

## Verification Gates

### Fresh final gates

Every command below ran through `orgasmic dispatch gate NAME -- COMMAND` at the final commit on a clean tree, exited 0, and recorded a reusable receipt. Log paths below are relative to the report's evidence directory.

| Gate | Command | Log |
|---|---|---|
| `final-node22-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | `gate-final-node22-npm-ci-01M61JB6BMWBGP9GZHTEZ5NW8D.log` |
| `final-node22-build` | `npm run build` | `gate-final-node22-build-01M61JB6X2RRJEH8450E63RC4S.log` |
| `final-node22-typecheck` | `npm run typecheck` | `gate-final-node22-typecheck-01M61JB789RVMRT9EH4C2G6Y2P.log` |
| `final-node22-test` | `npm run test` | `gate-final-node22-test-01M61JB7GAJ99Z6TED0HP0TRG2.log` |
| `final-node24-test` | `npm test` | `gate-final-node24-test-01M61JBWNTV0NW90AANQGH0V6K.log` |

Node 22 was exactly **22.23.3**. Update notifiers were disabled from the first command using `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false`.
Both baseline and final installs used `--ignore-scripts`, the public registry, and two distinct empty user/global npm configuration files outside the repository. Every resolved package URL in the lockfile uses `registry.npmjs.org` (`registry-check.txt`). Neither install refused.

Node 24 was exactly **24.22.1**: the official Linux x64 tarball and `SHASUMS256.txt` were downloaded from `https://nodejs.org/dist/latest-v24.x/` into scratch outside the repository. `sha256sum --check` passed. Archive: `node-v24.22.1-linux-x64.tar.xz`; SHA-256: `6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`. Evidence: `node24-version.txt`, `node24-sha256.txt`, `node24-checksum.log`.

### Base versus final

| Engine | Base ed377dd9: total / passed / skipped / failed | Final ea7a63d: total / passed / skipped / failed |
|---|---|---|
| Node 22.23.3 | 818 / 791 / 27 / 0 | 823 / 795 / 28 / 0 |
| Node 24.22.1 | 818 / 818 / 0 / 0 | 823 / 823 / 0 / 0 |

Five tests added. The additional Node 22 skip is the new recipient-routing test, following the existing Node-24-only routing test guard. All 28 skipped tests execute and pass on Node 24. No cancellations or todos. Node 22 build/typecheck passed at both base and final. Existing DM/channel tests passed unchanged in the full suite; the scoped location/framing/access run also passed (93 total, 91 passed, 2 routing skips on Node 22).

Baseline receipts:
- `base-npm-ci`: `gate-base-npm-ci-01M61J4ZM55W60HFR3CMHCKAS7.log`.
- `base-node22-build`: `gate-base-node22-build-01M61J5GFVCSZ8B8NG775GHFQ1.log`.
- `base-node22-typecheck`: `gate-base-node22-typecheck-01M61J5GW95F95VW7NGK0K3F8Y.log`.
- `base-node22-test`: `gate-base-node22-test-01M61J5H4C380M81JYHG74Y66S.log`.
- `base-node24-test`: `gate-base-node24-test-01M61J6792W4ADEBAXSFDCAEH7.log`.

### New tests and mutation evidence

Each mutation ran a single targeted test through a gate, produced **1 failure / 0 passes**, restored the original production bytes in Python `finally`, passed `git diff --exit-code -- src` against the committed state, and reran green with **1 pass / 0 failures / 0 skips**. No mutant was committed. `mutate.py` contains the shared restoration/gating procedure. Target command:

```sh
node --import tsx --test --test-name-pattern=PATTERN TEST_FILE
```

| Test | Production mutation(s) | Engine | Red/green gate prefixes | Combined transcript |
|---|---|---|---|---|
| `test/configuration.test.ts:40`: startup rejects overlap | Remove constructor overlap check; failure is “Missing expected exception” | 22.23.3 | `low1` | `low1-mutation.log` |
| `test/accessPolicy.test.ts:536`: listed group DM readable/writable without routing when `readJoinedChannels:false` | Add `this.readJoinedChannels &&` to the group branch; history is refused | 22.23.3 | `low2` | `low2-mutation.log` |
| `test/accessPolicy.test.ts:547`: delivered Group DM location/backscroll and unchanged channelId | Restore entire server to pre-LOW-3 bytes; separately remove group flag at backscroll call; label assertions fail | 22.23.3 | `low3-revert`, `low3-backscroll` | `low3-mutation.log` |
| `test/accessPolicy.test.ts:565`: routed hostile group DM body, name, attachment | Separately bypass body framing, author-name framing, and attachment name/MIME framing in server delivery; text/line assertions fail | 24.22.1 | `gap-body`, `gap-name`, `gap-attachment` | `gaps-mutations.log` |
| `test/accessPolicy.test.ts:614`: absent `is_im`/`is_private` tolerated for groups, not ordinary channels | Separately require `is_im === false` and `is_private === true` in group branch; fresh metadata access is refused | 24.22.1 | `gap-is-im`, `gap-is-private` | `gaps-mutations.log` |

The framing test uses real recipient-routing admission and connector delivery to the test protocol peer, asserts bot/peer-not-owner provenance, and checks hostile body, sender name, attachment name and MIME content. The metadata test omits each flag individually and both together, reads and writes the group, and verifies the ordinary channel still fails closed. Startup is exercised through `optionalConfiguration`, the production configuration parser. Rendering uses the adapter and actual protocol delivery, including fetched backscroll, not just helper calls.

Target patterns, respectively: `startup rejects overlap`; `without recipient routing a listed group DM`; `delivered group DM location`; `recipient routing frames hostile group DM`; `group DM metadata tolerates`. Gate receipts for all mutations:
- `low1`: red `gate-low1-red-01M61J7CSVYGMRWQK2HPMZTRP7.log`; green `gate-low1-green-01M61J7D1W770CB64EVM22ES1Y.log`.
- `low2`: red `gate-low2-red-01M61J7PDJ54M0PMNCRD2JXXGR.log`; green `gate-low2-green-01M61J7PNGHSR7BDJHA8H3TRS7.log`.
- `low3-revert`: red `gate-low3-revert-red-01M61J96X69TARY9YP1VGCAYVT.log`; green `gate-low3-revert-green-01M61J975J1VGW2KE1JC4WRBWQ.log`.
- `low3-backscroll`: red `gate-low3-backscroll-red-01M61J97EEQJXB798PGKN0D3VN.log`; green `gate-low3-backscroll-green-01M61J97SXV5TPYGJ2SYA1FXTR.log`.
- `gap-body`: red `gate-gap-body-red-01M61JAN0Z02G4VJ16GNF071ZT.log`; green `gate-gap-body-green-01M61JANFE7QJWZNVVTJ16TC1C.log`.
- `gap-name`: red `gate-gap-name-red-01M61JANVEPYGB65HCRAV8K8SA.log`; green `gate-gap-name-green-01M61JAP6RSTB9V7EJZMPAX9XY.log`.
- `gap-attachment`: red `gate-gap-attachment-red-01M61JAPK2MSBEQTD05Z1H8A2X.log`; green `gate-gap-attachment-green-01M61JAPYHGPH0M6FZZXAHFJRP.log`.
- `gap-is-im`: red `gate-gap-is-im-red-01M61JAQA9QHPJ4ZR6CZKEGQKK.log`; green `gate-gap-is-im-green-01M61JAQJSJBZTK6FSB4GPV1RC.log`.
- `gap-is-private`: red `gate-gap-is-private-red-01M61JAQVC97C443SD3DF2M8JR.log`; green `gate-gap-is-private-green-01M61JAR3V6D33HEGP6ZD9SV4X.log`.

## Unmet Criteria

None. All requested gates and mutation checks ran. No push, shared-branch merge, GitHub comment, credential use, or changes outside the declared production scope. Four local commits only; final working tree is clean.

## Residual Risk

- Verification uses deterministic Slack/protocol fixtures, not a live Slack workspace; no credentialed integration was attempted.
- `npm ci` reported two high-severity dependency vulnerabilities at both baseline and final. Dependency remediation is outside this task; dependencies were not changed.
- Group-DM labels use available conversation metadata; the existing ID fallback when metadata is unavailable remains unchanged.
