"""Direct-mode tests for sla_bounty.py."""

from tests.direct.conftest import to_hex


def _setup_assessment_mocks(vm, meets_expectation, summary, body="Site is up. Login form visible."):
    vm.mock_web(r".*status\.example.*", {"status": 200, "body": body})
    vm.mock_llm(
        r".*checking whether a website.*",
        f'{{"meets_expectation": {"true" if meets_expectation else "false"}, "summary": "{summary}"}}',
    )


def test_create_monitor(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/sla_bounty.py")
    direct_vm.sender = direct_alice

    contract.create_monitor("m1", "https://status.example/", "Login page loads and shows a form.")

    monitor = contract.get_monitor("m1")
    assert monitor["status"] == "active"
    assert monitor["owner"] == to_hex(direct_alice)


def test_create_duplicate_monitor_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/sla_bounty.py")
    direct_vm.sender = direct_alice
    contract.create_monitor("m1", "https://status.example/", "expectation")

    with direct_vm.expect_revert("Monitor id already exists"):
        contract.create_monitor("m1", "https://status.example/", "expectation")


def test_check_sla_passing(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/sla_bounty.py")
    direct_vm.sender = direct_alice
    contract.create_monitor("m1", "https://status.example/", "Login page loads and shows a form.")

    _setup_assessment_mocks(direct_vm, True, "Login form is visible and functional.")
    contract.check_sla("m1")

    monitor = contract.get_monitor("m1")
    assert monitor["status"] == "active"
    assert monitor["last_check_summary"] == "Login form is visible and functional."


def test_check_sla_breach(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/sla_bounty.py")
    direct_vm.sender = direct_alice
    contract.create_monitor("m1", "https://status.example/", "Login page loads and shows a form.")

    _setup_assessment_mocks(
        direct_vm, False, "Page shows a 500 error, no login form present.", body="500 Internal Server Error"
    )
    contract.check_sla("m1")

    monitor = contract.get_monitor("m1")
    assert monitor["status"] == "breached"
    assert monitor["breach_evidence"] == "Page shows a 500 error, no login form present."


def test_claim_bounty_requires_breach(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/sla_bounty.py")
    direct_vm.sender = direct_alice
    contract.create_monitor("m1", "https://status.example/", "expectation")

    with direct_vm.expect_revert("Monitor is not in a breached state"):
        contract.claim_bounty("m1")


def test_claim_bounty_by_non_owner_fails(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/sla_bounty.py")
    direct_vm.sender = direct_alice
    contract.create_monitor("m1", "https://status.example/", "expectation")

    _setup_assessment_mocks(direct_vm, False, "Down.", body="500")
    contract.check_sla("m1")

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the monitor's owner can claim its bounty"):
        contract.claim_bounty("m1")


def test_claim_bounty_success(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/sla_bounty.py")
    direct_vm.sender = direct_alice
    contract.create_monitor("m1", "https://status.example/", "expectation")

    _setup_assessment_mocks(direct_vm, False, "Down.", body="500")
    contract.check_sla("m1")
    contract.claim_bounty("m1")

    monitor = contract.get_monitor("m1")
    assert monitor["status"] == "claimed"
