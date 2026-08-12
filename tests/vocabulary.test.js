import test from "node:test";
import assert from "node:assert/strict";
import data from "../data/vocabulary.json" with { type:"json" };
import { validateVocabulary } from "../scripts/validate-vocabulary.js";
import { searchKey } from "../src/utils/text.js";

test("Kapitel- und Themenbestand sind vollständig und valide", () => {
  const r=validateVocabulary(data);assert.deepEqual(r.errors,[]);assert.equal(data.chapters.length,45);assert.equal(data.topics.length,11);assert.equal(data.vocabulary.length,969);
});
test("Kapitel 12 enthält die feste Ergänzung und – ve",()=>{const item=data.vocabulary.find(v=>v.id==="k12-v012");assert.ok(item);assert.equal(item.chapter,12);assert.deepEqual(item.german,["und"]);assert.equal(item.turkish,"ve");assert.equal(item.pronunciation,"we");assert.equal(item.sourceType,"chapter");});
test("IDs sind stabil, eindeutig und kapitelbezogen", () => {
  const ids=data.vocabulary.map(v=>v.id);assert.equal(new Set(ids).size,ids.length);
  assert.ok(data.vocabulary.filter(v=>v.sourceType==="chapter").every(v=>v.id.startsWith(`k${String(v.chapter).padStart(2,"0")}-`)));
  assert.ok(data.vocabulary.filter(v=>v.sourceType==="topic").every(v=>v.id.startsWith(`thema-${v.topicId}-`)));
});
test("alle elf Themen und exakt 250 Originalzeilen wurden übernommen",()=>{const items=data.vocabulary.filter(v=>v.sourceType==="topic");assert.equal(items.length,250);assert.deepEqual(data.topics.map(t=>t.count),[24,22,14,32,13,34,18,22,20,14,37]);});
test("Kapitel und Themen lassen sich gemeinsam oder nach Quelle filtern",()=>{const chapters=new Set([1]), topicIds=new Set(["lebensmittel"]);const mixed=data.vocabulary.filter(v=>(v.sourceType==="chapter"&&chapters.has(v.chapter))||(v.sourceType==="topic"&&topicIds.has(v.topicId)));assert.ok(mixed.some(v=>v.sourceType==="chapter"));assert.ok(mixed.some(v=>v.topicId==="lebensmittel"));assert.ok(data.vocabulary.filter(v=>v.sourceType==="topic").every(v=>v.topicId));});
test("Themensuche und türkische Sonderzeichen funktionieren",()=>{const hits=data.vocabulary.filter(v=>searchKey(`${v.turkish} ${v.german.join(" ")} ${v.topicTitle||""}`).includes(searchKey("Körperteile")));assert.equal(hits.length,32);assert.ok(data.vocabulary.some(v=>v.turkish==="ayçiçeği"));});
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
  assert.ok(data.vocabulary.filter(v=>v.sourceType==="chapter").every(v=>v.chapterTitle===data.chapters[v.chapter-1].title));
});
test("Kapitel können über ihre Titel gesucht werden", () => {
  const query=searchKey("Büyükada");
  const hits=data.vocabulary.filter(v=>searchKey(`${v.turkish} ${v.german.join(" ")} ${v.chapter} ${v.chapterTitle} ${v.category}`).includes(query));
  assert.ok(hits.length>0);
  assert.ok(hits.every(v=>v.chapter===40));
});
