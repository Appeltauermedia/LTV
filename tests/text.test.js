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
test("unsichtbare Unicode-Zeichen verändern eine richtige Antwort nicht", () => {
  assert.equal(evaluateAnswer("den\u200B Tee", "den Tee", "de").result, "correct");
  assert.equal(evaluateAnswer("\uFEFFden Tee", "den Tee", "de").result, "correct");
});
test("unwesentliche Interpunktion wird ignoriert", () => assert.equal(evaluateAnswer("den Tee.", "den Tee", "de").result, "correct"));
test("ähnliche Antworten und Buchstabendreher sind fast richtig", () => {
  assert.equal(evaluateAnswer("denn Te", "den Tee", "de").result, "almost");
  assert.equal(evaluateAnswer("Merhaba", "Mehraba").result, "almost");
});
test("große inhaltliche Abweichungen bleiben falsch", () => assert.equal(evaluateAnswer("den Kaffee", "den Tee", "de").result, "wrong"));
