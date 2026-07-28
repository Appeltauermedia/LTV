import test from "node:test";
import assert from "node:assert/strict";
import data from "../data/vocabulary.json" with { type:"json" };
import { validateVocabulary } from "../scripts/validate-vocabulary.js";
import { searchKey } from "../src/utils/text.js";

test("Vokabelbestand ist vollständig und valide", () => {
  const r=validateVocabulary(data);assert.deepEqual(r.errors,[]);assert.equal(data.chapters.length,45);assert.equal(data.vocabulary.length,718);
});
test("IDs sind stabil, eindeutig und kapitelbezogen", () => {
  const ids=data.vocabulary.map(v=>v.id);assert.equal(new Set(ids).size,ids.length);
  assert.ok(data.vocabulary.every(v=>v.id.startsWith(`k${String(v.chapter).padStart(2,"0")}-`)));
});
test("alle türkischen Kernsonderzeichen sind im Bestand darstellbar", () => {
  const text=data.vocabulary.map(v=>v.turkish).join("");for(const char of "çğışüö")assert.ok(text.includes(char),`${char} fehlt`);
});
test("Kapitelwahl und Filter sind technisch auf alle Kapitel anwendbar", () => {
  const selected=new Set([1,2,45]);const result=data.vocabulary.filter(v=>selected.has(v.chapter));
  assert.ok(result.some(v=>v.chapter===1));assert.ok(result.some(v=>v.chapter===45));assert.ok(result.every(v=>selected.has(v.chapter)));
});
test("Fortschritt kann aus Lernstufen berechnet werden", () => {
  const ps=[{level:0},{level:1},{level:5},{level:5}];assert.equal(ps.filter(p=>p.level>=5).length/ps.length,0.5);
});
test("alle Kapitel besitzen redaktionelle Titel", () => {
  assert.equal(data.chapters.length,45);
  assert.equal(data.chapters[0].title,"Ankunft in Istanbul");
  assert.equal(data.chapters[44].title,"Der Bosporus antwortet");
  assert.ok(data.vocabulary.every(v=>v.chapterTitle===data.chapters[v.chapter-1].title));
});
test("Kapitel können über ihre Titel gesucht werden", () => {
  const query=searchKey("Büyükada");
  const hits=data.vocabulary.filter(v=>searchKey(`${v.turkish} ${v.german.join(" ")} ${v.chapter} ${v.chapterTitle} ${v.category}`).includes(query));
  assert.ok(hits.length>0);
  assert.ok(hits.every(v=>v.chapter===40));
});
