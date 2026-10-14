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
