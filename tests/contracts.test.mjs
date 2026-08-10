import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("invite and composer controls remain in the console", () => {
  const source = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
  assert.match(source, /Convidar participante/);
  assert.match(source, /type="file"/);
  assert.match(source, /aria-label="Voz"/);
});

test("frontend source contains no server-side secrets", () => {
  const files = [
    "src/App.tsx",
    "src/api.ts",
    "src/routes/Landing.tsx",
    "src/routes/AppConsole.tsx",
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /PRIVATE_KEY|OPENAI_API_KEY|DATABASE_URL|CLIENT_SECRET/,
    );
  }
});
