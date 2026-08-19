# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# Fact Checker — submit a claim plus a source URL; validators fetch the
# page and an LLM judges true / false / unverifiable against it, recorded
# on-chain as a permanent, consensus-reached verdict. The simplest possible
# demo of GenLayer's "read the web, judge in natural language" pattern.

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Claim:
    id: str
    submitter: Address
    claim_text: str
    source_url: str
    verdict: str  # "true" | "false" | "unverifiable" | "" (pending)
    reasoning: str


class FactChecker(gl.Contract):
    claims: TreeMap[str, Claim]

    def __init__(self):
        pass

    def _check_claim(self, claim_text: str, source_url: str) -> dict:
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

    @gl.public.write
    def submit_claim(self, claim_id: str, claim_text: str, source_url: str) -> None:
        if claim_id in self.claims:
            raise gl.vm.UserError("Claim id already exists")

        verdict = self._check_claim(claim_text, source_url)
        self.claims[claim_id] = Claim(
            id=claim_id,
            submitter=gl.message.sender_address,
            claim_text=claim_text,
            source_url=source_url,
            verdict=verdict["verdict"],
            reasoning=verdict["reasoning"],
        )

    @gl.public.view
    def get_claim(self, claim_id: str) -> dict:
        c = self.claims[claim_id]
        return {
            "id": c.id,
            "submitter": c.submitter.as_hex,
            "claim_text": c.claim_text,
            "source_url": c.source_url,
            "verdict": c.verdict,
            "reasoning": c.reasoning,
        }

    @gl.public.view
    def list_claims(self) -> dict:
        return {k: v.verdict for k, v in self.claims.items()}
