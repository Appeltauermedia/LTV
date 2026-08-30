import test from "node:test";
import assert from "node:assert/strict";
import { countDue, emptyProgress, schedule, isDue, LEVEL_INTERVALS } from "../src/learning/spaced-repetition.js";

test("Lernsystem besitzt fünf aktive Stufen", () => assert.deepEqual(LEVEL_INTERVALS, [0,0,1,3,7,21]));
test("richtige Antwort erhöht die Stufe und plant Wiederholung", () => {
  const p=schedule(emptyProgress("x"),"correct",Date.UTC(2026,6,28));
  assert.equal(p.level,1);assert.equal(p.correct,1);assert.ok(p.nextReviewAt);
});
test("schnelles wiederholtes Anklicken erhöht Stufe nicht", () => {
  const first=schedule(emptyProgress("x"),"correct",100000);
  const second=schedule(first,"easy",110000);
  assert.equal(second.level,first.level);
});
test("falsche Antwort stuft zurück", () => {
  const p={...emptyProgress("x"),level:5,status:"learned"};
  assert.equal(schedule(p,"wrong",Date.now()).level,3);
});
test("Fälligkeit wird korrekt erkannt", () => assert.equal(isDue({nextReviewAt:"2020-01-01T00:00:00.000Z"},Date.now()),true));
test("fällige Einträge werden mit der aktuellen Zeit statt dem Listenindex gezählt",()=>{
  const now=new Date("2026-08-30T12:00:00.000Z").getTime();
  const progress=[{nextReviewAt:"2026-08-29T12:00:00.000Z"},{nextReviewAt:"2026-08-31T12:00:00.000Z"},{nextReviewAt:null}];
  assert.equal(countDue(progress,now),1);
});
