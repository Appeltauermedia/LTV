import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LEARN_SETTINGS, normalizeLearnSettings } from "../src/learning/settings.js";

test("vollständige Lerneinstellungen bleiben unverändert erhalten",()=>{const saved={scope:"topics",filter:"difficult",mode:"choice",direction:"mixed",count:"50",order:"chapter"};assert.deepEqual(normalizeLearnSettings(saved),saved);});
test("fehlende oder ungültige Werte fallen sicher auf die Standards zurück",()=>{assert.deepEqual(normalizeLearnSettings({mode:"unbekannt",count:20}),{...DEFAULT_LEARN_SETTINGS,count:"20"});});
test("Häufigkeitsrubrik kann als eigener Lernumfang gespeichert werden",()=>{assert.equal(normalizeLearnSettings({scope:"collections"}).scope,"collections");});
test("gelernte Vokabeln können gezielt zur Überprüfung ausgewählt werden",()=>{assert.equal(normalizeLearnSettings({filter:"learned"}).filter,"learned");});
