import test from "node:test";
import assert from "node:assert/strict";
import { matchesProgressFilter, selectedIncompleteChapters } from "../src/learning/selection.js";

test("der Filter learned enthält ausschließlich Stufe 5",()=>{
  assert.equal(matchesProgressFilter({level:5,status:"learned"},"learned"),true);
  assert.equal(matchesProgressFilter({level:4,status:"learning"},"learned"),false);
});

test("vollständig gelernte Kapitel werden aus einer Auswahl entfernt",()=>{
  assert.deepEqual([...selectedIncompleteChapters(new Set([1,2,3]),new Set([2,3]))],[1]);
});
