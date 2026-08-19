"""Direct-mode tests for dispute_arbitration.py."""

import json

from tests.direct.conftest import to_hex


def _setup_verdict_mocks(vm, winner, reasoning, url_pattern=r".*evidence\.example.*"):
    vm.mock_web(url_pattern, {"status": 200, "body": "Delivery confirmed by carrier tracking."})
    vm.mock_llm(
        r".*arbitrating a dispute.*",
        json.dumps({"winner": winner, "reasoning": reasoning}),
    )


def test_create_agreement(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/dispute_arbitration.py")
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)

    contract.create_agreement("deal1", bob, "Alice pays Bob $100 on delivery.", "100")

    agreement = contract.get_agreement("deal1")
    assert agreement["status"] == "open"
    assert agreement["party_b"] == bob


def test_create_duplicate_agreement_fails(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/dispute_arbitration.py")
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)

    contract.create_agreement("deal1", bob, "terms", "100")
    with direct_vm.expect_revert("Agreement id already exists"):
        contract.create_agreement("deal1", bob, "terms", "100")


def test_raise_dispute_by_non_party_fails(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/dispute_arbitration.py")
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)
    contract.create_agreement("deal1", bob, "terms", "100")

    # A third address that is neither party_a nor party_b.
    stranger = bytes([9] * 20)
    direct_vm.sender = stranger
    with direct_vm.expect_revert("Only a party to the agreement can raise a dispute"):
        contract.raise_dispute("deal1", "evidence", "")


def test_full_dispute_resolves_in_favor_of_party_a(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/dispute_arbitration.py")
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)

    contract.create_agreement("deal1", bob, "Alice pays Bob $100 on delivery.", "100")
    contract.raise_dispute("deal1", "Delivery was never made.", "https://evidence.example/track")

    agreement = contract.get_agreement("deal1")
    assert agreement["status"] == "disputed"

    _setup_verdict_mocks(direct_vm, "party_a", "Tracking shows delivery never occurred.")
    contract.resolve_dispute("deal1")

    agreement = contract.get_agreement("deal1")
    assert agreement["status"] == "resolved"
    assert agreement["verdict_winner"] == "party_a"
    assert agreement["verdict_reasoning"] == "Tracking shows delivery never occurred."


def test_resolve_without_dispute_fails(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/dispute_arbitration.py")
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)
    contract.create_agreement("deal1", bob, "terms", "100")

    with direct_vm.expect_revert("Agreement is not disputed"):
        contract.resolve_dispute("deal1")


def test_unresolved_verdict_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/dispute_arbitration.py")
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)
    contract.create_agreement("deal1", bob, "terms", "100")
    contract.raise_dispute("deal1", "unclear evidence", "https://evidence.example/track")

    _setup_verdict_mocks(direct_vm, "unresolved", "Evidence is ambiguous.")
    with direct_vm.expect_revert("Evidence was insufficient to reach a verdict"):
        contract.resolve_dispute("deal1")


def test_list_agreements(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/dispute_arbitration.py")
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)
    contract.create_agreement("deal1", bob, "terms", "100")
    contract.create_agreement("deal2", bob, "terms", "50")

    listing = contract.list_agreements()
    assert listing == {"deal1": "open", "deal2": "open"}


def test_get_all_agreements(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/dispute_arbitration.py")
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)
    contract.create_agreement("deal1", bob, "Alice pays Bob $100 on delivery.", "100")

    all_agreements = contract.get_all_agreements()
    assert set(all_agreements.keys()) == {"deal1"}
    assert all_agreements["deal1"]["status"] == "open"
    assert all_agreements["deal1"]["amount"] == "100"
    assert all_agreements["deal1"]["party_b"] == bob
