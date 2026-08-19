"""Direct-mode tests for fact_checker.py — corroboration-based verification."""

from tests.direct.conftest import to_hex


def mock_source(vm, url_pattern, verdict, reasoning, body="Page content."):
    vm.mock_web(url_pattern, {"status": 200, "body": body})
    vm.mock_llm(
        r"(?s).*Fact-check the following claim.*" + url_pattern,
        f'{{"verdict": "{verdict}", "reasoning": "{reasoning}"}}',
    )


def test_single_source_stays_pending(direct_vm, direct_deploy, direct_alice):
    """One source alone isn't enough to firmly resolve a claim."""
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice

    mock_source(direct_vm, r".*source-a\.example.*", "true", "Source A confirms it.")
    contract.submit_claim("c1", "The event happened in 2024.", "https://source-a.example/article")

    claim = contract.get_claim("c1")
    assert claim["status"] == "pending"
    assert len(claim["sources"]) == 1


def test_two_agreeing_sources_corroborates(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice

    mock_source(direct_vm, r".*source-a\.example.*", "true", "Source A confirms it.")
    contract.submit_claim("c1", "The event happened in 2024.", "https://source-a.example/article")

    mock_source(direct_vm, r".*source-b\.example.*", "true", "Source B also confirms it.")
    contract.add_source("c1", "https://source-b.example/article")

    claim = contract.get_claim("c1")
    assert claim["status"] == "corroborated"
    assert len(claim["sources"]) == 2


def test_two_agreeing_false_sources_refutes(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice

    mock_source(direct_vm, r".*source-a\.example.*", "false", "Source A contradicts it.")
    contract.submit_claim("c1", "The event happened in 2024.", "https://source-a.example/article")

    mock_source(direct_vm, r".*source-b\.example.*", "false", "Source B also contradicts it.")
    contract.add_source("c1", "https://source-b.example/article")

    claim = contract.get_claim("c1")
    assert claim["status"] == "refuted"


def test_disagreeing_sources_dispute(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice

    mock_source(direct_vm, r".*source-a\.example.*", "true", "Source A confirms it.")
    contract.submit_claim("c1", "The event happened in 2024.", "https://source-a.example/article")

    mock_source(direct_vm, r".*source-b\.example.*", "false", "Source B contradicts it.")
    contract.add_source("c1", "https://source-b.example/article")

    claim = contract.get_claim("c1")
    assert claim["status"] == "disputed"


def test_challenge_flips_corroborated_claim_to_disputed(direct_vm, direct_deploy, direct_alice, direct_bob):
    """The core challenge mechanic: a wrongly-corroborated claim can be re-opened by anyone."""
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice

    mock_source(direct_vm, r".*source-a\.example.*", "true", "Confirms it.")
    contract.submit_claim("c1", "claim text", "https://source-a.example/article")
    mock_source(direct_vm, r".*source-b\.example.*", "true", "Also confirms it.")
    contract.add_source("c1", "https://source-b.example/article")
    assert contract.get_claim("c1")["status"] == "corroborated"

    # Bob challenges with a contradicting source.
    direct_vm.sender = direct_bob
    mock_source(direct_vm, r".*source-c\.example.*", "false", "Actually contradicts it.")
    contract.add_source("c1", "https://source-c.example/article")

    claim = contract.get_claim("c1")
    assert claim["status"] == "disputed"
    assert len(claim["sources"]) == 3


def test_duplicate_source_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice
    mock_source(direct_vm, r".*source-a\.example.*", "true", "Confirms it.")
    contract.submit_claim("c1", "claim text", "https://source-a.example/article")

    with direct_vm.expect_revert("That source has already been checked for this claim"):
        contract.add_source("c1", "https://source-a.example/article")


def test_duplicate_claim_id_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice
    mock_source(direct_vm, r".*source-a\.example.*", "true", "confirmed")
    contract.submit_claim("c1", "claim text", "https://source-a.example/article")

    with direct_vm.expect_revert("Claim id already exists"):
        contract.submit_claim("c1", "claim text", "https://source-a.example/article")


def test_list_claims(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice
    mock_source(direct_vm, r".*source-a\.example.*", "true", "confirmed")
    contract.submit_claim("c1", "claim one", "https://source-a.example/a")
    mock_source(direct_vm, r".*source-b\.example.*", "true", "confirmed")
    contract.submit_claim("c2", "claim two", "https://source-b.example/b")

    listing = contract.list_claims()
    assert listing == {"c1": "pending", "c2": "pending"}


def test_submitter_recorded(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice
    mock_source(direct_vm, r".*source-a\.example.*", "true", "confirmed")
    contract.submit_claim("c1", "claim text", "https://source-a.example/article")

    claim = contract.get_claim("c1")
    assert claim["submitter"] == to_hex(direct_alice)


