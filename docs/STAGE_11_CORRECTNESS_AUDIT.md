# Stage 11 correctness and release audit

**Status:** candidate source changes are implemented and local checks pass. No contract was deployed and no live chain state was changed during this work.

## Scope and release boundary

This pass addresses the ordered correctness findings supplied for Stage 11: agreement finality and settlement guards; bounded challenges; validator-equivalent verdict validation; retry and reputation accounting; frozen policy and delegation/evidence scope; and wallet write finality. The current source is a candidate for a new deployment. It is not the code running at either recorded address.

| Deployment | Address | Status |
|---|---|---|
| V1 | `0xb222305575ee8af1255d8aCd196280b405B54Baf` | Historical deployment, unchanged |
| V2 | `0xCC67216ceD224A971739bAA706142A740B31853C` | Historical verified deployment, unchanged; does not contain these Stage 11 changes |
| Candidate | Not deployed | Requires separate deployment authorization and fresh deployment/lifecycle evidence |

The source hash recorded for V2 remains `sha256:e9d4c1314cce2d701fe5f105f28192a5200536d0c8e1f173f46e988e4b795ecb`. Do not replace it with the candidate source hash. Deployment records for V1/V2 remain historical evidence.

## Findings and implemented source changes

1. **Cancellation and settlement could bypass finality.** `cancel_by_rule` previously admitted states outside the cancellation lifecycle; `record_settlement` did not require a finalized agreement and matching eligible verdict/instruction before recording. The candidate limits cancellation to `ACCEPTED`, `ACTIVE`, and `EVIDENCE_OPEN`. Settlement now checks `FINALIZED`, eligible latest decision, authorization, recipient/amount consistency, and native-transfer disablement before mutation.
2. **Challenge cycles could extend finality indefinitely.** A verdict attempt could be challenged again after a prior rejection or timeout. The candidate allows one challenge per attempt. An upheld challenge advances the evaluation attempt; a rejected/timed-out challenge cannot reopen that attempt. Existing timeout resolution remains permissionless and records its outcome.
3. **Equivalence validation omitted material fields.** The candidate requires exactly the rubric's criterion IDs, validates each evidence reference against stored evidence and its criterion, checks uncertainty during leader/validator comparison, and derives the top-level decision from the criterion statuses. Unsupported/incomplete outputs fail as an evaluation error rather than becoming an authoritative verdict.
4. **Retry and reputation records could diverge from superseded results.** Evaluation requests now enforce `MAX_ATTEMPTS`. Rework supports the contract's retry remedy. When a finalized verdict is superseded, its reputation delta is reversed with an explicit audit event before a later finalization can apply a new delta.
5. **Policy and delegated permissions were not consistently frozen/enforced.** Agreements now snapshot challenge duration and allowed evidence types. Rubric IDs are checked against the selected module schema. Evidence submission checks the frozen policy and module evidence declarations. Delegated calls require the corresponding `submit_evidence` permission in the scope.
6. **The browser treated receipt acceptance as durable success.** Writes now check StudioNet chain ID `61999` and the selected account before signing, wait for `FINALIZED`, and report success only for a finalized receipt with `FINISHED_WITH_RETURN`. Wallet account/network changes clear the stale app connection and surface an error.

## Evidence and limits

The direct-mode regression suite passes **92/92**. It contains targeted cases for invalid cancellation/settlement, repeat challenges, policy snapshots, forbidden evidence type, missing delegation permission, incomplete criteria, invented evidence references, derived outcomes, attempt exhaustion, and reputation reversal. The existing tests cover prior state transitions and modules. `genvm-lint check contracts/agentverdict.py --json` passes with 40 public methods (12 views, 28 writes), zero errors, and one informational newer-runner notice. The workspace denied pytest cache writes; the cache warning did not change test results.

Frontend verification passes: `npm run typecheck`, `npm run lint`, `npm test -- --run --pool=forks --poolOptions.forks.singleFork` (**32/32**), and `npm run build`. The production build warns that the main minified bundle is about 788 kB and could be code-split; this is a performance follow-up, not a build failure.

`pytest -q tests/integration` collected **7 skipped** integration cases. They are intentionally disabled in this checkout because the required real GenVM/GLSim integration environment is unavailable. These results are not genuine leader/validator integration proof for the candidate.

The tested frontend was published to Vercel production as deployment `dpl_4t1EYuhwXg2dYURCHPuwiNvM3MSG` (project `web`, alias `https://web-omega-amber-37.vercel.app`) from commit `131cfb2`. A read-only browser check confirmed the site loads, shows the V2 address/network label, and accurately states the Stage 11 candidate is not deployed. The telemetry route remained in a `Loading` state in this browser session; contract reads were therefore **not verified**. No injected wallet was available in the browser, so network switching, wallet connection, signed writes, wrong-network/rejection behavior in a real wallet, direct-route refreshes, and live mobile layouts remain **unverified**. No wallet prompt or live transaction was attempted.

Direct mode tests contract behavior under its simulator. `genvm-lint` checks contract compatibility statically. Neither demonstrates that the candidate source is deployed, that live validators have executed it, or that the hosted website has been verified with a connected wallet and signed transaction. These must be verified against a new candidate deployment before asserting live readiness.

## Deployment attempt addendum (2026-10-14)

A deployment was attempted with the installed GenLayer CLI `0.40.0-rc.3`
using the configured admin signer. The transaction
`0x275ca36353b0b96f635adb44afbbb3faf45aa15e1877bc4bb485ddec3ae8c5c7`
ended `FINALIZED` with `NO_MAJORITY`, zero votes, no consensus data, and no
contract address. No deployment success is claimed and no lifecycle writes
were sent. Read-only schema lookup against V2 worked, but contract reads
failed during method resolution and fee estimation used an RPC method that
StudioNet does not expose. Retrieval of the stable CLI package timed out in
this environment, so the candidate remains undeployed pending a compatible
StudioNet signing path. Full evidence and the next step are in
[`STAGE_11_STUDIONET_DEPLOYMENT_ATTEMPT.md`](STAGE_11_STUDIONET_DEPLOYMENT_ATTEMPT.md).

The current V2 deployment cannot receive source changes in place. A new deployment is required to obtain the fixes. Existing V1/V2 state and history cannot be migrated automatically; any migration or user-facing cutover must preserve those addresses as historical instances and explicitly identify the new address. No migration procedure is claimed here.

## Test record

Candidate source SHA-256: `89f9092bcd4f724d01919cfe1e5c584be37bf26abb7657aa47ddce1f8d65dbef`. This is a local source fingerprint only, not a deployed source hash. A `PytestCacheWarning` caused by the sandbox denying writes to `.pytest_cache` is an environment permission warning and does not indicate a contract test failure. The GenVM lint's newer-runner notice is informational and is not proof of compatibility with that newer runner.

