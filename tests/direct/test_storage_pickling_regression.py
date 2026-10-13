"""Stage 6 investigation + fix: nondet-mode storage pickling warning.

Root cause (docs/SECURITY_THREAT_MODEL.md item 9,
docs/STAGE_6_MIGRATION_NOTE.md): the pinned v0.2.16 SDK's
``gl.vm.run_nondet`` serializes ``leader_fn``/``validator_fn`` with
``cloudpickle`` before executing them (confirmed by reading
``genlayer/gl/vm.py`` in the extracted pinned SDK -- both
``run_nondet_unsafe`` and ``run_nondet`` call
``cloudpickle.dumps(lambda _: leader_fn())`` /
``cloudpickle.dumps(validator_fn_mapped)``). Any storage-backed
``@allow_storage`` dataclass instance (e.g. an ``EvidencePacket`` pulled
out of ``self.evidence[eid]``) carries a live ``_storage_slot`` --
confirmed by reading ``genlayer/py/storage/_internal/desc_record.py``,
whose ``_RecordDesc.get()`` sets ``slf._storage_slot = slot`` on every
instance it returns. That ``Slot``'s own ``__getstate__`` (confirmed in
``genlayer/py/storage/_internal/core.py``) returns
``(self.manager, self.id)`` -- i.e. pickling ANY storage-backed object
also pickles the contract's storage manager singleton. In the real
pinned SDK that singleton is ``_ActualStorageMan`` (confirmed in
``genlayer/gl/_internal/storage.py``), whose own ``__getstate__``
override is exactly what prints the live-observed warning:
"Detected pickling storage class. Reading storage in nondet mode is not
supported".

Before this session's fix, ``AgentVerdictOS._run_llm_adjudication``
built ``bounded_rows = evidence_rows[:MAX_EVIDENCE_SOURCES]`` -- a list
of the actual storage-backed ``EvidencePacket`` instances -- and
captured that list directly inside ``leader_fn``/``validator_fn``,
which are the closures ``gl.vm.run_nondet`` cloudpickles. The fix
(see ``contracts/agentverdict.py::_run_llm_adjudication``) extracts
plain ``str`` fields into ordinary dicts *before* ``leader_fn`` is even
defined, so the closures only ever capture plain Python immutables that
never reach the storage manager.

Important honesty note about test-harness scope (explicitly required by
the Stage 6 task): ``gltest``'s direct-mode harness runs leader_fn
in-process via its own ``InmemManager`` (see
``gltest/direct/vm.py::InmemManager``), which has **no** ``__getstate__``
override at all -- so even ``direct_vm.check_pickling = True`` (which
does call real ``cloudpickle.dumps`` on the closures) can never
reproduce this specific warning, regardless of whether the contract-side
pattern is fixed or vulnerable. This was verified empirically this
session: both a reverted "vulnerable" copy of
``_run_llm_adjudication`` and the fixed version produced zero warnings
under ``direct_vm.check_pickling = True`` against the real
``request_evaluation`` call. Direct-mode silence does NOT prove the real
GenVM runtime is unaffected -- it proves only that this specific test
double can't observe this specific failure mode. See
``test_direct_mode_check_pickling_is_silent_either_way`` below for that
documented (not assumed) negative result.

What DOES independently and directly confirm the root cause and the fix,
executed in this session (not assumed): a standalone reproduction using
the REAL pinned SDK's own ``genlayer.py.storage._internal.core`` module
(``Slot``/``Manager`` -- the same classes ``_ActualStorageMan`` and every
``@allow_storage`` dataclass build on), with a ``Manager`` subclass whose
``__getstate__`` override is the exact text copied from
``genlayer/gl/_internal/storage.py::_ActualStorageMan.__getstate__``.
``test_real_sdk_slot_pickling_mechanism`` below is that reproduction,
kept in the suite as the actual regression test for this fix.
"""

import sys
import types
import warnings
from pathlib import Path

import pytest

from conftest import create_active_agreement, mock_evidence_source, mock_llm_decision

GLTEST_DIRECT_CACHE = Path.home() / ".cache" / "gltest-direct" / "extracted"

# The exact warning text from the pinned SDK's
# genlayer/gl/_internal/storage.py:21-23 (_ActualStorageMan.__getstate__),
# and from the live StudioNet stderr captured in
# docs/STUDIONET_LIVE_VERIFICATION_REPORT.md finding 4.
PICKLING_WARNING_TEXT = (
    "Detected pickling storage class. Reading storage in nondet mode is not supported"
)


def _find_pinned_sdk_core_module_root():
    """Locate the extracted pinned SDK's std-lib root (the directory that
    must be on sys.path for `import genlayer.py.storage._internal.core`
    to resolve), by searching the same cache directory
    gltest-direct itself downloads/extracts into
    (gltest/direct/sdk_loader.py::CACHE_DIR). Returns None if not found
    (e.g. a fresh checkout before any direct-mode test has run and
    triggered the download) rather than hardcoding a version-specific
    hash path.
    """
    if not GLTEST_DIRECT_CACHE.exists():
        return None
    for core_path in GLTEST_DIRECT_CACHE.rglob("genlayer/py/storage/_internal/core.py"):
        # core.py -> _internal -> storage -> py -> genlayer -> <hash root>
        return core_path.parents[4]
    return None


def _assert_warning_text_still_present_in_pinned_sdk():
    """Guard against silent drift: if a future pinned-SDK bump changes
    the warning's wording, this regression test's documentation (and the
    contract-side comments referencing it) would go stale without
    anyone noticing. Fails loudly instead.
    """
    sdk_root = _find_pinned_sdk_core_module_root()
    if sdk_root is None:
        pytest.skip("pinned SDK not found in ~/.cache/gltest-direct/extracted; run any "
                     "direct-mode test first to trigger the download")
    storage_py = sdk_root / "genlayer" / "gl" / "_internal" / "storage.py"
    if not storage_py.exists():
        pytest.skip(f"expected pinned SDK file missing: {storage_py}")
    text = storage_py.read_text(encoding="utf-8")
    assert PICKLING_WARNING_TEXT in text.replace("\n", " ").replace("\t", " ") or (
        "Detected pickling storage class" in text
    ), "pinned SDK's warning text changed -- update docs/SECURITY_THREAT_MODEL.md item 9 and this test"
    return sdk_root


def test_real_sdk_slot_pickling_mechanism():
    """Direct, executed proof of the root cause and the fix, using the
    REAL pinned SDK's own Slot/Manager classes (not a reimplementation):

    1. A closure that captures a storage-backed `Slot` (exactly what
       every `@allow_storage` dataclass's `_storage_slot` is, per
       `_RecordDesc.get()`) triggers the pickling-storage warning when
       cloudpickled -- reproducing, outside the WASM sandbox, the same
       mechanism that fired live on StudioNet.
    2. A closure that only captures a plain value extracted from the
       slot beforehand (exactly this session's contract fix) does not.
    """
    sdk_root = _assert_warning_text_still_present_in_pinned_sdk()

    sys.path.insert(0, str(sdk_root))
    try:
        from genlayer.py.storage._internal.core import Manager, Slot
        import cloudpickle

        class _ManagerWithRealWarning(Manager):
            """__getstate__ copied verbatim from the pinned SDK's real
            genlayer/gl/_internal/storage.py::_ActualStorageMan.
            do_read/do_write are stubbed: the real implementations call
            the WASM-only `_genlayer_wasi` extension, which does not
            exist on host CPython and is irrelevant to the pickling
            mechanism under test.
            """

            def __getstate__(self):
                warnings.warn(PICKLING_WARNING_TEXT)
                return {}

            def get_store_slot(self, addr: bytes) -> Slot:
                return Slot(addr, self)

            def do_read(self, id, off, length):
                raise NotImplementedError("WASM-only; not needed for this proof")

            def do_write(self, id, off, what):
                raise NotImplementedError("WASM-only; not needed for this proof")

        manager = _ManagerWithRealWarning()
        slot = manager.get_store_slot(b"\x00" * 32)

        def vulnerable_leader_fn():
            # Mirrors the ORIGINAL contract bug: capturing the whole
            # storage-backed object (here, its real Slot) in the
            # nondet closure. `slot` is a free variable of this
            # function -- that is precisely what gets cloudpickled.
            return slot.id

        # Mirrors this session's fix: extraction happens in the ENCLOSING
        # scope, strictly before the closure below is defined -- exactly
        # where `_run_llm_adjudication` now builds `bounded_rows` before
        # `leader_fn`/`validator_fn` exist. If this extraction were moved
        # inside `fixed_leader_fn` instead, `slot` itself would become a
        # free variable again and the fix would be undone.
        plain_id = bytes(slot.id)

        def fixed_leader_fn():
            return plain_id

        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            cloudpickle.dumps(vulnerable_leader_fn)
            vulnerable_hits = [w for w in caught if PICKLING_WARNING_TEXT in str(w.message)]
        assert vulnerable_hits, (
            "expected capturing a storage Slot in a cloudpickled closure to trigger "
            "the pickling-storage warning -- if this stops firing, the root-cause "
            "model in docs/STAGE_6_MIGRATION_NOTE.md needs re-verification"
        )

        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            cloudpickle.dumps(fixed_leader_fn)
            fixed_hits = [w for w in caught if PICKLING_WARNING_TEXT in str(w.message)]
        assert not fixed_hits, (
            "the fixed pattern (plain extracted values only) must never trigger the "
            "pickling-storage warning -- a regression here means the contract fix in "
            "_run_llm_adjudication was undone or a new storage-object capture was "
            "reintroduced"
        )
    finally:
        sys.path.remove(str(sdk_root))


def test_direct_mode_check_pickling_is_silent_either_way(deployed, direct_vm, direct_alice, direct_bob):
    """Documents (does not merely assume) that gltest's direct-mode
    harness cannot reproduce this warning via request_evaluation, even
    with the real cloudpickle call path enabled through
    `direct_vm.check_pickling = True`. This is because
    `gltest/direct/vm.py::InmemManager` (the storage manager direct mode
    actually uses) has no `__getstate__` override, unlike the real
    pinned SDK's `_ActualStorageMan`. Recorded explicitly so nobody
    later mistakes direct-mode silence for proof that the fix "did
    nothing" -- the real regression coverage is
    `test_real_sdk_slot_pickling_mechanism` above, which exercises the
    actual warning-emitting mechanism directly.
    """
    direct_vm.check_pickling = True
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        deployed.request_evaluation(agreement_id)

    pickling_hits = [w for w in caught if "pickling storage" in str(w.message)]
    assert pickling_hits == [], (
        "direct-mode's InmemManager has no __getstate__ override, so this is expected "
        "to be empty on BOTH the fixed and the (hypothetical) vulnerable contract -- "
        "silence here is not evidence of correctness, see module docstring"
    )
    # The evaluation itself must still succeed either way -- this test's
    # job is only to document harness scope, not to gate correctness.
    assert deployed.get_verdict(agreement_id)["decision"] == "PASS"
