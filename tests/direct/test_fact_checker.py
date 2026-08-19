"""Direct-mode tests for fact_checker.py."""

from tests.direct.conftest import to_hex


def _setup_verdict_mocks(vm, verdict, reasoning, body="Page confirms the event took place in 2024."):
    vm.mock_web(r".*source\.example.*", {"status": 200, "body": body})
    vm.mock_llm(
        r".*Fact-check the following claim.*",
        f'{{"verdict": "{verdict}", "reasoning": "{reasoning}"}}',
    )


def test_submit_true_claim(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice

    _setup_verdict_mocks(direct_vm, "true", "Source directly confirms the claim's date.")
    contract.submit_claim("c1", "The event happened in 2024.", "https://source.example/article")

    claim = contract.get_claim("c1")
    assert claim["verdict"] == "true"
    assert claim["submitter"] == to_hex(direct_alice)
    assert claim["reasoning"] == "Source directly confirms the claim's date."


def test_submit_false_claim(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice

    _setup_verdict_mocks(
        direct_vm, "false", "Source states the event happened in 2023, not 2024.",
        body="The event took place in 2023.",
    )
    contract.submit_claim("c1", "The event happened in 2024.", "https://source.example/article")

    claim = contract.get_claim("c1")
    assert claim["verdict"] == "false"


def test_submit_unverifiable_claim(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice

    _setup_verdict_mocks(
        direct_vm, "unverifiable", "Source doesn't mention this at all.",
        body="Unrelated page content.",
    )
    contract.submit_claim("c1", "The event happened in 2024.", "https://source.example/article")

    claim = contract.get_claim("c1")
    assert claim["verdict"] == "unverifiable"


def test_duplicate_claim_id_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice
    _setup_verdict_mocks(direct_vm, "true", "confirmed")
    contract.submit_claim("c1", "claim text", "https://source.example/article")

    with direct_vm.expect_revert("Claim id already exists"):
        contract.submit_claim("c1", "claim text", "https://source.example/article")


def test_list_claims(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fact_checker.py")
    direct_vm.sender = direct_alice
    _setup_verdict_mocks(direct_vm, "true", "confirmed")
    contract.submit_claim("c1", "claim one", "https://source.example/a")
    contract.submit_claim("c2", "claim two", "https://source.example/b")

    listing = contract.list_claims()
    assert listing == {"c1": "true", "c2": "true"}
