import test from "node:test";
import assert from "node:assert/strict";
import { createExport, validateImport } from "../src/storage/backup.js";

test("Export besitzt Typ, Version und vollständige Bereiche", () => {
  const x=createExport([{id:"k01-v001",level:1}],[],[]);
  assert.equal(x.type,"tuerkisch-lernstand");assert.equal(x.version,1);assert.ok(x.exportedAt);
});
test("gültiger Import wird akzeptiert", () => {
  const x=createExport([{id:"k01-v001",level:1}],[],[]);
  assert.equal(validateImport(x,new Set(["k01-v001"])).valid,true);
});
test("unbekannte IDs, Version und beschädigte Struktur werden abgelehnt", () => {
  const x={type:"tuerkisch-lernstand",version:99,progress:[{id:"nix",level:9}]};
  const result=validateImport(x,new Set());assert.equal(result.valid,false);assert.ok(result.errors.length>=3);
});
