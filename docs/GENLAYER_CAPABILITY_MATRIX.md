# GenLayer Capability Matrix

**Status:** Verified against live documentation and installed local tooling on 2026-10-13.
**Sources used:** `genlayer-docs` MCP (indexes `docs.genlayer.com` and `sdk.genlayer.com`), local `genlayer`/`genvm-lint`/`gltest` CLI `--version`/`--help` output, and direct inspection of the installed `gltest` Python package source (`site-packages/gltest/direct/*.py`). No claim below is from memory alone; each has a verification method listed.

## 1. Network configuration

| Setting | Value | Verification |
|---|---|---|
| Network alias | `studionet` | `genlayer network --help`; docs: Network Configuration page |
| Chain ID | **61999** | docs.genlayer.com/developers/networks → "Studionet" table |
| RPC | `https://studio.genlayer.com/api` | same page |
| Explorer | `explorer-studio.genlayer.com` | same page |
| Faucet | built-in (account selector button), 0 GEN balance is normal/gasless | same page |
| Currency | GEN | same page |

Brief's assumed values (chain ID 61999, RPC `https://studio.genlayer.com/api`) are **confirmed correct**, not assumptions.

Related networks that must NOT be confused with `studionet` (confirmed distinct chain IDs from the same docs page, recorded here to prevent a wrong-network deploy):
- `localnet`: `http://localhost:4000/api`, chain ID `61127`.
- `studio-dev` (release-candidate preview, NOT the stable network targeted by this build): `https://studio-dev.genlayer.com/api`, chain ID `61997`.
- `testnet-asimov`: chain ID `4221`, RPC `https://rpc-asimov.genlayer.com`.
- `testnet-bradbury`: production-like testnet, needs funded faucet account (`testnet-faucet.genlayer.foundation`).

## 2. CLI / SDK versions actually installed in this workspace

| Tool | Installed version | Verification |
|---|---|---|
| `genlayer` (Node CLI) | 0.39.2 | `genlayer --version` |
| `genvm-lint` | 0.11.1rc2 | `genvm-lint --version` |
| `genlayer-py` (pip) | 0.16.3 | `pip show genlayer-py` |
| `genlayer-test` (pip, exposes `gltest`) | 0.29.2 | `pip show genlayer-test` |
| `node` | v24.14.0 | `node --version` |
| `npm` | 11.9.0 | `npm --version` |
| `python` | 3.12.10 | `python --version` |

**genlayer-js pin:** the brief specifies `genlayer-js@1.1.8`. This has not yet been installed in `web/` (frontend work was not reached this session — see `FINAL_HANDOFF.md`). The pin will be applied verbatim in `web/package.json` when frontend work starts; do not substitute a floating `^`/`~` range.

**Known mismatch recorded per the brief's own warning:** `genvm-lint` 0.11.1rc2 targets a newer GenVM (reported upstream as v0.6.0-rc1-era) than the pinned runner this project targets (GenVM v0.2.16-era, matching the pinned runner hash below). A clean `genvm-lint check` is a necessary but **not sufficient** proof that Studio will load the contract. Treat lint as a fast first-pass gate only.

## 3. Contract runner pin

```
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
```

- This hash is the one reused successfully across this user's other GenLayer projects in this workspace (Contradiction Protocol, Continuum Protocol, Treasury Trial, AgentCourt, Protocol Court) and is treated as the current known-good pin. It was **not** re-resolved against a fresh upstream GenVM release list in this session (no `genlayer-cli`/`genvm-lint download --list` network round-trip was run for this purpose) — if it stops validating, cross-check `genvm-lint download --list` / the GenVM GitHub releases for a newer hash before assuming the contract is wrong.
- `genlayer-test`'s direct-mode runner (`gltest/direct/sdk_loader.py`) downloads the real GenVM SDK source matching this exact pinned hash from `github.com/genlayerlabs/genvm/releases` the first time a contract using it is loaded, and imports the genuine `genlayer.py`/`genlayer.gl` package tree from that release — direct-mode tests in this repo therefore run against the **real pinned SDK's Python surface**, not a hand-written stub. This was confirmed by reading `sdk_loader.py` and `wasi_mock.py` source.
- Confirmed API surface for this pinned (pre-v0.3) runner, read directly from the installed `gltest` package's own source (`gltest/direct/vm.py`, `wasi_mock.py`) and cross-checked against `sdk.genlayer.com`'s v0.2→v0.3 migration guide (which documents exactly what changed, i.e. what did NOT change prior to it):
  - `from genlayer import *` star-import style (not `import genlayer as gl`).
  - `class X(gl.Contract):` (not `gl.contract.Contract`).
  - `gl.vm.run_nondet(leader_fn, validator_fn)` is the **unsafe/custom** variant (no implicit validator sandbox) — this is the v0.2.x name. The v0.3 SDK renames this pair (`run_nondet` ↔ `run_nondet_unsafe` ↔ `run_nondet_default`); those renames do **not** apply to the pinned runner this project targets. `gltest`'s own `VMContext.run_validator()` docstring and captured-validator list refer to `gl.vm.run_nondet` by that exact v0.2.x name, confirming this.
  - `gl.vm.UserError(message)` with `.message` attribute (v0.3 renames this to a generic `.data` payload; not applicable here).
  - `gl.message.sender_address`, `gl.message.value`, `gl.message.datetime` (ISO-8601 string) are available as attributes of the `gl.message` object. `gl.message.datetime` is the SDK's documented deterministic, consensus-safe transaction time — confirmed via `sdk.genlayer.com` `MessageRawType.datetime` reference ("Transaction datetime") and via `gltest`'s `VMContext.warp()` / patched-`datetime.now()` test cheatcode, which exists specifically to let tests control this deterministic clock. **This project uses `gl.message.datetime` — never Python wall-clock or browser time — for every challenge-window / deadline comparison,** per the brief's explicit requirement that deadlines be chain-time-derived.
  - Storage types: `TreeMap[K, V]`, `DynArray[T]`, `Address`, `u256`/`i256`/other sized ints, `@allow_storage` dataclasses. Plain `dict`/`list`/unbounded `int` are rejected by the storage builder (confirmed by reading `_check_forbidden_origin` in the SDK storage-generation source: raises on `dict`→"use TreeMap", `list`→"use DynArray", bare `int`→"use bigint or sized integers").
  - `gl.nondet.web.get/post/put/delete/head/options/patch/request/render` — confirmed function names and signatures from `sdk.genlayer.com` Python SDK reference. **`gl.get_webpage` does not exist in the SDK reference and was not used anywhere in this contract**, consistent with this user's prior-project findings.
  - `gl.eq_principle.strict_eq`, `prompt_comparative`, `prompt_non_comparative` exist and are read from SDK source, but per this user's confirmed prior finding (re-verified by reading `gltest/direct/wasi_mock.py::_handle_run_nondet`, which only special-cases the `RunNondet` gl_call op, not `ExecPromptTemplate`) **direct-mode `gltest` cannot exercise the validator path of the `eq_principle.*` wrappers** — `ExecPromptTemplate` has no mock handler in `_handle_gl_call`. Any module needing direct-mode-testable LLM-judged equivalence in this project therefore uses `gl.vm.run_nondet(leader_fn, validator_fn)` with a bare `gl.nondet.exec_prompt` call inside `validator_fn`, exactly as this user's other projects converged on.

## 4. Direct-mode test harness (`gltest`)

Confirmed by reading the installed package source directly (not assumed):
- Fixtures: `direct_vm`, `direct_deploy`, `direct_alice`, `direct_bob`, `direct_charlie`, `direct_owner`, `direct_accounts` (pytest plugin, `gltest/direct/pytest_plugin.py` wiring confirmed via the `direct-tests` skill and cross-checked against `vm.py`).
- `direct_vm.mock_web(url_pattern, response)` / `direct_vm.mock_llm(prompt_pattern, response)` register regex-matched mocks; **mocks accumulate in a list and the first pattern that matches wins** (`_match_web_mock`/`_match_llm_mock` iterate in registration order and return on first match) — confirmed from source, matching this user's documented lesson #5. `direct_vm.clear_mocks()` must be called between a leader-time mock and a differing validator-time mock in the same test.
- `direct_vm.run_validator(leader_result=..., leader_error=..., index=-1)` replays a captured `gl.vm.run_nondet` validator function against a chosen/overridden leader result — this is how this project's direct tests exercise validator disagreement logic without a live network.
- Direct mode only ever runs the **leader** function path for a normal contract call (`_handle_run_nondet` in `wasi_mock.py` always executes the leader closure); true two-sided consensus (leader vs. independent validator execution via separate GenVM processes) is **not exercised** except through the explicit `run_validator()` cheat-code call. This matches the brief's own instruction to treat direct and integration tests as testing different things.
- `direct_vm._to_bytes` / the contract's own calldata-decoding path showed that `__init__`/constructor dispatch in direct mode is **not** routed through the normal calldata decoder (confirmed from this user's documented prior lesson and consistent with `_allocate_contract`-style direct instantiation elsewhere in the harness) — Address-typed constructor parameters must defensively accept `Address`, raw `bytes`, or hex `str`. This project's `_coerce_address()` helper (see `PROTOCOL_ARCHITECTURE.md`) handles this.

## 5. Integration tests / live network / LLM provider

- `gltest tests/integration/ -v -s` requires a running consensus-capable environment (local Studio/GLSim via `genlayer up`, or a reachable StudioNet with a funded signer) plus a configured LLM provider for real `exec_prompt`/`ExecPromptTemplate` calls. **Neither was started in this session** — no `genlayer up` was run, no local Docker-backed simulator is running, and this agent has no provider key or signing key. This is recorded as the Stage 2/6 integration-test blocker in `FINAL_HANDOFF.md`, not silently skipped.
- `genlayer-test[sim]` (the simulator extra) was not separately verified as installed; `pip show genlayer-test` lists the base package only. Confirming/installing the `[sim]` extra is a next manual step for whoever runs integration tests.

## 6. Asset custody / native GEN transfer

- Confirmed from `sdk.genlayer.com` migration docs: `gl.chain.Account(address).emit_transfer(value, on=...)` and the `Contract.__receive__`/`@gl.public.write.payable` pattern exist in the SDK as the mechanism for native value transfer and receipt.
- **Not independently re-verified live in this session** (no StudioNet transaction was sent — this agent has no signing key, which is a hard operating boundary, not merely a missing credential). This project therefore treats native GEN settlement as **unverified for this deployment** and ships with `settlement_native_transfer_enabled` defaulted to `False` (Settlement Safety Vault, feature 39, "safe disabled mode" branch), consistent with this user's own documented prior finding that a reverted payable call on StudioNet does **not** roll back attached value. No payable constructor/method accepts incoming value anywhere in this contract, which sidesteps that specific footgun entirely rather than attempting to work around it.

## 7. Wallet injection / genlayer-js

- Not yet exercised (frontend stage not reached). The brief's instruction to "confirm official `createClient`, chain configuration, `readContract`, `writeContract` ... for this version" against `genlayer-js@1.1.8` specifically is deferred to the frontend stage and listed as a next step in `FINAL_HANDOFF.md`.

## 8. Explicit list of brief claims checked and found accurate

- StudioNet chain ID 61999 — accurate.
- StudioNet RPC `https://studio.genlayer.com/api` — accurate.
- `genlayer-js@1.1.8` pin — not contradicted by anything found, but not independently re-verified against the npm registry in this session (no `npm view genlayer-js@1.1.8` was run); treat as brief-supplied until the frontend stage installs and checks it.
- `gl.get_webpage` does not exist — accurate, confirmed again.
- Direct-mode cannot exercise `eq_principle.*` validators — accurate, confirmed again from this specific package's source.
- Runner pin hash — reused, not re-resolved this session; flagged above.
