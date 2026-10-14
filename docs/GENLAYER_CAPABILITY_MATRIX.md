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
  - `gl.message.sender_address`, `gl.message.value` are available as attributes of the `gl.message` object. **Recorded discrepancy (found by direct empirical testing, not assumed):** the brief and the `sdk.genlayer.com` v0.3 reference document a `gl.message.datetime` / `MessageRawType.datetime` field ("Transaction datetime"), but this pinned (v0.2.x-era) runner's actual `gl.message` NamedTuple has **only** `('contract_address', 'sender_address', 'origin_address', 'value', 'chain_id')` — confirmed by printing `gl.message._fields` inside a direct-mode test against the real downloaded pinned SDK. `datetime` was evidently added to the message context in a later SDK revision than this pin. Instead, GenVM's modified Wasmtime runtime deterministically intercepts the WASI clock, so plain `datetime.datetime.now(datetime.timezone.utc)` returns the deterministic, consensus-safe transaction time for this pinned runner — also confirmed empirically: `gltest`'s `VMContext.warp()` test cheatcode patches exactly `datetime.datetime.now`, not `gl.message`, which only makes sense if that is the real mechanism it is standing in for. **This project uses `datetime.datetime.now(datetime.timezone.utc)` — never `gl.message.datetime`, never browser time — for every challenge-window/deadline comparison** (`AgentVerdictOS._now_dt()` in `contracts/agentverdict.py`), per the brief's requirement that deadlines be chain-time-derived, corrected to match the runner actually pinned.
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

- **Superseded by live confirmation (2026-10-14) — see `docs/SUBMISSION_READINESS_REPORT.md` section 12 for the full account.** This entry originally deferred wallet verification to "the frontend stage"; the frontend was built in Stage 4 and this was genuinely exercised by real user testing afterward. Confirmed by reading `node_modules/genlayer-js/dist/index.js`'s own `connect()` source directly: `genlayer-js@1.1.8`'s wallet-connect flow is **not wallet-agnostic despite targeting the standard EIP-1193 `window.ethereum` surface** — after the generic `wallet_addEthereumChain`/`wallet_switchEthereumChain` calls, it unconditionally calls `wallet_getSnaps` to check for and auto-install a GenLayer-specific MetaMask Snap plugin (`npm:genlayer-wallet-plugin`). `wallet_getSnaps`/`wallet_requestSnaps` are MetaMask-proprietary RPC methods, not part of the EIP-1193 standard. Confirmed live: Rabby Wallet implements EIP-1193 correctly but returns `-32601 Method not found` for `wallet_getSnaps`, meaning **this pinned SDK version genuinely requires the real MetaMask browser extension specifically** for its documented wallet-connect path — "a wallet with no supported injection must receive a clear actionable error" (spec section 0) is satisfied by a proactive capability probe added in `web/src/chain/client.ts`'s `connectWallet()`, but the underlying constraint (MetaMask-only, not generically EIP-1193-wallet-agnostic) is a real property of this SDK version, not a limitation this project's own code chose or can remove without bypassing `genlayer-js`'s own documented connect path.

## 7.1 Audit addendum (2026-10-13): time determinism re-investigated

A later audit session re-investigated the `datetime.datetime.now(UTC)`
claim above rigorously rather than accepting it at face value, per
explicit instruction. Findings:

- The `genlayer-docs` MCP tools were unavailable this session (every
  call returned `HTTP 400: No transport found for sessionId`); the live
  `sdk.genlayer.com` site was fetched directly via `WebFetch` instead
  (`https://sdk.genlayer.com/main/_static/ai/api.txt` and
  `.../impl-spec.txt`), which is the **current/main** GenVM docs branch,
  not necessarily exactly this pin's version — treat accordingly.
- Confirmed by reading the extracted pinned SDK directly
  (`~/.cache/gltest-direct/extracted/v0.2.16/.../genlayer/gl/__init__.py`
  and `vm.py`): this pin has **no** `gl.vm.get_timestamp()` and **no**
  dedicated clock API at all besides `trace_time_micro()` (a profiling
  timer, not a transaction clock). The current docs' `get_timestamp()`
  ("in deterministic mode it is the transaction timestamp; in
  non-deterministic mode it is the real wall-clock time") was added in a
  later SDK generation than this pin targets. This means the contract's
  use of raw `datetime.datetime.now(UTC)` is this pin's **only
  available** option, not a choice made over a safer documented
  alternative.
- The current GenVM implementation spec (`impl-spec.txt`, main branch)
  states WASI's time functions are "Modified to ensure reproducible
  behavior across validators" under the "Modified Wasmtime Runtime", and
  that real wall-clock time is exposed to a contract only at the
  `unsafe-tracing` debug level, which "a host on a consensus network must
  not" accept from untrusted callers. This is documentary evidence
  consistent with (not proof of) deterministic-mode time reads being
  safe for the real production runtime at this pin.
- `gltest`'s direct-mode `VMContext.activate()` (`gltest/direct/vm.py`
  line ~463) patches `datetime.datetime` at the **Python level** so that
  `.now()` returns the `warp()`-set value — confirmed by reading the
  source and by a new passing test
  (`tests/direct/test_time_determinism.py`). This is a **test-harness**
  simulation (direct mode runs contract code natively in CPython, not in
  WASM) and is not itself evidence about the real WASM sandbox's
  behavior, though it is consistent with the documentary evidence above.
- **Net conclusion:** no hazard was newly discovered, and no fix was
  made (none is possible within this SDK pin — there is no alternative
  API to switch to). The determinism claim remains **supported by
  documentary evidence and test-harness behavior, not by a live WASM-level
  execution test**, which no environment in this session could provide
  without a real `genlayer up`/Docker-backed GenVM or a StudioNet
  deployment (out of scope / unavailable).

## 8. Explicit list of brief claims checked and found accurate

- StudioNet chain ID 61999 — accurate.
- StudioNet RPC `https://studio.genlayer.com/api` — accurate.
- `genlayer-js@1.1.8` pin — not contradicted by anything found, but not independently re-verified against the npm registry in this session (no `npm view genlayer-js@1.1.8` was run); treat as brief-supplied until the frontend stage installs and checks it.
- `gl.get_webpage` does not exist — accurate, confirmed again.
- Direct-mode cannot exercise `eq_principle.*` validators — accurate, confirmed again from this specific package's source.
- Runner pin hash — reused, not re-resolved this session; flagged above.
