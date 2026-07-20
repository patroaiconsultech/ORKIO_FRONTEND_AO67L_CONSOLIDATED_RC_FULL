import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "..", "src", "routes", "AdminEvolutionCenter.jsx"),
  "utf8",
);

test("marco zero UI is preview-only and contains no client-side confirmation authority", () => {
  assert.match(source, /runMarcoZeroPreview/);
  assert.match(source, /archive-baseline\?dry_run=true/);
  assert.match(source, /aplicação real bloqueada/);
  assert.match(source, /Nenhuma proposta é alterada nesta fase/);

  assert.doesNotMatch(source, /EFATA777_MARCO_ZERO/);
  assert.doesNotMatch(source, /dry_run=false/);
  assert.doesNotMatch(source, /Aplicar marco zero/);
  assert.doesNotMatch(source, /window\.confirm/);
});

test("preview result communicates evidence and write state", () => {
  assert.match(source, /candidate_count/);
  assert.match(source, /preview_truncated/);
  assert.match(source, /cutoff_at/);
  assert.match(source, /Fonte:<\/span> PostgreSQL/);
  assert.match(source, /Escrita:<\/span> false/);
  assert.match(source, /inventário \+ rollback/);
});
