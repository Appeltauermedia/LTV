import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseTopics } from "../scripts/import-topics.js";

const source=fs.readFileSync("data/source/THEMENWORTSCHATZ_TUERKISCH.md","utf8");
test("Markdown-Import erkennt Überschriften, Tabellen und stabile IDs",()=>{const topics=parseTopics(source);assert.equal(topics.length,11);assert.equal(topics.flatMap(t=>t.vocabulary).length,250);assert.equal(topics[0].vocabulary[0].id,"thema-tiere-001");assert.equal(topics[10].vocabulary.at(-1).id,"thema-personen-037");});
test("Import verändert Inhalte nicht",()=>{const topics=parseTopics(source), bear=topics[0].vocabulary[1], metro=topics.find(t=>t.id==="verkehrsmittel").vocabulary.filter(v=>v.turkish==="metro");assert.deepEqual(bear.german,["Bär"]);assert.equal(bear.turkish,"ayı");assert.equal(metro.length,2);});
