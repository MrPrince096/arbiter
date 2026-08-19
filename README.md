# Arbiter — On-Chain Dispute Arbitration on GenLayer

## About
Two parties record an agreement in plain English. Either side can raise a dispute with evidence — free text and/or a URL. Validators fetch that evidence and an LLM judges who the terms favor, reaching a binding verdict through GenLayer's consensus (`eq_principle`) rather than any single node's opinion.

Scaffolded from GenLayer's official [project boilerplate](https://github.com/genlayerlabs/genlayer-project-boilerplate) (its own example, `contracts/football_bets.py`, is left in place as a reference for the same `gl.nondet.web.render` + `gl.nondet.exec_prompt` + `eq_principle.strict_eq` pattern this project builds on).

## What's included
- `contracts/dispute_arbitration.py` — the arbitration contract (this project's flagship)
- `contracts/sla_bounty.py` and `contracts/fact_checker.py` — two smaller companion Intelligent Contracts exploring the same web-access + LLM-judgment pattern for different use cases
- **Direct mode tests** — fast, in-memory unit tests with web/LLM mocking (~ms per test), covering all three contracts
- **Integration tests** — full end-to-end tests against GenLayer Studio
- **Contract linting** — static analysis to catch common contract issues before deployment
- **CI pipeline** — GitHub Actions workflow for linting and direct tests
- A production-ready Next.js frontend (TypeScript, TanStack Query, Radix UI) for `dispute_arbitration.py`
- Configuration file template and deployment scripts

## Requirements
- Python >= 3.12
- [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli) globally installed: `npm install -g genlayer`
- GenLayer Studio (for integration tests and deployment): Install from [Docs](https://docs.genlayer.com/developers/intelligent-contracts/tooling-setup#using-the-genlayer-studio) or use the hosted [GenLayer Studio](https://studio.genlayer.com/)

## Project Structure

```
contracts/              # Python intelligent contracts
tests/
  direct/               # Fast in-memory tests (no Studio required)
    test_create_bet.py   # Bet creation logic
    test_resolve_bet.py  # Bet resolution with web/LLM mocks
    test_views.py        # Read-only view methods
  integration/           # Full tests against GenLayer Studio
    test_football_bets.py
    fixtures.py          # Expected state fixtures
frontend/               # Next.js 15 app (TypeScript, TanStack Query, Radix UI)
deploy/                 # TypeScript deployment scripts
gltest.config.yaml      # Test runner network configuration
pyproject.toml          # Python/pytest configuration
.github/workflows/      # CI pipeline
```

## Quick Start

### 1. Set up Python environment

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Lint your contracts

Run the GenVM linter to catch issues before deployment:

```shell
genvm-lint check contracts/football_bets.py
```

The linter catches:
- Forbidden imports and non-deterministic calls
- Invalid storage types (must use `TreeMap`, `DynArray`, `u256`, etc.)
- Missing decorators and return type annotations
- Non-deterministic operations outside equivalence principle blocks
- And [20+ other rules](https://github.com/genlayerlabs/genvm-linter)

### 3. Run direct mode tests

Direct mode tests run contracts in-memory without needing GenLayer Studio. They use mocks for web requests and LLM calls, giving you fast feedback (~milliseconds per test):

```shell
pytest tests/direct/ -v
```

Direct mode features used in these tests:
- `direct_deploy("contracts/file.py")` — deploy contract in memory
- `direct_vm.sender = address` — set transaction sender
- `direct_vm.mock_web(pattern, response)` — mock HTTP/render calls
- `direct_vm.mock_llm(pattern, response)` — mock LLM responses
- `direct_vm.expect_revert("message")` — assert expected failures
- `direct_vm.clear_mocks()` — reset mocks between calls

### 4. Deploy the contract

1. Choose your network: `genlayer network`
2. Deploy: `genlayer deploy` (runs the script in `/deploy/deployScript.ts`)

### 5. Run integration tests

Integration tests deploy the contract to GenLayer Studio and test with real consensus:

```shell
gltest tests/integration/ -v -s
```

These require GenLayer Studio running (local or hosted).

### 6. Set up the frontend

1. Copy `frontend/.env.example` to `frontend/.env`
2. Add your deployed contract address as `NEXT_PUBLIC_CONTRACT_ADDRESS`
3. Run:

```shell
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:3000/.

## How the Dispute Arbitration Contract Works

1. **Creating an Agreement**: Either party records the terms, the counterparty's address, and the amount at stake.
2. **Raising a Dispute**: Either party can dispute an open agreement, submitting evidence (free text and/or a URL).
3. **Resolving**: The contract fetches any evidence URL, asks an LLM to judge who the terms favor, and records the verdict + reasoning — reached via `eq_principle.strict_eq` so all validators converge on the same answer.

## Testing Strategy

| Test Type | Command | Speed | Requires Studio |
|-----------|---------|-------|-----------------|
| **Lint** | `genvm-lint check contracts/*.py` | ~250ms | No |
| **Direct** | `pytest tests/direct/ -v` | ~ms/test | No |
| **Integration** | `gltest tests/integration/ -v -s` | ~min/test | Yes |

**Recommended workflow:**
1. Lint after every contract change
2. Run direct tests frequently during development
3. Run integration tests before deployment to verify consensus behavior

For AI coding agents (Claude Code, Cursor, etc.), the linter and direct tests provide the fast feedback loop needed for iterative development without requiring a running Studio instance.

## Community
- **[Discord](https://discord.gg/8Jm4v89VAu)**: Discussions, support, and announcements
- **[Telegram](https://t.me/genlayer)**: Informal chats and quick updates

## Documentation
For detailed information, see our [documentation](https://docs.genlayer.com/).

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
