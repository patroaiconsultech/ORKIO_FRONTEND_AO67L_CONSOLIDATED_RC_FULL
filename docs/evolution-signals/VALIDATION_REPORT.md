# Relatório de validação

```text
artifact_source=AdminEvolutionCenter (3).jsx
artifact_source_sha256=ecb7623153a4eec469e980bea1fd4c9bd9df3f4c51f343070be3c9293ad1de85
artifact_source_lines=1478

contract_tests=PASS
contract_test_count=6
syntax_check=PASS
secret_scan=PASS
runtime_scope=PASS

backend_changed=false
migration_added=false
environment_changed=false

vite_build=REQUIRED_IN_GITHUB_BRANCH
write_to_github_executed=false
commit_executed=false
merge_executed=false
deploy_executed=false
human_approval_required=true
```

## Resultado dos testes de contrato

```text
TAP version 13
# Subtest: sample zero becomes insufficient evidence instead of a neutral score
ok 1 - sample zero becomes insufficient evidence instead of a neutral score
  ---
  duration_ms: 3.066564
  type: 'test'
  ...
# Subtest: configuration-only agents do not receive a measured knowledge score
ok 2 - configuration-only agents do not receive a measured knowledge score
  ---
  duration_ms: 0.584368
  type: 'test'
  ...
# Subtest: explicit evaluated agent signal can produce a measured score
ok 3 - explicit evaluated agent signal can produce a measured score
  ---
  duration_ms: 0.366847
  type: 'test'
  ...
# Subtest: overall ignores metrics without evidence
ok 4 - overall ignores metrics without evidence
  ---
  duration_ms: 0.286062
  type: 'test'
  ...
# Subtest: source failure lowers reliability and never creates NaN
ok 5 - source failure lowers reliability and never creates NaN
  ---
  duration_ms: 0.460401
  type: 'test'
  ...
# Subtest: display helpers use honest labels
ok 6 - display helpers use honest labels
  ---
  duration_ms: 0.219006
  type: 'test'
  ...
1..6
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 102.659583
```

## Resultado da validação sintática

```text
PASS /mnt/data/ORKIO_EVOLUTION_SIGNALS_V2_GITHUB_READY/src/routes/AdminEvolutionCenter.jsx
PASS /mnt/data/ORKIO_EVOLUTION_SIGNALS_V2_GITHUB_READY/src/components/admin/EvolutionSignalGraph.jsx
PASS /mnt/data/ORKIO_EVOLUTION_SIGNALS_V2_GITHUB_READY/src/lib/evolutionSignals.mjs
```
