# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# Dispute Arbitration — two parties record an agreement in plain English.
# Either party can raise a dispute with evidence (free text and/or a URL);
# the contract reads the evidence and issues a binding, LLM-judged verdict,
# reached via validator consensus (eq_principle), not a single node's opinion.
#
# Scope note: this contract records a VERDICT (who's right, and the amount
# the terms say they're owed) — it does not itself custody token value. Wiring
# actual fund transfer requires GenLayer's payable-method syntax, which
# wasn't available to verify locally; adding it is a clean follow-up once
# confirmed against the docs, not something to guess at.

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Agreement:
    id: str
    party_a: Address
    party_b: Address
    terms: str
    amount: str
    status: str  # "open" | "disputed" | "resolved"
    evidence: str
    evidence_url: str
    verdict_winner: str  # "party_a" | "party_b" | "" (unresolved)
    verdict_reasoning: str


class DisputeArbitration(gl.Contract):
    agreements: TreeMap[str, Agreement]

    def __init__(self):
        pass

    def _judge(self, terms: str, amount: str, evidence: str, evidence_url: str) -> dict:
        def get_verdict() -> str:
            web_context = ""
            if evidence_url:
                web_context = gl.nondet.web.render(evidence_url, mode="text")

            task = f"""
You are arbitrating a dispute between two parties over an agreement.

Agreement terms:
{terms}

Amount at stake: {amount}

Evidence submitted by the disputing party:
{evidence}

Additional evidence fetched from a URL the disputing party provided:
{web_context if web_context else "(no URL provided)"}

Based ONLY on the agreement terms and the evidence above, decide who the
terms favor: "party_a" or "party_b". If the evidence is insufficient to
decide, respond "unresolved".

Respond in JSON:
{{
    "winner": str, // "party_a", "party_b", or "unresolved"
    "reasoning": str // one or two sentences explaining the verdict
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters, your output
must be only JSON without any formatting prefix or suffix. This result
should be perfectly parsable by a JSON parser without errors.
            """
            result = gl.nondet.exec_prompt(task, response_format="json")
            return json.dumps(result, sort_keys=True)

        return json.loads(gl.eq_principle.strict_eq(get_verdict))

    @gl.public.write
    def create_agreement(
        self, agreement_id: str, party_b: str, terms: str, amount: str
    ) -> None:
        sender = gl.message.sender_address
        if agreement_id in self.agreements:
            raise gl.vm.UserError("Agreement id already exists")

        self.agreements[agreement_id] = Agreement(
            id=agreement_id,
            party_a=sender,
            party_b=Address(party_b),
            terms=terms,
            amount=amount,
            status="open",
            evidence="",
            evidence_url="",
            verdict_winner="",
            verdict_reasoning="",
        )

    @gl.public.write
    def raise_dispute(self, agreement_id: str, evidence: str, evidence_url: str = "") -> None:
        if agreement_id not in self.agreements:
            raise gl.vm.UserError("Agreement not found")

        agreement = self.agreements[agreement_id]
        sender = gl.message.sender_address
        if sender != agreement.party_a and sender != agreement.party_b:
            raise gl.vm.UserError("Only a party to the agreement can raise a dispute")
        if agreement.status != "open":
            raise gl.vm.UserError(f"Agreement is not open (status: {agreement.status})")

        agreement.status = "disputed"
        agreement.evidence = evidence
        agreement.evidence_url = evidence_url

    @gl.public.write
    def resolve_dispute(self, agreement_id: str) -> None:
        if agreement_id not in self.agreements:
            raise gl.vm.UserError("Agreement not found")

        agreement = self.agreements[agreement_id]
        if agreement.status != "disputed":
            raise gl.vm.UserError(f"Agreement is not disputed (status: {agreement.status})")

        verdict = self._judge(
            agreement.terms, agreement.amount, agreement.evidence, agreement.evidence_url
        )
        if verdict["winner"] == "unresolved":
            raise gl.vm.UserError("Evidence was insufficient to reach a verdict")

        agreement.status = "resolved"
        agreement.verdict_winner = verdict["winner"]
        agreement.verdict_reasoning = verdict["reasoning"]

    @gl.public.view
    def get_agreement(self, agreement_id: str) -> dict:
        a = self.agreements[agreement_id]
        return {
            "id": a.id,
            "party_a": a.party_a.as_hex,
            "party_b": a.party_b.as_hex,
            "terms": a.terms,
            "amount": a.amount,
            "status": a.status,
            "verdict_winner": a.verdict_winner,
            "verdict_reasoning": a.verdict_reasoning,
        }

    @gl.public.view
    def list_agreements(self) -> dict:
        return {k: v.status for k, v in self.agreements.items()}

    @gl.public.view
    def get_all_agreements(self) -> dict:
        """Full details for every agreement — used by the frontend's table view (list_agreements() only gives id -> status)."""
        return {k: self.get_agreement(k) for k in self.agreements}
