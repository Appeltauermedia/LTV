import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseFrequencyVocabulary } from "../scripts/import-frequency.js";

const source=fs.readFileSync("data/source/2000_GEBRAEUCHLICHE_TUERKISCHE_VOKABELN_ALPHABETISCH.md","utf8");

test("Häufigkeitsimport übernimmt exakt 2.000 Tabellenzeilen",()=>{
  const vocabulary=parseFrequencyVocabulary(source);
  assert.equal(vocabulary.length,2000);
  assert.equal(vocabulary[0].turkish,"abd");
  assert.equal(vocabulary.at(-1).turkish,"zorunlu");
});

test("Häufigkeitsrang erzeugt stabile IDs und Bedeutungen bleiben erhalten",()=>{
  const vocabulary=parseFrequencyVocabulary(source);
  const zaman=vocabulary.find(item=>item.turkish==="zaman");
  assert.equal(zaman.id,"freq-0034");
  assert.equal(zaman.alphabeticalIndex,1985);
  assert.deepEqual(zaman.german,["Zeit","Zeitpunkt"]);
  assert.equal(zaman.source.originalGerman,"Zeit; Zeitpunkt");
});
