# Stage 11 correctness and release audit

**Status (updated 2026-10-15):** Stage 11 is deployed and initialized on StudioNet at `0xab972c3af9878b7CD4631CD21639B20E981B0702`. The original zero-value A-1/A-2 agreements remain `PROPOSED` because their fixed counterparty has not accepted. Replacement agreements A-3/A-4 completed live synthetic lifecycles with a dedicated counterparty; both are `SETTLED` at amount zero. Deployment and transaction evidence are recorded in `docs/STAGE_11_STUDIONET_DEPLOYMENT_ATTEMPT.md` and `deployments/studionet.json`.

## Scope and release boundary

This pass addresses the ordered correctness findings supplied for Stage 11: agreement finality and settlement guards; bounded challenges; validator-equivalent verdict validation; retry and reputation accounting; frozen policy and delegation/evidence scope; and wallet write finality. Stage 11 is deployed at its own address; V1 and V2 remain separate historical instances.

| Deployment | Address | Status |
|---|---|---|
| V1 | `0xb222305575ee8af1255d8aCd196280b405B54Baf` | Historical deployment, unchanged |
| V2 | `0xCC67216ceD224A971739bAA706142A740B31853C` | Historical verified deployment, unchanged; does not contain these Stage 11 changes |
| Stage 11 | `0xab972c3af9878b7CD4631CD21639B20E981B0702` | Deployed, initialized, and verified through two zero-value settled lifecycles |

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

The tested frontend was published to Vercel production as deployment `dpl_4t1EYuhwXg2dYURCHPuwiNvM3MSG` (project `web`, alias `https://web-omega-amber-37.vercel.app`) from commit `131cfb2`. At that time, the browser check confirmed the site loaded and showed the V2 address; StudioNet reads and wallet-signed writes were unverified. Stage 11 is now a distinct deployment and the frontend still targets V2. Do not infer frontend integration with Stage 11 from the earlier Vercel check.

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

## Deployment follow-up (2026-10-14)

The candidate was submitted once with the stable CLI `0.39.2` and pinned
`genlayer-js@1.1.8`. The transaction
`0x6c0f890c50715bfe92455599e244861b76cec920bd3520ea5adf058234c3e133`
reached majority consensus, but leader execution returned `ERROR` with
`invalid_contract` and gas used `0`. Although the CLI printed
`0x65d5E2C1b94db61afd0c262270a5c6667d3402e2`, subsequent schema and
`get_protocol_stats` reads returned `Contract not found`. It is not a
deployment. No initialization, lifecycle writes, or changes to V1/V2
followed. The exact loader incompatibility remains unresolved; the passing
static lint and direct-mode tests do not establish Studio compatibility.

A read-only StudioNet code-schema check was attempted locally but failed at
network access. Requesting network escalation to retransmit the candidate
source to the schema endpoint was rejected by automatic approval review due
to source disclosure risk; that review has not been bypassed. The next
deployment attempt must wait until the loader issue is diagnosed through an
approved path. No lifecycle transaction hashes can be reported for this
candidate because it never produced a usable contract address.

## Live deployment addendum (2026-10-14)

The source header incompatibility was fixed and the contract deployed successfully. The exact Stage 11 source hash is `sha256:710b02a083dcb551fde345f94f87381ea07b8fa5a4bf3c66965ee5a1ecaf526b`. The transaction `0x8c1979122f3103f865bba60646d699217b2bb3ecd283ce232532bdb4aad4821b` finalized with majority agreement, five validator responses revealed, and successful leader execution. The new address is `0xab972c3af9878b7CD4631CD21639B20E981B0702`; V1 and V2 were not changed.

Both modules and both policy templates were registered and verified by live reads. The admin created and proposed API Delivery agreement A-1 and AI-Agent Task agreement A-2. Both remain `PROPOSED` because their fixed counterparty is `0x1Af111b06E6f6A05Bd41572A016318f1356aF85c`. A dedicated test counterparty was then registered and used for new zero-value A-3/A-4 agreements; see the live lifecycle addendum below. The Vercel application still targets V2 and has not been checked against Stage 11.

## Live Stage 11 lifecycle addendum (2026-10-14/15, complete for recorded paths)

Dedicated counterparty: `0xAAbdb32c7e07803Fe9d5d4d70c06bbDEAfE3b402` (`agentverdict-stage11-counterparty`). It was created specifically for this user-authorized synthetic test and registered on Stage 11. No private key was printed, exported, or committed. Every test agreement has amount `0`; live `get_protocol_stats` confirms `settlement_native_transfer_enabled=false`.

| Path | Agreement | Result observed live |
|---|---|---|
| API Delivery | A-3 | Accepted, activated, evidence submitted, validator evaluation PASS; counterparty challenged, admin upheld it, and a second evaluation again returned PASS. The verdict was finalized after its 900-second window. Receipt-only settlement `S-1` is `EXECUTED` at amount zero; passport read shows completed count 1 and reputation score 5. |
| AI-Agent Task | A-4 | First evaluation returned FAIL/REWORK for a generic page; rework was requested and acknowledged; a public project verification report was submitted and the second evaluation returned PASS. Challenge `C-2` timed out with `TIMEOUT_REJECTED`; after the new 900-second challenge window ended, the counterparty finalized the verdict and recorded receipt-only settlement `S-2` at amount zero. Final state `SETTLED`. |

These are real StudioNet leader executions and validator equivalence outputs. Transaction hashes, validator receipts, and recorded deadlines are in `deployments/studionet.json`. Final reads show A-3/A-4 `SETTLED`, two executed receipt-only settlements, two reputation events, counterparty completed count 2 and reputation score 10, and `settlement_native_transfer_enabled=false`. The old A-1/A-2 transactions remain unchanged.

## Test record

Candidate source SHA-256: `89f9092bcd4f724d01919cfe1e5c584be37bf26abb7657aa47ddce1f8d65dbef`. This is a local source fingerprint only, not a deployed source hash. A `PytestCacheWarning` caused by the sandbox denying writes to `.pytest_cache` is an environment permission warning and does not indicate a contract test failure. The GenVM lint's newer-runner notice is informational and is not proof of compatibility with that newer runner.

