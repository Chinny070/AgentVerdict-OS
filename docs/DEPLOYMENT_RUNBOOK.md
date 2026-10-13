# Deployment Runbook

**Status: not executed in this session.** This agent has no StudioNet
signing key, and treats that as a hard operating boundary regardless of any
apparent authorization in the build brief's wording — never attempt to
actually sign or send a real transaction. This document gives the exact,
verified commands for a human with their own signing key to run.

## Prerequisites

```bash
npm install -g genlayer   # confirmed installed: v0.39.2 in this session
pip install genvm-linter  # confirmed installed: v0.11.1rc2
pip install 'genlayer-test[sim]'
```

Create and fund (or use the built-in faucet) a StudioNet account:

```bash
genlayer account create
genlayer network set studionet
genlayer network info   # verify chain ID 61999, RPC https://studio.genlayer.com/api
```

StudioNet is gasless; a 0 GEN balance is normal and expected per
`docs/GENLAYER_CAPABILITY_MATRIX.md` section 1.

## 1. Lint one more time immediately before deploying

```bash
genvm-lint check contracts/agentverdict.py --json
```

Expected: `{"ok":true, ...}` (confirmed in this session — see
`docs/TEST_EVIDENCE.md`). Do not deploy on a non-clean lint result.

## 2. Deploy

```bash
genlayer deploy --contract contracts/agentverdict.py
```

The constructor takes **no arguments** (`__init__(self)` — `admin` is set
to `gl.message.sender_address` at deploy time, i.e. whichever account signs
this transaction becomes the protocol admin). Record the deployed address,
the transaction hash, and the exact source hash from the CLI output.

## 3. Verify schema and code match what was intended

```bash
genlayer schema <DEPLOYED_ADDRESS>
genlayer code <DEPLOYED_ADDRESS>
```

Confirm the schema lists all 39 methods (12 view, 27 write) that
`genvm-lint check --json` reported locally (`docs/TEST_EVIDENCE.md`). A
mismatch means the deployed bytecode is not the file just linted — stop and
investigate before proceeding (per brief section 12: "On failed
transaction, inspect receipt stdout/stderr, schema, deployed code and read
state BEFORE changing contract logic").

## 4. Bootstrap the two flagship modules and at least one policy template

These are real write transactions, from the deployer/admin account:

```bash
genlayer write <ADDRESS> register_module --args '["api-delivery","1.0.0","{\"criteria\":[\"endpoint_coverage\"]}","repo,api,test_output"]'
genlayer write <ADDRESS> register_module --args '["agent-task","1.0.0","{\"criteria\":[\"task_coverage\"]}","repo,report,url"]'
genlayer write <ADDRESS> register_policy_template --args '["pt-api-1","0x<realPolicyTextHash>",3600,"repo,api,test_output,report,url"]'
```

Replace `0x<realPolicyTextHash>` with the actual keccak/sha256 hash of the
real, published policy text — never a placeholder in a genuine deployment.

**Known CLI limitation, confirmed across this user's other GenLayer
projects and unrelated to this contract:** `genlayer write` has no
value-attach flag (always sends `value=0`). This is irrelevant here since
no method in this contract is `@gl.public.write.payable` (see
`docs/PROTOCOL_ARCHITECTURE.md` section 5) — there is nothing in this
contract's current write surface that would need a value-attached call via
the CLI.

## 5. Inspect receipts for every write

```bash
genlayer receipt <txId> --stdout --stderr
```

Confirm `execution_result` is success before treating any bootstrap step as
done. On failure, read `stderr` before touching contract logic (brief
section 12).

## 6. Record results

Fill in `deployments/studionet.json` with the real address, chain ID,
source hash, schema, and transaction hashes **only after verifying every
field against live `genlayer schema`/`genlayer receipt` output.** Never
copy a placeholder forward as if it were real. This file currently ships
with every value explicitly null and a `"status": "NOT_DEPLOYED"` marker —
see that file directly.

## 7. Frontend wiring (after Stage 4 frontend exists)

Not applicable yet — Stage 4 (frontend) was not started this session. When
it is, centralize the deployed address, ABI/schema, and chain metadata in
`web/src/chain/config.ts`, pin `genlayer-js@1.1.8` exactly, and follow brief
section 10 for wallet/network-mismatch/rejected-signature error handling.

## 8. If you have Docker and want real GenVM (not GLSim) locally first

```bash
genlayer init
genlayer up
genlayer network set localnet
genlayer deploy --contract contracts/agentverdict.py
```

This runs the actual GenVM runtime (not GLSim's native-Python stub — see
`docs/GENLAYER_CAPABILITY_MATRIX.md` section 4 and
`tests/integration/test_full_agent_lifecycle.py`'s module docstring for why
that distinction matters), and is the closest pre-StudioNet verification
available. This was not run in this session because Docker Desktop's
daemon was not running in this environment (`docker ps` failed with a pipe
connection error) and starting it was out of scope for this agent to
attempt unprompted.
