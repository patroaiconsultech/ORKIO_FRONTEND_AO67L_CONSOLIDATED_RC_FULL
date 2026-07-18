# Evolution Signals V2.1 — Relatório de validação

```text
baseline_artifact=ORKIO_EVOLUTION_SIGNALS_V2_GITHUB_READY.zip
deployed_frontend_commit=NOT_PROVEN

contract_tests=8 PASS
polling_contract_tests=4 PASS
syntax_check=PASS
secret_scan=PASS

vite_build=REQUIRED_IN_GITHUB_BRANCH
backend_changed=false
migration_added=false
environment_changed=false

write_to_github_executed=false
commit_executed=false
merge_executed=false
deploy_executed=false
human_approval_required=true
```

## Contrato de métricas

```text
TAP version 13
# Subtest: sample zero becomes insufficient evidence instead of a neutral score
ok 1 - sample zero becomes insufficient evidence instead of a neutral score
  ---
  duration_ms: 2.696946
  type: 'test'
  ...
# Subtest: configuration-only agents do not receive a measured knowledge score
ok 2 - configuration-only agents do not receive a measured knowledge score
  ---
  duration_ms: 0.531403
  type: 'test'
  ...
# Subtest: explicit evaluated agent signal can produce a measured score
ok 3 - explicit evaluated agent signal can produce a measured score
  ---
  duration_ms: 0.489605
  type: 'test'
  ...
# Subtest: overall ignores metrics without evidence
ok 4 - overall ignores metrics without evidence
  ---
  duration_ms: 0.249165
  type: 'test'
  ...
# Subtest: source failure lowers reliability and never creates NaN
ok 5 - source failure lowers reliability and never creates NaN
  ---
  duration_ms: 0.309613
  type: 'test'
  ...
# Subtest: display helpers use honest labels
ok 6 - display helpers use honest labels
  ---
  duration_ms: 0.158726
  type: 'test'
  ...
# Subtest: coverage discloses measured fronts and unsampled fronts
ok 7 - coverage discloses measured fronts and unsampled fronts
  ---
  duration_ms: 0.771978
  type: 'test'
  ...
# Subtest: zero execution copy does not claim zero failures as reliability proof
ok 8 - zero execution copy does not claim zero failures as reliability proof
  ---
  duration_ms: 0.223741
  type: 'test'
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 95.948083
```

## Contrato de polling e UI

```text
TAP version 13
# Subtest: polling pauses while the admin tab is hidden
ok 1 - polling pauses while the admin tab is hidden
  ---
  duration_ms: 0.763671
  type: 'test'
  ...
# Subtest: summary and static signal polling use different intervals
ok 2 - summary and static signal polling use different intervals
  ---
  duration_ms: 0.158639
  type: 'test'
  ...
# Subtest: selected proposal detail is not refreshed by the minute polling loop
ok 3 - selected proposal detail is not refreshed by the minute polling loop
  ---
  duration_ms: 0.255677
  type: 'test'
  ...
# Subtest: graph uses explicit coverage labels and no native metric tooltip
ok 4 - graph uses explicit coverage labels and no native metric tooltip
  ---
  duration_ms: 0.407529
  type: 'test'
  ...
1..4
# tests 4
# suites 0
# pass 4
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 93.693695
```

## Sintaxe

```text
PASS /mnt/data/ORKIO_EVOLUTION_SIGNALS_V2_1_GITHUB_READY/src/routes/AdminEvolutionCenter.jsx
PASS /mnt/data/ORKIO_EVOLUTION_SIGNALS_V2_1_GITHUB_READY/src/components/admin/EvolutionSignalGraph.jsx
PASS /mnt/data/ORKIO_EVOLUTION_SIGNALS_V2_1_GITHUB_READY/src/lib/evolutionSignals.mjs
```
