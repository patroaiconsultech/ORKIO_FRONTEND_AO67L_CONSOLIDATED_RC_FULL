# AO-01 Root Hygiene Correction V2

Scope: repository hygiene and deterministic packaging only.

Applied:
- Historical Markdown/patch handoffs moved out of the executable root.
- Bytecode disguised as Python source removed.
- `__pycache__`, `.pytest_cache`, `.pyc`, and `.pyo` removed.
- `.gitignore` hardened.
- Post-test scrub is mandatory before packaging.
- Full-tree deterministic repository manifests added.
- Repository hygiene validator added.

Not changed:
- Product runtime logic.
- Team-lite behavior.
- Agent identity.
- SSE.
- Database.
- Migrations.
- Authentication.
- The 13 pre-existing backend test failures.
