import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App.tsx", "utf8");
const landing = fs.readFileSync("src/routes/Landing.tsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
const install = fs.readFileSync(
  "src/components/PwaInstallButton.tsx",
  "utf8",
);

test("landing and app are separate routes", () => {
  assert.match(app, /path="\/" element={<Landing/);
  assert.match(app, /path="\/app" element={<AppConsole/);
});

test("landing contains premium brand and trust sections", () => {
  assert.match(landing, /Onde a inteligência/);
  assert.match(landing, /CONFIANÇA POR ARQUITETURA/);
  assert.match(landing, /ORKIO NO SEU DISPOSITIVO/);
});

test("install UX includes Android prompt and iOS instructions", () => {
  assert.match(install, /requestInstall/);
  assert.match(install, /Compartilhar/);
  assert.match(install, /Adicionar à Tela de Início/);
});

test("responsive layout includes safe areas and touch targets", () => {
  assert.match(styles, /safe-area-inset-top/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /@media \(display-mode: standalone\)/);
});
