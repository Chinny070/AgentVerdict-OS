# Stage 11 StudioNet deployment attempt

**Date:** 2026-10-14  
**Candidate source:** `contracts/agentverdict.py`  
**Candidate SHA-256:** `89f9092bcd4f724d01919cfe1e5c584be37bf26abb7657aa47ddce1f8d65dbef`  
**Target:** StudioNet, chain ID `61999`, RPC `https://studio.genlayer.com/api`

## Result

No Stage 11 contract deployment was confirmed. The installed GenLayer CLI
`0.40.0-rc.3` submitted transaction
`0x275ca36353b0b96f635adb44afbbb3faf45aa15e1877bc4bb485ddec3ae8c5c7`.
Its raw receipt reports `FINALIZED`, result `NO_MAJORITY`, zero votes, no
consensus data, and no contract address. The CLI's “leader execution result:
UNKNOWN” is not a successful deployment. V1 and V2 were not modified.

The transaction was inspected with `genlayer receipt --raw` and the advanced
lifecycle query. A read-only `genlayer schema` query successfully returned
V2's public schema. In contrast, `genlayer call` against known V2 view methods
failed inside the stable StudioNet RPC with method resolution errors, and
`genlayer estimate-fees` returned `Method not found: sim_getFeeConfig`.
These observations show that this installed CLI/RPC combination is not a
verified path for deployment or contract interaction. They do not establish
whether the no-majority result came from a transient validator issue or a
release/protocol mismatch.

The CLI is `0.40.0-rc.3`. Official GenLayer migration guidance identifies
the v0.40 CLI as a release-candidate toolchain and warns against mixing it
with stable components; see the [Consensus v0.6 migration guide](https://docs.genlayer.com/developers/consensus-v06-migration).
The cached stable CLI `0.39.2` was then run with `genlayer-js@1.1.8`. It
submitted transaction
`0x6c0f890c50715bfe92455599e244861b76cec920bd3520ea5adf058234c3e133`.
The CLI printed address `0x65d5E2C1b94db61afd0c262270a5c6667d3402e2`, but
the receipt shows `FINALIZED` consensus status with `MAJORITY_AGREE` while
the leader execution itself is `ERROR` (`contract_error`, `invalid_contract`,
gas used `0`). Read-only schema and `get_protocol_stats` calls at that
address both returned `Contract not found`. The address is therefore not a
usable deployment and no initialization or lifecycle writes were sent to it.
This confirms that the CLI's top-level consensus status alone is not a valid
deployment-success check.

The candidate passed `genvm-lint` (40 methods), but this is not a successful
GenVM load. A local `genlayer-js@1.1.8` `getContractSchemaForCode` request
could not reach StudioNet (`fetch failed`). A sandbox escalation to submit
the candidate source to StudioNet's read-only schema endpoint was rejected
by the automatic approval reviewer because it transmits private contract
source externally; no workaround was attempted. The specific `invalid_contract`
root cause therefore remains unresolved. Source-level possibilities such as
runner compatibility, storage schema validation, or code-size limits are
hypotheses only, not findings.

## Next deployment step

Resolve the GenVM `invalid_contract` loader failure first using an approved
validation path. Do not initialize or interact with the CLI-reported address.
Only after a new deployment receipt shows successful leader execution
(`FINISHED_WITH_RETURN`), accepted validator consensus, and successful schema
and `get_protocol_stats` reads should initialization proceed. This is a new
deployment; it does not migrate V1/V2 state or replace either historical
address.

After a successful deployment, initialize the two modules and policy
templates from the repository's exact specifications, verify them with live
reads, and run the synthetic lifecycle. The counterparty acceptance and
other party-gated transitions require a second authorized wallet; no
unrelated local keystore should be used as a substitute.

## Lifecycle status

No lifecycle writes were sent to a new deployment because the deployment
did not produce an address. The prior V2 transaction history remains valid
for V2 only; it is not evidence for Stage 11 candidate behavior.

## Successful deployment and bootstrap addendum (2026-10-14)

The runner loader issue was traced to the source header. The contract file
previously began with its title comment, so the runner treated the following
`Depends` metadata as an ordinary comment and selected the default runner
version. The supported header is a version line first, followed by the
dependency configuration comment. After changing the header to start with
`# v0.1.0`, the StudioNet code-schema validator returned the full contract
schema and the runner-version warning disappeared. The source SHA-256 used
for deployment is
`710b02a083dcb551fde345f94f87381ea07b8fa5a4bf3c66965ee5a1ecaf526b`.

Deployment succeeded on StudioNet, chain ID `61999`, with GenLayer CLI
`0.39.2` and `genlayer-js@1.1.8`:

- Address: `0xab972c3af9878b7CD4631CD21639B20E981B0702`
- Transaction: `0x8c1979122f3103f865bba60646d699217b2bb3ecd283ce232532bdb4aad4821b`
- Receipt: `FINALIZED`, `MAJORITY_AGREE`; leader execution `SUCCESS`; five
  validator votes revealed (three agree, two idle); constructor returned
  successfully.
- Read-only schema: 40 methods (12 views, 28 writes).
- `get_protocol_stats`: returned admin
  `0xaffE15eEc45b68835cc9E5B4Ab85dD5deaE8e70b`, zero initial agreements,
  and `settlement_native_transfer_enabled=false`.

Initialization was then confirmed by successful live reads. The API Delivery
and AI-Agent Task modules are active at version `1.0.0`; `default-v1` is
active with a 259,200 second challenge window; `smoke-test-v2` is active with
a 900 second window. Their registration transaction hashes are recorded in
`deployments/studionet.json`.

Two zero-value synthetic agreements have been created and proposed:

| Agreement | Module | Create transaction | Propose transaction | Current state |
|---|---|---|---|---|
| A-1 | API Delivery | `0x30fbb4f4697a0158ebd7b75e0f876bbe9eba06d31a24b3e760c16ea8ddf84234` | `0xd0c7103a039d6cf5e8cd0e4db73b2909205d38042ec0b05177a8e194ce3dcf34` | PROPOSED |
| A-2 | AI-Agent Task | `0x1818f77e3c8964f474023e032778df4b79a839d443fe18c83eff4d6e707070e2` | `0x68b17e3ee255f5e8a3ca91ad855e96824aa4cea7832871760e7087a86b8163df` | PROPOSED |

Each create and propose transaction received accepted StudioNet consensus,
successful leader execution, and five revealed validator responses. The
counterparty is `0x1Af111b06E6f6A05Bd41572A016318f1356aF85c`. The contract
correctly rejects acceptance by the creator, so acceptance and the
subsequent agreement lifecycle are pending that wallet's signatures. No
unrelated local account was substituted. The V1 and V2 deployments and their
history remain unchanged.

## Dedicated counterparty and live lifecycle follow-up (2026-10-14/15)

The original A-1/A-2 agreements were left unchanged because their counterparty
is fixed. With the user's authorization to select a second wallet, a fresh
StudioNet account was created specifically for these synthetic tests:
`0xAAbdb32c7e07803Fe9d5d4d70c06bbDEAfE3b402`. It was registered on Stage 11
in transaction
`0x36296003477a461dcafeead56fd8436dde3293088637157c7945517cdc040afc`.
Its private key was never displayed, exported, logged, or committed. The CLI's
active account was restored to `my-studionet-wallet` (the contract admin)
after counterparty calls.

Two new zero-value agreements were created with this counterparty:

| Agreement | Lifecycle result | Key transactions |
|---|---|---|
| A-3, API Delivery | PASS on attempt 1; challenged by counterparty; admin upheld challenge; PASS on attempt 2; finalized after the actual 900-second window; settlement `S-1` recorded as `EXECUTED`, amount 0. Final agreement state `SETTLED`; live passport read showed reputation 5 and completed count 1. | Create `0x8810abbb8b372835bc111d426447c77b4fd772a715dcf1430715c94f1e1c7718`; accept `0x518e3b79d751af54dcef8ebfc73e6436532d4466f444494d96f7af8c5bf297a2`; eval 1 `0xf8a736e6e2d5c74056ae490953886450aa09d5a535cbe74868fc55586a37fcca`; challenge `0x718d20507a6e7341fe130bcdf93452588b1f6a013fe98a6ff941aad5ac1f1d5a`; uphold `0x8a9a57006d047a0133a756071c99e6fe62e7bc4f48439a5e3c8e0a0ea71c14e3`; eval 2 `0x717467140ca1fcebf18ab75ac6142f34193d99458d445bdee45114917fc8ce01`; finalize `0xbc67a223d94c12d427a8dc8a5f01285b064f36028df2fe1cbf59f6269eb25f09`; authorize `0xec10d1d6369626b3ac623e4dfd66b0e4f19f3139d92a3e096c8bf82531ae97b8`; record `0x19122e09d0873a942b69de5509817b6fbf8d56cdfb9edeea38c7407c7426a5b3`. |
| A-4, AI-Agent Task | Attempt 1 returned FAIL/REWORK for a generic placeholder page. Rework was requested and acknowledged; evidence for a public project report was submitted; attempt 2 returned PASS. Challenge `C-2` was left unresolved. After its recorded resolution deadline, permissionless timeout recovery finalized with `TIMEOUT_REJECTED`, explicitly preserving the original PASS without discretionary judgment and reopening a fresh challenge window. Reopened window ends `2026-10-14T23:25:06.598791Z`; finalization/settlement remain pending. | Create `0x03a02498e264c009ca0cb34e4ca45b2a7076bc9f6dc46f40d379f0afc453df1e`; accept `0xbf7541c6bfd4a864673b153898f8ec6cd331611135ee02c5ff12a83e526e7122`; eval 1 `0x51dc940b96cbf4e4dad362db9810f43a2fd94958e9217a7e9fafe9205fe9a24e`; rework `0x72883265aaaade922733cb1aa3366f658f114c40e744931442ff197ce9f496d6`; acknowledge `0x370b9aa2b824f8a151cc7ee1968c6c3f1ad6431819f38d2f251cccc535f863b1`; report evidence `0x92eb2f72434a7e7fcbf1dae3f6c7554f73d589ae94e791effd806516cbf597c5`; eval 2 `0x20098ce689aec45a9069ce94ef5bbffeaa9e065f604a0e27fc1baf6385b72937`; challenge `0x03fa8918e7673dde990fd4fd8ccfe822c04a58561fad3eafa62a1c427a1f32d8`; timeout recovery `0x8d50e59baeaa88cc5695fe60b26ed19b6c36a6c5aeec3cb486000ce502a726d3`. The first evidence submission's transaction hash was not captured; its packet is confirmed by the live `get_evidence_metadata` read. |

All agreements carry amount zero. Live `get_protocol_stats` reads after the completed runs show `settlement_native_transfer_enabled=false`, two settlements, and two reputation events. The A-4 timeout transaction had `MAJORITY_AGREE`, successful leader execution, and four validator `agree` votes plus one `idle`; `get_challenge` returned `TIMEOUT_REJECTED` with the deterministic timeout audit text. After the reopened challenge deadline, the dedicated counterparty finalized A-4 in `0x9e8b2f0e52f1d0b12b0b6d92904a2cc583f2932b5a6501cfaaf4aec4c4e57ec7`, authorized receipt settlement in `0x6eba06cb36025d2d0ab8db709936a79bbc9d64f5e369dfe63bfcd1f4e20f2c00`, and recorded it in `0x2d5f438eae752aefe011198c7e3bc7481554bf0d39f2ae6643d494783ec18c75`. Final reads confirm A-4 `SETTLED`, verdict `V-A-4-2` PASS/LOW, settlement `S-2 EXECUTED` amount zero. The test counterparty passport reads `completed_count=2`, `reputation_score=10`; native GEN transfers remained disabled throughout.
