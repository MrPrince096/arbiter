# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# Fact Checker — corroboration-based claim verification. A single LLM call
# against a single source is easy to get wrong (a biased page, a stale
# cache, a source that doesn't actually address the claim). This contract
# requires independent sources to AGREE before a claim is firmly verified
# or refuted, and stays open to challenge: anyone can add a contradicting
# source at any time, which re-opens a "corroborated" claim as "disputed"
# until it's resolved by further evidence. Each source check is itself an
# LLM judgment reached via validator consensus (eq_principle) — this
# contract aggregates multiple such judgments rather than trusting one.

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class SourceCheck:
    url: str
    verdict: str  # "true" | "false" | "unverifiable"
    reasoning: str


@allow_storage
@dataclass
class Claim:
    id: str
    submitter: Address
    claim_text: str
    sources: DynArray[SourceCheck]
    status: str  # "pending" | "corroborated" | "disputed" | "refuted"


# A claim needs at least this many agreeing sources before it's firmly
# resolved (not just a single source's opinion).
CORROBORATION_THRESHOLD = 2


class FactChecker(gl.Contract):
    claims: TreeMap[str, Claim]

    def __init__(self):
        pass

    def _check_source(self, claim_text: str, source_url: str) -> dict:
        def get_verdict() -> str:
            web_data = gl.nondet.web.render(source_url, mode="text")

            task = f"""
Fact-check the following claim against the source content provided.

Claim:
{claim_text}

Source content fetched from {source_url}:
{web_data}

Judge whether the source content supports the claim.

Respond in JSON:
{{
    "verdict": str, // "true", "false", or "unverifiable"
    "reasoning": str // one sentence citing what in the source supports the verdict
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters, your output
must be only JSON without any formatting prefix or suffix. This result
should be perfectly parsable by a JSON parser without errors.
            """
            result = gl.nondet.exec_prompt(task, response_format="json")
            return json.dumps(result, sort_keys=True)

        return json.loads(gl.eq_principle.strict_eq(get_verdict))

    def _recompute_status(self, sources: list) -> str:
        true_votes = sum(1 for s in sources if s.verdict == "true")
        false_votes = sum(1 for s in sources if s.verdict == "false")

        # Any disagreement always surfaces as disputed, even if one side
        # already met the corroboration threshold — a challenge should
        # never be silently outvoted, only resolved by removing the
        # disagreement (this contract has no such removal, by design:
        # disputes stay visible for humans/further sources to weigh in on).
        if true_votes >= 1 and false_votes >= 1:
            return "disputed"
        if true_votes >= CORROBORATION_THRESHOLD:
            return "corroborated"
        if false_votes >= CORROBORATION_THRESHOLD:
            return "refuted"
        return "pending"

    @gl.public.write
    def submit_claim(self, claim_id: str, claim_text: str, source_url: str) -> None:
        if claim_id in self.claims:
            raise gl.vm.UserError("Claim id already exists")

        check = self._check_source(claim_text, source_url)
        source = SourceCheck(url=source_url, verdict=check["verdict"], reasoning=check["reasoning"])
        self.claims[claim_id] = Claim(
            id=claim_id,
            submitter=gl.message.sender_address,
            claim_text=claim_text,
            sources=[source],
            status=self._recompute_status([source]),
        )

    @gl.public.write
    def add_source(self, claim_id: str, source_url: str) -> None:
        """Anyone can strengthen or challenge an existing claim with another independent source."""
        if claim_id not in self.claims:
            raise gl.vm.UserError("Claim not found")

        claim = self.claims[claim_id]
        if any(s.url == source_url for s in claim.sources):
            raise gl.vm.UserError("That source has already been checked for this claim")

        check = self._check_source(claim.claim_text, source_url)
        claim.sources.append(
            SourceCheck(url=source_url, verdict=check["verdict"], reasoning=check["reasoning"])
        )
        claim.status = self._recompute_status(list(claim.sources))

    @gl.public.view
    def get_claim(self, claim_id: str) -> dict:
        c = self.claims[claim_id]
        return {
            "id": c.id,
            "submitter": c.submitter.as_hex,
            "claim_text": c.claim_text,
            "status": c.status,
            "sources": [
                {"url": s.url, "verdict": s.verdict, "reasoning": s.reasoning} for s in c.sources
            ],
        }

    @gl.public.view
    def list_claims(self) -> dict:
        return {k: v.status for k, v in self.claims.items()}
