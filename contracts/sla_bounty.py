# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# SLA Bounty — an owner describes, in plain English, what "up and working"
# means for their site (not just a status-code check: an LLM reads the
# actual page and judges whether it matches the description). Anyone can
# trigger a check; if the SLA is breached, it's recorded on-chain and the
# monitor becomes claimable. Same value-custody scope note as
# dispute_arbitration.py: this records a breach + claim entitlement, it
# doesn't itself move token value.

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Monitor:
    id: str
    owner: Address
    url: str
    expectation: str  # plain-English description of "working correctly"
    status: str  # "active" | "breached" | "claimed"
    last_check_summary: str
    breach_evidence: str


class SlaBounty(gl.Contract):
    monitors: TreeMap[str, Monitor]

    def __init__(self):
        pass

    def _assess(self, url: str, expectation: str) -> dict:
        def get_assessment() -> str:
            web_data = gl.nondet.web.render(url, mode="text")

            task = f"""
You are checking whether a website is meeting its stated SLA.

Expectation (what "working correctly" means for this site):
{expectation}

Actual page content fetched just now from {url}:
{web_data}

Judge whether the page content is consistent with the expectation.

Respond in JSON:
{{
    "meets_expectation": bool,
    "summary": str // one sentence describing what was actually observed
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters, your output
must be only JSON without any formatting prefix or suffix. This result
should be perfectly parsable by a JSON parser without errors.
            """
            result = gl.nondet.exec_prompt(task, response_format="json")
            return json.dumps(result, sort_keys=True)

        return json.loads(gl.eq_principle.strict_eq(get_assessment))

    @gl.public.write
    def create_monitor(self, monitor_id: str, url: str, expectation: str) -> None:
        if monitor_id in self.monitors:
            raise gl.vm.UserError("Monitor id already exists")

        self.monitors[monitor_id] = Monitor(
            id=monitor_id,
            owner=gl.message.sender_address,
            url=url,
            expectation=expectation,
            status="active",
            last_check_summary="",
            breach_evidence="",
        )

    @gl.public.write
    def check_sla(self, monitor_id: str) -> None:
        if monitor_id not in self.monitors:
            raise gl.vm.UserError("Monitor not found")

        monitor = self.monitors[monitor_id]
        if monitor.status != "active":
            raise gl.vm.UserError(f"Monitor is not active (status: {monitor.status})")

        assessment = self._assess(monitor.url, monitor.expectation)
        monitor.last_check_summary = assessment["summary"]
        if not assessment["meets_expectation"]:
            monitor.status = "breached"
            monitor.breach_evidence = assessment["summary"]

    @gl.public.write
    def claim_bounty(self, monitor_id: str) -> None:
        if monitor_id not in self.monitors:
            raise gl.vm.UserError("Monitor not found")

        monitor = self.monitors[monitor_id]
        if gl.message.sender_address != monitor.owner:
            raise gl.vm.UserError("Only the monitor's owner can claim its bounty")
        if monitor.status != "breached":
            raise gl.vm.UserError(f"Monitor is not in a breached state (status: {monitor.status})")

        monitor.status = "claimed"

    @gl.public.view
    def get_monitor(self, monitor_id: str) -> dict:
        m = self.monitors[monitor_id]
        return {
            "id": m.id,
            "owner": m.owner.as_hex,
            "url": m.url,
            "expectation": m.expectation,
            "status": m.status,
            "last_check_summary": m.last_check_summary,
            "breach_evidence": m.breach_evidence,
        }

    @gl.public.view
    def list_monitors(self) -> dict:
        return {k: v.status for k, v in self.monitors.items()}
