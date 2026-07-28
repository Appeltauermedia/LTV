import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAnswer, normalizeExact, normalizeLoose, searchKey } from "../src/utils/text.js";

test("türkische Sonderzeichen bleiben in genauer Normalisierung erhalten", () => {
  assert.equal(normalizeExact("  İyi   günler "), "iyi günler");
  assert.equal(normalizeExact("Ç Ğ I İ Ö Ş Ü"), "ç ğ ı i ö ş ü");
});
test("vereinfachte türkische Schreibweise ist nur fast richtig", () => {
  assert.equal(evaluateAnswer("Gorusuruz", "Görüşürüz").result, "almost");
  assert.equal(evaluateAnswer("Görüşürüz", "Görüşürüz").result, "correct");
});
test("ein Tippfehler wird als fast richtig erkannt", () => assert.equal(evaluateAnswer("Merhabe", "Merhaba").result, "almost"));
test("mehrere Übersetzungen werden akzeptiert", () => assert.equal(evaluateAnswer("Guten Tag", ["Hallo","Guten Tag"], "de").result, "correct"));
test("deutlich falsche Antwort wird abgelehnt", () => assert.equal(evaluateAnswer("elma", "Merhaba").result, "wrong"));
test("Suche ist tolerant gegenüber türkischen Zeichen", () => assert.equal(searchKey("GÖRÜŞÜRÜZ"), normalizeLoose("gorusuruz")));
